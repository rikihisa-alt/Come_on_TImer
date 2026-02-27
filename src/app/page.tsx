'use client';
import Link from 'next/link';

function NavCard({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} className="g-card p-5 md:p-6 flex flex-col items-center gap-3 text-center hover:bg-white/[0.1] hover:border-white/[0.2] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group">
      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
        {icon}
      </div>
      <div>
        <div className="text-sm md:text-base font-bold text-white/80 group-hover:text-white transition-colors">{title}</div>
        <div className="text-[10px] md:text-xs text-white/30 mt-0.5">{desc}</div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 md:gap-10 p-6"
      style={{ background: 'linear-gradient(160deg, var(--sys-bg-from) 0%, var(--sys-bg-to) 100%)' }}>

      {/* Logo */}
      <div className="text-center space-y-3 fade-in-up">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight">
          <span className="text-blue-400">COME ON</span>{' '}
          <span className="text-white/40">Timer</span>
        </h1>
        <p className="text-white/25 text-sm font-medium tracking-wide">Professional Poker Timer System</p>
      </div>

      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 w-full max-w-2xl fade-in-up" style={{ animationDelay: '0.1s' }}>
        <NavCard href="/operator" title="Operator" desc="管理パネル" icon={
          <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
        } />
        <NavCard href="/display/tournament" title="Tournament" desc="トーナメント" icon={
          <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.013 6.013 0 0 1-2.52.753m0 0a6.006 6.006 0 0 1-2.52-.753" /></svg>
        } />
        <NavCard href="/display/cash" title="Cash Game" desc="キャッシュ" icon={
          <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
        } />
        <NavCard href="/display/split" title="Split View" desc="2画面分割" icon={
          <svg className="w-6 h-6 md:w-7 md:h-7 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15M4.5 19.5h15a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5h-15A1.5 1.5 0 0 0 3 6v12a1.5 1.5 0 0 0 1.5 1.5Z" /></svg>
        } />
      </div>

      <p className="text-white/15 text-xs fade-in" style={{ animationDelay: '0.3s' }}>v2.2</p>
    </div>
  );
}
