'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';
import { onSync } from '@/lib/sync';
import { unlockAudio } from '@/lib/audio';
import { formatTimerHMS } from '@/lib/utils';
import { CashGame, ThemeConfig } from '@/lib/types';

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

      {/* COME ON Timer branding (mobile) */}
      <div className="md:hidden absolute top-2 left-3 z-30">
        <span className="text-xs font-black text-blue-400/40 tracking-tight">COME ON</span>
        <span className="text-white/10 font-medium text-[9px] ml-1">Timer</span>
      </div>

      {runningCash.length > 1 && (
        <div className="relative z-20 flex justify-center py-2 bg-black/20">
          <div className="tab-bar">
            {runningCash.map(rc => (
              <div key={rc.id} className={`tab-item ${rc.id === activeId ? 'active' : ''}`} onClick={() => setSelectedId(rc.id)}>
                {rc.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <header className="relative z-10 flex items-center justify-between px-5 md:px-8 py-2.5 bg-black/20 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-base md:text-lg font-black text-blue-400 tracking-tight">COME ON</span>
          <span className="hidden md:inline text-white/20 font-medium text-xs">Timer</span>
          <span className="text-white/25 text-sm md:ml-3 font-medium">{cashGame.name}</span>
        </div>
        <div className="text-xs text-white/15 font-medium tracking-wider uppercase">Cash Game</div>
      </header>

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
