'use client';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 p-6"
      style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0f172a 50%, #1e293b 100%)' }}>
      <div className="text-center space-y-2">
        <h1 className="text-5xl md:text-6xl font-black tracking-tight">
          <span className="text-blue-400">COME ON</span>{' '}
          <span className="text-white/40">Timer</span>
        </h1>
        <p className="text-white/25 text-sm font-medium tracking-wide">Professional Poker Timer System</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/operator" className="btn btn-primary text-center py-4 text-base rounded-xl">Operator Panel</Link>
        <Link href="/display/tournament" className="btn btn-ghost text-center py-4 text-base rounded-xl">Tournament Display</Link>
        <Link href="/display/cash" className="btn btn-ghost text-center py-4 text-base rounded-xl">Cash Game Display</Link>
      </div>
      <p className="text-white/15 text-xs">v2.0</p>
    </div>
  );
}
