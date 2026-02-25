'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';
import { onSync } from '@/lib/sync';
import { unlockAudio, playSound, playWarningBeep, speakTTS, fillTTSTemplate } from '@/lib/audio';
import { formatTimer, formatChips, formatTimerHMS, computeTimeToBreak, computeTimeToEnd, computeRegCloseTime } from '@/lib/utils';
import { Tournament, CashGame, ThemeConfig, DisplayToggles, SoundSettings } from '@/lib/types';

/* ═══ Compact stat cell (split version) ═══ */
function SC({ label, value }: { label: string; value: string }) {
  return (
    <div className="g-card-inner p-2 lg:p-3 flex-1 min-h-0 text-center">
      <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-0.5">{label}</div>
      <div className="text-xs lg:text-base font-bold text-white/65 timer-font leading-tight">{value}</div>
    </div>
  );
}

function BC({ label, value, wide, accent }: { label: string; value: string; wide?: boolean; accent?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center py-1.5 lg:py-2.5 ${wide ? 'flex-[2]' : 'flex-1'} border-r border-white/[0.06] last:border-r-0`}>
      <div className="text-[7px] lg:text-[9px] text-white/25 uppercase tracking-wider font-semibold">{label}</div>
      <div className={`text-sm lg:text-xl font-black timer-font leading-tight ${accent ? 'text-blue-400' : 'text-white/65'}`}>{value}</div>
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
    <div className={`flex-1 flex flex-col overflow-hidden relative p-2 lg:p-3 gap-2 ${isBrk ? 'break-bg' : ''}`}>
      {/* Top info bar */}
      <div className="g-card-inner flex items-center px-3 py-1.5 lg:py-2">
        <span className="text-xs lg:text-sm font-bold text-white/60 truncate flex-1">{tournament.name}</span>
        <span className="text-[9px] lg:text-[11px] text-white/25 font-medium">{isBrk ? 'BRK' : `Lv${cur?.level || '-'}`}/{totalLvs}</span>
      </div>

      {/* Main Timer Card */}
      <div className="g-card flex-1 flex flex-col items-center justify-center p-2 lg:p-4 min-h-0">
        {isBrk ? (
          <span className="text-green-400 text-base lg:text-xl font-black tracking-widest">BREAK</span>
        ) : (
          <span className="text-white/20 text-xs lg:text-sm font-black tracking-[0.2em]">Level {cur?.level || '-'}</span>
        )}
        <div className={`text-[11vw] lg:text-[5.5vw] font-black timer-font leading-[0.85] ${isWarn ? 'text-amber-400 warning-pulse' : isBrk ? 'text-green-400' : 'text-white'}`}>
          {formatTimer(displayMs)}
        </div>
        {dt.showProgressBar && (
          <div className="w-3/4 h-1 bg-white/[0.06] rounded-full mt-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(prog * 100, 100)}%`, background: isWarn ? '#f59e0b' : isBrk ? '#22c55e' : pc }} />
          </div>
        )}
        {cur && !isBrk && (
          <div className="mt-1.5 text-lg lg:text-2xl font-black timer-font" style={{ color: pc }}>
            {cur.smallBlind.toLocaleString()}/{cur.bigBlind.toLocaleString()}
          </div>
        )}
        {cur && cur.ante > 0 && !isBrk && <div className="text-[10px] text-white/20 font-semibold">Ante {cur.ante.toLocaleString()}</div>}
      </div>

      {/* Stats row */}
      <div className="hidden lg:flex gap-2">
        <SC label="Players" value={`${tournament.entryCount}`} />
        <SC label="Rebuy" value={String(tournament.rebuyCount)} />
        <SC label="Corner" value={formatTimerHMS(tte)} />
      </div>

      {/* Next */}
      {nextPlay && (
        <div className="g-card-inner flex items-center justify-center py-1 lg:py-1.5 px-2">
          <span className="text-[8px] text-white/20 mr-1">Next:</span>
          <span className="text-[10px] lg:text-xs font-bold text-white/35 timer-font">
            {nextPlay.ante > 0 && `A${nextPlay.ante.toLocaleString()} `}{nextPlay.smallBlind.toLocaleString()}/{nextPlay.bigBlind.toLocaleString()}
          </span>
        </div>
      )}

      {/* Overlays */}
      {tournament.status === 'idle' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center g-overlay-idle rounded-lg">
          <div className="g-card p-5 text-center"><div className="text-lg lg:text-2xl font-black text-blue-400">COME ON Timer</div><div className="text-[10px] text-white/20 mt-1">{tournament.name}</div></div>
        </div>
      )}
      {tournament.status === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center g-overlay-pause rounded-lg">
          <div className="g-card px-6 py-4"><div className="text-lg lg:text-2xl font-black text-white/40 tracking-widest animate-pulse">PAUSED</div></div>
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
    <div className="flex-1 flex flex-col overflow-hidden relative p-2 lg:p-3 gap-2">
      {/* Top info */}
      <div className="g-card-inner flex items-center px-3 py-1.5 lg:py-2">
        <span className="text-xs lg:text-sm font-bold text-white/60 truncate flex-1">{cashGame.name}</span>
        <span className="text-[9px] lg:text-[11px] text-white/25 font-medium">Cash</span>
      </div>

      {/* Main Card */}
      <div className="g-card flex-1 flex flex-col items-center justify-center gap-2 p-3 lg:p-4 min-h-0">
        <div className="text-[8px] lg:text-[10px] text-white/20 uppercase tracking-widest font-semibold">Rate</div>
        <div className="text-2xl lg:text-4xl font-black leading-none" style={{ color: pc }}>
          {cashGame.smallBlind.toLocaleString()} / {cashGame.bigBlind.toLocaleString()}
        </div>
        {cashGame.ante > 0 && <div className="text-[10px] lg:text-sm text-white/25 font-semibold">Ante {cashGame.ante.toLocaleString()}</div>}
        {dt.showCashMemo && cashGame.memo && <div className="text-[10px] text-white/20 text-center">{cashGame.memo}</div>}
        {dt.showCashTimer && (
          <div className="text-center mt-1">
            <div className="text-[7px] text-white/15 uppercase tracking-widest">{cashGame.countdownMode ? 'Remaining' : 'Session'}</div>
            <div className={`text-xl lg:text-3xl font-black timer-font ${isWarn ? 'text-amber-400 warning-pulse' : 'text-white/40'}`}>
              {cashGame.countdownMode ? formatTimerHMS(countdown) : formatTimerHMS(elapsed)}
            </div>
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="flex gap-2">
        <SC label="SB" value={cashGame.smallBlind.toLocaleString()} />
        <SC label="BB" value={cashGame.bigBlind.toLocaleString()} />
        {cashGame.ante > 0 && <SC label="Ante" value={cashGame.ante.toLocaleString()} />}
      </div>

      {/* Overlays */}
      {cashGame.status === 'idle' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center g-overlay-idle rounded-lg">
          <div className="g-card p-5 text-center"><div className="text-lg lg:text-2xl font-black text-blue-400">COME ON Timer</div><div className="text-[10px] text-white/20 mt-1">Cash Ready</div></div>
        </div>
      )}
      {cashGame.status === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center g-overlay-pause rounded-lg">
          <div className="g-card px-6 py-4"><div className="text-lg lg:text-2xl font-black text-white/40 tracking-widest animate-pulse">PAUSED</div></div>
        </div>
      )}
    </div>
  );
}

