import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, X, KeyRound, Lock, Unlock, Plus, Info } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onLogin: (password: string) => boolean;
  onLogout: () => void;
  onOpenUpload?: () => void;
  notice?: string;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  isAdmin,
  onClose,
  onLogin,
  onLogout,
  onOpenUpload,
  notice,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(password);
    if (success) {
      setPassword('');
      setError(false);
      onClose();
      if (notice && onOpenUpload) {
        onOpenUpload();
      }
    } else {
      setError(true);
      setPassword('');
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl shadow-orange-950/20 border border-orange-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-orange-50 bg-[#FFF9F5]">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white ${isAdmin ? 'bg-emerald-500 shadow-emerald-200' : 'bg-[#004E64] shadow-teal-200'} shadow-md`}>
              {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">관리자 모드</h3>
              <p className="text-[11px] font-bold text-slate-400">
                {isAdmin ? '관리자 권한 활성화됨' : '관리자 비밀번호 입력'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-orange-100 text-slate-400 hover:text-[#FF6B35] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isAdmin ? (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-black">
                  <Unlock className="w-4 h-4" />
                  <span>현재 관리자 모드입니다</span>
                </div>
                <p className="text-[11px] text-emerald-700 font-medium">
                  관리자 권한으로 음원 업로드와 등록된 음원 삭제가 가능합니다.
                </p>
              </div>

              {onOpenUpload && (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenUpload();
                  }}
                  className="w-full py-2.5 rounded-2xl bg-[#FF6B35] hover:bg-[#ff7b4b] text-white text-xs font-black shadow-md shadow-orange-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>새 음원 등록하기</span>
                </button>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    handleClose();
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black shadow-md shadow-rose-200 transition-colors"
                >
                  관리자 모드 끄기
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {notice && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-snug">{notice}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  비밀번호
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    autoFocus
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(false);
                    }}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#FFF9F5] border border-orange-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#004E64] focus:bg-white text-slate-900"
                  />
                </div>
                {error && (
                  <p className="text-[11px] font-bold text-rose-500 mt-1.5 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>비밀번호가 올바르지 않습니다.</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-[#004E64] hover:bg-[#003d4e] text-white text-xs font-black shadow-md shadow-teal-950/20 transition-all"
                >
                  확인
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
