'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';
import { onSync } from '@/lib/sync';
import { unlockAudio, playSound, playWarningBeep, speakTTS, fillTTSTemplate } from '@/lib/audio';
import { formatTimer, formatChips, formatTimerHMS, computeTimeToBreak, computeTimeToEnd, computeRegCloseTime } from '@/lib/utils';
import { Tournament, ThemeConfig, DisplayToggles, SoundSettings } from '@/lib/types';
import { DEFAULT_DISPLAY_TOGGLES, DEFAULT_SOUND } from '@/lib/presets';
import { FullscreenButton } from '@/components/FullscreenButton';

/* ── Timer Selector dropdown ── */
function TimerSelector({ selectedId, onSelect, tournaments }: {
  selectedId: string;
  onSelect: (id: string) => void;
  tournaments: Tournament[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const current = tournaments.find(t => t.id === selectedId);
  if (tournaments.length <= 1) return null;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] hover:border-white/[0.2] transition-all duration-200 cursor-pointer">
        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400">T</span>
        <span className="text-[10px] lg:text-xs text-white/60 font-medium truncate max-w-[160px]">{current?.name || '\u9078\u629E'}</span>
        <svg className={`w-2.5 h-2.5 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 min-w-[220px] g-card p-1.5 overflow-hidden">
          {tournaments.map(t => (
            <button key={t.id} onClick={() => { onSelect(t.id); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.08] transition-colors ${t.id === selectedId ? 'bg-white/[0.06]' : ''}`}>
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

/* ── Glass Stat Card ── */
function GlassStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="g-card-inner p-3 lg:p-4 flex-1 min-h-0 text-center">
      <div className="text-[9px] lg:text-[11px] text-white/35 uppercase tracking-wider font-semibold mb-1.5">{label}</div>
      <div className={`text-base lg:text-xl xl:text-2xl font-bold timer-font leading-tight ${accent ? 'text-blue-400' : 'text-white/75'}`}>{value}</div>
    </div>
  );
}

