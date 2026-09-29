import React, { useState } from 'react';
import { X, FileText, Copy, Check, Play, Pause, Music, Sparkles, User, Calendar } from 'lucide-react';
import { Song } from '../types';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  isPlaying?: boolean;
  onPlay?: (song: Song) => void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  isOpen,
  onClose,
  song,
  isPlaying = false,
  onPlay,
}) => {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');

  if (!isOpen || !song) return null;

  const hasLyrics = Boolean(song.lyrics && song.lyrics.trim().length > 0);

  const handleCopy = async () => {
    if (!song.lyrics) return;
    try {
      await navigator.clipboard.writeText(song.lyrics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[88vh] bg-white rounded-[32px] sm:rounded-[36px] shadow-2xl shadow-orange-950/25 border border-orange-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-orange-100/80 bg-[#FFF9F5] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-2xl overflow-hidden bg-orange-100 border border-orange-200 flex-shrink-0 shadow-sm">
              <img
                src={song.coverUrl}
                alt={song.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';
                }}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-[#FF6B35] text-[10px] sm:text-[11px] font-black uppercase">
                  <FileText className="w-3 h-3" />
                  <span>전체 가사보기</span>
                </span>
                {song.tags && song.tags[0] && (
                  <span className="text-[10px] text-slate-400 font-bold hidden sm:inline">
                    #{song.tags[0]}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate" title={song.title}>
                {song.title}
              </h2>
              <p className="text-xs text-slate-500 font-semibold truncate flex items-center gap-1">
                <User className="w-3 h-3 text-[#FF6B35]" />
                <span>{song.artist}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onPlay && (
              <button
                type="button"
                onClick={() => onPlay(song)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FF6B35] hover:bg-[#ff7b4b] text-white flex items-center justify-center shadow-md shadow-orange-300 hover:scale-105 active:scale-95 transition-all"
                title={isPlaying ? '일시정지' : '듣기'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-orange-100 text-slate-400 hover:text-[#FF6B35] flex items-center justify-center transition-colors"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 sm:px-7 py-2.5 bg-orange-50/50 border-b border-orange-50 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400">글자 크기:</span>
            <div className="flex items-center bg-white rounded-lg p-0.5 border border-orange-100 shadow-2xs">
              <button
                type="button"
                onClick={() => setFontSize('normal')}
                className={`px-2 py-0.5 rounded text-[11px] font-black transition-all ${
                  fontSize === 'normal'
                    ? 'bg-[#FF6B35] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                보통
              </button>
              <button
                type="button"
                onClick={() => setFontSize('large')}
                className={`px-2 py-0.5 rounded text-[11px] font-black transition-all ${
                  fontSize === 'large'
                    ? 'bg-[#FF6B35] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                크게
              </button>
            </div>
          </div>

          {hasLyrics && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-orange-100/80 border border-orange-100 text-slate-700 text-[11px] font-bold shadow-2xs transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-black">가사 복사됨!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>가사 복사</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Lyrics Content (Scrollable) */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 scrollbar-thin">
          {hasLyrics ? (
            <div
              className={`font-sans font-medium text-slate-800 whitespace-pre-wrap transition-all leading-loose select-text ${
                fontSize === 'large' ? 'text-base sm:text-lg' : 'text-sm sm:text-base'
              }`}
            >
              {song.lyrics}
            </div>
          ) : (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#FF6B35] flex items-center justify-center mx-auto shadow-sm">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-800">등록된 가사가 없습니다</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                이 곡은 가사 없이 업로드되었거나 연주곡(인스트루멘탈)일 수 있습니다.
              </p>
              {song.description && (
                <div className="mt-4 p-4 rounded-2xl bg-[#FFF9F5] border border-orange-100/80 text-xs text-slate-700 max-w-md mx-auto italic font-medium">
                  "{song.description}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-orange-50 bg-[#FFF9F5] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
            <Calendar className="w-3 h-3" />
            <span>등록일: {song.createdAt}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
