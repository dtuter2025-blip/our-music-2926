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
              <p className="text-teal-100/90 text-sm sm:text-base font-medium mt-0.5">
                학생들의 솔직한 이야기에 AI의 감각을 더해 완성한, 생생하고 따뜻한 멜로디를 감상해 보세요.
              </p>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 text-xs text-teal-100 font-bold">
          <Music2 className="w-4 h-4 text-amber-300 animate-bounce" />
          <span>모든 기기에서 실시간으로 함께 듣는 음악</span>
        </div>
      </div>
    </header>
  );
};
