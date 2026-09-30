import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Edit3,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  Music,
  User,
  Tag,
  Image as ImageIcon,
} from 'lucide-react';
import { Song } from '../types';
import { SUGGESTED_GENRES } from './UploadModal';
import { updateSongInStorage } from '../utils/audioStorage';

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80', // 스튜디오 마이크
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', // 청량한 바다
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80', // DJ 네온
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=600&q=80', // 기타
  'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&w=600&q=80', // 피아노
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80', // 오케스트라
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80', // 콘서트
  'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=600&q=80', // 페스티벌 조명
  'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80', // 헤드폰
  'https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=600&q=80', // 레트로 카세트
];

interface EditSongModalProps {
  isOpen: boolean;
  song: Song | null;
  onClose: () => void;
  onSongUpdated: (updatedSong: Song) => void;
}

export const EditSongModal: React.FC<EditSongModalProps> = ({
  isOpen,
  song,
  onClose,
  onSongUpdated,
}) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [tag, setTag] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  // Sync form inputs when song changes
  useEffect(() => {
    if (song) {
      setTitle(song.title || '');
      setArtist(song.artist || '');
      setDescription(song.description || '');
      setLyrics(song.lyrics || '');
      setTag(song.tags && song.tags.length > 0 ? song.tags[0] : '발라드');
      setCoverUrl(song.coverUrl || PRESET_COVERS[0]);
      setError('');
      setSuccessToast(false);
    }
  }, [song]);

  if (!isOpen || !song) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('곡 제목을 입력해주세요.');
      return;
    }
    if (!artist.trim()) {
      setError('작성자(학생 이름 또는 학급)를 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const cleanTag = tag.trim().replace(/^#/, '') || '자작곡';

      const updated = await updateSongInStorage(song.id, {
        title: title.trim(),
        artist: artist.trim(),
        description: description.trim(),
        lyrics: lyrics.trim(),
        tags: [cleanTag],
        coverUrl: coverUrl || song.coverUrl,
      });

      setSuccessToast(true);
      onSongUpdated(updated);

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to update song:', err);
      setError('수정 저장 중 오류가 발생했습니다: ' + (err.message || '다시 시도해주세요.'));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] bg-white rounded-[32px] sm:rounded-[36px] shadow-2xl border border-orange-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sm:py-5 border-b border-orange-100/80 bg-[#FFF9F5] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#FF6B35] flex items-center justify-center shadow-inner">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                곡 정보 및 가사 수정
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                오타나 빠진 가사, 설명을 손쉽게 수정하세요
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full hover:bg-orange-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>성공적으로 수정되었습니다!</span>
            </div>
          )}

          {/* Title & Artist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>곡 제목</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 봄날의 기억"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] text-sm font-bold text-slate-800 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>작성자 (학생 이름 또는 학급)</span>
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="예: 2학년 3반 김민준"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] text-sm font-bold text-slate-800 transition-all"
                required
              />
            </div>
          </div>

          {/* Genre Tag */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#FF6B35]" />
              <span>장르 태그</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {SUGGESTED_GENRES.slice(0, 8).map((genreName) => (
                <button
                  key={genreName}
                  type="button"
                  onClick={() => setTag(genreName)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                    tag === genreName
                      ? 'bg-[#FF6B35] text-white shadow-sm shadow-orange-300'
                      : 'bg-orange-50 text-slate-600 hover:bg-orange-100'
                  }`}
                >
                  #{genreName}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="직접 입력하거나 위 태그를 선택하세요"
              className="w-full px-4 py-2 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] text-xs font-bold text-slate-800"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF6B35]" />
              <span>곡 설명 (한 줄 소개)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 봄날에 벚꽃을 보며 느낀 감정을 피아노와 함께 표현한 곡입니다."
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] text-xs font-medium text-slate-800"
            />
          </div>

          {/* Lyrics Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>전체 가사</span>
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                {lyrics.split('\n').filter((l) => l.trim()).length}줄 입력됨
              </span>
            </div>
            <textarea
              rows={6}
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="가사를 입력하거나 오타를 수정하세요 (줄바꿈 가능)&#10;예:&#10;바람이 불어오는 곳으로&#10;그대의 향기가 머무는 곳"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] text-xs leading-relaxed font-mono text-slate-800 resize-none bg-slate-50/50"
            />
          </div>

          {/* Cover Image Preset Selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#FF6B35]" />
              <span>앨범 커버 이미지 변경</span>
            </label>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {PRESET_COVERS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCoverUrl(preset)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    coverUrl === preset
                      ? 'border-[#FF6B35] ring-2 ring-orange-500/40 scale-105 shadow-md'
                      : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <img
                    src={preset}
                    alt={`커버 ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {coverUrl === preset && (
                    <div className="absolute inset-0 bg-[#FF6B35]/40 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-2xl bg-[#FF6B35] hover:bg-[#ff7b4b] text-white text-xs font-black shadow-lg shadow-orange-300 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>수정 저장 중...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>수정 완료</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
