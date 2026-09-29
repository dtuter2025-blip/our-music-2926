export interface Song {
  id: string;
  title: string;
  artist: string; // 학생 이름 / 학급
  coverUrl: string;
  audioUrl: string;
  fileName?: string;
  duration?: number; // in seconds
  createdAt: string;
  description?: string;
  lyrics?: string;
  driveLink?: string;
  likes: number;
  tags?: string[];
  chunkCount?: number;
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
}