function Inner() {
  const params = useSearchParams();
  const displayId = params.get('display') || '';
  const targetIdParam = params.get('id') || '';
  const { tournaments, displays, themes, sound: globalSound, displayToggles: globalToggles } = useStore();
  const assignment = displays.find(d => d.displayId === displayId);
  const defaultId = assignment?.targetId || targetIdParam || tournaments[0]?.id || '';
  const themeId = assignment?.themeId || 'come-on-blue';
  const theme: ThemeConfig | undefined = themes.find(t => t.id === themeId) || themes[0];
  const [selectedId, setSelectedId] = useState(defaultId);
  const activeId = assignment?.targetId || selectedId || defaultId;
  const tournament: Tournament | undefined = tournaments.find(t => t.id === activeId);
  const [displayMs, setDisplayMs] = useState(0);
  const prevRef = useRef(-1);
  const warnRef = useRef(false);

  /* Pre-tournament countdown */
  const [preCountdown, setPreCountdown] = useState(0);
  useEffect(() => {
    if (!tournament || tournament.status !== 'idle' || !tournament.scheduledStartTime) {
      setPreCountdown(0);
      return;
    }
    const update = () => {
      const diff = (tournament.scheduledStartTime || 0) - Date.now();
      setPreCountdown(Math.max(0, diff));
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [tournament?.status, tournament?.scheduledStartTime]);

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
      if (tournament.status === 'running') {
        const lv = tournament.levels[tournament.currentLevelIndex];
        const s = tournament.sound || globalSound;
        if (lv?.type === 'break') {
          if (s.breakStartEnabled) playSound(s.soundPreset, s.masterVolume);
          const m = s.ttsMessages.find(x => x.enabled && (x.label.includes('\u30D6\u30EC\u30A4\u30AF') || x.label.includes('\u4F11\u61A9') || x.label.toLowerCase().includes('break')));
          if (s.ttsEnabled && m) speakTTS(fillTTSTemplate(m.template, { level: lv.level, sb: lv.smallBlind, bb: lv.bigBlind, ante: lv.ante }), s.ttsLang);
        } else if (lv) {
          if (s.blindChangeEnabled) playSound(s.soundPreset, s.masterVolume);
          const m = s.ttsMessages.find(x => x.enabled && (x.label.includes('\u30EC\u30D9\u30EB') || x.label.toLowerCase().includes('level')));
          if (s.ttsEnabled && m) speakTTS(fillTTSTemplate(m.template, { level: lv.level, sb: lv.smallBlind, bb: lv.bigBlind, ante: lv.ante }), s.ttsLang);
        }
      }
    }
  }, [tournament?.currentLevelIndex, tournament?.status, tournament?.sound, globalSound]);

  useEffect(() => {
    if (!tournament || tournament.status !== 'running') return;
    const s = tournament.sound || globalSound;
    if (displayMs <= 60000 && displayMs > 55000 && !warnRef.current) {
      warnRef.current = true;
      if (s.oneMinWarningEnabled) playWarningBeep(s.masterVolume);
      const m = s.ttsMessages.find(x => x.enabled && (x.label.includes('\u6B8B\u308A') || x.label.toLowerCase().includes('min')));
      if (s.ttsEnabled && m) speakTTS(fillTTSTemplate(m.template, { level: 0, sb: 0, bb: 0, ante: 0 }), s.ttsLang);
    }
  }, [displayMs, tournament, globalSound]);

  if (!tournament) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0e1c36, #152d52, #1c3d6e)' }}>
      <div className="g-card p-8 text-center text-white/40"><p className="text-xl font-bold">No Tournament</p><p className="text-sm mt-2 text-white/25">Operator画面から設定してください</p></div>
    </div>
  );

  const dt = tournament.displayToggles || globalToggles;
  const snd = tournament.sound || globalSound;
  const tickerSpeed = dt.tickerSpeed || 25;
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
    ? { background: `linear-gradient(160deg, ${theme.gradientFrom || '#0e1c36'}, ${theme.gradientTo || '#1c3d6e'})` }
    : theme?.type === 'image' && theme.imageUrl
    ? { backgroundImage: `url(${theme.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'linear-gradient(160deg, #0e1c36 0%, #152d52 50%, #1c3d6e 100%)' };

  const showPreCountdown = tournament.status === 'idle' && tournament.scheduledStartTime && preCountdown > 0;

  return (
    <div className={`min-h-screen flex flex-col select-none overflow-hidden relative ${isBrk ? 'break-bg' : ''}`} style={bgStyle}>
      {/* BG Overlays */}
      {(dt.backgroundImageUrl || (theme?.type === 'image' && theme.imageUrl)) && (
        <div className="absolute inset-0 bg-black/50 pointer-events-none z-[1]" />
      )}
      {theme && theme.overlayOpacity > 0 && <div className="absolute inset-0 bg-black pointer-events-none z-[1]" style={{ opacity: theme.overlayOpacity / 100 }} />}

      {/* ═══ Glass Top Bar ═══ */}
      <div className="g-topbar relative z-10 flex items-center px-4 md:px-6 py-2.5 md:py-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm md:text-base font-black text-blue-400 tracking-tight">COME ON</span>
          <span className="text-white/25 font-medium text-[10px] md:text-xs">Timer</span>
        </div>
        <div className="flex-1 flex items-center justify-center gap-3">
          <TimerSelector selectedId={activeId} onSelect={setSelectedId} tournaments={tournaments} />
          {dt.showTournamentName && (
            <span className="text-lg md:text-2xl lg:text-3xl font-black text-white/70 tracking-wide truncate max-w-[50vw]">{tournament.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dt.showLevelInfo && (
            <div className="text-xs md:text-sm text-white/30 font-medium">
              {isBrk ? 'BREAK' : `Lv${cur?.level || '-'}`}/{totalLvs}
            </div>
          )}
          <FullscreenButton />
        </div>
      </div>

      {/* ═══ Main Dashboard Grid ═══ */}
      <div className="relative z-10 flex-1 flex p-2.5 md:p-3 lg:p-4 gap-2.5 md:gap-3 lg:gap-4 min-h-0">

        {/* ── Left Stats Column (desktop) ── */}
        <div className="hidden md:flex flex-col gap-2.5 lg:gap-3 w-[130px] lg:w-[155px] xl:w-[175px]">
          <GlassStat label="Players" value={`${tournament.entryCount}`} accent />
          <GlassStat label="Rebuy" value={String(tournament.rebuyCount)} />
          <GlassStat label="Add-on" value={String(tournament.addonCount)} />
          <GlassStat label="Avg Stack" value={avg > 0 ? formatChips(avg) : '--'} />
        </div>

        {/* ── Center Column ── */}
        <div className="flex-1 flex flex-col gap-2.5 md:gap-3 min-h-0">

          {/* Main Timer Card */}
          <div className="g-card flex-1 flex flex-col items-center justify-center p-3 md:p-5 relative overflow-hidden min-h-0">
            {/* Level indicator */}
            {dt.showLevelInfo && (
              <div className="mb-1 md:mb-2">
                {isBrk ? (
                  <span className="text-green-400 text-xl md:text-3xl lg:text-4xl font-black tracking-[0.15em]">BREAK</span>
                ) : (
                  <span className="text-white/25 text-base md:text-2xl lg:text-3xl font-black tracking-[0.2em]">Level {cur?.level || '-'}</span>
                )}
              </div>
            )}

            {/* TIMER */}
            {dt.showTimer && (
              <div className={`text-[17vw] md:text-[13vw] lg:text-[11vw] font-black timer-font leading-[0.85] transition-colors duration-300 ${isWarn ? 'text-amber-400 warning-pulse' : isBrk ? 'text-green-400' : 'text-white'}`}>
                {formatTimer(displayMs)}
              </div>
            )}

            {/* Progress bar */}
            {dt.showProgressBar && (
              <div className="w-[80%] h-1.5 md:h-2 bg-white/[0.06] rounded-full mt-2 md:mt-4 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${Math.min(prog * 100, 100)}%`,
                  background: isWarn ? 'linear-gradient(to right, #f59e0b, #ef4444)' : isBrk ? '#22c55e' : `linear-gradient(to right, ${pc}, ${theme?.accentColor || '#93c5fd'})`
                }} />
              </div>
            )}

            {/* Blinds */}
            {dt.showFooter && cur && !isBrk && (
              <div className="mt-2 md:mt-4 text-center">
                <div className="text-2xl md:text-4xl lg:text-5xl font-black timer-font" style={{ color: pc }}>
                  {cur.smallBlind.toLocaleString()} / {cur.bigBlind.toLocaleString()}
                </div>
                {cur.ante > 0 && (
                  <div className="text-sm md:text-lg text-white/30 font-semibold mt-1">Ante {cur.ante.toLocaleString()}</div>
                )}
              </div>
            )}

            {/* Mobile compact stats */}
            <div className="flex md:hidden items-center gap-3 mt-3 flex-wrap justify-center text-[10px] text-white/30">
              <span>Players <span className="text-white/50 font-bold">{tournament.entryCount}</span></span>
              <span>R <span className="text-white/50 font-bold">{tournament.rebuyCount}</span></span>
              <span>A <span className="text-white/50 font-bold">{tournament.addonCount}</span></span>
              {avg > 0 && <span>Avg <span className="text-white/50 font-bold">{formatChips(avg)}</span></span>}
            </div>
          </div>

          {/* Next Level Card */}
          {dt.showNextLevel && nextPlay && (
            <div className="g-card-inner flex items-center justify-center gap-3 px-4 py-2 md:py-3">
              <span className="text-[10px] md:text-xs text-white/30 uppercase tracking-wider font-semibold">Next</span>
              <span className="text-sm md:text-lg font-bold text-white/50 timer-font">
                {nextPlay.ante > 0 && <span className="text-white/30">Ante {nextPlay.ante.toLocaleString()} </span>}
                {nextPlay.smallBlind.toLocaleString()} / {nextPlay.bigBlind.toLocaleString()}
              </span>
            </div>
          )}

          {/* Mobile info row */}
          <div className="flex md:hidden gap-2">
            <div className="g-card-inner flex-1 p-2.5 text-center">
              <div className="text-[8px] text-white/30 uppercase tracking-wider font-semibold">Corner</div>
              <div className="text-sm font-bold text-white/60 timer-font">{formatTimerHMS(tte)}</div>
            </div>
            {ttb !== null && (
              <div className="g-card-inner flex-1 p-2.5 text-center">
                <div className="text-[8px] text-white/30 uppercase tracking-wider font-semibold">Next Brk</div>
                <div className="text-sm font-bold text-white/60 timer-font">{formatTimerHMS(ttb)}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Stats Column (desktop) ── */}
        <div className="hidden md:flex flex-col gap-2.5 lg:gap-3 w-[130px] lg:w-[155px] xl:w-[175px]">
          <GlassStat label="Corner Time" value={formatTimerHMS(tte)} />
          <GlassStat label={tournament.regCloseLevel ? `Reg Close Lv${tournament.regCloseLevel}` : 'Reg Close'} value={regClose !== null ? formatTimer(regClose) : 'N/A'} />
          <GlassStat label="Next Break" value={ttb !== null ? formatTimerHMS(ttb) : '--:--:--'} />
        </div>
      </div>

      {/* ═══ Ticker ═══ */}
      {dt.tickerText && (
        <div className="relative z-10 px-2.5 md:px-3 lg:px-4 pb-2.5 md:pb-3">
          <div className="g-ticker py-2.5 md:py-3 overflow-hidden">
            <div className="ticker-container">
              <span className="ticker-scroll text-sm md:text-lg lg:text-xl font-semibold text-white/40 px-4" style={{ animationDuration: `${tickerSpeed}s` }}>{dt.tickerText}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Overlays ═══ */}
      {/* Pre-tournament countdown */}
      {showPreCountdown && (
        <div className="absolute inset-0 z-40 flex items-center justify-center g-overlay-idle">
          <div className="g-card p-8 md:p-14 text-center fade-in-up">
            <div className="text-xl md:text-3xl lg:text-4xl font-black text-white/50 tracking-wide mb-4 md:mb-6">{tournament.name}</div>
            <div className="text-sm md:text-lg text-white/25 uppercase tracking-[0.3em] font-semibold mb-3 md:mb-5">Starting In</div>
            <div className="text-5xl md:text-8xl lg:text-[10vw] font-black timer-font text-blue-400 leading-none">
              {formatTimerHMS(preCountdown)}
            </div>
          </div>
        </div>
      )}

      {/* Regular idle (no scheduled time or past time) */}
      {tournament.status === 'idle' && !showPreCountdown && (
        <div className="absolute inset-0 z-40 flex items-center justify-center g-overlay-idle">
          <div className="g-card p-8 md:p-12 text-center fade-in-up">
            <div className="text-3xl md:text-5xl font-black text-blue-400">COME ON Timer</div>
            <div className="text-base md:text-lg text-white/30 font-medium mt-3">{tournament.name}</div>
            <div className="text-white/15 text-sm tracking-wider mt-1">Waiting to Start</div>
          </div>
        </div>
      )}
      {tournament.status === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center g-overlay-pause">
          <div className="g-card px-12 py-8 md:px-16 md:py-10">
            <div className="text-3xl md:text-5xl font-black text-white/50 tracking-widest animate-pulse">PAUSED</div>
          </div>
        </div>
      )}
      {tournament.status === 'finished' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center g-overlay-idle">
          <div className="g-card p-8 md:p-12 text-center fade-in-up">
            <div className="text-3xl md:text-5xl font-black text-blue-400">FINISHED</div>
            <div className="text-base md:text-lg text-white/30 font-medium mt-3">{tournament.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TournamentDisplayPage() {
  return <Suspense fallback={<div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0e1c36, #152d52, #1c3d6e)' }} />}><Inner /></Suspense>;
}
