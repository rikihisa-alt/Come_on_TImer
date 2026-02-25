'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';
import { onSync } from '@/lib/sync';
import { unlockAudio, playSound, playWarningBeep, speakTTS, fillTTSTemplate } from '@/lib/audio';
import { formatTimer, formatChips, formatTimerHMS, computeTimeToBreak, computeTimeToEnd, computeRegCloseTime } from '@/lib/utils';
import { Tournament, CashGame, ThemeConfig, DisplayToggles, SoundSettings } from '@/lib/types';

/* ═══ Compact stat cell ═══ */
function SC({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-1 py-0.5 border-b border-white/[0.05] last:border-b-0">
      <div className="text-[8px] lg:text-[10px] text-white/25 uppercase tracking-wider font-medium leading-tight">{label}</div>
      <div className="text-sm lg:text-lg font-bold text-white/60 timer-font leading-tight">{value}</div>
    </div>
  );
}

function BC({ label, value, wide, accent }: { label: string; value: string; wide?: boolean; accent?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center py-1 lg:py-2 ${wide ? 'flex-[2]' : 'flex-1'} border-r border-white/[0.05] last:border-r-0`}>
      <div className="text-[7px] lg:text-[9px] text-white/20 uppercase tracking-wider font-medium">{label}</div>
      <div className={`text-base lg:text-2xl font-black timer-font leading-tight ${accent ? 'text-blue-400' : 'text-white/70'}`}>{value}</div>
    </div>
  );
}

/* ═══ Tournament Panel (compact for split) ═══ */
function TournamentPanel({ tournament, theme, displayToggles: dt, sound }: {
  tournament: Tournament;
  theme: ThemeConfig;
  displayToggles: DisplayToggles;
  sound: SoundSettings;
}) {
  const [displayMs, setDisplayMs] = useState(0);
  const prevRef = useRef(-1);
  const warnRef = useRef(false);

  const computeRem = useCallback(() => {
    if (tournament.status === 'running' && tournament.timerStartedAt) return Math.max(0, tournament.remainingMs - (Date.now() - tournament.timerStartedAt));
    return tournament.remainingMs;
  }, [tournament.status, tournament.timerStartedAt, tournament.remainingMs]);

  useEffect(() => {
    const iv = setInterval(() => { const r = computeRem(); setDisplayMs(r); if (r <= 0 && tournament.status === 'running') useStore.getState().tTick(tournament.id); }, 200);
    return () => clearInterval(iv);
  }, [computeRem, tournament.status, tournament.id]);

  useEffect(() => {
    if (prevRef.current === -1) { prevRef.current = tournament.currentLevelIndex; return; }
    if (prevRef.current !== tournament.currentLevelIndex) {
      prevRef.current = tournament.currentLevelIndex; warnRef.current = false;
      if (tournament.status === 'running') {
        const lv = tournament.levels[tournament.currentLevelIndex];
        if (lv?.type === 'break') { if (sound.breakStartEnabled) playSound(sound.soundPreset, sound.masterVolume); }
        else if (lv) { if (sound.blindChangeEnabled) playSound(sound.soundPreset, sound.masterVolume); }
      }
    }
  }, [tournament.currentLevelIndex, tournament.status, tournament.levels, sound]);

  useEffect(() => {
    if (tournament.status !== 'running') return;
    if (displayMs <= 60000 && displayMs > 55000 && !warnRef.current) {
      warnRef.current = true;
      if (sound.oneMinWarningEnabled) playWarningBeep(sound.masterVolume);
    }
  }, [displayMs, tournament.status, sound]);

  const cur = tournament.levels[tournament.currentLevelIndex];
  const nextPlay = tournament.levels.slice(tournament.currentLevelIndex + 1).find(l => l.type === 'play');
  const isBrk = cur?.type === 'break';
  const isWarn = displayMs <= 60000 && tournament.status === 'running' && !isBrk;
  const dur = cur ? cur.duration * 1000 : 1;
  const prog = 1 - displayMs / dur;
  const totalLvs = tournament.levels.filter(l => l.type === 'play').length;
  const ttb = computeTimeToBreak(tournament.levels, tournament.currentLevelIndex, displayMs);
  const tte = computeTimeToEnd(tournament.levels, tournament.currentLevelIndex, displayMs);
  const regClose = computeRegCloseTime(tournament.levels, tournament.currentLevelIndex, displayMs, tournament.regCloseLevel);
  const totalChips = (tournament.entryCount + tournament.rebuyCount + tournament.addonCount) * tournament.startingChips;
  const avg = tournament.entryCount > 0 ? Math.round(totalChips / tournament.entryCount) : 0;
  const pc = theme?.primaryColor || '#60a5fa';

  return (
    <div className={`flex-1 flex flex-col overflow-hidden relative ${isBrk ? 'break-bg' : ''}`}>
      {/* Top banner */}
      <div className="flex items-center px-2 py-1 lg:py-1.5 bg-black/30 border-b border-white/[0.06]">
        <div className="flex-1 text-center">
          <span className="text-xs lg:text-sm font-bold text-white/60 truncate">{tournament.name}</span>
        </div>
        <span className="text-[10px] text-white/20 font-medium">{isBrk ? 'BRK' : `Lv${cur?.level || '-'}`}/{totalLvs}</span>
      </div>

      {/* 3-column main area */}
      <div className="flex-1 flex border-b border-white/[0.05]">
        {/* Left stats */}
        <div className="hidden lg:flex flex-col w-[18%] border-r border-white/[0.06] bg-black/10">
          <SC label="Rebuy" value={String(tournament.rebuyCount)} />
          <SC label="Add-on" value={String(tournament.addonCount)} />
          <SC label="Avg Stack" value={avg > 0 ? formatChips(avg) : '--'} />
        </div>

        {/* Center: Level + Timer */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {isBrk ? (
            <span className="text-green-400 text-lg lg:text-2xl font-black tracking-widest">BREAK</span>
          ) : (
            <span className="text-white/25 text-sm lg:text-lg font-black tracking-[0.2em]">Level {cur?.level || '-'}</span>
          )}
          <div className={`text-[12vw] lg:text-[6vw] font-black timer-font leading-[0.9] ${isWarn ? 'text-amber-400 warning-pulse' : isBrk ? 'text-green-400' : 'text-white'}`}>
            {formatTimer(displayMs)}
          </div>
          {dt.showProgressBar && (
            <div className="w-3/4 h-1 bg-white/[0.04] rounded-full mt-1 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${Math.min(prog * 100, 100)}%`,
                background: isWarn ? '#f59e0b' : isBrk ? '#22c55e' : pc
              }} />
            </div>
          )}
        </div>

        {/* Right stats */}
        <div className="hidden lg:flex flex-col w-[18%] border-l border-white/[0.06] bg-black/10">
          <SC label="Corner" value={formatTimerHMS(tte)} />
          <SC label="Reg Close" value={regClose !== null ? formatTimer(regClose) : 'N/A'} />
          <SC label="Next Brk" value={ttb !== null ? formatTimer(ttb) : '--'} />
        </div>
      </div>

      {/* Bottom: Players | Blinds | Ante */}
      <div className="flex bg-black/20">
        <BC label="Players" value={`${tournament.entryCount}`} />
        <BC label="Blinds" value={cur && !isBrk ? `${cur.smallBlind.toLocaleString()}/${cur.bigBlind.toLocaleString()}` : '--'} wide accent />
        <BC label="Ante" value={cur && cur.ante > 0 ? cur.ante.toLocaleString() : '--'} />
      </div>

      {/* Next */}
      {nextPlay && (
        <div className="flex items-center justify-center py-1 bg-black/10 border-t border-white/[0.03]">
          <span className="text-[9px] text-white/15 mr-1">Next:</span>
          <span className="text-xs font-bold text-white/30 timer-font">
            {nextPlay.ante > 0 && `A${nextPlay.ante.toLocaleString()} `}{nextPlay.smallBlind.toLocaleString()}/{nextPlay.bigBlind.toLocaleString()}
          </span>
        </div>
      )}

      {/* Overlays */}
      {tournament.status === 'idle' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="text-center"><div className="text-xl lg:text-3xl font-black text-blue-400">COME ON Timer</div><div className="text-xs text-white/15 mt-1">{tournament.name}</div></div>
        </div>
      )}
      {tournament.status === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="text-xl lg:text-3xl font-black text-white/35 tracking-widest animate-pulse">PAUSED</div>
        </div>
      )}
    </div>
  );
}

