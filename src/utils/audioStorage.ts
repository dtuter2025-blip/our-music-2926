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

/**
 * 1. Upload file directly to Firebase Cloud Storage with real-time progress callback
 */
export async function uploadFileToStorage(
  file: File,
  folder: 'songs' | 'covers' = 'songs',
  onProgress?: (percent: number, statusMsg: string) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  // Sanitize filename and make unique
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
  const storagePath = `${folder}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  const metadata = {
    contentType: file.type || (folder === 'songs' ? 'audio/mpeg' : 'image/jpeg'),
  };

  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  return new Promise((resolve, reject) => {
    // 60-second timeout guard to prevent infinite hanging
    const timeoutId = setTimeout(() => {
      try {
        uploadTask.cancel();
      } catch (e) {
        // ignore
      }
      reject(
        new Error(
          'Firebase Storage 업로드 시간이 초과되었습니다 (60초). Firebase 콘솔(Storage 메뉴)에서 "시작하기"를 눌러 스토리지가 생성되어 있는지 확인해주세요.'
        )
      );
    }, 60000);

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
        console.error('Firebase Storage upload error:', error);
        
        let friendlyMessage = error.message;
        if (error.code === 'storage/unknown' || error.status_ === 404 || error.code === 'storage/bucket-not-found') {
          friendlyMessage = 'Firebase Cloud Storage 버킷을 찾을 수 없습니다. Firebase 콘솔(https://console.firebase.google.com)의 [Storage] 메뉴에서 "시작하기" 버튼을 눌러 스토리지를 활성화했는지 확인해주세요.';
        } else if (error.code === 'storage/unauthorized') {
          friendlyMessage = 'Storage 업로드 권한이 없습니다. Firebase 콘솔의 Storage 규칙(Rules)에서 allow write를 허용해주세요.';
        } else if (error.code === 'storage/canceled') {
          friendlyMessage = '사용자에 의해 업로드가 취소되었습니다.';
        }
        
        reject(new Error(friendlyMessage));
      },
      async () => {
        clearTimeout(timeoutId);
        try {
          onProgress?.(100, 'Storage 업로드 완료, Download URL 발급 중...');
          // 2. Obtain download URL
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
 * 3. Save bundled song metadata (with Storage Download URL, lyrics, description) to Firestore
 */
export async function saveSongToFirestore(
  songData: Omit<Song, 'id' | 'likes'>
): Promise<Song> {
  const songId = `student-song-${Date.now()}`;

  const songDoc: Song = {
    id: songId,
    title: songData.title.trim() || '무제',
    artist: songData.artist.trim() || '학생',
    coverUrl:
      songData.coverUrl ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
    audioUrl: songData.audioUrl, // Direct Firebase Storage Download URL
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
  await setDoc(doc(db, 'songs', songId), cleanDoc);

  return songDoc;
}

/**
 * Full sequential workflow:
 * 1. Upload MP3 to Firebase Cloud Storage
 * 2. Get Download URL
 * 3. Package metadata with lyrics, description, and Download URL into Firestore
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
  // Step 1: Upload MP3 to Firebase Cloud Storage
  onProgress?.(5, 'Firebase Cloud Storage에 MP3 파일 업로드 준비 중...');
  const { downloadUrl: audioDownloadUrl, storagePath: audioStoragePath } =
    await uploadFileToStorage(params.audioFile, 'songs', (pct) => {
      // Map 0..100 to 10..75%
      const overall = Math.round(10 + (pct * 0.65));
      onProgress?.(overall, `Firebase Cloud Storage에 MP3 업로드 중... (${pct}%)`);
    });

  // Step 2: Handle Cover Image (custom upload or preset)
  let finalCoverUrl = params.presetCoverUrl;
  let coverStoragePath = '';
  if (params.coverFile) {
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

  // Step 3: Bundle metadata and save to Firestore
  onProgress?.(90, '곡 정보, 가사 및 Storage URL을 Firestore에 저장 중...');
  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(
    2,
    '0'
  )}.${String(today.getDate()).padStart(2, '0')}`;

  const cleanTag = params.tag.trim().replace(/^#/, '') || '자작곡';

  const savedSong = await saveSongToFirestore({
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
  });

  onProgress?.(100, '음원 등록이 완료되었습니다!');
  return savedSong;
}

/**
 * Return playable audio URL.
 * If already a direct HTTP/HTTPS URL (Firebase Storage Download URL), returns directly!
 * Handles legacy chunked songs if any exist.
 */
export async function getPlayableAudioUrl(song: Song): Promise<string> {
  // If it's a direct Storage URL or external HTTP/HTTPS URL, stream directly!
  if (song.audioUrl && (song.audioUrl.startsWith('http://') || song.audioUrl.startsWith('https://'))) {
    return song.audioUrl;
  }

  // If stored as data URL
  if (song.audioUrl && song.audioUrl.startsWith('data:')) {
    return song.audioUrl;
  }

  // Fallback for legacy chunked songs
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
    console.warn('Legacy chunk lookup failed:', err);
  }

  return song.audioUrl;
}

/**
 * Delete song from Firestore and clean up audio file from Firebase Cloud Storage
 */
export async function deleteSongWithStorage(
  songId: string,
  storagePath?: string,
  audioUrl?: string
): Promise<void> {
  // 1. Delete from Firebase Cloud Storage if storagePath exists
  if (storagePath) {
    try {
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn('Storage file deletion note:', err);
    }
  } else if (audioUrl && audioUrl.includes('firebasestorage.googleapis.com')) {
    try {
      const fileRef = ref(storage, audioUrl);
      await deleteObject(fileRef);
    } catch (err) {
      console.warn('Storage file deletion by URL note:', err);
    }
  }

  // 2. Clean up any legacy subcollection chunks
  try {
    const chunksCol = collection(db, 'songs', songId, 'chunks');
    const snap = await getDocs(chunksCol);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (e) {
    // ignore
  }

  // 3. Delete song document from Firestore
  await deleteDoc(doc(db, 'songs', songId));
}

// Backward-compatible exports
export const saveSongWithAudio = saveSongToFirestore;
export const deleteSongWithChunks = (songId: string) => deleteSongWithStorage(songId);
