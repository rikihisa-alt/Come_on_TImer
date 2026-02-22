'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';
import { onSync } from '@/lib/sync';
import { unlockAudio, playSound, playWarningBeep, speakTTS, fillTTSTemplate } from '@/lib/audio';
import { formatTimer, formatChips, formatTimerHMS, computeTimeToBreak, computeTimeToEnd, computeRegCloseTime } from '@/lib/utils';
import { Tournament, ThemeConfig } from '@/lib/types';

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="stat-box">
      <div className="text-[9px] md:text-[10px] text-white/20 uppercase tracking-wider font-medium leading-tight">{label}</div>
      <div className={`text-sm md:text-lg lg:text-xl font-bold timer-font leading-tight mt-0.5 ${accent ? 'text-blue-400' : 'text-white/60'}`}>{value}</div>
    </div>
  );
}

function Inner() {
  const params = useSearchParams();
  const displayId = params.get('display') || '';
  const targetIdParam = params.get('id') || '';
  const { tournaments, displays, themes, sound, displayToggles } = useStore();
  const assignment = displays.find(d => d.displayId === displayId);
  const defaultId = assignment?.targetId || targetIdParam || tournaments[0]?.id || '';
  const themeId = assignment?.themeId || 'come-on-blue';
  const theme: ThemeConfig | undefined = themes.find(t => t.id === themeId) || themes[0];
  const running = tournaments.filter(t => t.status === 'running' || t.status === 'paused');
  const [selectedId, setSelectedId] = useState(defaultId);
  const activeId = assignment?.targetId || selectedId || defaultId;
  const tournament: Tournament | undefined = tournaments.find(t => t.id === activeId);
  const [displayMs, setDisplayMs] = useState(0);
  const prevRef = useRef(-1);
  const warnRef = useRef(false);
  const [trans, setTrans] = useState(false);

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
        if (p.displays) useStore.setState({ displays: p.displays as never });
        if (p.themes) useStore.setState({ themes: p.themes as never });
        if (p.sound) useStore.setState({ sound: p.sound as never });
        if (p.displayToggles) useStore.setState({ displayToggles: p.displayToggles as never });
      }
    });
  }, []);

  const computeRem = useCallback(() => {
    if (!tournament) return 0;
    if (tournament.status === 'running' && tournament.timerStartedAt) return Math.max(0, tournament.remainingMs - (Date.now() - tournament.timerStartedAt));
    return tournament.remainingMs;
  }, [tournament]);

  useEffect(() => {
    if (!tournament) return;
    const iv = setInterval(() => { const r = computeRem(); setDisplayMs(r); if (r <= 0 && tournament.status === 'running') useStore.getState().tTick(tournament.id); }, 200);
    return () => clearInterval(iv);
  }, [tournament, computeRem]);

  useEffect(() => {
    if (!tournament) return;
    if (prevRef.current === -1) { prevRef.current = tournament.currentLevelIndex; return; }
    if (prevRef.current !== tournament.currentLevelIndex) {
      prevRef.current = tournament.currentLevelIndex; warnRef.current = false;
      setTrans(true); setTimeout(() => setTrans(false), 500);
      if (tournament.status === 'running') {
        const lv = tournament.levels[tournament.currentLevelIndex];
        if (lv?.type === 'break') {
          if (sound.breakStartEnabled) playSound(sound.soundPreset, sound.masterVolume);
          const m = sound.ttsMessages.find(x => x.enabled && (x.label.includes('ブレイク') || x.label.includes('休憩') || x.label.toLowerCase().includes('break')));
          if (sound.ttsEnabled && m) speakTTS(fillTTSTemplate(m.template, { level: lv.level, sb: lv.smallBlind, bb: lv.bigBlind, ante: lv.ante }), sound.ttsLang);
        } else if (lv) {
          if (sound.blindChangeEnabled) playSound(sound.soundPreset, sound.masterVolume);
          const m = sound.ttsMessages.find(x => x.enabled && (x.label.includes('レベル') || x.label.toLowerCase().includes('level')));
          if (sound.ttsEnabled && m) speakTTS(fillTTSTemplate(m.template, { level: lv.level, sb: lv.smallBlind, bb: lv.bigBlind, ante: lv.ante }), sound.ttsLang);
        }
      }
    }
  }, [tournament?.currentLevelIndex, tournament?.status, sound]);

  useEffect(() => {
    if (!tournament || tournament.status !== 'running') return;
    if (displayMs <= 60000 && displayMs > 55000 && !warnRef.current) {
      warnRef.current = true;
      if (sound.oneMinWarningEnabled) playWarningBeep(sound.masterVolume);
      const m = sound.ttsMessages.find(x => x.enabled && (x.label.includes('残り') || x.label.toLowerCase().includes('min')));
      if (sound.ttsEnabled && m) speakTTS(fillTTSTemplate(m.template, { level: 0, sb: 0, bb: 0, ante: 0 }), sound.ttsLang);
    }
  }, [displayMs, tournament, sound]);

  if (!tournament) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e1a' }}>
      <div className="text-center text-white/25"><p className="text-xl font-bold">No Tournament</p><p className="text-sm mt-2">Operator画面から設定してください</p></div>
    </div>
  );

  const dt = displayToggles;
  const cur = tournament.levels[tournament.currentLevelIndex];
  const nextPlay = tournament.levels.slice(tournament.currentLevelIndex + 1).find(l => l.type === 'play');
  const isBrk = cur?.type === 'break';
  const isWarn = displayMs <= 60000 && tournament.status === 'running' && !isBrk;
  const dur = cur ? cur.duration * 1000 : 1;
  const prog = 1 - displayMs / dur;
  let lvNum = 0;
  for (let i = 0; i <= tournament.currentLevelIndex; i++) if (tournament.levels[i]?.type === 'play') lvNum++;
  const totalLvs = tournament.levels.filter(l => l.type === 'play').length;
  const ttb = computeTimeToBreak(tournament.levels, tournament.currentLevelIndex, displayMs);
  const tte = computeTimeToEnd(tournament.levels, tournament.currentLevelIndex, displayMs);
  const regClose = computeRegCloseTime(tournament.levels, tournament.currentLevelIndex, displayMs, tournament.regCloseLevel);
  const totalChips = (tournament.entryCount + tournament.rebuyCount + tournament.addonCount) * tournament.startingChips;
  const avg = tournament.entryCount > 0 ? Math.round(totalChips / tournament.entryCount) : 0;
  const pool = (tournament.entryCount + tournament.rebuyCount) * tournament.buyInAmount;
  const pc = theme?.primaryColor || '#60a5fa';

  const bgStyle = theme?.type === 'gradient'
    ? { background: `linear-gradient(135deg, ${theme.gradientFrom || '#0f172a'}, ${theme.gradientTo || '#1e3a5f'})` }
    : theme?.type === 'image' && theme.imageUrl
    ? { backgroundImage: `url(${theme.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: theme?.bgColor || '#0a0e1a' };

  return (
    <div className={`min-h-screen flex flex-col select-none overflow-hidden relative ${isBrk ? 'break-bg' : ''}`} style={bgStyle}>
      {/* Background image from display settings */}
      {dt.backgroundImageUrl && (
        <div className="absolute inset-0 z-0" style={{ backgroundImage: `url(${dt.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      )}
      {/* Overlay */}
      {theme && theme.overlayOpacity > 0 && <div className="absolute inset-0 bg-black pointer-events-none z-[1]" style={{ opacity: theme.overlayOpacity / 100 }} />}
      {dt.backgroundImageUrl && <div className="absolute inset-0 bg-black/40 pointer-events-none z-[1]" />}

      {/* Tab bar for multiple tournaments */}
      {running.length > 1 && (
        <div className="relative z-20 flex justify-center py-2 bg-black/20">
          <div className="tab-bar">{running.map(rt => <div key={rt.id} className={`tab-item ${rt.id === activeId ? 'active' : ''}`} onClick={() => setSelectedId(rt.id)}>{rt.name}</div>)}</div>
        </div>
      )}

      {/* Tournament name banner */}
      {dt.showTournamentName && (
        <div className="relative z-10 w-full py-2 md:py-3 bg-black/25 border-b border-white/[0.06]">
          <div className="text-center">
            <span className="text-base md:text-xl lg:text-2xl font-bold text-white/70 tracking-wide">{tournament.name}</span>
            {dt.showLevelInfo && <span className="text-xs md:text-sm text-white/20 ml-4 font-medium">Level {lvNum}/{totalLvs}</span>}
          </div>
        </div>
      )}

      {/* Level indicator */}
      {dt.showLevelInfo && (
        <div className={`relative z-10 text-center py-2 md:py-3 transition-opacity duration-400 ${trans ? 'opacity-0' : 'opacity-100'}`}>
          {isBrk ? (
            <div className="px-8 py-2 inline-block rounded-xl bg-green-500/10 border border-green-500/15">
              <span className="text-green-400 text-2xl md:text-4xl lg:text-5xl font-black tracking-[0.2em]">BREAK</span>
            </div>
          ) : (
            <span className="text-white/25 text-xl md:text-3xl lg:text-4xl font-black tracking-[0.3em] uppercase">LEVEL {cur?.level || '-'}</span>
          )}
        </div>
      )}

      {/* Main area: Left stats | Timer + Blinds | Right stats */}
      <div className={`relative z-10 flex-1 flex items-stretch px-2 md:px-4 gap-2 md:gap-3 transition-opacity duration-400 ${trans ? 'opacity-0' : 'opacity-100'}`}>
        {/* Left panel - desktop only */}
        <div className="hidden md:flex flex-col w-40 lg:w-52 gap-1.5 py-2">
          <StatBox label="Rebuy" value={String(tournament.rebuyCount)} />
          <StatBox label="Add-on" value={String(tournament.addonCount)} />
          <StatBox label="Avg Stack" value={avg > 0 ? formatChips(avg) : '--'} />
        </div>

        {/* Center: Timer + Blinds */}
        <div className="flex-1 flex flex-col items-center justify-center gap-1 md:gap-3 min-w-0">
          {/* Timer */}
          {dt.showTimer && (
            <div className={`text-[16vw] md:text-[13vw] lg:text-[11vw] font-black timer-font leading-none transition-colors duration-300 ${isWarn ? 'text-amber-400 warning-pulse' : isBrk ? 'text-green-400' : 'text-white'}`}>
              {formatTimer(displayMs)}
            </div>
          )}

          {/* Blinds */}
          {dt.showBlinds && cur && !isBrk && (
            <div className="text-center">
              <div className="text-4xl md:text-6xl lg:text-[7vw] font-black leading-none tracking-tight" style={{ color: pc }}>
                {cur.smallBlind.toLocaleString()} / {cur.bigBlind.toLocaleString()}
              </div>
              {cur.ante > 0 && (
                <div className="text-base md:text-xl lg:text-2xl text-white/25 font-semibold mt-1">
                  Ante {cur.ante.toLocaleString()}
                </div>
              )}
            </div>
          )}

          {/* Mobile-only: compact stats row */}
          <div className="flex md:hidden items-center gap-3 mt-2 flex-wrap justify-center">
            {tournament.rebuyCount > 0 && <div className="text-[10px] text-white/20"><span className="text-white/30 font-bold">{tournament.rebuyCount}</span> Rebuy</div>}
            {tournament.addonCount > 0 && <div className="text-[10px] text-white/20"><span className="text-white/30 font-bold">{tournament.addonCount}</span> Add-on</div>}
            {avg > 0 && <div className="text-[10px] text-white/20">Avg <span className="text-white/30 font-bold">{formatChips(avg)}</span></div>}
            {ttb !== null && <div className="text-[10px] text-white/20">Break <span className="text-white/30 font-bold timer-font">{formatTimer(ttb)}</span></div>}
            <div className="text-[10px] text-white/20">End <span className="text-white/30 font-bold timer-font">{formatTimerHMS(tte)}</span></div>
          </div>
        </div>

        {/* Right panel - desktop only */}
        <div className="hidden md:flex flex-col w-40 lg:w-52 gap-1.5 py-2">
          <StatBox label="Corner Time" value={formatTimerHMS(tte)} />
          <StatBox label="Reg Close" value={regClose !== null ? formatTimer(regClose) : '--:--'} />
          <StatBox label="Next Break" value={ttb !== null ? formatTimer(ttb) : '--:--'} />
        </div>
      </div>

      {/* Progress bar */}
      {dt.showProgressBar && (
        <div className="relative z-10 w-full h-1.5 md:h-2 bg-white/[0.03]">
          <div className="h-full transition-all duration-500" style={{
            width: `${Math.min(prog * 100, 100)}%`,
            background: isWarn ? 'linear-gradient(to right, #f59e0b, #ef4444)' : isBrk ? '#22c55e' : `linear-gradient(to right, ${pc}, ${theme?.accentColor || '#93c5fd'})`
          }} />
        </div>
      )}

      {/* Bottom info bar: Players | Buy-in | ... | Ante */}
      {dt.showFooter && (
        <div className="relative z-10 flex items-center justify-between px-3 md:px-6 py-2 bg-black/20 border-t border-white/[0.04]">
          <div className="flex items-center gap-4 md:gap-6">
            {dt.showEntryCount && tournament.entryCount > 0 && (
              <div className="text-center">
                <div className="text-[8px] md:text-[9px] text-white/15 uppercase tracking-wider">Players</div>
                <div className="text-sm md:text-base font-bold text-white/60">{tournament.entryCount}</div>
              </div>
            )}
            {tournament.buyInAmount > 0 && (
              <div className="text-center">
                <div className="text-[8px] md:text-[9px] text-white/15 uppercase tracking-wider">Buy-in</div>
                <div className="text-sm md:text-base font-bold text-white/60">&yen;{tournament.buyInAmount.toLocaleString()}</div>
              </div>
            )}
            {dt.showChipInfo && totalChips > 0 && (
              <div className="text-center">
                <div className="text-[8px] md:text-[9px] text-white/15 uppercase tracking-wider">Total Chips</div>
                <div className="text-sm md:text-base font-bold text-white/60">{formatChips(totalChips)}</div>
              </div>
            )}
          </div>
          {/* Prize pool */}
          {dt.showPrizeStructure && pool > 0 && (
            <div className="text-center">
              <div className="text-[8px] md:text-[9px] text-white/15 uppercase tracking-wider">Prize Pool</div>
              <div className="text-sm md:text-base font-bold text-blue-400">&yen;{pool.toLocaleString()}</div>
            </div>
          )}
          {cur && cur.ante > 0 && (
            <div className="text-center">
              <div className="text-[8px] md:text-[9px] text-white/15 uppercase tracking-wider">Ante</div>
              <div className="text-sm md:text-base font-bold text-white/60">{cur.ante.toLocaleString()}</div>
            </div>
          )}
        </div>
      )}

      {/* Next blinds */}
      {dt.showNextLevel && nextPlay && (
        <div className="relative z-10 text-center py-1.5 md:py-2 bg-black/15 border-t border-white/[0.03]">
          <span className="text-xs md:text-sm text-white/15 mr-2 uppercase tracking-wider">Next</span>
          <span className="text-sm md:text-lg font-bold text-white/30">
            {nextPlay.ante > 0 && <span className="text-white/20">Ante {nextPlay.ante.toLocaleString()}{' '}</span>}
            {nextPlay.smallBlind.toLocaleString()} / {nextPlay.bigBlind.toLocaleString()}
          </span>
        </div>
      )}

      {/* Ticker banner */}
      {dt.tickerText && (
        <div className="relative z-10 w-full py-1.5 md:py-2 bg-black/30 border-t border-white/[0.04] overflow-hidden">
          <div className="ticker-container">
            <span className="ticker-scroll text-xs md:text-sm font-medium text-white/35 px-4">
              {dt.tickerText}
            </span>
          </div>
        </div>
      )}

      {/* COME ON Timer branding - display pages (mobile) */}
      <div className="md:hidden absolute top-2 left-3 z-30">
        <span className="text-xs font-black text-blue-400/40 tracking-tight">COME ON</span>
        <span className="text-white/10 font-medium text-[9px] ml-1">Timer</span>
      </div>

      {/* Idle overlay */}
      {tournament.status === 'idle' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="text-center space-y-4 fade-in-up">
            <div className="text-4xl md:text-6xl font-black text-blue-400 glow-pulse">COME ON Timer</div>
            <div className="text-lg text-white/20 font-medium">{tournament.name}</div>
            <div className="text-white/10 text-sm tracking-wider">Waiting to Start</div>
          </div>
        </div>
      )}
      {tournament.status === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="text-3xl md:text-5xl font-black text-white/40 tracking-widest animate-pulse">PAUSED</div>
        </div>
      )}
      {tournament.status === 'finished' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="text-center space-y-4 fade-in-up">
            <div className="text-4xl md:text-6xl font-black text-blue-400">FINISHED</div>
            <div className="text-lg text-white/20 font-medium">{tournament.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TournamentDisplayPage() {
  return <Suspense fallback={<div className="min-h-screen" style={{ background: '#0a0e1a' }} />}><Inner /></Suspense>;
}
