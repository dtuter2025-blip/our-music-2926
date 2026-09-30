import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Music,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Pause,
  Play,
  Cloud,
  Loader2,
  Shield,
  ShieldCheck,
  FileText,
  GripVertical,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  increment,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Song, PlayerState } from './types';
import { formatTime } from './utils/audioSynth';
import {
  getPlayableAudioUrl,
  deleteSongWithStorage,
  getLocalSongs,
  reorderSongsInStorage,
} from './utils/audioStorage';
import { DriveBanner } from './components/DriveBanner';
import { SongCard } from './components/SongCard';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { UploadModal, GENRES } from './components/UploadModal';
import { AdminModal } from './components/AdminModal';
import { LyricsModal } from './components/LyricsModal';
import { EditSongModal } from './components/EditSongModal';

const ADMIN_PASSWORD = 'gksksla0316';

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);

  // Admin Mode State (Persisted in sessionStorage)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('app_is_admin') === 'true';
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminNotice, setAdminNotice] = useState<string>('');

  // Player State
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isMuted: false,
    isLooping: false,
  });

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'likes' | 'title'>('latest');

  // Drag-and-drop state for Admin mode
  const [draggedSongId, setDraggedSongId] = useState<string | null>(null);
  const [dragOverSongId, setDragOverSongId] = useState<string | null>(null);

  // Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedLyricsSong, setSelectedLyricsSong] = useState<Song | null>(null);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  // Admin Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isAdmin) return;
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSongId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSongId !== id) {
      setDragOverSongId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    if (!isAdmin) return;
    if (dragOverSongId === id) {
      setDragOverSongId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedSongId;
    setDraggedSongId(null);
    setDragOverSongId(null);

    if (!sourceId || sourceId === targetId) return;

    const currentList = [...songs];
    const sourceIdx = currentList.findIndex((s) => s.id === sourceId);
    const targetIdx = currentList.findIndex((s) => s.id === targetId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const [moved] = currentList.splice(sourceIdx, 1);
    currentList.splice(targetIdx, 0, moved);

    const reordered = currentList.map((item, idx) => ({
      ...item,
      order: idx,
    }));

    setSongs(reordered);

    try {
      await reorderSongsInStorage(reordered);
    } catch (err) {
      console.warn('Reorder save notice:', err);
    }
  };

  const handleDragEnd = () => {
    setDraggedSongId(null);
    setDragOverSongId(null);
  };

  const handleOpenLyrics = (song: Song) => {
    setSelectedLyricsSong(song);
    setIsLyricsModalOpen(true);
  };

  const handleOpenEdit = (song: Song) => {
    setEditingSong(song);
    setIsEditModalOpen(true);
  };

  const handleSongUpdated = (updatedSong: Song) => {
    // 1. Update songs list
    setSongs((prev) =>
      prev.map((s) => (s.id === updatedSong.id ? updatedSong : s))
    );

    // 2. Keep playerState synced if current song is playing
    if (playerState.currentSong?.id === updatedSong.id) {
      setPlayerState((prev) => ({
        ...prev,
        currentSong: updatedSong,
      }));
    }

    // 3. Keep lyrics modal synced if opened
    if (selectedLyricsSong?.id === updatedSong.id) {
      setSelectedLyricsSong(updatedSong);
    }
  };

  // Clean up any leftover sample-track-1 on mount if present
  useEffect(() => {
    const cleanSampleTrack = async () => {
      try {
        const sampleRef = doc(db, 'songs', 'sample-track-1');
        await deleteDoc(sampleRef);
      } catch (e) {
        // ignore
      }
    };
    cleanSampleTrack();
  }, []);

  // Subscribe to Firestore real-time updates & load local songs
  useEffect(() => {
    // 1. Instantly load locally cached songs from IndexedDB (instant zero-delay display)
    getLocalSongs().then((localList) => {
      if (localList && localList.length > 0) {
        setSongs((prev) => {
          const map = new Map<string, Song>();
          prev.forEach((s) => map.set(s.id, s));
          localList.forEach((s) => {
            if (!map.has(s.id)) map.set(s.id, s);
          });
          return Array.from(map.values());
        });
        setLoading(false);
      }
    });

    // 2. Subscribe to Firestore updates
    const songsCol = collection(db, 'songs');
    const q = query(songsCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const loadedSongs: Song[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Song;
          // Filter out sample-track-1 if any
          if (data.id !== 'sample-track-1') {
            loadedSongs.push(data);
          }
        });

        // Merge with any offline / locally stored songs
        const localList = await getLocalSongs();
        const map = new Map<string, Song>();
        (localList || []).forEach((s) => map.set(s.id, s));
        loadedSongs.forEach((s) => map.set(s.id, s));
        const mergedSongs = Array.from(map.values());
        mergedSongs.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          if (a.order !== undefined) return -1;
          if (b.order !== undefined) return 1;
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });

        setSongs(mergedSongs);
        setLoading(false);

        // Keep currentSong synced
        setPlayerState((prev) => {
          if (mergedSongs.length === 0) {
            return { ...prev, currentSong: null, isPlaying: false };
          }
          if (!prev.currentSong && mergedSongs.length > 0) {
            return { ...prev, currentSong: mergedSongs[0] };
          }
          if (prev.currentSong) {
            const updated = mergedSongs.find((s) => s.id === prev.currentSong?.id);
            if (updated) {
              return { ...prev, currentSong: updated };
            } else {
              return { ...prev, currentSong: mergedSongs[0] || null };
            }
          }
          return prev;
        });
      },
      async (error) => {
        console.warn('Firestore subscription notice (loading local songs):', error);
        const localList = await getLocalSongs();
        if (localList && localList.length > 0) {
          setSongs(localList);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setPlayerState((prev) => ({
        ...prev,
        currentTime: audio.currentTime,
        duration: audio.duration || prev.duration || 0,
      }));
    };

    const handleLoadedMetadata = () => {
      setPlayerState((prev) => ({
        ...prev,
        duration: audio.duration || 0,
      }));
    };

    const handleEnded = () => {
      if (playerState.isLooping) {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      } else {
        handleNextSong();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playerState.isLooping, songs]);

  // Admin login handler
  const handleAdminLogin = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      sessionStorage.setItem('app_is_admin', 'true');
      return true;
    }
    return false;
  };

  // Admin logout handler
  const handleAdminLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('app_is_admin');
  };

  // Upload request handler (checks admin access)
  const handleRequestUpload = () => {
    if (isAdmin) {
      setIsUploadModalOpen(true);
    } else {
      setAdminNotice('음원 업로드 및 삭제는 관리자만 가능합니다. 관리자 비밀번호를 입력해주세요.');
      setIsAdminModalOpen(true);
    }
  };

  // Play a specific song
  const handlePlaySong = async (song: Song) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playerState.currentSong?.id === song.id && audio.src) {
      if (playerState.isPlaying) {
        audio.pause();
        setPlayerState((prev) => ({ ...prev, isPlaying: false }));
      } else {
        audio.play().then(() => {
          setPlayerState((prev) => ({ ...prev, isPlaying: true }));
        }).catch(console.warn);
      }
    } else {
      setPlayerState((prev) => ({
        ...prev,
        currentSong: song,
        currentTime: 0,
        isPlaying: true,
      }));

      try {
        setLoadingAudioId(song.id);
        const playableUrl = await getPlayableAudioUrl(song);
        audio.src = playableUrl;
        audio.load();
        await audio.play();
        setPlayerState((prev) => ({ ...prev, isPlaying: true }));
      } catch (err) {
        console.warn('Audio play error:', err);
      } finally {
        setLoadingAudioId(null);
      }
    }
  };

  // Play / Pause Toggle
  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !playerState.currentSong) return;

    if (playerState.isPlaying) {
      audio.pause();
      setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      if (!audio.src) {
        await handlePlaySong(playerState.currentSong);
      } else {
        audio.play().then(() => {
          setPlayerState((prev) => ({ ...prev, isPlaying: true }));
        }).catch(console.warn);
      }
    }
  };

  // Next / Prev Song
  const handleNextSong = () => {
    if (songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === playerState.currentSong?.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    handlePlaySong(songs[nextIndex]);
  };

  const handlePrevSong = () => {
    if (songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === playerState.currentSong?.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    handlePlaySong(songs[prevIndex]);
  };

  // Seek
  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setPlayerState((prev) => ({ ...prev, currentTime: time }));
    }
  };

  // Volume & Mute
  const handleVolumeChange = (volume: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      setPlayerState((prev) => ({ ...prev, volume, isMuted: volume === 0 }));
    }
  };

  const handleToggleMute = () => {
    const audio = audioRef.current;
    if (audio) {
      const nextMuted = !playerState.isMuted;
      audio.muted = nextMuted;
      setPlayerState((prev) => ({ ...prev, isMuted: nextMuted }));
    }
  };

  const handleToggleLoop = () => {
    setPlayerState((prev) => ({ ...prev, isLooping: !prev.isLooping }));
  };

  // Like Song in Firestore
  const handleToggleLike = async (id: string) => {
    try {
      const songRef = doc(db, 'songs', id);
      await updateDoc(songRef, {
        likes: increment(1),
      });
    } catch (err) {
      console.error('Failed to update likes:', err);
    }
  };

  // Delete Song from Firestore and Cloud Storage (Only accessible by admin)
  const handleDeleteSong = async (id: string) => {
    if (!isAdmin) return;
    const targetSong = songs.find((s) => s.id === id);
    if (confirm('이 음원을 모든 기기 목록 및 클라우드에서 영구 삭제하시겠습니까?')) {
      try {
        if (playerState.currentSong?.id === id) {
          audioRef.current?.pause();
          setPlayerState((prev) => ({
            ...prev,
            isPlaying: false,
            currentTime: 0,
            currentSong: null,
          }));
        }
        await deleteSongWithStorage(id, targetSong?.storagePath, targetSong?.audioUrl);
      } catch (err) {
        console.error('Failed to delete song:', err);
      }
    }
  };

  // Filter & Sort
  const filteredSongs = songs.filter((song) => {
    const matchesSearch =
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (song.description && song.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag =
      selectedTag === 'all' ||
      (song.tags && song.tags.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  const sortedSongs = [...filteredSongs].sort((a, b) => {
    if (sortBy === 'likes') return b.likes - a.likes;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  // Extract available tags dynamically from all registered songs
  const presentTags: string[] = Array.from(
    new Set(songs.flatMap((s) => s.tags || []).map((t) => t.trim()).filter(Boolean))
  );
  const displayTags: string[] = presentTags.length > 0 ? presentTags : GENRES.slice(0, 8);

  const currentTrack = playerState.currentSong || (songs.length > 0 ? songs[0] : null);
  const progressRatio = playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-slate-800 pb-52 sm:pb-40 flex flex-col font-sans selection:bg-[#FF6B35] selection:text-white">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        preload="metadata"
      />

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-30 bg-[#FFF9F5]/95 backdrop-blur-md border-b border-orange-100/80 px-3 sm:px-8 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-[#FF6B35] rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md sm:shadow-lg shadow-orange-200 text-white flex-shrink-0">
              <Music className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-[#1A1A1A] whitespace-nowrap">
                TYHS'story-26
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3.5 flex-shrink-0">
            {/* Admin Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setAdminNotice('');
                setIsAdminModalOpen(true);
              }}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black transition-all ${
                isAdmin
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm'
              }`}
              title={isAdmin ? '관리자 모드 활성화됨' : '관리자 모드'}
            >
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  <span className="hidden sm:inline">관리자 모드 켜짐</span>
                  <span className="sm:hidden">관리자 ON</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                  <span>관리자 모드</span>
                </>
              )}
            </button>

            {/* Realtime Cloud Sync Badge */}
            <div className="hidden md:flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-emerald-100 shadow-sm text-emerald-700 text-xs font-black">
              <Cloud className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>실시간 클라우드 연동</span>
            </div>

            {/* Upload Button (Admin restricted) */}
            <button
              type="button"
              onClick={handleRequestUpload}
              className="inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4.5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#FF6B35] hover:bg-[#ff7b4b] text-white text-[11px] sm:text-xs font-black shadow-md sm:shadow-lg shadow-orange-200 hover:scale-105 active:scale-95 transition-all"
              title={isAdmin ? '음원 올리기 (관리자 모드)' : '음원 올리기 (관리자 전용)'}
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
              <span className="whitespace-nowrap">음원 올리기</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 flex-1 w-full space-y-8">
        {/* Drive Info Banner */}
        <DriveBanner totalSongs={songs.length} />

        {/* Prominent Spotlight "Now Playing" Hero Card */}
        {currentTrack ? (
          <section className="bg-white rounded-[40px] p-6 sm:p-9 shadow-2xl shadow-orange-100/70 border border-orange-100/80 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#004E64] opacity-5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 left-1/3 w-64 h-64 bg-[#FF6B35] opacity-5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 justify-between">
              {/* Left Track Visual & Info */}
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 w-full lg:w-auto">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-[32px] overflow-hidden shadow-2xl flex-shrink-0 rotate-2 hover:rotate-0 transition-transform duration-300 border-4 border-white bg-slate-100">
                  <img
                    src={currentTrack.coverUrl}
                    alt={currentTrack.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';
                    }}
                    className="w-full h-full object-cover"
                  />
                  {loadingAudioId === currentTrack.id ? (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center text-white gap-2">
                      <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35]" />
                      <span className="text-[11px] font-black">음원 로딩 중...</span>
                    </div>
                  ) : playerState.isPlaying && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-[#FF6B35] text-white text-xs font-black shadow-lg">
                        ON AIR
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2">
                  <span className="px-4 py-1.5 bg-orange-100 text-[#FF6B35] text-xs font-black rounded-full w-fit uppercase tracking-wider">
                    {playerState.isPlaying ? 'Now Playing' : 'Selected Track'}
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {currentTrack.title}
                  </h2>
                  <p className="text-base sm:text-xl font-bold text-slate-500">
                    {currentTrack.artist}
                  </p>
                  {currentTrack.tags && currentTrack.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {currentTrack.tags.map((t) => (
                        <span key={t} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                  {currentTrack.description && (
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md bg-[#FFF9F5] p-3 rounded-2xl border border-orange-100/60 font-medium mt-1">
                      "{currentTrack.description}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleOpenLyrics(currentTrack)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-xs font-black transition-all ${
                        currentTrack.lyrics
                          ? 'bg-orange-100 hover:bg-[#FF6B35] text-[#FF6B35] hover:text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>가사보기</span>
                      {currentTrack.lyrics && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Equalizer & Controls */}
              <div className="w-full lg:w-96 flex flex-col justify-center space-y-5 bg-[#FFF9F5] p-6 rounded-3xl border border-orange-100/70">
                {/* Wave Equalizer Visualizer */}
                <div className="flex items-end justify-center gap-1.5 h-16 px-2">
                  <div className={`w-2.5 bg-orange-100 rounded-full transition-all ${playerState.isPlaying ? 'animate-wave-1 h-8' : 'h-4'}`} />
                  <div className={`w-2.5 bg-orange-200 rounded-full transition-all ${playerState.isPlaying ? 'animate-wave-2 h-12' : 'h-6'}`} />
                  <div className={`w-2.5 bg-[#FF6B35] rounded-full transition-all ${playerState.isPlaying ? 'animate-wave-3 h-16' : 'h-10'}`} />
                  <div className={`w-2.5 bg-[#FF6B35] rounded-full transition-all ${playerState.isPlaying ? 'animate-wave-4 h-10' : 'h-6'}`} />
                  <div className={`w-2.5 bg-orange-300 rounded-full transition-all ${playerState.isPlaying ? 'animate-wave-5 h-14' : 'h-8'}`} />
                  <div className={`w-2.5 bg-orange-200 rounded-full transition-all ${playerState.isPlaying ? 'animate-wave-1 h-9' : 'h-5'}`} />
                  <div className={`w-2.5 bg-[#FF6B35] rounded-full transition-all ${playerState.isPlaying ? 'animate-wave-2 h-15' : 'h-9'}`} />
                  <div className={`w-2.5 bg-orange-300 rounded-full transition-all ${playerState.isPlaying ? 'animate-wave-3 h-11' : 'h-6'}`} />
                  <div className={`w-2.5 bg-orange-100 rounded-full transition-all ${playerState.isPlaying ? 'animate-wave-4 h-8' : 'h-4'}`} />
                  <div className={`w-2.5 bg-orange-200 rounded-full transition-all ${playerState.isPlaying ? 'animate-wave-5 h-13' : 'h-7'}`} />
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = (e.clientX - rect.left) / rect.width;
                      handleSeek(ratio * playerState.duration);
                    }}
                    className="relative h-2.5 bg-slate-200/80 rounded-full overflow-hidden cursor-pointer"
                  >
                    <div
                      className="absolute left-0 top-0 h-full bg-[#FF6B35] rounded-full transition-[width] duration-100"
                      style={{ width: `${progressRatio}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-400 font-mono">
                    <span>{formatTime(playerState.currentTime)}</span>
                    <span>{formatTime(playerState.duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-6 pt-1">
                  <button
                    type="button"
                    onClick={handlePrevSong}
                    className="p-3 text-slate-400 hover:text-[#FF6B35] hover:bg-white rounded-2xl transition-all"
                    title="이전 곡"
                  >
                    <SkipBack className="w-6 h-6 fill-current" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="w-16 h-16 bg-[#FF6B35] hover:bg-[#ff7b4b] rounded-full flex items-center justify-center text-white shadow-xl shadow-orange-300 hover:scale-105 active:scale-95 transition-all"
                    aria-label={playerState.isPlaying ? '일시 정지' : '재생'}
                  >
                    {playerState.isPlaying ? (
                      <Pause className="w-8 h-8 fill-current" />
                    ) : (
                      <Play className="w-8 h-8 fill-current ml-1" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNextSong}
                    className="p-3 text-slate-400 hover:text-[#FF6B35] hover:bg-white rounded-2xl transition-all"
                    title="다음 곡"
                  >
                    <SkipForward className="w-6 h-6 fill-current" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-white rounded-[40px] p-8 sm:p-12 shadow-xl shadow-orange-100/50 border border-orange-100 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-orange-100 text-[#FF6B35] flex items-center justify-center mx-auto shadow-md shadow-orange-200/50">
              <Music className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800">등록된 첫 음원을 기다리고 있어요</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
                첫 번째 학생의 자작곡을 업로드하면 이곳에 멋진 플레이어와 함께 실시간으로 등록됩니다!
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestUpload}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#FF6B35] hover:bg-[#ff7b4b] text-white text-xs font-black shadow-lg shadow-orange-200 hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>첫 음원 등록하기</span>
            </button>
          </section>
        )}

        {/* Filter & Search Bar */}
        <section className="bg-white rounded-3xl p-5 border border-orange-100/90 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="곡 제목, 학생 이름(작성자), 소감 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FFF9F5] hover:bg-white focus:bg-white border border-orange-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B35] transition-all text-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                지우기
              </button>
            )}
          </div>

          {/* Tags & Sorting */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-xl pb-1 sm:pb-0 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedTag('all')}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${
                  selectedTag === 'all'
                    ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-200'
                    : 'bg-orange-50 text-slate-600 hover:bg-orange-100'
                }`}
              >
                전체 ({songs.length})
              </button>
              {displayTags.map((t) => {
                const count = songs.filter((s) => s.tags?.includes(t)).length;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTag(t)}
                    className={`px-3.5 py-1.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${
                      selectedTag === t
                        ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-200'
                        : count > 0
                        ? 'bg-orange-100/70 text-slate-800 hover:bg-orange-200/80'
                        : 'bg-orange-50 text-slate-400 hover:bg-orange-100 hover:text-slate-600'
                    }`}
                  >
                    #{t} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>

            <div className="h-5 w-px bg-orange-100 hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 rounded-2xl bg-[#FFF9F5] border border-orange-100 text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]"
              >
                <option value="latest">최신 등록순</option>
                <option value="likes">좋아요순</option>
                <option value="title">곡 제목순</option>
              </select>
            </div>
          </div>
        </section>

        {/* Songs Grid Section */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>최근 올라온 학생 음원</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF6B35]">
                {sortedSongs.length}곡
              </span>
            </h3>
          </div>

          {loading ? (
            <div className="bg-white rounded-[40px] p-16 text-center border border-orange-100 max-w-md mx-auto my-8 space-y-4 shadow-sm">
              <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-600">클라우드 음원 목록을 불러오는 중...</p>
            </div>
          ) : sortedSongs.length === 0 ? (
            <div className="bg-white rounded-[40px] p-12 text-center border border-orange-100 max-w-md mx-auto my-8 space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-orange-100 text-[#FF6B35] flex items-center justify-center mx-auto">
                <Music className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-800">등록된 음원이 없습니다</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  {searchQuery ? '검색 조건에 일치하는 음원이 없습니다.' : '첫 번째 학생의 창작 음원을 올려보세요!'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRequestUpload}
                className="px-6 py-2.5 rounded-2xl bg-[#FF6B35] text-white text-xs font-black shadow-lg shadow-orange-200 hover:scale-105 transition-all inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>새 음원 등록하기</span>
              </button>
            </div>
          ) : (
            <>
              {isAdmin && sortedSongs.length > 1 && (
                <div className="flex items-center justify-between gap-2 px-4.5 py-3 rounded-2xl bg-orange-50/90 border border-orange-200/90 text-orange-950 text-xs font-bold mb-5 shadow-xs animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-[#FF6B35]" />
                    <span>
                      관리자 모드: 카드를 마우스로 끌어서 원하는 곡 순서로 바로 변경(드래그 앤 드롭)할 수 있습니다.
                    </span>
                  </div>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-[#FF6B35] text-white whitespace-nowrap shadow-xs">
                    순서 이동 ON
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {sortedSongs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isPlaying={playerState.isPlaying}
                    isCurrent={playerState.currentSong?.id === song.id}
                    onPlay={handlePlaySong}
                    onToggleLike={handleToggleLike}
                    onDelete={isAdmin ? handleDeleteSong : undefined}
                    onEdit={isAdmin ? handleOpenEdit : undefined}
                    onOpenLyrics={handleOpenLyrics}
                    draggable={isAdmin}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedSongId === song.id}
                    isDragOver={dragOverSongId === song.id}
                  />
                ))}
              </div>
            </>
          )}

          {/* Bottom spacing spacer so floating player never obstructs the lowest cards */}
          <div className="h-16 sm:h-8" aria-hidden="true" />
        </section>
      </main>

      {/* Persistent Responsive Audio Player Bar */}
      {playerState.currentSong && (
        <AudioPlayerBar
          playerState={playerState}
          onPlayPause={handlePlayPause}
          onPrev={handlePrevSong}
          onNext={handleNextSong}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onToggleLoop={handleToggleLoop}
          onToggleLike={handleToggleLike}
          onOpenLyrics={() => currentTrack && handleOpenLyrics(currentTrack)}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        isAdmin={isAdmin}
        onClose={() => setIsUploadModalOpen(false)}
        onSongCreated={(newSong) => {
          setSongs((prev) => [newSong, ...prev.filter((s) => s.id !== newSong.id)]);
          handlePlaySong(newSong);
        }}
      />

      {/* Admin Login/Logout Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        isAdmin={isAdmin}
        notice={adminNotice}
        onClose={() => {
          setIsAdminModalOpen(false);
          setAdminNotice('');
        }}
        onLogin={handleAdminLogin}
        onLogout={handleAdminLogout}
        onOpenUpload={() => setIsUploadModalOpen(true)}
      />
      {/* Lyrics Modal */}
      <LyricsModal
        isOpen={isLyricsModalOpen}
        song={selectedLyricsSong}
        isPlaying={playerState.isPlaying && playerState.currentSong?.id === selectedLyricsSong?.id}
        onPlay={handlePlaySong}
        onEdit={isAdmin ? handleOpenEdit : undefined}
        onClose={() => {
          setIsLyricsModalOpen(false);
          setSelectedLyricsSong(null);
        }}
      />

      {/* Edit Song & Lyrics Modal */}
      <EditSongModal
        isOpen={isEditModalOpen}
        song={editingSong}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSong(null);
        }}
        onSongUpdated={handleSongUpdated}
      />
    </div>
  );
}
