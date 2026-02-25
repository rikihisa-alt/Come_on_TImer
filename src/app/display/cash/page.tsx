'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';
import { onSync } from '@/lib/sync';
import { unlockAudio } from '@/lib/audio';
import { formatTimerHMS } from '@/lib/utils';
import { CashGame, ThemeConfig } from '@/lib/types';

/* ── Timer Selector dropdown (same style as split page) ── */
function TimerSelector({ selectedId, onSelect, cashGames }: {
  selectedId: string;
  onSelect: (id: string) => void;
  cashGames: CashGame[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const current = cashGames.find(c => c.id === selectedId);
  if (cashGames.length <= 1) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] hover:border-white/[0.15] transition-all duration-200 cursor-pointer">
        <span className="text-[8px] font-bold px-1 rounded bg-green-500/20 text-green-400">C</span>
        <span className="text-[10px] lg:text-xs text-white/50 font-medium truncate max-w-[160px]">{current?.name || '選択'}</span>
        <svg className={`w-2.5 h-2.5 text-white/20 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 min-w-[200px] bg-black/90 backdrop-blur-xl border border-white/[0.1] rounded-lg shadow-2xl overflow-hidden">
          <div className="py-1">
            {cashGames.map(c => (
              <button key={c.id} onClick={() => { onSelect(c.id); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.08] transition-colors ${c.id === selectedId ? 'bg-blue-500/10' : ''}`}>
                <span className="text-xs text-white/60 truncate flex-1">{c.name}</span>
                {c.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />}
                {c.status === 'paused' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                {c.id === selectedId && <svg className="w-3 h-3 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CashDisplayInner() {
  const params = useSearchParams();
  const displayId = params.get('display') || '';
  const targetIdParam = params.get('id') || '';

  const { cashGames, displays, themes, displayToggles } = useStore();

  const assignment = displays.find(d => d.displayId === displayId);
  const defaultTargetId = assignment?.targetId || targetIdParam || cashGames[0]?.id || '';
  const themeId = assignment?.themeId || 'come-on-blue';
  const theme: ThemeConfig | undefined = themes.find(t => t.id === themeId) || themes[0];

  const runningCash = cashGames.filter(c => c.status === 'running' || c.status === 'paused');
  const [selectedId, setSelectedId] = useState(defaultTargetId);
  const activeId = assignment?.targetId || selectedId || defaultTargetId;
  const cashGame: CashGame | undefined = cashGames.find(c => c.id === activeId);

  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const h = () => unlockAudio();
    document.addEventListener('click', h, { once: true });
    document.addEventListener('touchstart', h, { once: true });
    return () => { document.removeEventListener('click', h); document.removeEventListener('touchstart', h); };
  }, []);

  useEffect(() => {
    return onSync((msg) => {
      if (msg.type === 'FULL_SYNC' && msg.payload) {
        const p = msg.payload as Record<string, unknown>;
        if (p.cashGames) useStore.setState({ cashGames: p.cashGames as never });
        if (p.displays) useStore.setState({ displays: p.displays as never });
        if (p.themes) useStore.setState({ themes: p.themes as never });
        if (p.displayToggles) useStore.setState({ displayToggles: p.displayToggles as never });
      }
    });
  }, []);

  useEffect(() => {
    if (!cashGame) return;
    const iv = setInterval(() => {
      if (cashGame.status === 'running' && cashGame.timerStartedAt) {
        const e = Date.now() - cashGame.timerStartedAt;
        setElapsed(cashGame.elapsedMs + e);
        if (cashGame.countdownMode) {
          setCountdown(Math.max(0, cashGame.countdownRemainingMs - e));
        }
      } else {
        setElapsed(cashGame.elapsedMs);
        setCountdown(cashGame.countdownRemainingMs);
      }
    }, 500);
    return () => clearInterval(iv);
  }, [cashGame]);

  const dt = displayToggles;

  if (!cashGame) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
        <div className="text-center space-y-3 text-white/25">
          <p className="text-xl font-bold">No Cash Game</p>
          <p className="text-sm">Operator画面からディスプレイ設定を行ってください</p>
        </div>
      </div>
    );
  }

  const bgStyle = theme?.type === 'gradient'
    ? { background: `linear-gradient(135deg, ${theme.gradientFrom || '#0f172a'}, ${theme.gradientTo || '#1e3a5f'})` }
    : theme?.type === 'image' && theme.imageUrl
    ? { backgroundImage: `url(${theme.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: theme?.bgColor || '#0a0e1a' };

  const primaryColor = theme?.primaryColor || '#60a5fa';
  const isCountdownWarning = cashGame.countdownMode && countdown < 300000 && countdown > 0 && cashGame.status === 'running';

  return (
    <div className="min-h-screen flex flex-col select-none overflow-hidden relative" style={bgStyle}>
      {theme && theme.overlayOpacity > 0 && (
        <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: theme.overlayOpacity / 100 }} />
      )}

      {/* ═══ TOP BANNER: Logo + Selector + Cash Game Name ═══ */}
      <div className="relative z-10 flex items-center px-3 md:px-5 py-2 md:py-3 bg-black/30 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm md:text-base font-black text-blue-400 tracking-tight">COME ON</span>
          <span className="text-white/20 font-medium text-[10px] md:text-xs">Timer</span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-3">
          <TimerSelector selectedId={activeId} onSelect={setSelectedId} cashGames={cashGames} />
          {cashGames.length <= 1 && <span className="text-base md:text-xl lg:text-2xl font-bold text-white/70 tracking-wide">{cashGame.name}</span>}
        </div>
        <div className="text-xs md:text-sm text-white/25 font-medium shrink-0 uppercase tracking-wider">Cash Game</div>
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 gap-4 md:gap-6">
        {dt.showCashRate && (
          <div className="text-white/15 text-sm md:text-base font-semibold tracking-[0.3em] uppercase">Rate</div>
        )}

        {dt.showCashRate && (
          <div className="text-center fade-in">
            <div className="text-5xl md:text-7xl lg:text-[9vw] font-black leading-none tracking-tight" style={{ color: primaryColor }}>
              {cashGame.smallBlind.toLocaleString()} / {cashGame.bigBlind.toLocaleString()}
            </div>
            {cashGame.ante > 0 && (
              <div className="text-lg md:text-2xl text-white/25 font-semibold mt-1">
                Ante {cashGame.ante.toLocaleString()}
              </div>
            )}
          </div>
        )}

        {dt.showCashMemo && cashGame.memo && (
          <div className="glass-sm px-5 py-2.5 text-base md:text-lg text-white/35 font-medium text-center max-w-md">
            {cashGame.memo}
          </div>
        )}

        {dt.showCashTimer && (
          <div className="text-center space-y-1 mt-2">
            <div className="text-[10px] text-white/15 uppercase tracking-widest font-medium">
              {cashGame.countdownMode ? 'Remaining' : 'Session Time'}
            </div>
            <div className={`text-4xl md:text-6xl font-black timer-font leading-none transition-colors duration-300 ${
              isCountdownWarning ? 'text-amber-400 warning-pulse' : 'text-white/45'
            }`}>
              {cashGame.countdownMode ? formatTimerHMS(countdown) : formatTimerHMS(elapsed)}
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 flex items-center justify-center gap-6 md:gap-12 px-4 py-3 bg-black/20 border-t border-white/[0.04] flex-wrap">
        <div className="text-center">
          <div className="text-[8px] md:text-[9px] text-white/15 uppercase tracking-wider">SB</div>
          <div className="text-base font-bold text-white/60">{cashGame.smallBlind.toLocaleString()}</div>
        </div>
        <div className="text-center">
          <div className="text-[8px] md:text-[9px] text-white/15 uppercase tracking-wider">BB</div>
          <div className="text-base font-bold text-white/60">{cashGame.bigBlind.toLocaleString()}</div>
        </div>
        {cashGame.ante > 0 && (
          <div className="text-center">
            <div className="text-[8px] md:text-[9px] text-white/15 uppercase tracking-wider">Ante</div>
            <div className="text-base font-bold text-white/60">{cashGame.ante.toLocaleString()}</div>
          </div>
        )}
      </footer>

      {/* Ticker */}
      {dt.tickerText && (
        <div className="relative z-10 w-full py-1.5 bg-black/30 border-t border-white/[0.04] overflow-hidden">
          <div className="ticker-container">
            <span className="ticker-scroll text-xs md:text-sm font-medium text-white/35 px-4">
              {dt.tickerText}
            </span>
          </div>
        </div>
      )}

      {cashGame.status === 'idle' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="text-center space-y-4 fade-in-up">
            <div className="text-4xl md:text-6xl font-black text-blue-400 glow-pulse">COME ON Timer</div>
            <div className="text-lg md:text-xl text-white/20 font-medium">Cash Game Ready</div>
          </div>
        </div>
      )}

      {cashGame.status === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="text-3xl md:text-5xl font-black text-white/40 tracking-widest animate-pulse">PAUSED</div>
        </div>
      )}
    </div>
  );
}

export default function CashDisplayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#0a0e1a' }} />}>
      <CashDisplayInner />
    </Suspense>
  );
}
