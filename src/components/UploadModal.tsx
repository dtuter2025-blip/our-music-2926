import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Music,
  Image as ImageIcon,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  Play,
  CloudUpload,
  CheckCircle2,
} from 'lucide-react';
import { Song } from '../types';
import { uploadAndSaveSong } from '../utils/audioStorage';

export const SUGGESTED_GENRES = [
  '발라드',
  '팝',
  '힙합',
  '어쿠스틱',
  'R&B',
  '댄스',
  '재즈',
  '록',
  '인디',
  '시티팝',
  'EDM',
  '피아노/연주곡',
  'OST',
  '트로트',
];

export const GENRES = SUGGESTED_GENRES;

interface UploadModalProps {
  isOpen: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  onSongCreated?: (newSong: Song) => void;
  // Kept for backward compatibility
  onAddSong?: (
    newSong: Omit<Song, 'id' | 'likes'>,
    onProgress?: (msg: string) => void
  ) => Promise<void> | void;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80', // 1. 스튜디오 마이크
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', // 2. 청량한 에메랄드 바다
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80', // 3. DJ 콘솔 네온
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=600&q=80', // 4. 어쿠스틱 기타
  'https://images.unsplash.com/photo-1513883049090-d0b7439799bf?auto=format&fit=crop&w=600&q=80', // 5. 그랜드 피아노
  'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=600&q=80', // 6. 오케스트라 바이올린
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80', // 7. 화려한 콘서트 파티
  'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=600&q=80', // 8. 뮤직 페스티벌 조명
  'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80', // 9. 힐링 헤드폰
  'https://images.unsplash.com/photo-1487180144351-b8472da7d491?auto=format&fit=crop&w=600&q=80', // 10. 레트로 카세트
];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  isAdmin = true,
  onClose,
  onSongCreated,
  onAddSong,
}) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [tag, setTag] = useState('발라드');

  // Cover image state
  const [coverUrl, setCoverUrl] = useState(PRESET_COVERS[0]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverFileName, setCoverFileName] = useState('');

  // Audio file state (Raw File, NEVER Base64!)
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [audioFileSize, setAudioFileSize] = useState<string>('');

  // Upload status and progress
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('Firebase Cloud Storage 연결 중...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdSong, setCreatedSong] = useState<Song | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Direct Audio File Selection (no base64 FileReader!)
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !file.type.startsWith('audio/') &&
      !file.name.toLowerCase().endsWith('.mp3') &&
      !file.name.toLowerCase().endsWith('.wav') &&
      !file.name.toLowerCase().endsWith('.m4a')
    ) {
      setError('MP3 또는 오디오 파일 형식만 업로드 가능합니다.');
      return;
    }

    setError('');
    setAudioFile(file);
    setAudioFileName(file.name);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setAudioFileSize(`${sizeMb} MB`);
  };

  // Direct Image File Selection
  const handleCoverFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('이미지 파일 형식만 커버로 등록할 수 있습니다.');
      return;
    }

    setError('');
    setCoverFile(file);
    setCoverFileName(file.name);
    setCoverUrl(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setDescription('');
    setLyrics('');
    setTag('발라드');
    setCoverUrl(PRESET_COVERS[0]);
    setCoverFile(null);
    setCoverFileName('');
    setAudioFile(null);
    setAudioFileName('');
    setAudioFileSize('');
    setError('');
    setIsSubmitting(false);
    setUploadProgress(0);
    setIsSuccess(false);
    setCreatedSong(null);
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing mid-upload
    resetForm();
    onClose();
  };

  /**
   * Sequential Upload Process:
   * 1. Upload raw MP3 to Firebase Cloud Storage
   * 2. Obtain Download URL from Storage
   * 3. Package lyrics, description, and Download URL into Firestore
   * 4. Display success confirmation to user
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      setError('관리자 권한이 있는 사용자만 음원을 업로드할 수 있습니다.');
      return;
    }

    if (!title.trim()) {
      setError('곡 제목을 입력해주세요.');
      return;
    }
    if (!artist.trim()) {
      setError('작성자(학생 이름 또는 학급)를 입력해주세요.');
      return;
    }
    if (!audioFile) {
      setError('MP3 음원 파일을 등록해주세요.');
      return;
    }
    if (!tag.trim()) {
      setError('장르 태그를 입력해주세요 (직접 입력 또는 추천 태그 클릭).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setUploadProgress(5);
      setUploadStatus('1/3: Firebase Cloud Storage에 MP3 고속 업로드 준비 중...');

      // Execute sequential Cloud Storage -> Download URL -> Firestore flow
      const savedSong = await uploadAndSaveSong(
        {
          audioFile,
          coverFile,
          presetCoverUrl: coverFile ? coverUrl : coverUrl || PRESET_COVERS[0],
          title: title.trim(),
          artist: artist.trim(),
          description: description.trim(),
          lyrics: lyrics.trim(),
          tag: tag.trim(),
        },
        (progressPercent, statusMsg) => {
          setUploadProgress(progressPercent);
          setUploadStatus(statusMsg);
        }
      );

      // Notify parent / backward compatibility
      if (onAddSong) {
        onAddSong(savedSong);
      }

      setCreatedSong(savedSong);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Upload sequence error:', err);
      setError('음원 업로드 중 오류가 발생했습니다: ' + (err.message || '다시 시도해주세요.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayNow = () => {
    if (createdSong && onSongCreated) {
      onSongCreated(createdSong);
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white rounded-[36px] shadow-2xl shadow-orange-950/20 border border-orange-100 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-orange-50 bg-[#FFF9F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B35] text-white flex items-center justify-center shadow-lg shadow-orange-200">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                {isSuccess ? '업로드 완료' : '새 곡 클라우드 업로드'}
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                {isSuccess
                  ? 'Cloud Storage 및 Firestore에 정상 등록되었습니다'
                  : 'Firebase Cloud Storage 고속 저장 및 실시간 스트리밍'}
              </p>
            </div>
          </div>
          {!isSubmitting && (
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-orange-100 text-slate-400 hover:text-[#FF6B35] flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 4. SUCCESS SCREEN: 모두 완료되면 성공 메시지를 띄워줄 것 */}
        {isSuccess && createdSong ? (
          <div className="p-8 space-y-6 text-center animate-fadeIn">
            <div className="relative w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-200/50">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
              <Sparkles className="w-5 h-5 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                음원 등록이 완료되었습니다!
              </h3>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                MP3 파일이 <strong className="text-emerald-700">Firebase Cloud Storage</strong>에 안전하게 보관되었으며,
                가사 및 정보가 실시간 데이터베이스에 동기화되었습니다.
              </p>
            </div>

            {/* Song Preview Card */}
            <div className="bg-[#FFF9F5] p-4.5 rounded-3xl border border-orange-100/90 text-left flex items-center gap-4 shadow-sm">
              <img
                src={createdSong.coverUrl}
                alt={createdSong.title}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover shadow-md flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF6B35] text-[10px] font-black uppercase">
                  #{createdSong.tags?.[0] || '자작곡'}
                </span>
                <h4 className="text-sm sm:text-base font-black text-slate-900 truncate mt-0.5">
                  {createdSong.title}
                </h4>
                <p className="text-xs text-slate-500 font-bold truncate">
                  작성자: {createdSong.artist}
                </p>
                {createdSong.lyrics && (
                  <p className="text-[11px] text-teal-700 font-semibold flex items-center gap-1 mt-1">
                    <FileText className="w-3 h-3 text-teal-600" />
                    <span>가사 등록 완료</span>
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-100 transition-colors"
              >
                추가로 등록하기
              </button>
              <button
                type="button"
                onClick={handlePlayNow}
                className="w-full sm:flex-1 py-3 rounded-2xl bg-[#FF6B35] hover:bg-[#ff7b4b] text-white text-xs font-black shadow-lg shadow-orange-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>지금 감상하기</span>
              </button>
            </div>
          </div>
        ) : (
          /* MAIN UPLOAD FORM */
          <form onSubmit={handleSubmit} className="p-7 space-y-5">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Cloud Storage Pipeline Architecture Notice */}
            <div className="p-3.5 rounded-2xl bg-[#004E64] text-white text-xs flex items-center justify-between gap-3 shadow-md shadow-teal-950/20">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0 animate-pulse" />
                <span className="font-medium text-teal-100 text-[11.5px] leading-snug">
                  MP3 파일은 <strong>Firebase Cloud Storage</strong>에 다이렉트 고속 업로드되며, 발급된 Download URL과 가사가 실시간 DB에 저장됩니다.
                </span>
              </div>
            </div>

            {/* Loading / Progress Indicator when uploading */}
            {isSubmitting && (
              <div className="p-4.5 rounded-2xl bg-orange-50/80 border border-orange-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-black text-slate-800">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#FF6B35]" />
                    <span>{uploadStatus}</span>
                  </div>
                  <span className="font-mono text-[#FF6B35]">{uploadProgress}%</span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full h-2.5 bg-orange-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF6B35] to-[#ff9767] rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(uploadProgress, 6)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>1. Storage 업로드</span>
                  <span>2. URL 발급</span>
                  <span>3. DB 저장</span>
                </div>
              </div>
            )}

            {/* 1. Song Title */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                곡 제목 <span className="text-[#FF6B35]">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 우리들의 여름방학, 숲속의 멜로디"
                className="w-full px-4 py-3 rounded-2xl bg-[#FFF9F5] border border-orange-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:bg-white transition-all text-slate-900 disabled:opacity-60"
              />
            </div>

            {/* 2. Artist */}
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                작성자 (학생 이름 / 학급) <span className="text-[#FF6B35]">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="예: 김통영/101200"
                className="w-full px-4 py-3 rounded-2xl bg-[#FFF9F5] border border-orange-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:bg-white transition-all text-slate-900 disabled:opacity-60"
              />
            </div>

            {/* 3. Audio & Cover Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* MP3 File Box (Direct File Object) */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  MP3 파일 <span className="text-[#FF6B35]">*</span>
                </label>
                <input
                  ref={audioInputRef}
                  type="file"
                  disabled={isSubmitting}
                  accept="audio/*,.mp3,.wav,.m4a"
                  onChange={handleAudioFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => !isSubmitting && audioInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] ${
                    audioFileName
                      ? 'border-[#FF6B35] bg-orange-50/60 text-[#FF6B35]'
                      : 'border-orange-200 hover:border-[#FF6B35] bg-orange-50/40 hover:bg-orange-50 text-slate-600'
                  } ${isSubmitting ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  {audioFileName ? (
                    <div className="space-y-1">
                      <Check className="w-5 h-5 mx-auto text-emerald-600" />
                      <p className="text-xs font-black text-slate-800 truncate max-w-[170px]">
                        {audioFileName}
                      </p>
                      <p className="text-[10px] text-[#FF6B35] font-bold">
                        {audioFileSize} • Cloud Storage 업로드 준비 완료
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 mx-auto text-[#FF6B35]" />
                      <p className="text-xs font-black text-slate-700">MP3 파일 선택</p>
                      <p className="text-[10px] text-slate-400">클릭하여 파일 첨부</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cover Upload Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    커버 사진
                  </label>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => imageInputRef.current?.click()}
                    className="text-[11px] text-[#FF6B35] hover:underline font-black flex items-center gap-1 disabled:opacity-50"
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>내 사진 첨부</span>
                  </button>
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  disabled={isSubmitting}
                  accept="image/*"
                  onChange={handleCoverFileUpload}
                  className="hidden"
                />

                <div className="relative rounded-2xl overflow-hidden border-2 border-orange-100 aspect-video sm:aspect-auto sm:h-[110px] bg-slate-100 flex items-center justify-center">
                  <img
                    src={coverUrl}
                    alt="Selected cover preview"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PRESET_COVERS[0];
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="text-white text-[11px] font-black px-2 py-1 bg-black/50 backdrop-blur-xs rounded-full">
                      {coverFileName ? '사용자 지정 사진' : '추천 앨범 아트'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Preset covers picker */}
            <div>
              <span className="block text-[11px] font-bold text-slate-400 mb-1.5">
                추천 앨범 아트 선택 (10종):
              </span>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {PRESET_COVERS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setCoverUrl(preset);
                      setCoverFile(null);
                      setCoverFileName('');
                    }}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      coverUrl === preset && !coverFileName
                        ? 'border-[#FF6B35] ring-2 ring-orange-400/40 scale-95'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    } disabled:opacity-50`}
                  >
                    <img
                      src={preset}
                      alt={`Preset ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80';
                      }}
                      className="w-full h-full object-cover"
                    />
                    {coverUrl === preset && !coverFileName && (
                      <div className="absolute inset-0 bg-[#FF6B35]/40 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Description & Custom Genre Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  곡 소개 및 소감 (선택)
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="음악 시간에 직접 작곡한 소감을 적어보세요"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FFF9F5] border border-orange-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:bg-white text-slate-900 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                    장르 태그 <span className="text-[#FF6B35]">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">직접 입력 가능</span>
                </div>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="장르를 직접 입력하세요 (예: 발라드, 힙합, Lo-Fi, 어쿠스틱, K-POP, 애니OST)"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#FFF9F5] border border-orange-100 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:bg-white transition-all disabled:opacity-60"
                />

                {/* Quick suggestion tags */}
                <div className="mt-2">
                  <span className="block text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1.5">
                    추천 장르 (클릭 시 자동 입력):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_GENRES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setTag(g)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all ${
                          tag.trim().toLowerCase() === g.toLowerCase()
                            ? 'bg-[#FF6B35] text-white shadow-xs scale-105'
                            : 'bg-orange-50 text-slate-600 hover:bg-orange-100 hover:text-[#FF6B35]'
                        } disabled:opacity-50`}
                      >
                        #{g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Song Lyrics (가사 입력) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#FF6B35]" />
                  <span>노래 가사 (선택)</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">줄바꿈 지원 • 가사보기 연동</span>
              </div>
              <textarea
                rows={4}
                disabled={isSubmitting}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="노래 가사를 입력해주세요. 가사보기 버튼을 통해 등록된 가사 전체가 표시됩니다.&#10;예:&#10;푸른 바다 저 너머로&#10;우리의 꿈이 피어나네..."
                className="w-full px-4 py-3 rounded-2xl bg-[#FFF9F5] border border-orange-100 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:bg-white resize-y transition-all text-slate-900 leading-relaxed placeholder:text-slate-400 disabled:opacity-60"
              />
            </div>

            {/* Modal Submit Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleClose}
                className="px-5 py-3 rounded-2xl border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !audioFile}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-[#FF6B35] hover:bg-[#ff7b4b] text-white text-sm font-black shadow-lg shadow-orange-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{uploadProgress}% 업로드 중...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4" />
                    <span>음원 업로드 시작</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
