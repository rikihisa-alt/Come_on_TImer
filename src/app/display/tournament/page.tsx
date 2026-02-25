'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';
import { onSync } from '@/lib/sync';
import { unlockAudio, playSound, playWarningBeep, speakTTS, fillTTSTemplate } from '@/lib/audio';
import { formatTimer, formatChips, formatTimerHMS, computeTimeToBreak, computeTimeToEnd, computeRegCloseTime } from '@/lib/utils';
import { Tournament, ThemeConfig } from '@/lib/types';

/* ── Reusable stat cell for the left/right columns ── */
function StatCell({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center px-2 py-1 border-b border-white/[0.06] last:border-b-0 ${className || ''}`}>
      <div className="text-[10px] md:text-xs text-white/30 uppercase tracking-wider font-medium leading-tight">{label}</div>
      <div className="text-lg md:text-2xl lg:text-3xl font-bold text-white/70 timer-font leading-tight mt-0.5">{value}</div>
    </div>
  );
}

/* ── Bottom bar cell ── */
function BottomCell({ label, value, wide, accent }: { label: string; value: string; wide?: boolean; accent?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center py-2 md:py-3 ${wide ? 'flex-[2]' : 'flex-1'} border-r border-white/[0.06] last:border-r-0`}>
      <div className="text-[9px] md:text-[11px] text-white/25 uppercase tracking-wider font-medium">{label}</div>
      <div className={`text-xl md:text-3xl lg:text-4xl font-black timer-font leading-tight mt-0.5 ${accent ? 'text-blue-400' : 'text-white/80'}`}>{value}</div>
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

  // Sound effects on level change
  useEffect(() => {
    if (!tournament) return;
    if (prevRef.current === -1) { prevRef.current = tournament.currentLevelIndex; return; }
    if (prevRef.current !== tournament.currentLevelIndex) {
      prevRef.current = tournament.currentLevelIndex; warnRef.current = false;
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

  // 1-min warning
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
  const totalLvs = tournament.levels.filter(l => l.type === 'play').length;
  const ttb = computeTimeToBreak(tournament.levels, tournament.currentLevelIndex, displayMs);
  const tte = computeTimeToEnd(tournament.levels, tournament.currentLevelIndex, displayMs);
  const regClose = computeRegCloseTime(tournament.levels, tournament.currentLevelIndex, displayMs, tournament.regCloseLevel);
  const totalChips = (tournament.entryCount + tournament.rebuyCount + tournament.addonCount) * tournament.startingChips;
  const avg = tournament.entryCount > 0 ? Math.round(totalChips / tournament.entryCount) : 0;
  const pc = theme?.primaryColor || '#60a5fa';

  const bgStyle = dt.backgroundImageUrl
    ? { backgroundImage: `url(${dt.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : theme?.type === 'gradient'
    ? { background: `linear-gradient(135deg, ${theme.gradientFrom || '#0f172a'}, ${theme.gradientTo || '#1e3a5f'})` }
    : theme?.type === 'image' && theme.imageUrl
    ? { backgroundImage: `url(${theme.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: theme?.bgColor || '#0a0e1a' };

  return (
    <div className={`min-h-screen flex flex-col select-none overflow-hidden relative ${isBrk ? 'break-bg' : ''}`} style={bgStyle}>
      {/* Overlay for bg image readability */}
      {(dt.backgroundImageUrl || (theme?.type === 'image' && theme.imageUrl)) && (
        <div className="absolute inset-0 bg-black/50 pointer-events-none z-[1]" />
      )}
      {theme && theme.overlayOpacity > 0 && <div className="absolute inset-0 bg-black pointer-events-none z-[1]" style={{ opacity: theme.overlayOpacity / 100 }} />}

      {/* Tab bar for multiple tournaments */}
      {running.length > 1 && (
        <div className="relative z-20 flex justify-center py-1.5 bg-black/30">
          <div className="tab-bar">{running.map(rt => <div key={rt.id} className={`tab-item ${rt.id === activeId ? 'active' : ''}`} onClick={() => setSelectedId(rt.id)}>{rt.name}</div>)}</div>
        </div>
      )}

      {/* ═══ TOP BANNER: Logo + Tournament Name ═══ */}
      <div className="relative z-10 flex items-center px-3 md:px-5 py-2 md:py-3 bg-black/30 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm md:text-base font-black text-blue-400 tracking-tight">COME ON</span>
          <span className="text-white/20 font-medium text-[10px] md:text-xs">Timer</span>
        </div>
        <div className="flex-1 text-center">
          <span className="text-base md:text-xl lg:text-2xl font-bold text-white/70 tracking-wide">{tournament.name}</span>
        </div>
        {dt.showLevelInfo && (
          <div className="text-xs md:text-sm text-white/25 font-medium shrink-0">
            {isBrk ? 'BREAK' : `Lv${cur?.level || '-'}`}/{totalLvs}
          </div>
        )}
      </div>

      {/* ═══ MAIN 3-COLUMN GRID ═══ */}
      <div className="relative z-10 flex-1 flex border-b border-white/[0.06]">
        {/* ── LEFT COLUMN: Rebuy / Add-on / Avg Stack ── */}
        <div className="hidden md:flex flex-col w-[18%] lg:w-[16%] border-r border-white/[0.08] bg-black/15">
          <StatCell label="Rebuy" value={String(tournament.rebuyCount)} />
          <StatCell label="Add-on" value={String(tournament.addonCount)} />
          <StatCell label="Avg Stack" value={avg > 0 ? formatChips(avg) : '--'} />
        </div>

        {/* ── CENTER: Level + Timer ── */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Level indicator */}
          {dt.showLevelInfo && (
            <div className="mb-1 md:mb-2">
              {isBrk ? (
                <span className="text-green-400 text-2xl md:text-4xl lg:text-5xl font-black tracking-[0.15em]">BREAK</span>
              ) : (
                <span className="text-white/30 text-xl md:text-3xl lg:text-4xl font-black tracking-[0.2em]">Level {cur?.level || '-'}</span>
              )}
            </div>
          )}

          {/* TIMER (massive) */}
          {dt.showTimer && (
            <div className={`text-[18vw] md:text-[14vw] lg:text-[12vw] font-black timer-font leading-[0.9] transition-colors duration-300 ${isWarn ? 'text-amber-400 warning-pulse' : isBrk ? 'text-green-400' : 'text-white'}`}>
              {formatTimer(displayMs)}
            </div>
          )}

          {/* Progress bar (inside center area) */}
          {dt.showProgressBar && (
            <div className="w-4/5 h-1.5 md:h-2 bg-white/[0.04] rounded-full mt-2 md:mt-3 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{
                width: `${Math.min(prog * 100, 100)}%`,
                background: isWarn ? 'linear-gradient(to right, #f59e0b, #ef4444)' : isBrk ? '#22c55e' : `linear-gradient(to right, ${pc}, ${theme?.accentColor || '#93c5fd'})`
              }} />
            </div>
          )}

          {/* Mobile-only compact stats */}
          <div className="flex md:hidden items-center gap-3 mt-3 flex-wrap justify-center text-[10px] text-white/25">
            <span>R:<span className="text-white/40 font-bold">{tournament.rebuyCount}</span></span>
            <span>A:<span className="text-white/40 font-bold">{tournament.addonCount}</span></span>
            {avg > 0 && <span>Avg:<span className="text-white/40 font-bold">{formatChips(avg)}</span></span>}
            {ttb !== null && <span>Brk:<span className="text-white/40 font-bold timer-font">{formatTimer(ttb)}</span></span>}
            <span>End:<span className="text-white/40 font-bold timer-font">{formatTimerHMS(tte)}</span></span>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Corner Time / Reg Close / Next Break ── */}
        <div className="hidden md:flex flex-col w-[18%] lg:w-[16%] border-l border-white/[0.08] bg-black/15">
          <StatCell label="Corner Time" value={formatTimerHMS(tte)} />
          <StatCell label={tournament.regCloseLevel ? `Reg Close Lv${tournament.regCloseLevel}` : 'Reg Close'} value={regClose !== null ? formatTimer(regClose) : 'N/A'} />
          <StatCell label="Next Break" value={ttb !== null ? formatTimerHMS(ttb) : '--:--:--'} />
        </div>
      </div>

      {/* ═══ BOTTOM BAR: Players | Blinds (widest) | BB Ante ═══ */}
      {dt.showFooter && (
        <div className="relative z-10 flex bg-black/25 border-b border-white/[0.06]">
          <BottomCell label="Players" value={`${tournament.entryCount}`} />
          <BottomCell label="Blinds" value={cur && !isBrk ? `${cur.smallBlind.toLocaleString()}/${cur.bigBlind.toLocaleString()}` : '--'} wide accent />
          <BottomCell label="BB Ante" value={cur && cur.ante > 0 ? cur.ante.toLocaleString() : '--'} />
        </div>
      )}

      {/* ═══ NEXT BLINDS ═══ */}
      {dt.showNextLevel && nextPlay && (
        <div className="relative z-10 flex items-center justify-center py-1.5 md:py-2 bg-black/15 border-b border-white/[0.04]">
          <span className="text-[10px] md:text-xs text-white/20 mr-2 uppercase tracking-wider font-medium">Next</span>
          <span className="text-sm md:text-lg font-bold text-white/40 timer-font">
            {nextPlay.ante > 0 && <span className="text-white/25">Ante {nextPlay.ante.toLocaleString()} </span>}
            {nextPlay.smallBlind.toLocaleString()} / {nextPlay.bigBlind.toLocaleString()}
          </span>
        </div>
      )}

      {/* ═══ TICKER BANNER ═══ */}
      {dt.tickerText && (
        <div className="relative z-10 w-full py-1.5 bg-black/30 border-b border-white/[0.04] overflow-hidden">
          <div className="ticker-container">
            <span className="ticker-scroll text-xs md:text-sm font-medium text-white/35 px-4">{dt.tickerText}</span>
          </div>
        </div>
      )}

      {/* ═══ OVERLAYS ═══ */}
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
