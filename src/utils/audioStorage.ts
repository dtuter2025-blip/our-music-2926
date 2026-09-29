import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Song } from '../types';

const CHUNK_SIZE = 450000; // ~450 KB per chunk (Firestore limit is 1MB)
const audioBlobCache = new Map<string, string>();

/**
 * Convert base64 data URL to Blob URL for high-performance audio playback & memory efficiency
 */
export function dataUrlToBlobUrl(dataUrl: string): string {
  try {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'audio/mp3';
    const b64 = parts[1];
    const byteCharacters = atob(b64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    return dataUrl;
  }
}

/**
 * Save a song and chunk large audio files across Firestore subcollection
 */
export async function saveSongWithAudio(
  newSongData: Omit<Song, 'id' | 'likes'>,
  onProgress?: (step: string) => void
): Promise<Song> {
  const songId = `student-song-${Date.now()}`;
  const rawAudio = newSongData.audioUrl;

  // Split audio string into chunks
  const chunks: string[] = [];
  for (let i = 0; i < rawAudio.length; i += CHUNK_SIZE) {
    chunks.push(rawAudio.substring(i, i + CHUNK_SIZE));
  }

  onProgress?.('음악 파일 클라우드 분할 저장 중...');

  // Save main song document (without full heavy audio string to stay well under 1MB)
  const songDoc: Song = {
    id: songId,
    title: newSongData.title.trim() || '무제',
    artist: newSongData.artist.trim() || '학생',
    coverUrl: newSongData.coverUrl || 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=600',
    audioUrl: chunks.length === 1 && rawAudio.length < 500000 ? rawAudio : '', // Store inline only if very small
    fileName: newSongData.fileName || 'student_song.mp3',
    duration: newSongData.duration || 0,
    createdAt: newSongData.createdAt,
    description: newSongData.description || '',
    lyrics: newSongData.lyrics ? newSongData.lyrics.trim() : '',
    likes: 0,
    tags: newSongData.tags || ['발라드 (Ballad)'],
    chunkCount: chunks.length,
  };

  const cleanDoc = JSON.parse(JSON.stringify(songDoc));
  await setDoc(doc(db, 'songs', songId), cleanDoc);

  // If chunked, save chunks to subcollection
  if (chunks.length > 1 || !songDoc.audioUrl) {
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = writeBatch(db);
      const slice = chunks.slice(i, i + batchSize);
      slice.forEach((chunkData, index) => {
        const chunkIndex = i + index;
        const chunkRef = doc(db, 'songs', songId, 'chunks', `chunk_${String(chunkIndex).padStart(4, '0')}`);
        batch.set(chunkRef, { index: chunkIndex, data: chunkData });
      });
      await batch.commit();
    }
  }

  // Pre-cache the blob URL locally
  const blobUrl = dataUrlToBlobUrl(rawAudio);
  audioBlobCache.set(songId, blobUrl);

  return {
    ...songDoc,
    audioUrl: blobUrl,
  };
}

/**
 * Fetch and reassemble chunked audio from Firestore
 */
export async function getPlayableAudioUrl(song: Song): Promise<string> {
  // Check memory cache first
  if (audioBlobCache.has(song.id)) {
    return audioBlobCache.get(song.id)!;
  }

  // If already stored inline
  if (song.audioUrl && song.audioUrl.startsWith('data:')) {
    const blobUrl = dataUrlToBlobUrl(song.audioUrl);
    audioBlobCache.set(song.id, blobUrl);
    return blobUrl;
  }

  // Fetch chunks from Firestore subcollection
  try {
    const chunksCol = collection(db, 'songs', song.id, 'chunks');
    const q = query(chunksCol, orderBy('index', 'asc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      return song.audioUrl;
    }

    const chunkPieces: string[] = [];
    snap.forEach((d) => {
      const chunkData = d.data();
      if (chunkData.data) {
        chunkPieces.push(chunkData.data);
      }
    });

    const fullDataUrl = chunkPieces.join('');
    const blobUrl = dataUrlToBlobUrl(fullDataUrl);
    audioBlobCache.set(song.id, blobUrl);
    return blobUrl;
  } catch (err) {
    console.error('Failed to load chunked audio:', err);
    return song.audioUrl;
  }
}

/**
 * Cleanly delete song and all its subcollection chunks
 */
export async function deleteSongWithChunks(songId: string): Promise<void> {
  try {
    // Delete chunks
    const chunksCol = collection(db, 'songs', songId, 'chunks');
    const snap = await getDocs(chunksCol);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
    // Delete main song
    await deleteDoc(doc(db, 'songs', songId));
    audioBlobCache.delete(songId);
  } catch (e) {
    console.error('Error deleting song chunks:', e);
  }
}
