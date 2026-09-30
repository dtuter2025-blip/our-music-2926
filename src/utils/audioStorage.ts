import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { Song } from '../types';
import {
  saveLocalAudioBlob,
  getLocalAudioBlob,
  deleteLocalAudioBlob,
  saveLocalSong,
  getLocalSongs,
  deleteLocalSong,
} from './indexedDbAudio';

/**
 * 1. Upload file directly to Firebase Cloud Storage with real-time progress callback
 */
export async function uploadFileToStorage(
  file: File,
  folder: 'songs' | 'covers' = 'songs',
  onProgress?: (percent: number, statusMsg: string) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
  const storagePath = `${folder}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  const metadata = {
    contentType: file.type || (folder === 'songs' ? 'audio/mpeg' : 'image/jpeg'),
  };

  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  return new Promise((resolve, reject) => {
    // 15-second timeout guard to detect missing storage bucket quickly
    const timeoutId = setTimeout(() => {
      try {
        uploadTask.cancel();
      } catch (e) {
        // ignore
      }
      reject(
        new Error(
          'Firebase Storage 버킷에 연결할 수 없습니다. AI Studio Starter 프로젝트는 기본 스토리지를 제공하지 않으므로 로컬 저장소로 자동 전환합니다.'
        )
      );
    }, 15000);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const percent = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          onProgress?.(
            percent,
            `Firebase Cloud Storage 업로드 중... (${percent}%)`
          );
        }
      },
      (error: any) => {
        clearTimeout(timeoutId);
        console.warn('Firebase Storage upload error:', error);

        let friendlyMessage = error.message;
        if (
          error.code === 'storage/unknown' ||
          error.status_ === 404 ||
          error.code === 'storage/bucket-not-found'
        ) {
          friendlyMessage =
            'Firebase Cloud Storage 버킷이 미생성 상태입니다.';
        } else if (error.code === 'storage/unauthorized') {
          friendlyMessage =
            'Storage 업로드 권한이 없습니다. Firebase 콘솔의 Storage 규칙을 확인해주세요.';
        } else if (error.code === 'storage/canceled') {
          friendlyMessage = '사용자에 의해 업로드가 취소되었습니다.';
        }

        reject(new Error(friendlyMessage));
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          onProgress?.(100, 'Storage 업로드 완료, Download URL 발급 중...');
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadUrl, storagePath });
        } catch (err: any) {
          reject(new Error(`Download URL 생성 실패: ${err.message}`));
        }
      }
    );
  });
}

/**
 * Save song metadata to Firestore (with IndexedDB fallback if quota is exceeded)
 */
export async function saveSongToFirestore(
  songData: Omit<Song, 'id' | 'likes'>,
  idOverride?: string
): Promise<Song> {
  const songId = idOverride || `student-song-${Date.now()}`;

  const songDoc: Song = {
    id: songId,
    title: songData.title.trim() || '무제',
    artist: songData.artist.trim() || '학생',
    coverUrl:
      songData.coverUrl ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    audioUrl: songData.audioUrl,
    storagePath: songData.storagePath || '',
    fileName: songData.fileName || 'music.mp3',
    duration: songData.duration || 0,
    createdAt: songData.createdAt,
    description: songData.description ? songData.description.trim() : '',
    lyrics: songData.lyrics ? songData.lyrics.trim() : '',
    likes: 0,
    tags: songData.tags && songData.tags.length > 0 ? songData.tags : ['자작곡'],
  };

  const cleanDoc = JSON.parse(JSON.stringify(songDoc));

  // Always keep a local copy in IndexedDB
  await saveLocalSong(cleanDoc);

  // Attempt Firestore write
  try {
    await setDoc(doc(db, 'songs', songId), cleanDoc);
  } catch (firestoreErr: any) {
    console.warn('Firestore write failed, saved locally in IndexedDB:', firestoreErr);
    // If quota exceeded or offline, local copy will ensure user can still play and see their song
  }

  return songDoc;
}

/**
 * Full sequential workflow:
 * 1. Attempt upload MP3 to Firebase Cloud Storage
 * 2. If Cloud Storage is not available, save audio into IndexedDB in < 1 second!
 * 3. Save song metadata into Firestore & IndexedDB
 */
export async function uploadAndSaveSong(
  params: {
    audioFile: File;
    coverFile?: File | null;
    presetCoverUrl: string;
    title: string;
    artist: string;
    description?: string;
    lyrics?: string;
    tag: string;
  },
  onProgress?: (percent: number, statusMsg: string) => void
): Promise<Song> {
  const songId = `student-song-${Date.now()}`;
  let audioDownloadUrl = '';
  let audioStoragePath = '';
  let isLocalFallback = false;

  // Step 1: Upload MP3 to Firebase Cloud Storage (or Instant Local Fallback)
  onProgress?.(10, '음원 업로드 준비 중...');
  try {
    const uploadRes = await uploadFileToStorage(
      params.audioFile,
      'songs',
      (pct) => {
        const overall = Math.round(10 + pct * 0.65);
        onProgress?.(overall, `Firebase Cloud Storage 업로드 중... (${pct}%)`);
      }
    );
    audioDownloadUrl = uploadRes.downloadUrl;
    audioStoragePath = uploadRes.storagePath;
  } catch (storageErr: any) {
    console.warn(
      'Firebase Cloud Storage unavailable, falling back to IndexedDB local storage:',
      storageErr
    );
    isLocalFallback = true;
    onProgress?.(50, 'Cloud Storage 미연동 확인 ➔ 브라우저 고속 저장소로 즉시 저장 중...');
    
    // Save to IndexedDB
    const localUri = await saveLocalAudioBlob(songId, params.audioFile);
    audioDownloadUrl = localUri || URL.createObjectURL(params.audioFile);
  }

  // Step 2: Handle Cover Image
  let finalCoverUrl = params.presetCoverUrl;
  let coverStoragePath = '';
  if (params.coverFile && !isLocalFallback) {
    onProgress?.(80, '커버 이미지를 Cloud Storage에 업로드 중...');
    try {
      const coverResult = await uploadFileToStorage(
        params.coverFile,
        'covers'
      );
      finalCoverUrl = coverResult.downloadUrl;
      coverStoragePath = coverResult.storagePath;
    } catch (err) {
      console.warn('Cover upload failed, falling back to preset:', err);
    }
  }

  // Step 3: Bundle metadata and save to Firestore (and IndexedDB)
  onProgress?.(90, '곡 정보 및 가사 저장 중...');
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(
    2,
    '0'
  )}.${String(today.getDate()).padStart(2, '0')}`;

  const cleanTag = params.tag.trim().replace(/^#/, '') || '자작곡';

  const savedSong = await saveSongToFirestore(
    {
      title: params.title,
      artist: params.artist,
      coverUrl: finalCoverUrl,
      audioUrl: audioDownloadUrl,
      storagePath: audioStoragePath,
      fileName: params.audioFile.name,
      createdAt: dateStr,
      description: params.description || '',
      lyrics: params.lyrics || '',
      tags: [cleanTag],
    },
    songId
  );

  if (isLocalFallback) {
    onProgress?.(
      100,
      '업로드 완료! (스토리지 미연결로 브라우저 로컬 저장소에 고속 등록되었습니다)'
    );
  } else {
    onProgress?.(100, '음원 등록이 완료되었습니다!');
  }

  return savedSong;
}

/**
 * Return playable audio URL.
 * Handles Firebase Cloud Storage URLs, Blob URLs, IndexedDB stored audios, and legacy chunks.
 */
export async function getPlayableAudioUrl(song: Song): Promise<string> {
  // If it's an external HTTP/HTTPS URL (Firebase Storage direct link)
  if (
    song.audioUrl &&
    (song.audioUrl.startsWith('http://') || song.audioUrl.startsWith('https://'))
  ) {
    return song.audioUrl;
  }

  // If stored in IndexedDB (indexeddb://<songId>)
  if (song.audioUrl && song.audioUrl.startsWith('indexeddb://')) {
    const id = song.audioUrl.replace('indexeddb://', '');
    const blob = await getLocalAudioBlob(id);
    if (blob) {
      return URL.createObjectURL(blob);
    }
  }

  // Also check IndexedDB by song.id
  if (song.id) {
    const blob = await getLocalAudioBlob(song.id);
    if (blob) {
      return URL.createObjectURL(blob);
    }
  }

  // If stored as base64 data URL
  if (song.audioUrl && song.audioUrl.startsWith('data:')) {
    return song.audioUrl;
  }

  // Fallback for legacy chunked songs if any exist in Firestore
  try {
    const chunksCol = collection(db, 'songs', song.id, 'chunks');
    const snap = await getDocs(chunksCol);
    if (!snap.empty) {
      const pieces: string[] = [];
      const docs = snap.docs.sort((a, b) => {
        const idxA = a.data().index ?? 0;
        const idxB = b.data().index ?? 0;
        return idxA - idxB;
      });
      docs.forEach((d) => {
        if (d.data().data) pieces.push(d.data().data);
      });
      if (pieces.length > 0) {
        return pieces.join('');
      }
    }
  } catch (err) {
    console.warn('Legacy chunk lookup note:', err);
  }

  return song.audioUrl || '';
}

/**
 * Delete song from Firestore, Firebase Storage, and IndexedDB
 */
export async function deleteSongWithStorage(
  songId: string,
  storagePath?: string,
  audioUrl?: string
): Promise<void> {
  // 1. Delete from IndexedDB local storage
  await deleteLocalAudioBlob(songId);
  await deleteLocalSong(songId);

  // 2. Delete from Firebase Cloud Storage if applicable
  if (storagePath) {
    try {
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
    } catch (err) {
      // ignore
    }
  } else if (audioUrl && audioUrl.includes('firebasestorage.googleapis.com')) {
    try {
      const fileRef = ref(storage, audioUrl);
      await deleteObject(fileRef);
    } catch (err) {
      // ignore
    }
  }

  // 3. Clean up Firestore document
  try {
    await deleteDoc(doc(db, 'songs', songId));
  } catch (e) {
    console.warn('Firestore delete note:', e);
  }
}

export { getLocalSongs };
export const saveSongWithAudio = saveSongToFirestore;
export const deleteSongWithChunks = (songId: string) =>
  deleteSongWithStorage(songId);
