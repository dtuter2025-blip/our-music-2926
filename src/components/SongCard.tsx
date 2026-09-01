import React from 'react';
import { Play, Pause, Heart, User, Calendar, Volume2, Trash2 } from 'lucide-react';
import { Song } from '../types';

interface SongCardProps {
  song: Song;
  isPlaying: boolean;
  isCurrent: boolean;
  onPlay: (song: Song) => void;
  onToggleLike: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const SongCard: React.FC<SongCardProps> = ({
  song,
  isPlaying,
  isCurrent,
  onPlay,
  onToggleLike,
  onDelete,
}) => {
  const isPlayingThis = isCurrent && isPlaying;

  return (
    <div
      className={`group relative flex flex-col bg-white rounded-[32px] transition-all duration-300 overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-orange-200/50 hover:-translate-y-1.5 ${
        isPlayingThis
          ? 'border-2 border-[#FF6B35] ring-4 ring-orange-500/15 shadow-orange-200/60'
          : isCurrent
          ? 'border-2 border-orange-300 bg-orange-50/20'
          : 'border border-orange-100/90 hover:border-orange-200'
      }`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-square w-full bg-orange-50/40 overflow-hidden p-3 pb-0">
        <div className="relative w-full h-full rounded-[24px] overflow-hidden shadow-inner">
          <img
            src={song.coverUrl}
            alt={song.title}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';
            }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-75 group-hover:opacity-85 transition-opacity" />

          {/* Playing Animated Wave Equalizer Badge */}
          {isPlayingThis && (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#FF6B35] text-white text-[11px] font-black flex items-center gap-1.5 shadow-lg shadow-orange-950/30">
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-white rounded-full animate-wave-1 h-3" />
                <span className="w-0.5 bg-white rounded-full animate-wave-2 h-3" />
                <span className="w-0.5 bg-white rounded-full animate-wave-3 h-3" />
                <span className="w-0.5 bg-white rounded-full animate-wave-4 h-3" />
              </span>
              <span>재생 중</span>
            </div>
          )}

          {/* Date Badge */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md text-slate-100 text-[11px] font-bold flex items-center gap-1">
            <Calendar className="w-3 h-3 text-orange-300" />
            <span>{song.createdAt}</span>
          </div>

          {/* Center Play Button Overlay */}
          <button
            type="button"
            onClick={() => onPlay(song)}
            className={`absolute inset-0 m-auto w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
              isPlayingThis
                ? 'bg-[#FF6B35] text-white scale-100 shadow-orange-500/50'
                : 'bg-white/95 text-slate-900 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 hover:bg-[#FF6B35] hover:text-white hover:scale-110'
            }`}
            aria-label={isPlayingThis ? '일시정지' : '재생'}
          >
            {isPlayingThis ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          {/* Bottom Student Info Overlay on Image */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-1.5 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold max-w-[70%] truncate">
              <User className="w-3.5 h-3.5 text-orange-300 flex-shrink-0" />
              <span className="truncate">{song.artist}</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLike(song.id);
              }}
              className="flex items-center gap-1 bg-black/45 hover:bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-slate-200 hover:text-[#FF6B35] transition-colors"
              title="좋아요"
            >
              <Heart className={`w-3.5 h-3.5 ${song.likes > 0 ? 'fill-[#FF6B35] text-[#FF6B35]' : ''}`} />
              <span>{song.likes}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3
            onClick={() => onPlay(song)}
            className="text-base sm:text-lg font-black text-slate-900 hover:text-[#FF6B35] transition-colors line-clamp-1 cursor-pointer"
            title={song.title}
          >
            {song.title}
          </h3>

          <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1">
            <span className="text-slate-400">작성자:</span>
            <span className="text-slate-800 font-bold">{song.artist}</span>
          </p>

          {song.description && (
            <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed bg-[#FFF9F5] p-2.5 rounded-2xl border border-orange-100/60 font-medium">
              "{song.description}"
            </p>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-4 pt-3.5 border-t border-orange-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {song.tags && song.tags.length > 0 ? (
              <span className="px-3 py-1 rounded-full bg-orange-100 text-[#FF6B35] text-[11px] font-black">
                #{song.tags[0]}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-orange-100 text-[#FF6B35] text-[11px] font-black">
                #학생작곡
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(song.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                title="목록에서 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onPlay(song)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                isPlayingThis
                  ? 'bg-[#FF6B35] text-white shadow-md shadow-orange-300'
                  : 'bg-slate-100 hover:bg-[#FF6B35] hover:text-white text-slate-700'
              }`}
            >
              {isPlayingThis ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                  <span>듣는 중</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>감상하기</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
