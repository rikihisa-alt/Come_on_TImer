'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-6 pb-mobile"
      style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0f172a 50%, #1e293b 100%)' }}>
      <div className="text-center space-y-3 fade-in-up">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight">
          <span className="text-blue-400">COME ON</span>{' '}
          <span className="text-white/40">Timer</span>
        </h1>
        <p className="text-white/25 text-sm font-medium tracking-wide">Professional Poker Timer System</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs fade-in-up" style={{ animationDelay: '0.1s' }}>
        <Link href="/operator" className="glass text-center py-4 text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
          Operator Panel
        </Link>
        <Link href="/display/tournament" className="glass text-center py-4 text-base font-semibold text-white/50 hover:text-white/80 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
          Tournament Display
        </Link>
        <Link href="/display/cash" className="glass text-center py-4 text-base font-semibold text-white/50 hover:text-white/80 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
          Cash Game Display
        </Link>
      </div>
      <p className="text-white/15 text-xs fade-in" style={{ animationDelay: '0.3s' }}>v2.1</p>
    </div>
  );
}
