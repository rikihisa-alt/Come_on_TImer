'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';
import { onSync } from '@/lib/sync';
import { unlockAudio, playSound, playWarningBeep, speakTTS, fillTTSTemplate } from '@/lib/audio';
import { formatTimer, formatChips, formatTimerHMS, computeTimeToBreak, computeTimeToEnd } from '@/lib/utils';
import { Tournament, ThemeConfig } from '@/lib/types';

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
      {theme && theme.overlayOpacity > 0 && <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: theme.overlayOpacity / 100 }} />}
      {running.length > 1 && (
        <div className="relative z-20 flex justify-center py-2 bg-black/30">
          <div className="tab-bar">{running.map(rt => <div key={rt.id} className={`tab-item ${rt.id === activeId ? 'active' : ''}`} onClick={() => setSelectedId(rt.id)}>{rt.name}</div>)}</div>
        </div>
      )}
      <header className="relative z-10 flex items-center justify-between px-5 md:px-8 py-2.5 bg-black/20">
        <div className="flex items-center gap-3">
          <span className="text-base md:text-lg font-black text-blue-400 tracking-tight">COME ON</span>
          <span className="text-white/20 font-medium text-xs">Timer</span>
          {dt.showTournamentName && <span className="text-white/30 text-sm ml-3 font-medium">{tournament.name}</span>}
        </div>
        <div className="flex items-center gap-4 text-xs text-white/30 font-medium">
          {dt.showLevelInfo && <span>Level {lvNum}/{totalLvs}</span>}
          {dt.showEntryCount && tournament.entryCount > 0 && <span>Players: {tournament.entryCount}</span>}
        </div>
      </header>
      <div className="relative z-10 flex-1 flex">
        <main className={`flex-1 flex flex-col items-center justify-center px-4 gap-3 md:gap-5 transition-opacity duration-400 ${trans ? 'opacity-0' : 'opacity-100'}`}>
          {dt.showLevelInfo && (isBrk ? <div className="px-6 py-2 rounded-xl bg-green-500/10 border border-green-500/15"><span className="text-green-400 text-xl md:text-2xl font-bold tracking-widest">BREAK</span></div> : <div className="text-white/25 text-lg md:text-xl font-semibold tracking-[0.2em] uppercase">Level {cur?.level || '-'}</div>)}
          {dt.showBlinds && cur && !isBrk && <div className="text-center"><div className="text-6xl md:text-8xl lg:text-[10vw] font-black leading-none tracking-tight" style={{ color: pc }}>{cur.smallBlind.toLocaleString()} / {cur.bigBlind.toLocaleString()}</div>{cur.ante > 0 && <div className="text-xl md:text-3xl text-white/30 font-semibold mt-1">Ante {cur.ante.toLocaleString()}</div>}</div>}
          {dt.showTimer && <div className={`text-[16vw] md:text-[13vw] lg:text-[11vw] font-black timer-font leading-none transition-colors duration-300 ${isWarn ? 'text-amber-400 warning-pulse' : isBrk ? 'text-green-400' : 'text-white'}`}>{formatTimer(displayMs)}</div>}
          {dt.showProgressBar && <div className="w-full max-w-3xl h-1.5 md:h-2 bg-white/[0.04] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(prog * 100, 100)}%`, background: isWarn ? 'linear-gradient(to right, #f59e0b, #ef4444)' : isBrk ? '#22c55e' : `linear-gradient(to right, ${pc}, ${theme?.accentColor || '#93c5fd'})` }} /></div>}
          {dt.showNextLevel && nextPlay && <div className="text-lg md:text-2xl text-white/20 font-semibold">Next: {nextPlay.smallBlind.toLocaleString()} / {nextPlay.bigBlind.toLocaleString()}{nextPlay.ante > 0 && <span className="text-white/15"> (Ante {nextPlay.ante.toLocaleString()})</span>}</div>}
          <div className="flex items-center gap-6 md:gap-10 mt-1">
            {dt.showTimeToBreak && ttb !== null && <div className="text-center"><div className="text-[10px] text-white/15 uppercase tracking-wider font-medium">Break in</div><div className="text-base md:text-lg font-bold text-white/30 timer-font">{formatTimer(ttb)}</div></div>}
            {dt.showTimeToEnd && <div className="text-center"><div className="text-[10px] text-white/15 uppercase tracking-wider font-medium">End in</div><div className="text-base md:text-lg font-bold text-white/30 timer-font">{formatTimerHMS(tte)}</div></div>}
          </div>
        </main>
        {dt.showPrizeStructure && tournament.prizeStructure.length > 0 && pool > 0 && (
          <aside className="relative z-10 w-48 md:w-56 bg-black/20 border-l border-white/5 flex flex-col py-4 px-3">
            <div className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-3">Prize Pool</div>
            <div className="text-xl font-bold text-blue-400 mb-4">¥{pool.toLocaleString()}</div>
            <div className="space-y-2 flex-1">
              {tournament.prizeStructure.map((p, i) => <div key={i} className="flex items-center justify-between"><span className="text-xs text-white/25">{p.place}位</span><span className="text-sm font-bold text-white/50">¥{Math.round(pool * p.percent / 100).toLocaleString()}</span></div>)}
            </div>
          </aside>
        )}
      </div>
      {dt.showFooter && (
        <footer className="relative z-10 flex items-center justify-center gap-6 md:gap-12 px-4 py-3 bg-black/20 flex-wrap">
          {dt.showEntryCount && tournament.entryCount > 0 && <div className="text-center"><div className="text-[9px] text-white/15 uppercase tracking-wider">Entries</div><div className="text-base font-bold">{tournament.entryCount}</div></div>}
          {dt.showEntryCount && tournament.rebuyCount > 0 && <div className="text-center"><div className="text-[9px] text-white/15 uppercase tracking-wider">Rebuys</div><div className="text-base font-bold">{tournament.rebuyCount}</div></div>}
          {dt.showChipInfo && totalChips > 0 && <div className="text-center"><div className="text-[9px] text-white/15 uppercase tracking-wider">Total Chips</div><div className="text-base font-bold">{formatChips(totalChips)}</div></div>}
          {dt.showChipInfo && avg > 0 && <div className="text-center"><div className="text-[9px] text-white/15 uppercase tracking-wider">Avg Stack</div><div className="text-base font-bold">{formatChips(avg)}</div></div>}
        </footer>
      )}
      {tournament.status === 'idle' && <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60"><div className="text-center space-y-4"><div className="text-4xl md:text-6xl font-black text-blue-400">COME ON Timer</div><div className="text-lg text-white/20 font-medium">{tournament.name}</div><div className="text-white/10 text-sm">Waiting to Start</div></div></div>}
      {tournament.status === 'paused' && <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40"><div className="text-3xl md:text-5xl font-black text-white/40 tracking-widest animate-pulse">PAUSED</div></div>}
    </div>
  );
}

export default function TournamentDisplayPage() {
  return <Suspense fallback={<div className="min-h-screen" style={{ background: '#0a0e1a' }} />}><Inner /></Suspense>;
}
