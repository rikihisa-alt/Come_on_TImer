'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';
import { onSync } from '@/lib/sync';
import { unlockAudio } from '@/lib/audio';
import { formatTimerHMS } from '@/lib/utils';
import { CashGame, ThemeConfig, DisplayToggles, CashSectionLayout } from '@/lib/types';
import { DEFAULT_DISPLAY_TOGGLES, DEFAULT_CASH_SECTION_LAYOUT } from '@/lib/presets';
import { FullscreenButton } from '@/components/FullscreenButton';
import { AbsoluteSection } from '@/components/AbsoluteSection';
import { DisplayWrapper } from '@/components/DisplayWrapper';

/* ── Timer Selector dropdown ── */
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] hover:border-white/[0.2] transition-all duration-200 cursor-pointer min-w-[140px]">
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-green-500/20 text-green-400">R</span>
        <span className="text-[10px] lg:text-xs text-white/60 font-medium truncate max-w-[160px]">{current?.name || '選択'}</span>
        <svg className={`w-2.5 h-2.5 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 min-w-[220px] g-card p-1.5 overflow-hidden">
          {cashGames.map(c => (
            <button key={c.id} onClick={() => { onSelect(c.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.08] transition-colors ${c.id === selectedId ? 'bg-white/[0.06]' : ''}`}>
              <span className="text-xs text-white/70 truncate flex-1">{c.name}</span>
              {c.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />}
              {c.status === 'paused' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
              {c.id === selectedId && <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CashDisplayInner() {
  const params = useSearchParams();
  const displayId = params.get('display') || '';
  const targetIdParam = params.get('id') || params.get('timer') || '';
  const themeParam = params.get('theme') || '';

  const { cashGames, displays, themes, displayToggles: globalToggles, defaultThemeId } = useStore();

  const assignment = displays.find(d => d.displayId === displayId);
  const defaultTargetId = assignment?.targetId || targetIdParam || cashGames[0]?.id || '';

  const [selectedId, setSelectedId] = useState(defaultTargetId);
  const activeId = assignment?.targetId || selectedId || defaultTargetId;
  const cashGame: CashGame | undefined = cashGames.find(c => c.id === activeId);
  const themeId = themeParam || cashGame?.themeId || assignment?.themeId || defaultThemeId || 'come-on-blue';
  const theme: ThemeConfig | undefined = themes.find(t => t.id === themeId) || themes[0];

  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [preLevelMs, setPreLevelMs] = useState(0);

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
        if (p.defaultThemeId) useStore.setState({ defaultThemeId: p.defaultThemeId as never });
        if (p.systemStyle) useStore.setState({ systemStyle: p.systemStyle as never });
      }
    });
  }, []);

  useEffect(() => {
    if (!cashGame) return;
    setPreLevelMs(cashGame.preLevelRemainingMs);
    const iv = setInterval(() => {
      if (cashGame.status === 'running' && cashGame.timerStartedAt) {
        const e = Date.now() - cashGame.timerStartedAt;
        if (cashGame.preLevelRemainingMs > 0) {
          const rem = Math.max(0, cashGame.preLevelRemainingMs - e);
          setPreLevelMs(rem);
          if (rem <= 0) useStore.getState().cEndPreLevel(cashGame.id);
        } else {
          setElapsed(cashGame.elapsedMs + e);
          if (cashGame.countdownMode) setCountdown(Math.max(0, cashGame.countdownRemainingMs - e));
        }
      } else {
        setElapsed(cashGame.elapsedMs);
        setCountdown(cashGame.countdownRemainingMs);
        setPreLevelMs(cashGame.preLevelRemainingMs);
      }
    }, 500);
    return () => clearInterval(iv);
  }, [cashGame]);

  if (!cashGame) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0e1c36, #152d52, #1c3d6e)' }}>
        <div className="g-card p-8 text-center text-white/40">
          <p className="text-xl font-bold">No Ring Game</p>
          <p className="text-sm mt-2 text-white/25">Operator画面からディスプレイ設定を行ってください</p>
        </div>
      </div>
    );
  }

  const dt = cashGame.displayToggles || globalToggles;
  const tickerSpeed = dt.tickerSpeed || 25;

  const bgStyle = theme?.type === 'gradient'
    ? { background: `linear-gradient(160deg, ${theme.gradientFrom || '#0e1c36'}, ${theme.gradientTo || '#1c3d6e'})` }
    : theme?.type === 'image' && theme.imageUrl
    ? { backgroundImage: `url(${theme.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(160deg, #0e1c36 0%, #152d52 50%, #1c3d6e 100%)' };

  const primaryColor = theme?.primaryColor || '#60a5fa';
  const isCountdownWarning = cashGame.countdownMode && countdown < 300000 && countdown > 0 && cashGame.status === 'running';
  const layout = cashGame.sectionLayout || DEFAULT_CASH_SECTION_LAYOUT;

  return (
    <DisplayWrapper bgStyle={bgStyle} className="flex flex-col select-none relative">
      {theme && theme.overlayOpacity > 0 && (
        <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: theme.overlayOpacity / 100 }} />
      )}
      {(theme?.type === 'image' && theme.imageUrl) && (
        <div className="absolute inset-0 bg-black/50 pointer-events-none z-[1]" />
      )}

      {/* ═══ Glass Top Bar ═══ */}
      <div className="relative z-50 flex items-center px-4 md:px-6 py-2.5 md:py-3" style={{ background: 'var(--sys-bg-from, #0e1c36)' }}>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm md:text-base font-black text-blue-400 tracking-tight">COME ON</span>
          <span className="text-white/25 font-medium text-[10px] md:text-xs">Timer</span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-2 md:gap-3 min-w-0">
          <TimerSelector selectedId={activeId} onSelect={setSelectedId} cashGames={cashGames} />
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <div className="text-xs md:text-sm text-white/30 font-medium uppercase tracking-wider">Ring Game</div>
        </div>
      </div>

      {/* Fullscreen button (below top bar, right) */}
      <div className="absolute top-14 right-3 z-20">
        <FullscreenButton />
      </div>

      {/* ═══ Desktop: Absolute Section Layout ═══ */}
      <div className="absolute inset-0 z-10 hidden md:block">
        {/* Cash Name */}
        <AbsoluteSection pos={layout.cashName}>
          <div className="h-full flex items-center justify-center">
            <span className="font-black text-white/70 tracking-wide truncate" style={{ fontSize: '2em' }}>{cashGame.name}</span>
          </div>
        </AbsoluteSection>

        {/* Rate */}
        {dt.showCashRate && (
          <AbsoluteSection pos={layout.rate}>
            <div className="g-card h-full flex flex-col items-center justify-center p-4">
              <div className="text-white/25 text-xs font-semibold tracking-[0.3em] uppercase mb-2">Rate</div>
              <div className="text-5xl lg:text-7xl font-black leading-none tracking-tight" style={{ color: primaryColor }}>
                {cashGame.smallBlind.toLocaleString()} / {cashGame.bigBlind.toLocaleString()}
              </div>
              {cashGame.ante > 0 && (
                <div className="text-lg text-white/30 font-semibold mt-2">Ante {cashGame.ante.toLocaleString()}</div>
              )}
            </div>
          </AbsoluteSection>
        )}

        {/* Memo */}
        {dt.showCashMemo && cashGame.memo && (
          <AbsoluteSection pos={layout.memo}>
            <div className="g-card-inner h-full flex items-center justify-center px-4">
              <span className="text-base text-white/40 font-medium text-center">{cashGame.memo}</span>
            </div>
          </AbsoluteSection>
        )}

        {/* Timer */}
        {dt.showCashTimer && (
          <AbsoluteSection pos={layout.timer}>
            <div className="g-card h-full flex flex-col items-center justify-center p-4">
              <div className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2">
                {cashGame.countdownMode ? 'Remaining' : 'Session Time'}
              </div>
              <div className={`text-4xl lg:text-6xl font-black timer-font leading-none transition-colors duration-300 ${isCountdownWarning ? 'text-amber-400 warning-pulse' : 'text-white/50'}`}>
                {cashGame.countdownMode ? formatTimerHMS(countdown) : formatTimerHMS(elapsed)}
              </div>
            </div>
          </AbsoluteSection>
        )}

        {/* SB / BB / Ante cards */}
        {dt.showCashRate && (
          <>
            <AbsoluteSection pos={layout.sbCard}>
              <div className="g-card-inner h-full flex flex-col items-center justify-center">
                <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-1">SB</div>
                <div className="text-lg lg:text-2xl font-bold text-white/70 timer-font">{cashGame.smallBlind.toLocaleString()}</div>
              </div>
            </AbsoluteSection>
            <AbsoluteSection pos={layout.bbCard}>
              <div className="g-card-inner h-full flex flex-col items-center justify-center">
                <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-1">BB</div>
                <div className="text-lg lg:text-2xl font-bold text-blue-400 timer-font">{cashGame.bigBlind.toLocaleString()}</div>
              </div>
            </AbsoluteSection>
            {cashGame.ante > 0 && (
              <AbsoluteSection pos={layout.anteCard}>
                <div className="g-card-inner h-full flex flex-col items-center justify-center">
                  <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-1">Ante</div>
                  <div className="text-lg lg:text-2xl font-bold text-white/70 timer-font">{cashGame.ante.toLocaleString()}</div>
                </div>
              </AbsoluteSection>
            )}
          </>
        )}

        {/* Ticker */}
        {dt.tickerText && (
          <AbsoluteSection pos={layout.ticker}>
            <div className="g-ticker h-full flex items-center overflow-hidden">
              <div className="ticker-container">
                <span className="ticker-scroll text-lg lg:text-xl font-semibold text-white/40 px-4" style={{ animationDuration: `${tickerSpeed}s` }}>{dt.tickerText}</span>
              </div>
            </div>
          </AbsoluteSection>
        )}
      </div>

      {/* ═══ Mobile: Flex Layout ═══ */}
      <main className="relative z-10 flex-1 flex md:hidden flex-col items-center justify-center p-3 gap-3">
        {dt.showCashRate && (
          <div className="g-card w-full p-5 text-center">
            <div className="text-white/25 text-xs font-semibold tracking-[0.3em] uppercase mb-3">Rate</div>
            <div className="text-5xl font-black leading-none tracking-tight" style={{ color: primaryColor }}>
              {cashGame.smallBlind.toLocaleString()} / {cashGame.bigBlind.toLocaleString()}
            </div>
            {cashGame.ante > 0 && <div className="text-lg text-white/30 font-semibold mt-2">Ante {cashGame.ante.toLocaleString()}</div>}
          </div>
        )}
        {dt.showCashMemo && cashGame.memo && (
          <div className="g-card-inner px-5 py-3 text-base text-white/40 font-medium text-center">{cashGame.memo}</div>
        )}
        {dt.showCashTimer && (
          <div className="g-card w-full p-4 text-center">
            <div className="text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-2">{cashGame.countdownMode ? 'Remaining' : 'Session Time'}</div>
            <div className={`text-4xl font-black timer-font leading-none ${isCountdownWarning ? 'text-amber-400 warning-pulse' : 'text-white/50'}`}>
              {cashGame.countdownMode ? formatTimerHMS(countdown) : formatTimerHMS(elapsed)}
            </div>
          </div>
        )}
        <div className="flex gap-2.5 w-full">
          <div className="g-card-inner flex-1 p-3 text-center">
            <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-1">SB</div>
            <div className="text-lg font-bold text-white/70 timer-font">{cashGame.smallBlind.toLocaleString()}</div>
          </div>
          <div className="g-card-inner flex-1 p-3 text-center">
            <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-1">BB</div>
            <div className="text-lg font-bold text-blue-400 timer-font">{cashGame.bigBlind.toLocaleString()}</div>
          </div>
          {cashGame.ante > 0 && (
            <div className="g-card-inner flex-1 p-3 text-center">
              <div className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-1">Ante</div>
              <div className="text-lg font-bold text-white/70 timer-font">{cashGame.ante.toLocaleString()}</div>
            </div>
          )}
        </div>
      </main>

      {/* ═══ Overlays ═══ */}
      {/* Pre-level countdown */}
      {cashGame.status === 'running' && preLevelMs > 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center g-overlay-idle">
          <div className="g-card p-8 md:p-14 text-center fade-in-up">
            <div className="text-xl md:text-3xl lg:text-4xl font-black text-white/50 tracking-wide mb-4 md:mb-6">{cashGame.name}</div>
            <div className="text-sm md:text-lg text-white/25 uppercase tracking-[0.3em] font-semibold mb-3 md:mb-5">Starting In</div>
            <div className="text-5xl md:text-8xl lg:text-[10vw] font-black timer-font text-blue-400 leading-none">
              {formatTimerHMS(preLevelMs)}
            </div>
          </div>
        </div>
      )}

      {cashGame.status === 'idle' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center g-overlay-idle">
          <div className="g-card p-8 md:p-12 text-center fade-in-up">
            <div className="text-3xl md:text-5xl font-black text-blue-400">COME ON Timer</div>
            <div className="text-base md:text-lg text-white/25 font-medium mt-3">Ring Game Ready</div>
          </div>
        </div>
      )}

      {cashGame.status === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center g-overlay-pause">
          <div className="g-card px-12 py-8 md:px-16 md:py-10">
            <div className="text-3xl md:text-5xl font-black text-white/50 tracking-widest animate-pulse">PAUSED</div>
          </div>
        </div>
      )}
    </DisplayWrapper>
  );
}

export default function CashDisplayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0e1c36, #152d52, #1c3d6e)' }} />}>
      <CashDisplayInner />
    </Suspense>
  );
}
