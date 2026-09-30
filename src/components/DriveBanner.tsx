import React from 'react';
import { Sparkles, Disc3, Music2 } from 'lucide-react';

interface DriveBannerProps {
  totalSongs: number;
}

export const DriveBanner: React.FC<DriveBannerProps> = ({ totalSongs }) => {
  return (
    <header className="relative overflow-hidden rounded-[36px] bg-[#004E64] text-white shadow-2xl shadow-teal-950/20 border border-teal-700/30 mb-8 p-6 sm:p-9">
      {/* Background Decorative Vibrant Shapes */}
      <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#FF6B35] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute left-1/3 -bottom-20 w-64 h-64 rounded-full bg-cyan-400 opacity-15 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-teal-100 text-xs font-black tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="text-teal-200 font-bold">{totalSongs}곡 실시간 공유 중</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FF6B35] flex items-center justify-center shadow-xl shadow-orange-950/30 text-white flex-shrink-0">
              <Disc3 className="w-8 h-8 animate-spin-slow" />
            </div>
            <div>
              <p className="text-xs font-bold text-teal-200 tracking-wider uppercase">Vibrant Youth Sounds</p>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                우리들의 이야기
              </h1>
            </div>
          </div>

          <div className="space-y-2.5 text-teal-100/90 text-sm sm:text-[15px] font-normal leading-relaxed border-t border-white/10 pt-3">
            <p className="font-semibold text-white/95">
              열일곱의 계절, &apos;학교&apos;와 &apos;우리 반&apos;은 아이들에게 어떤 의미로 남겨질까요?
            </p>
            <p className="text-teal-100/85">
              매일 겪는 오늘 하루와 말 못 할 고민들, 그리고 과거의 나와 미래의 나에게 건네는 진솔한 고백까지. 아이들이 직접 적어 내려간 솔직한 노랫말 위에 AI의 감각적인 선율을 얹어 하나의 다이어리 같은 음악을 완성했습니다.
            </p>
            <p className="text-teal-200/90">
              그 시절을 지나는 아이들의 진솔한 숨결이 담긴 이 곡들이, 누군가에게는 따뜻한 위로가 되고 또 누군가에게는 잊고 있던 청춘의 한 페이지를 떠올리는 아련한 선율이 되기를 바랍니다.
            </p>
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-xs text-teal-100 font-bold flex-shrink-0 self-start lg:self-center">
          <Music2 className="w-4 h-4 text-amber-300 animate-bounce" />
          <span>모든 기기에서 실시간으로 함께 듣는 음악</span>
        </div>
      </div>
    </header>
  );
};
