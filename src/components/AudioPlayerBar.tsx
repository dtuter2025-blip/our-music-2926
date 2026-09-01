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
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-orange-100 shadow-[0_-10px_35px_rgba(255,107,53,0.1)]">
      {/* Top Interactive Progress Bar with Vibrant Coral Gradient */}
      <div
        ref={progressBarRef}
        onClick={handleProgressBarClick}
        className="group relative w-full h-2.5 bg-orange-100/60 hover:h-3.5 cursor-pointer transition-all flex items-center"
      >
        <div
          className="h-full bg-gradient-to-r from-[#FF6B35] via-[#ff8450] to-[#ffa060] rounded-r-full relative transition-[width] duration-100"
          style={{ width: `${progressPercent}%` }}
        >
          {/* Thumb marker */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-[#FF6B35] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Left: Track Information */}
          <div className="flex items-center gap-3.5 w-full sm:w-1/3 min-w-0">
            <div className="relative w-13 h-13 rounded-2xl overflow-hidden bg-orange-50 border border-orange-200 flex-shrink-0 shadow-md">
              <img
                src={currentSong.coverUrl}
                alt={currentSong.title}
                referrerPolicy="no-referrer"
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
          <div className="flex flex-col items-center gap-1.5 w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={onToggleLoop}
                className={`p-2.5 rounded-xl transition-all ${
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
                className="w-13 h-13 rounded-full bg-[#FF6B35] hover:bg-[#ff7b4b] text-white flex items-center justify-center shadow-xl shadow-orange-300 hover:scale-105 active:scale-95 transition-all"
                aria-label={isPlaying ? '일시 정지' : '재생'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-0.5" />
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
                className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
          <div className="hidden sm:flex items-center justify-end gap-3 w-1/3">
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
