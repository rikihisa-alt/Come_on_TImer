'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';
import { onSync } from '@/lib/sync';
import { unlockAudio, playSound, playWarningBeep } from '@/lib/audio';
import { formatTimer, formatChips, formatTimerHMS, computeTimeToBreak, computeTimeToEnd, computeRegCloseTime } from '@/lib/utils';
import { Tournament, CashGame, ThemeConfig, DisplayToggles, SoundSettings, SectionLayout } from '@/lib/types';
import { DEFAULT_SECTION_LAYOUT, DEFAULT_CASH_SECTION_LAYOUT } from '@/lib/presets';
import { FullscreenButton } from '@/components/FullscreenButton';
import { AbsoluteSection } from '@/components/AbsoluteSection';
import { DisplayWrapper } from '@/components/DisplayWrapper';
import { RoomSync } from '@/components/RoomSync';

/* ═══ Tournament Panel (AbsoluteSection layout) ═══ */
function TournamentPanel({ tournament, theme, displayToggles: dt, sound, layoutOverride }: {
  tournament: Tournament;
  theme: ThemeConfig;
  displayToggles: DisplayToggles;
  sound: SoundSettings;
  layoutOverride?: SectionLayout;
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

  const layout = layoutOverride || tournament.splitSectionLayout || tournament.sectionLayout || DEFAULT_SECTION_LAYOUT;
  const cur = tournament.levels[tournament.currentLevelIndex];
  const nextPlay = tournament.levels.slice(tournament.currentLevelIndex + 1).find(l => l.type === 'play');
  const isBrk = cur?.type === 'break';
  const isWarn = displayMs <= 60000 && tournament.status === 'running' && !isBrk;
  const dur = cur ? cur.duration * 1000 : 1;
  const prog = 1 - displayMs / dur;
  const ttb = computeTimeToBreak(tournament.levels, tournament.currentLevelIndex, displayMs);
  const tte = computeTimeToEnd(tournament.levels, tournament.currentLevelIndex, displayMs);
  const regClose = computeRegCloseTime(tournament.levels, tournament.currentLevelIndex, displayMs, tournament.regCloseLevel);
  const fs = useStore(s => s.systemStyle?.displayFontScale) || 1;
  const timerPos = layout.timer;
  const tds = (timerPos.timerDigitScale ?? 1) * fs;
  const bds = (timerPos.blindsScale ?? 1) * fs;
  const ads = (timerPos.anteScale ?? 1) * fs;
  const activePlayers = tournament.initialEntries + tournament.reEntryCount;
  const totalChips = tournament.initialEntries * tournament.startingChips
    + tournament.reEntryCount * tournament.reEntryChips
    + tournament.rebuyCount * tournament.rebuyChips
    + tournament.addonCount * tournament.addonChips
    + tournament.earlyBirdCount * tournament.earlyBirdBonus;
  const avg = activePlayers > 0 ? Math.round(totalChips / activePlayers) : 0;
  const pc = theme?.primaryColor || '#60a5fa';
  const tickerSpeed = dt.tickerSpeed || 25;
  const isPreLevel = tournament.status === 'running' && tournament.currentLevelIndex === -1;

  return (
    <div className={`flex-1 relative overflow-hidden ${isBrk ? 'break-bg' : ''}`}>
      {/* Tournament Name */}
      {dt.showTournamentName && (
        <AbsoluteSection pos={layout.tournamentName}>
          <div className="h-full flex items-center justify-center">
            <span className="font-black text-white/60 tracking-wide truncate" style={{ fontSize: '1.5em' }}>{tournament.name}</span>
          </div>
        </AbsoluteSection>
      )}

      {/* Stats */}
      {dt.showEntryCount && (
        <AbsoluteSection pos={layout.players}>
          <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
            <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Players</div>
            <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{activePlayers}</div>
          </div>
        </AbsoluteSection>
      )}
      {dt.showEntryCount && (
        <AbsoluteSection pos={layout.reEntry}>
          <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
            <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Re-Entry</div>
            <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{tournament.reEntryCount}</div>
          </div>
        </AbsoluteSection>
      )}
      {dt.showEntryCount && (
        <AbsoluteSection pos={layout.rebuy}>
          <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
            <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Rebuy</div>
            <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{tournament.rebuyCount}</div>
          </div>
        </AbsoluteSection>
      )}
      {dt.showEntryCount && (
        <AbsoluteSection pos={layout.addon}>
          <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
            <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Add-on</div>
            <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{tournament.addonCount}</div>
          </div>
        </AbsoluteSection>
      )}
      {dt.showChipInfo && (
        <AbsoluteSection pos={layout.avgStack}>
          <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
            <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Avg Stack</div>
            <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{avg > 0 ? formatChips(avg) : '--'}</div>
          </div>
        </AbsoluteSection>
      )}

      {/* Timer */}
      <AbsoluteSection pos={layout.timer}>
        <div className="g-card h-full p-2 overflow-hidden" style={{ display: 'grid', gridTemplateRows: '1fr auto 1fr' }}>
          {/* Top: Level info */}
          <div className="flex flex-col items-center justify-end pb-0.5">
            {dt.showLevelInfo && (
              <div className="text-center">
                {isBrk ? (
                  <span className="text-green-400 text-base lg:text-xl font-black tracking-[0.15em]">BREAK</span>
                ) : (
                  <span className="text-white/20 text-xs lg:text-sm font-black tracking-[0.2em]">Level {cur?.level || '-'}</span>
                )}
              </div>
            )}
          </div>
          {/* Middle: Timer digits */}
          <div className="flex items-center justify-center">
            <div className={`font-black timer-font leading-[0.85] ${isWarn ? 'text-amber-400 warning-pulse' : isBrk ? 'text-green-400' : 'text-white'}`}
              style={{ fontSize: `${5.5 * tds}vw` }}>
              {formatTimer(displayMs)}
            </div>
          </div>
          {/* Bottom: Progress + blinds/telop */}
          <div className="flex flex-col items-center pt-0.5">
            {dt.showProgressBar && (
              <div className="w-3/4 h-1 bg-white/[0.06] rounded-full mt-1 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(prog * 100, 100)}%`, background: isWarn ? '#f59e0b' : isBrk ? '#22c55e' : pc }} />
              </div>
            )}
            {isBrk && cur?.note && (
              <div className="text-green-400/70 text-[8px] lg:text-[10px] font-semibold mt-1 text-center">{cur.note}</div>
            )}
            {dt.showFooter && cur && !isBrk && (
              <div className="mt-1 font-black timer-font" style={{ color: pc, fontSize: `${1.8 * bds}vw` }}>
                {cur.smallBlind.toLocaleString()}/{cur.bigBlind.toLocaleString()}
              </div>
            )}
            {cur && cur.ante > 0 && !isBrk && <div className="font-black timer-font" style={{ color: pc, fontSize: `${1.8 * bds}vw` }}>Ante {cur.ante.toLocaleString()}</div>}
          </div>
        </div>
      </AbsoluteSection>

      {/* Next Level */}
      {dt.showNextLevel && nextPlay && (
        <AbsoluteSection pos={layout.nextLevel}>
          <div className="g-card-inner h-full flex items-center justify-center gap-2 px-2">
            <span className="text-[8px] text-white/25 uppercase tracking-wider font-semibold">Next</span>
            <span className="text-[10px] lg:text-xs font-bold text-white/40 timer-font">
              {nextPlay.ante > 0 && `A${nextPlay.ante.toLocaleString()} `}{nextPlay.smallBlind.toLocaleString()}/{nextPlay.bigBlind.toLocaleString()}
            </span>
          </div>
        </AbsoluteSection>
      )}

      {/* Corner Time */}
      {dt.showTimeToEnd && (
        <AbsoluteSection pos={layout.cornerTime}>
          <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
            <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Corner</div>
            <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{formatTimerHMS(tte)}</div>
          </div>
        </AbsoluteSection>
      )}

      {/* Reg Close */}
      <AbsoluteSection pos={layout.regClose}>
        <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
          <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">{tournament.regCloseLevel ? `Reg Lv${tournament.regCloseLevel}` : 'Reg Close'}</div>
          <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{regClose !== null ? formatTimer(regClose) : 'N/A'}</div>
        </div>
      </AbsoluteSection>

      {/* Next Break */}
      {dt.showTimeToBreak && (
        <AbsoluteSection pos={layout.nextBreak}>
          <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
            <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Next Break</div>
            <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{ttb !== null ? formatTimerHMS(ttb) : '--:--:--'}</div>
          </div>
        </AbsoluteSection>
      )}

      {/* Prize Table */}
      {dt.showPrizeStructure && tournament.prizeStructure.some(p => p.label) && (
        <AbsoluteSection pos={layout.prizeTable}>
          <div className="g-card-inner p-2 h-full overflow-auto">
            <div className="text-[7px] text-white/30 uppercase tracking-wider font-semibold mb-1 text-center">Prize</div>
            <div className="space-y-0.5">
              {tournament.prizeStructure.filter(p => p.label).map(p => (
                <div key={p.place} className="flex items-center justify-between text-[10px] gap-1">
                  <span className="text-white/40">{p.place}位</span>
                  <span className="font-bold timer-font truncate" style={{ color: p.place === 1 ? pc : 'rgba(255,255,255,0.5)' }}>
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AbsoluteSection>
      )}

      {/* Ticker */}
      {dt.tickerText && (
        <AbsoluteSection pos={layout.ticker}>
          <div className="g-ticker h-full flex items-center overflow-hidden">
            <div className="ticker-container">
              <span className="ticker-scroll text-xs font-semibold text-white/35 px-2" style={{ animationDuration: `${tickerSpeed}s` }}>{dt.tickerText}</span>
            </div>
          </div>
        </AbsoluteSection>
      )}

      {/* ═══ Overlays ═══ */}
      {isPreLevel && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center g-overlay-idle rounded-lg fade-in-up">
          {dt.tickerText && (
            <div className="absolute top-2 left-0 right-0 overflow-hidden">
              <div className="ticker-container"><span className="ticker-scroll text-xs font-semibold text-white/35 px-2" style={{ animationDuration: `${tickerSpeed}s` }}>{dt.tickerText}</span></div>
            </div>
          )}
          <div className="text-3xl lg:text-5xl font-black timer-font text-blue-400 leading-none">{formatTimerHMS(displayMs)}</div>
          <div className="w-2/3 mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-blue-400/60 transition-all duration-500" style={{ width: `${tournament.preLevelDuration ? Math.max(0, 100 - (displayMs / (tournament.preLevelDuration * 1000)) * 100) : 0}%` }} />
          </div>
        </div>
      )}
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

/* ═══ Cash Panel (AbsoluteSection layout) ═══ */
function CashPanel({ cashGame, theme, displayToggles: dt }: {
  cashGame: CashGame;
  theme: ThemeConfig;
  displayToggles: DisplayToggles;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [preLevelMs, setPreLevelMs] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      if (cashGame.status === 'running' && cashGame.timerStartedAt) {
        const e = Date.now() - cashGame.timerStartedAt;
        if (cashGame.preLevelRemainingMs > 0) {
          const rem = Math.max(0, cashGame.preLevelRemainingMs - e);
          setPreLevelMs(rem);
          if (rem <= 0) useStore.getState().cEndPreLevel(cashGame.id);
        } else {
          setPreLevelMs(0);
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

  const layout = cashGame.splitSectionLayout || cashGame.sectionLayout || DEFAULT_CASH_SECTION_LAYOUT;
  const pc = theme?.primaryColor || '#60a5fa';
  const isWarn = cashGame.countdownMode && countdown < 300000 && countdown > 0 && cashGame.status === 'running';
  const tickerSpeed = dt.tickerSpeed || 25;
  const activePlayers = cashGame.initialEntries + cashGame.reEntryCount;
  const totalChips = cashGame.initialEntries * cashGame.startingChips
    + cashGame.reEntryCount * cashGame.reEntryChips
    + cashGame.rebuyCount * cashGame.rebuyChips
    + cashGame.addonCount * cashGame.addonChips;
  const avgStack = activePlayers > 0 ? Math.round(totalChips / activePlayers) : 0;

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Cash Name */}
      {dt.showCashName !== false && (
        <AbsoluteSection pos={layout.cashName}>
          <div className="h-full flex items-center justify-center">
            <span className="font-black text-white/60 tracking-wide truncate" style={{ fontSize: '1.5em' }}>{cashGame.name}</span>
          </div>
        </AbsoluteSection>
      )}

      {/* Rate */}
      {dt.showCashRate && (
        <AbsoluteSection pos={layout.rate}>
          <div className="g-card h-full flex flex-col items-center justify-center p-2">
            <div className="text-[8px] lg:text-[10px] text-white/25 uppercase tracking-widest font-semibold mb-1">Rate</div>
            <div className="text-2xl lg:text-4xl font-black leading-none tracking-tight" style={{ color: pc }}>
              {cashGame.smallBlind.toLocaleString()}/{cashGame.bigBlind.toLocaleString()}
            </div>
            {cashGame.ante > 0 && (
              <div className="text-[10px] lg:text-sm text-white/30 font-semibold mt-1">Ante {cashGame.ante.toLocaleString()}</div>
            )}
          </div>
        </AbsoluteSection>
      )}

      {/* Next Blinds */}
      {dt.showCashNextBlinds && (cashGame.nextSmallBlind > 0 || cashGame.nextBigBlind > 0) && (
        <AbsoluteSection pos={layout.nextBlinds}>
          <div className="g-card-inner h-full flex items-center justify-center gap-2 px-2">
            <span className="text-[8px] text-white/25 uppercase font-bold">Next</span>
            <span className="text-[10px] lg:text-xs font-bold text-white/40 timer-font">
              {cashGame.nextSmallBlind.toLocaleString()}/{cashGame.nextBigBlind.toLocaleString()}
              {cashGame.nextAnte > 0 && <span className="ml-1">(Ante {cashGame.nextAnte.toLocaleString()})</span>}
            </span>
          </div>
        </AbsoluteSection>
      )}

      {/* Memo */}
      {dt.showCashMemo && cashGame.memo && (
        <AbsoluteSection pos={layout.memo}>
          <div className="g-card-inner h-full flex items-center justify-center px-2">
            <span className="text-xs text-white/40 font-medium text-center">{cashGame.memo}</span>
          </div>
        </AbsoluteSection>
      )}

      {/* Timer */}
      {dt.showCashTimer && (
        <AbsoluteSection pos={layout.timer}>
          <div className="g-card h-full flex flex-col items-center justify-center p-2">
            <div className="text-[7px] text-white/20 uppercase tracking-widest font-semibold mb-1">
              {cashGame.countdownMode ? 'Remaining' : 'Session'}
            </div>
            <div className={`text-xl lg:text-3xl font-black timer-font leading-none ${isWarn ? 'text-amber-400 warning-pulse' : 'text-white/40'}`}>
              {cashGame.countdownMode ? formatTimerHMS(countdown) : formatTimerHMS(elapsed)}
            </div>
          </div>
        </AbsoluteSection>
      )}

      {/* SB / BB / Ante cards */}
      {dt.showCashRate && (
        <>
          <AbsoluteSection pos={layout.sbCard}>
            <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
              <div className="text-[7px] text-white/30 uppercase tracking-wider font-semibold">SB</div>
              <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{cashGame.smallBlind.toLocaleString()}</div>
            </div>
          </AbsoluteSection>
          <AbsoluteSection pos={layout.bbCard}>
            <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
              <div className="text-[7px] text-white/30 uppercase tracking-wider font-semibold">BB</div>
              <div className="text-xs lg:text-base font-bold text-blue-400 timer-font">{cashGame.bigBlind.toLocaleString()}</div>
            </div>
          </AbsoluteSection>
          {cashGame.ante > 0 && (
            <AbsoluteSection pos={layout.anteCard}>
              <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
                <div className="text-[7px] text-white/30 uppercase tracking-wider font-semibold">Ante</div>
                <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{cashGame.ante.toLocaleString()}</div>
              </div>
            </AbsoluteSection>
          )}
        </>
      )}

      {/* Player / Re-Entry / Rebuy / Add-on / Avg Stack */}
      {dt.showCashPlayers && (
        <>
          <AbsoluteSection pos={layout.players}>
            <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
              <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Players</div>
              <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{activePlayers}</div>
            </div>
          </AbsoluteSection>
          <AbsoluteSection pos={layout.reEntry}>
            <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
              <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Re-Entry</div>
              <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{cashGame.reEntryCount}</div>
            </div>
          </AbsoluteSection>
          <AbsoluteSection pos={layout.rebuy}>
            <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
              <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Rebuy</div>
              <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{cashGame.rebuyCount}</div>
            </div>
          </AbsoluteSection>
          <AbsoluteSection pos={layout.addon}>
            <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
              <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Add-on</div>
              <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{cashGame.addonCount}</div>
            </div>
          </AbsoluteSection>
        </>
      )}
      {dt.showCashChipInfo && (
        <AbsoluteSection pos={layout.avgStack}>
          <div className="g-card-inner h-full flex flex-col items-center justify-center p-1">
            <div className="text-[7px] lg:text-[9px] text-white/30 uppercase tracking-wider font-semibold">Avg Stack</div>
            <div className="text-xs lg:text-base font-bold text-white/65 timer-font">{avgStack > 0 ? formatChips(avgStack) : '--'}</div>
          </div>
        </AbsoluteSection>
      )}

      {/* Ticker */}
      {dt.tickerText && (
        <AbsoluteSection pos={layout.ticker}>
          <div className="g-ticker h-full flex items-center overflow-hidden">
            <div className="ticker-container">
              <span className="ticker-scroll text-xs font-semibold text-white/35 px-2" style={{ animationDuration: `${tickerSpeed}s` }}>{dt.tickerText}</span>
            </div>
          </div>
        </AbsoluteSection>
      )}

      {/* ═══ Overlays ═══ */}
      {cashGame.status === 'running' && preLevelMs > 0 && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center g-overlay-idle rounded-lg fade-in-up">
          {dt.tickerText && (
            <div className="absolute top-2 left-0 right-0 overflow-hidden">
              <div className="ticker-container"><span className="ticker-scroll text-xs font-semibold text-white/35 px-2" style={{ animationDuration: `${tickerSpeed}s` }}>{dt.tickerText}</span></div>
            </div>
          )}
          <div className="text-3xl lg:text-5xl font-black timer-font text-blue-400 leading-none">{formatTimerHMS(preLevelMs)}</div>
          <div className="w-2/3 mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-blue-400/60 transition-all duration-500" style={{ width: `${cashGame.preLevelDuration ? Math.max(0, 100 - (preLevelMs / (cashGame.preLevelDuration * 1000)) * 100) : 0}%` }} />
          </div>
        </div>
      )}
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

/* ═══ Split Timer Selector (dropdown) ═══ */
function SplitTimerSelector({ selectedId, onSelect, tournaments, cashGames, label }: {
  selectedId: string;
  onSelect: (id: string) => void;
  tournaments: Tournament[];
  cashGames: CashGame[];
  label: string;
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
    ...tournaments.map(t => ({ id: t.id, name: t.name, kind: 'T' as const, status: t.status as string })),
    ...cashGames.map(c => ({ id: c.id, name: c.name, kind: 'C' as const, status: c.status as string })),
  ];

  if (allTimers.length <= 1) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] hover:border-white/[0.2] transition-all duration-200 cursor-pointer">
        <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-blue-500/20 text-blue-400">{label}</span>
        <svg className={`w-2.5 h-2.5 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 min-w-[200px] g-card p-1.5 overflow-hidden">
          {allTimers.map(t => (
            <button key={t.id} onClick={() => { onSelect(t.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-white/[0.08] transition-colors ${t.id === selectedId ? 'bg-white/[0.06]' : ''}`}>
              <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${t.kind === 'T' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>{t.kind}</span>
              <span className="text-xs text-white/70 truncate flex-1">{t.name}</span>
              {t.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />}
              {t.status === 'paused' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
              {t.id === selectedId && <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
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
  const { tournaments, cashGames, displays, themes, sound: globalSound, displayToggles: globalToggles, defaultThemeId } = useStore();

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
        if (p.defaultThemeId) useStore.setState({ defaultThemeId: p.defaultThemeId as never });
        if (p.systemStyle) useStore.setState({ systemStyle: p.systemStyle as never });
      }
    });
  }, []);

  const leftType = detectType(selLeft);
  const rightType = detectType(selRight);

  const leftTournament = leftType === 'tournament' ? tournaments.find(t => t.id === selLeft) : undefined;
  const leftCash = leftType === 'cash' ? cashGames.find(c => c.id === selLeft) : undefined;
  const rightTournament = rightType === 'tournament' ? tournaments.find(t => t.id === selRight) : undefined;
  const rightCash = rightType === 'cash' ? cashGames.find(c => c.id === selRight) : undefined;

  const leftThemeParam = params.get('leftTheme') || '';
  const rightThemeParam = params.get('rightTheme') || '';
  const leftTimerThemeId = leftTournament?.themeId || leftCash?.themeId;
  const baseThemeId = leftTimerThemeId || assignment?.themeId || defaultThemeId || 'come-on-blue';
  const theme = themes.find(t => t.id === baseThemeId) || themes[0];
  const leftTheme = (leftThemeParam ? themes.find(t => t.id === leftThemeParam) : undefined) || theme;
  const rightTheme = (rightThemeParam ? themes.find(t => t.id === rightThemeParam) : undefined) || theme;

  /* per-timer settings for each panel */
  const leftDt = (leftTournament?.displayToggles || leftCash?.displayToggles) || globalToggles;
  const leftSnd = (leftTournament?.sound || leftCash?.sound) || globalSound;
  const rightDt = (rightTournament?.displayToggles || rightCash?.displayToggles) || globalToggles;
  const rightSnd = (rightTournament?.sound || rightCash?.sound) || globalSound;

  /* Helper: theme → bg style */
  const themeBgStyle = (t: ThemeConfig, dtBgUrl?: string): React.CSSProperties => {
    if (dtBgUrl) return { backgroundImage: `url(${dtBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (t?.type === 'gradient') return { background: `linear-gradient(160deg, ${t.gradientFrom || '#0e1c36'}, ${t.gradientTo || '#1c3d6e'})` };
    if (t?.type === 'image' && t.imageUrl) return { backgroundImage: `url(${t.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    return { background: 'linear-gradient(160deg, #0e1c36 0%, #152d52 50%, #1c3d6e 100%)' };
  };

  const bgStyle = themeBgStyle(theme, leftDt.backgroundImageUrl || rightDt.backgroundImageUrl);
  const leftBgStyle = themeBgStyle(leftTheme, leftDt.backgroundImageUrl);
  const rightBgStyle = themeBgStyle(rightTheme, rightDt.backgroundImageUrl);
  const hasSeparateThemes = leftThemeParam || rightThemeParam;

  const hasLeft = leftTournament || leftCash;
  const hasRight = rightTournament || rightCash;
  const leftName = leftTournament?.name || leftCash?.name || '左';
  const rightName = rightTournament?.name || rightCash?.name || '右';

  /* Neutral dark bg for overall wrapper (header uses this) */
  const neutralBg = { background: 'linear-gradient(160deg, #0e1c36 0%, #152d52 50%, #1c3d6e 100%)' };

  return (
    <DisplayWrapper bgStyle={neutralBg} className="flex flex-col select-none">
      {/* Header - solid bg, above overlays */}
      <div className="relative z-50 flex items-center px-4 md:px-6 py-2.5 md:py-3" style={{ background: '#0e1c36' }}>
        <div className="flex items-center gap-2 shrink-0">
          <RoomSync />
        </div>
        <div className="flex-1 flex items-center justify-center gap-2 md:gap-4 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm md:text-lg lg:text-xl font-black text-white/60 truncate max-w-[20vw]">{leftName}</span>
            <SplitTimerSelector label="L" selectedId={selLeft} onSelect={setSelLeft} tournaments={tournaments} cashGames={cashGames} />
          </div>
          <span className="text-white/15 font-light text-lg shrink-0">|</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm md:text-lg lg:text-xl font-black text-white/60 truncate max-w-[20vw]">{rightName}</span>
            <SplitTimerSelector label="R" selectedId={selRight} onSelect={setSelRight} tournaments={tournaments} cashGames={cashGames} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <FullscreenButton />
        </div>
      </div>

      {/* Split panels */}
      <div className="relative z-10 flex-1 flex">
        {/* LEFT PANEL - always has own bg */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 z-0" style={leftBgStyle} />
          {leftTheme && leftTheme.overlayOpacity > 0 && <div className="absolute inset-0 bg-black z-0" style={{ opacity: leftTheme.overlayOpacity / 100 }} />}
          <div className="relative z-[1] flex-1 flex flex-col">
            {hasLeft ? (
              leftTournament ? <TournamentPanel tournament={leftTournament} theme={leftTheme} displayToggles={leftDt} sound={leftSnd} />
              : leftCash ? <CashPanel cashGame={leftCash} theme={leftTheme} displayToggles={leftDt} />
              : null
            ) : (
              <div className="flex-1 flex items-center justify-center"><div className="g-card p-6 text-white/20 text-sm">左パネル: タイマーを選択 ↑</div></div>
            )}
          </div>
        </div>

        {/* CENTER DIVIDER - きれいな縦線 */}
        <div className="relative z-10 w-[2px] bg-white/20 shrink-0" />

        {/* RIGHT PANEL - always has own bg */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 z-0" style={rightBgStyle} />
          {rightTheme && rightTheme.overlayOpacity > 0 && <div className="absolute inset-0 bg-black z-0" style={{ opacity: rightTheme.overlayOpacity / 100 }} />}
          <div className="relative z-[1] flex-1 flex flex-col">
            {hasRight ? (
              rightTournament ? <TournamentPanel tournament={rightTournament} theme={rightTheme} displayToggles={rightDt} sound={rightSnd} />
              : rightCash ? <CashPanel cashGame={rightCash} theme={rightTheme} displayToggles={rightDt} />
              : null
            ) : (
              <div className="flex-1 flex items-center justify-center"><div className="g-card p-6 text-white/20 text-sm">右パネル: タイマーを選択 ↑</div></div>
            )}
          </div>
        </div>
      </div>
    </DisplayWrapper>
  );
}

export default function SplitDisplayPage() {
  return <Suspense fallback={<div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0e1c36, #152d52, #1c3d6e)' }} />}><SplitInner /></Suspense>;
}