/* ═══ Cash Panel (compact for split) ═══ */
function CashPanel({ cashGame, theme, displayToggles: dt }: {
  cashGame: CashGame;
  theme: ThemeConfig;
  displayToggles: DisplayToggles;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      if (cashGame.status === 'running' && cashGame.timerStartedAt) {
        const e = Date.now() - cashGame.timerStartedAt;
        setElapsed(cashGame.elapsedMs + e);
        if (cashGame.countdownMode) setCountdown(Math.max(0, cashGame.countdownRemainingMs - e));
      } else {
        setElapsed(cashGame.elapsedMs);
        setCountdown(cashGame.countdownRemainingMs);
      }
    }, 500);
    return () => clearInterval(iv);
  }, [cashGame]);

  const pc = theme?.primaryColor || '#60a5fa';
  const isWarn = cashGame.countdownMode && countdown < 300000 && countdown > 0 && cashGame.status === 'running';

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Top banner */}
      <div className="flex items-center px-2 py-1 lg:py-1.5 bg-black/30 border-b border-white/[0.06]">
        <div className="flex-1 text-center">
          <span className="text-xs lg:text-sm font-bold text-white/60">{cashGame.name}</span>
        </div>
        <span className="text-[10px] text-white/20 font-medium">Cash</span>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-2">
        <div className="text-[9px] text-white/15 uppercase tracking-widest font-medium">Rate</div>
        <div className="text-3xl lg:text-5xl font-black leading-none" style={{ color: pc }}>
          {cashGame.smallBlind.toLocaleString()} / {cashGame.bigBlind.toLocaleString()}
        </div>
        {cashGame.ante > 0 && <div className="text-sm text-white/20 font-semibold">Ante {cashGame.ante.toLocaleString()}</div>}
        {dt.showCashMemo && cashGame.memo && <div className="text-xs text-white/25 text-center">{cashGame.memo}</div>}
        {dt.showCashTimer && (
          <div className="text-center mt-2">
            <div className="text-[8px] text-white/15 uppercase tracking-widest">{cashGame.countdownMode ? 'Remaining' : 'Session'}</div>
            <div className={`text-2xl lg:text-4xl font-black timer-font ${isWarn ? 'text-amber-400 warning-pulse' : 'text-white/40'}`}>
              {cashGame.countdownMode ? formatTimerHMS(countdown) : formatTimerHMS(elapsed)}
            </div>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="flex bg-black/20 border-t border-white/[0.05]">
        <BC label="SB" value={cashGame.smallBlind.toLocaleString()} />
        <BC label="BB" value={cashGame.bigBlind.toLocaleString()} wide accent />
        {cashGame.ante > 0 && <BC label="Ante" value={cashGame.ante.toLocaleString()} />}
      </div>

      {/* Overlays */}
      {cashGame.status === 'idle' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="text-center"><div className="text-xl lg:text-3xl font-black text-blue-400">COME ON Timer</div><div className="text-xs text-white/15 mt-1">Cash Ready</div></div>
        </div>
      )}
      {cashGame.status === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="text-xl lg:text-3xl font-black text-white/35 tracking-widest animate-pulse">PAUSED</div>
        </div>
      )}
    </div>
  );
}