/* ═══ Panel Selector ═══ */
function PanelSelector({ selectedId, onSelect, tournaments, cashGames, side }: {
  selectedId: string;
  onSelect: (id: string) => void;
  tournaments: Tournament[];
  cashGames: CashGame[];
  side: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const allTimers = [
    ...tournaments.map(t => ({ id: t.id, name: t.name, kind: 'T' as const, status: t.status })),
    ...cashGames.map(c => ({ id: c.id, name: c.name, kind: 'C' as const, status: c.status })),
  ];
  const current = allTimers.find(t => t.id === selectedId);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] hover:border-white/[0.2] transition-all duration-200 cursor-pointer">
        <span className={`text-[8px] font-bold px-1 py-0.5 rounded-md ${current?.kind === 'C' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
          {current?.kind === 'C' ? 'C' : 'T'}
        </span>
        <span className="text-[10px] lg:text-xs text-white/55 font-medium truncate max-w-[120px]">{current?.name || '選択'}</span>
        <svg className={`w-2.5 h-2.5 text-white/25 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>

      {open && (
        <div className={`absolute top-full mt-1.5 ${side === 'right' ? 'right-0' : 'left-0'} z-50 min-w-[200px] g-card p-1.5 overflow-hidden`}>
          {allTimers.length === 0 && <div className="px-3 py-2 text-xs text-white/25">タイマーなし</div>}
          {allTimers.map(t => (
            <button key={t.id} onClick={() => { onSelect(t.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-white/[0.08] transition-colors ${t.id === selectedId ? 'bg-white/[0.06]' : ''}`}>
              <span className={`text-[8px] font-bold px-1 py-0.5 rounded-md shrink-0 ${t.kind === 'C' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {t.kind === 'C' ? 'Cash' : 'Trn'}
              </span>
              <span className="text-xs text-white/65 truncate flex-1">{t.name}</span>
              {t.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />}
              {t.status === 'paused' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
              {t.id === selectedId && <svg className="w-3 h-3 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
            </button>
          ))}
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

  const detectType = useCallback((id: string): 'tournament' | 'cash' => {
    if (cashGames.find(c => c.id === id)) return 'cash';
    return 'tournament';
  }, [cashGames]);

  const assignment = displays.find(d => d.displayId === displayId);
  const initLeftId = params.get('left') || assignment?.targetId || tournaments[0]?.id || cashGames[0]?.id || '';
  const initRightId = params.get('right') || assignment?.splitTargetId || (tournaments[1]?.id || cashGames[0]?.id || tournaments[0]?.id || '');

  const [selLeft, setSelLeft] = useState(initLeftId);
  const [selRight, setSelRight] = useState(initRightId);

  useEffect(() => {
    if (assignment?.targetId) setSelLeft(assignment.targetId);
    if (assignment?.splitTargetId) setSelRight(assignment.splitTargetId);
  }, [assignment?.targetId, assignment?.splitTargetId]);

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

  const themeId = assignment?.themeId || 'come-on-blue';
  const theme = themes.find(t => t.id === themeId) || themes[0];

  const leftType = detectType(selLeft);
  const rightType = detectType(selRight);

  const leftTournament = leftType === 'tournament' ? tournaments.find(t => t.id === selLeft) : undefined;
  const leftCash = leftType === 'cash' ? cashGames.find(c => c.id === selLeft) : undefined;
  const rightTournament = rightType === 'tournament' ? tournaments.find(t => t.id === selRight) : undefined;
  const rightCash = rightType === 'cash' ? cashGames.find(c => c.id === selRight) : undefined;

  const bgStyle = displayToggles.backgroundImageUrl
    ? { backgroundImage: `url(${displayToggles.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : theme?.type === 'gradient'
    ? { background: `linear-gradient(160deg, ${theme.gradientFrom || '#0e1c36'}, ${theme.gradientTo || '#1c3d6e'})` }
    : { background: 'linear-gradient(160deg, #0e1c36 0%, #152d52 50%, #1c3d6e 100%)' };

  const hasLeft = leftTournament || leftCash;
  const hasRight = rightTournament || rightCash;

  return (
    <div className="min-h-screen flex flex-col select-none overflow-hidden" style={bgStyle}>
      {displayToggles.backgroundImageUrl && <div className="absolute inset-0 bg-black/50 pointer-events-none z-[1]" />}
      {theme && theme.overlayOpacity > 0 && <div className="absolute inset-0 bg-black pointer-events-none z-[1]" style={{ opacity: theme.overlayOpacity / 100 }} />}

      {/* Header */}
      <div className="g-topbar relative z-10 flex items-center px-3 py-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm font-black text-blue-400 tracking-tight">COME ON</span>
          <span className="text-white/25 font-medium text-[10px]">Timer</span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-3">
          <span className="text-[9px] text-white/25 font-medium">左</span>
          <PanelSelector selectedId={selLeft} onSelect={setSelLeft} tournaments={tournaments} cashGames={cashGames} side="left" />
          <span className="text-white/15">|</span>
          <PanelSelector selectedId={selRight} onSelect={setSelRight} tournaments={tournaments} cashGames={cashGames} side="right" />
          <span className="text-[9px] text-white/25 font-medium">右</span>
        </div>
      </div>

      {/* Split panels */}
      <div className="relative z-10 flex-1 flex">
        {/* LEFT PANEL */}
        <div className="flex-1 flex flex-col border-r border-white/[0.08]">
          {hasLeft ? (
            leftTournament ? <TournamentPanel tournament={leftTournament} theme={theme} displayToggles={displayToggles} sound={sound} />
            : leftCash ? <CashPanel cashGame={leftCash} theme={theme} displayToggles={displayToggles} />
            : null
          ) : (
            <div className="flex-1 flex items-center justify-center"><div className="g-card p-6 text-white/20 text-sm">左パネル: タイマーを選択 ↑</div></div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 flex flex-col">
          {hasRight ? (
            rightTournament ? <TournamentPanel tournament={rightTournament} theme={theme} displayToggles={displayToggles} sound={sound} />
            : rightCash ? <CashPanel cashGame={rightCash} theme={theme} displayToggles={displayToggles} />
            : null
          ) : (
            <div className="flex-1 flex items-center justify-center"><div className="g-card p-6 text-white/20 text-sm">右パネル: タイマーを選択 ↑</div></div>
          )}
        </div>
      </div>

      {/* Ticker */}
      {displayToggles.tickerText && (
        <div className="relative z-10 px-2.5 pb-2">
          <div className="g-ticker py-1.5 overflow-hidden">
            <div className="ticker-container">
              <span className="ticker-scroll text-xs font-medium text-white/35 px-4">{displayToggles.tickerText}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SplitDisplayPage() {
  return <Suspense fallback={<div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0e1c36, #152d52, #1c3d6e)' }} />}><SplitInner /></Suspense>;
}
