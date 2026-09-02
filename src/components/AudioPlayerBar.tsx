import React, { useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  Heart,
  User,
} from 'lucide-react';
import { PlayerState } from '../types';
import { formatTime } from '../utils/audioSynth';

interface AudioPlayerBarProps {
  playerState: PlayerState;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleLoop: () => void;
  onToggleLike: (id: string) => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  playerState,
  onPlayPause,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleLoop,
  onToggleLike,
}) => {
  const { currentSong, isPlaying, currentTime, duration, volume, isMuted, isLooping } = playerState;
  const progressBarRef = useRef<HTMLDivElement>(null);

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(clickRatio * duration);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-xl border-t border-orange-200/80 shadow-[0_-8px_30px_rgba(255,107,53,0.18)] pb-[max(env(safe-area-inset-bottom,0px),6px)]">
      {/* Top Interactive Progress Bar with Coral Gradient */}
      <div
        ref={progressBarRef}
        onClick={handleProgressBarClick}
        className="group relative w-full h-2 bg-orange-100 hover:h-3 cursor-pointer transition-all flex items-center"
      >
        <div
          className="h-full bg-gradient-to-r from-[#FF6B35] via-[#ff8450] to-[#ffa060] rounded-r-full relative transition-[width] duration-100"
          style={{ width: `${progressPercent}%` }}
        >
          {/* Thumb marker */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-[#FF6B35] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3.5">
        {/* Mobile Single-Row Layout (< sm) */}
        <div className="flex sm:hidden items-center justify-between gap-2">
          {/* Mini Track Info */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-orange-50 border border-orange-200 flex-shrink-0 shadow-sm">
              <img
                src={currentSong.coverUrl}
                alt={currentSong.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';
                }}
                className="w-full h-full object-cover"
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 bg-[#FF6B35] rounded-full animate-wave-1 h-3" />
                    <span className="w-0.5 bg-white rounded-full animate-wave-2 h-3" />
                    <span className="w-0.5 bg-[#FF6B35] rounded-full animate-wave-3 h-3" />
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-slate-900 truncate" title={currentSong.title}>
                {currentSong.title}
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <span className="truncate max-w-[90px]">{currentSong.artist}</span>
                <span>•</span>
                <span className="font-mono text-slate-400">{formatTime(currentTime)}</span>
              </div>
            </div>
          </div>

          {/* Compact Controls */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => onToggleLike(currentSong.id)}
              className="p-2 rounded-xl text-slate-400 hover:text-[#FF6B35] active:scale-90 transition-all"
              title="좋아요"
            >
              <Heart className={`w-4 h-4 ${currentSong.likes > 0 ? 'fill-[#FF6B35] text-[#FF6B35]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onPrev}
              className="p-2 rounded-xl text-slate-600 hover:text-[#FF6B35] active:scale-90 transition-all"
              title="이전 곡"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onPlayPause}
              className="w-10 h-10 rounded-full bg-[#FF6B35] hover:bg-[#ff7b4b] text-white flex items-center justify-center shadow-md shadow-orange-300 active:scale-90 transition-all"
              aria-label={isPlaying ? '일시 정지' : '재생'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNext}
              className="p-2 rounded-xl text-slate-600 hover:text-[#FF6B35] active:scale-90 transition-all"
              title="다음 곡"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={onToggleLoop}
              className={`p-2 rounded-xl transition-all ${
                isLooping
                  ? 'text-[#FF6B35] bg-orange-100 font-black'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title={isLooping ? '반복 켜짐' : '반복 꺼짐'}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Desktop Expanded Layout (>= sm) */}
        <div className="hidden sm:flex items-center justify-between gap-4">
          {/* Left: Track Information */}
          <div className="flex items-center gap-3.5 w-1/3 min-w-0">
            <div className="relative w-13 h-13 rounded-2xl overflow-hidden bg-orange-50 border border-orange-200 flex-shrink-0 shadow-md">
              <img
                src={currentSong.coverUrl}
                alt={currentSong.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';
                }}
                className="w-full h-full object-cover"
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-3.5">
                    <span className="w-1 bg-[#FF6B35] rounded-full animate-wave-1 h-3.5" />
                    <span className="w-1 bg-white rounded-full animate-wave-2 h-3.5" />
                    <span className="w-1 bg-[#FF6B35] rounded-full animate-wave-3 h-3.5" />
                  </div>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF6B35] text-[10px] font-black tracking-wider uppercase inline-block mb-0.5">
                {isPlaying ? '재생 중' : '대기 중'}
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-900 truncate" title={currentSong.title}>
                {currentSong.title}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <User className="w-3 h-3 text-[#FF6B35] flex-shrink-0" />
                <span className="truncate">{currentSong.artist}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onToggleLike(currentSong.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-[#FF6B35] hover:bg-orange-50 transition-colors"
                title="좋아요"
              >
                <Heart className={`w-4 h-4 ${currentSong.likes > 0 ? 'fill-[#FF6B35] text-[#FF6B35]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Center: Playback Controls & Time */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleLoop}
                className={`p-2 rounded-xl transition-all ${
                  isLooping
                    ? 'text-[#FF6B35] bg-orange-100 font-black'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={isLooping ? '반복 재생 켜짐' : '반복 재생 꺼짐'}
              >
                <Repeat className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onPrev}
                className="p-2.5 rounded-xl text-slate-500 hover:text-[#FF6B35] hover:bg-orange-50 transition-colors"
                title="이전 곡"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              <button
                type="button"
                onClick={onPlayPause}
                className="w-12 h-12 rounded-full bg-[#FF6B35] hover:bg-[#ff7b4b] text-white flex items-center justify-center shadow-xl shadow-orange-300 hover:scale-105 active:scale-95 transition-all"
                aria-label={isPlaying ? '일시 정지' : '재생'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onNext}
                className="p-2.5 rounded-xl text-slate-500 hover:text-[#FF6B35] hover:bg-orange-50 transition-colors"
                title="다음 곡"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>

              <button
                type="button"
                onClick={() => onSeek(0)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="처음부터 다시 듣기"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Time labels */}
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400">
              <span className="text-slate-800">{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Volume & Extra Controls */}
          <div className="flex items-center justify-end gap-3 w-1/3">
            <button
              type="button"
              onClick={onToggleMute}
              className="p-2.5 rounded-xl text-slate-500 hover:text-[#FF6B35] hover:bg-orange-50 transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#FF6B35]" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-24 h-2 bg-orange-100 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
              title={`볼륨: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