/* ═══ Split Display Main ═══ */
function SplitInner() {
  const params = useSearchParams();
  const displayId = params.get('display') || '';
  const { tournaments, cashGames, displays, themes, sound, displayToggles } = useStore();

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
        if (p.tournaments) useStore.setState({ tournaments: p.tournaments as never });
        if (p.cashGames) useStore.setState({ cashGames: p.cashGames as never });
        if (p.displays) useStore.setState({ displays: p.displays as never });
        if (p.themes) useStore.setState({ themes: p.themes as never });
        if (p.sound) useStore.setState({ sound: p.sound as never });
        if (p.displayToggles) useStore.setState({ displayToggles: p.displayToggles as never });
      }
    });
  }, []);

  const assignment = displays.find(d => d.displayId === displayId);
  const themeId = assignment?.themeId || 'come-on-blue';
  const theme = themes.find(t => t.id === themeId) || themes[0];

  // Left panel config
  const leftRoute = assignment?.route === 'split' ? (assignment.route === 'split' ? 'tournament' : assignment.route) : (assignment?.route || 'tournament');
  const leftId = assignment?.targetId || tournaments[0]?.id || '';
  // Right panel config
  const rightRoute = assignment?.splitRoute || 'cash';
  const rightId = assignment?.splitTargetId || cashGames[0]?.id || '';

  // Also support URL params for quick testing: ?left=id&leftType=tournament&right=id&rightType=cash
  const pLeftId = params.get('left') || leftId;
  const pLeftType = (params.get('leftType') as 'tournament' | 'cash') || leftRoute;
  const pRightId = params.get('right') || rightId;
  const pRightType = (params.get('rightType') as 'tournament' | 'cash') || rightRoute;

  const leftTournament = pLeftType === 'tournament' ? tournaments.find(t => t.id === pLeftId) : undefined;
  const leftCash = pLeftType === 'cash' ? cashGames.find(c => c.id === pLeftId) : undefined;
  const rightTournament = pRightType === 'tournament' ? tournaments.find(t => t.id === pRightId) : undefined;
  const rightCash = pRightType === 'cash' ? cashGames.find(c => c.id === pRightId) : undefined;

  const bgStyle = displayToggles.backgroundImageUrl
    ? { backgroundImage: `url(${displayToggles.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : theme?.type === 'gradient'
    ? { background: `linear-gradient(135deg, ${theme.gradientFrom || '#0f172a'}, ${theme.gradientTo || '#1e3a5f'})` }
    : { background: theme?.bgColor || '#0a0e1a' };

  const hasLeft = leftTournament || leftCash;
  const hasRight = rightTournament || rightCash;

  return (
    <div className="min-h-screen flex flex-col select-none overflow-hidden" style={bgStyle}>
      {displayToggles.backgroundImageUrl && <div className="absolute inset-0 bg-black/50 pointer-events-none z-[1]" />}
      {theme && theme.overlayOpacity > 0 && <div className="absolute inset-0 bg-black pointer-events-none z-[1]" style={{ opacity: theme.overlayOpacity / 100 }} />}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-3 py-1.5 bg-black/30 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-blue-400 tracking-tight">COME ON</span>
          <span className="text-white/20 font-medium text-[10px]">Timer</span>
        </div>
        <span className="text-[10px] text-white/15 font-medium uppercase tracking-wider">Split Display</span>
      </div>

      {/* Split panels */}
      <div className="relative z-10 flex-1 flex">
        {/* LEFT PANEL */}
        <div className="flex-1 flex flex-col border-r-2 border-white/[0.1]">
          {hasLeft ? (
            leftTournament ? (
              <TournamentPanel tournament={leftTournament} theme={theme} displayToggles={displayToggles} sound={sound} />
            ) : leftCash ? (
              <CashPanel cashGame={leftCash} theme={theme} displayToggles={displayToggles} />
            ) : null
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/15 text-sm">No left panel configured</div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col">
          {hasRight ? (
            rightTournament ? (
              <TournamentPanel tournament={rightTournament} theme={theme} displayToggles={displayToggles} sound={sound} />
            ) : rightCash ? (
              <CashPanel cashGame={rightCash} theme={theme} displayToggles={displayToggles} />
            ) : null
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/15 text-sm">No right panel configured</div>
          )}
        </div>
      </div>

      {/* Ticker */}
      {displayToggles.tickerText && (
        <div className="relative z-10 w-full py-1 bg-black/30 border-t border-white/[0.04] overflow-hidden">
          <div className="ticker-container">
            <span className="ticker-scroll text-xs font-medium text-white/30 px-4">{displayToggles.tickerText}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SplitDisplayPage() {
  return <Suspense fallback={<div className="min-h-screen" style={{ background: '#0a0e1a' }} />}><SplitInner /></Suspense>;
}
