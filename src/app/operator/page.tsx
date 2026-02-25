'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { formatTimer, formatTimerHMS, formatChips, uid } from '@/lib/utils';
import { PRESET_OPTIONS } from '@/lib/presets';
import { playSound, playTestSound, playWarningBeep, speakTTS, fillTTSTemplate, PRESET_LABELS } from '@/lib/audio';
import { BlindLevel, Tournament, CashGame, SoundPreset, PrizeEntry } from '@/lib/types';

export default function OperatorPage() {
  const [tab, setTab] = useState<'tournaments' | 'cash' | 'displays' | 'settings'>('tournaments');
  return (
    <div className="min-h-screen pb-mobile" style={{ background: 'linear-gradient(160deg, #0e1c36 0%, #152d52 50%, #1c3d6e 100%)' }}>
      {/* Glass Header */}
      <div className="g-topbar px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-black text-blue-400 tracking-tight">COME ON</span>
          <span className="text-white/20 font-medium text-xs">Timer</span>
        </div>
        <span className="text-xs text-white/25 font-medium tracking-wider uppercase">Operator</span>
      </div>

      {/* Glass Tab Nav */}
      <nav className="flex px-3 py-2 gap-1.5 border-b border-white/[0.06]">
        {(['tournaments', 'cash', 'displays', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${tab === t ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04] border border-transparent'}`}>
            {t === 'tournaments' ? 'Tournaments' : t === 'cash' ? 'Cash Games' : t === 'displays' ? 'Displays' : 'Settings'}
          </button>
        ))}
      </nav>
      <div className="p-4 max-w-4xl mx-auto">
        {tab === 'tournaments' && <TournamentsTab />}
        {tab === 'cash' && <CashTab />}
        {tab === 'displays' && <DisplaysTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function TournamentsTab() {
  const { tournaments, addTournament } = useStore();
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id || '');
  useEffect(() => { if (!selectedId && tournaments.length) setSelectedId(tournaments[0].id); }, [tournaments, selectedId]);
  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-2 flex-wrap">
        {tournaments.map(t => (
          <button key={t.id} onClick={() => setSelectedId(t.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${selectedId === t.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/[0.05] text-white/40 hover:text-white/60 border border-white/[0.08] hover:border-white/[0.15]'}`}>
            {t.name}
            <span className={`ml-2 text-xs ${t.status === 'running' ? 'text-green-400' : t.status === 'paused' ? 'text-amber-400' : 'text-white/20'}`}>
              {t.status === 'running' ? 'LIVE' : t.status === 'paused' ? 'PAUSED' : t.status === 'finished' ? 'END' : ''}
            </span>
          </button>
        ))}
        <button onClick={() => { const id = addTournament(`Tournament ${tournaments.length + 1}`); setSelectedId(id); }} className="btn btn-ghost btn-sm">+ Add</button>
      </div>
      {selectedId && <TournamentEditor id={selectedId} />}
    </div>
  );
}

function TournamentEditor({ id }: { id: string }) {
  const store = useStore();
  const t = store.tournaments.find(x => x.id === id);
  if (!t) return null;
  return (
    <div className="space-y-4 fade-in">
      <div className="g-card p-4 space-y-4">
        <div className="flex items-center gap-3">
          <input className="input flex-1" value={t.name} onChange={e => store.updateTournament(id, { name: e.target.value })} placeholder="Tournament name" />
          <button onClick={() => store.removeTournament(id)} className="btn btn-danger btn-sm">Delete</button>
        </div>
        <TournamentTimer tournament={t} />
      </div>
      <div className="g-card p-4"><TournamentStats tournament={t} /></div>
      <div className="g-card p-4"><PrizeEditor tournament={t} /></div>
      <div className="g-card p-4"><BlindEditor tournament={t} /></div>
    </div>
  );
}

function TournamentTimer({ tournament: t }: { tournament: Tournament }) {
  const store = useStore();
  const [displayMs, setDisplayMs] = useState(t.remainingMs);
  const prevLevelRef = useRef(t.currentLevelIndex);
  const warnedRef = useRef(false);
  const computeRem = useCallback(() => {
    if (t.status === 'running' && t.timerStartedAt) return Math.max(0, t.remainingMs - (Date.now() - t.timerStartedAt));
    return t.remainingMs;
  }, [t.status, t.timerStartedAt, t.remainingMs]);
  useEffect(() => {
    const iv = setInterval(() => { const r = computeRem(); setDisplayMs(r); if (r <= 0 && t.status === 'running') store.tTick(t.id); }, 200);
    return () => clearInterval(iv);
  }, [computeRem, t.status, t.id, store]);
  useEffect(() => {
    if (prevLevelRef.current !== t.currentLevelIndex) {
      prevLevelRef.current = t.currentLevelIndex;
      warnedRef.current = false;
      if (t.status === 'running') {
        const lv = t.levels[t.currentLevelIndex];
        if (lv?.type === 'break') {
          if (store.sound.breakStartEnabled) playSound(store.sound.soundPreset, store.sound.masterVolume);
          fireTTS(store, 'break', lv);
        } else if (lv) {
          if (store.sound.blindChangeEnabled) playSound(store.sound.soundPreset, store.sound.masterVolume);
          fireTTS(store, 'level', lv);
        }
      }
    }
  }, [t.currentLevelIndex, t.status, t.levels, store]);
  useEffect(() => {
    if (t.status !== 'running') return;
    if (displayMs <= 60000 && displayMs > 55000 && !warnedRef.current) {
      warnedRef.current = true;
      if (store.sound.oneMinWarningEnabled) playWarningBeep(store.sound.masterVolume);
      fireTTS(store, 'warning', null);
    }
  }, [displayMs, t.status, store]);
  const curLevel = t.levels[t.currentLevelIndex];
  const isBreak = curLevel?.type === 'break';
  const duration = curLevel ? curLevel.duration * 1000 : 1;
  const progress = (duration - displayMs) / duration;
  const isWarning = displayMs <= 60000 && t.status === 'running' && !isBreak;
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    store.tSeek(t.id, ratio * duration);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>{isBreak ? <span className="text-green-400 font-bold text-lg">BREAK</span> : curLevel ? <span className="text-white/60 text-sm font-medium">Level {curLevel.level} — {curLevel.smallBlind.toLocaleString()}/{curLevel.bigBlind.toLocaleString()}{curLevel.ante > 0 ? ` (Ante ${curLevel.ante.toLocaleString()})` : ''}</span> : null}</div>
        <div className={`text-3xl font-bold timer-font ${isWarning ? 'text-amber-400' : isBreak ? 'text-green-400' : 'text-white'}`}>{formatTimer(displayMs)}</div>
      </div>
      <div className="seek-bar bg-white/5 h-2 rounded" onClick={handleSeek}>
        <div className="seek-fill rounded" style={{ width: `${Math.min(progress * 100, 100)}%`, background: isWarning ? 'linear-gradient(to right, #f59e0b, #ef4444)' : isBreak ? '#22c55e' : 'linear-gradient(to right, #2563eb, #60a5fa)' }} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => store.tPrevLevel(t.id)} className="btn btn-ghost btn-sm">Prev</button>
        {t.status === 'idle' && <button onClick={() => store.tStart(t.id)} className="btn btn-primary">Start</button>}
        {t.status === 'running' && <button onClick={() => store.tPause(t.id)} className="btn btn-warning">Pause</button>}
        {t.status === 'paused' && <button onClick={() => store.tResume(t.id)} className="btn btn-success">Resume</button>}
        {t.status === 'finished' && <button onClick={() => store.tReset(t.id)} className="btn btn-ghost">Restart</button>}
        {(t.status === 'running' || t.status === 'paused') && <button onClick={() => store.tReset(t.id)} className="btn btn-danger btn-sm">Reset</button>}
        <button onClick={() => store.tNextLevel(t.id)} className="btn btn-ghost btn-sm">Next</button>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => store.tAdjust(t.id, -30000)} className="btn btn-ghost btn-sm">-30s</button>
          <button onClick={() => store.tAdjust(t.id, 30000)} className="btn btn-ghost btn-sm">+30s</button>
          <button onClick={() => store.tAdjust(t.id, -60000)} className="btn btn-ghost btn-sm">-1m</button>
          <button onClick={() => store.tAdjust(t.id, 60000)} className="btn btn-ghost btn-sm">+1m</button>
        </div>
      </div>
    </div>
  );
}

function TournamentStats({ tournament: t }: { tournament: Tournament }) {
  const up = (p: Partial<Tournament>) => useStore.getState().updateTournament(t.id, p);
  const totalPlayLevels = t.levels.filter(l => l.type === 'play').length;

  const toLocalDatetime = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Tournament Info</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><label className="text-[11px] text-white/25 block mb-1">Starting Chips</label><input type="number" className="input input-sm" value={t.startingChips} onChange={e => up({ startingChips: +e.target.value })} /></div>
        <div><label className="text-[11px] text-white/25 block mb-1">Entries</label><div className="flex gap-1"><button className="btn btn-ghost btn-sm" onClick={() => up({ entryCount: Math.max(0, t.entryCount - 1) })}>-</button><input type="number" className="input input-sm text-center" value={t.entryCount} onChange={e => up({ entryCount: Math.max(0, +e.target.value) })} /><button className="btn btn-ghost btn-sm" onClick={() => up({ entryCount: t.entryCount + 1 })}>+</button></div></div>
        <div><label className="text-[11px] text-white/25 block mb-1">Rebuys</label><div className="flex gap-1"><button className="btn btn-ghost btn-sm" onClick={() => up({ rebuyCount: Math.max(0, t.rebuyCount - 1) })}>-</button><input type="number" className="input input-sm text-center" value={t.rebuyCount} onChange={e => up({ rebuyCount: Math.max(0, +e.target.value) })} /><button className="btn btn-ghost btn-sm" onClick={() => up({ rebuyCount: t.rebuyCount + 1 })}>+</button></div></div>
        <div><label className="text-[11px] text-white/25 block mb-1">Add-ons</label><div className="flex gap-1"><button className="btn btn-ghost btn-sm" onClick={() => up({ addonCount: Math.max(0, (t.addonCount || 0) - 1) })}>-</button><input type="number" className="input input-sm text-center" value={t.addonCount || 0} onChange={e => up({ addonCount: Math.max(0, +e.target.value) })} /><button className="btn btn-ghost btn-sm" onClick={() => up({ addonCount: (t.addonCount || 0) + 1 })}>+</button></div></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><label className="text-[11px] text-white/25 block mb-1">Buy-in (&yen;)</label><input type="number" className="input input-sm" value={t.buyInAmount} onChange={e => up({ buyInAmount: +e.target.value })} /></div>
        <div>
          <label className="text-[11px] text-white/25 block mb-1">Reg Close Level</label>
          <select className="input input-sm" value={t.regCloseLevel || 0} onChange={e => up({ regCloseLevel: +e.target.value || undefined })}>
            <option value={0}>-- None --</option>
            {Array.from({ length: totalPlayLevels }, (_, i) => (
              <option key={i + 1} value={i + 1}>Level {i + 1}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[11px] text-white/25 block mb-1">Scheduled Start (開始予定時刻)</label>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              className="input input-sm flex-1"
              value={t.scheduledStartTime ? toLocalDatetime(t.scheduledStartTime) : ''}
              onChange={e => up({ scheduledStartTime: e.target.value ? new Date(e.target.value).getTime() : null })}
            />
            {t.scheduledStartTime && (
              <button className="btn btn-ghost btn-sm" onClick={() => up({ scheduledStartTime: null })}>Clear</button>
            )}
          </div>
          <p className="text-[10px] text-white/15 mt-1">設定すると開催前のディスプレイにカウントダウンが表示されます</p>
        </div>
      </div>
    </div>
  );
}

function PrizeEditor({ tournament: t }: { tournament: Tournament }) {
  const update = (p: PrizeEntry[]) => useStore.getState().updateTournament(t.id, { prizeStructure: p });
  const pool = (t.entryCount + t.rebuyCount) * t.buyInAmount;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Prize Structure</div>
        <button className="btn btn-ghost btn-sm" onClick={() => update([...t.prizeStructure, { place: t.prizeStructure.length + 1, percent: 0 }])}>+ Add</button>
      </div>
      {t.prizeStructure.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-white/30 w-6">{p.place}位</span>
          <input type="number" className="input input-sm w-20" value={p.percent} onChange={e => { const arr = [...t.prizeStructure]; arr[i] = { ...arr[i], percent: +e.target.value }; update(arr); }} min={0} max={100} />
          <span className="text-xs text-white/20">%</span>
          <span className="text-xs text-white/40 ml-2">&yen;{pool > 0 ? Math.round(pool * p.percent / 100).toLocaleString() : '0'}</span>
          <button className="btn btn-danger btn-sm ml-auto" onClick={() => update(t.prizeStructure.filter((_, j) => j !== i))}>x</button>
        </div>
      ))}
    </div>
  );
}

function BlindEditor({ tournament: t }: { tournament: Tournament }) {
  const store = useStore();
  const addLevel = (type: 'play' | 'break') => {
    const levels = [...t.levels];
    const last = [...levels].reverse().find(l => l.type === 'play');
    if (type === 'play') levels.push({ level: (last?.level || 0) + 1, type: 'play', smallBlind: (last?.smallBlind || 100) * 2, bigBlind: (last?.bigBlind || 200) * 2, ante: last?.ante || 0, duration: last?.duration || 900 });
    else levels.push({ level: 0, type: 'break', smallBlind: 0, bigBlind: 0, ante: 0, duration: 600 });
    store.updateTournament(t.id, { levels });
  };
  const upLv = (i: number, p: Partial<BlindLevel>) => { const lvs = t.levels.map((l, j) => j === i ? { ...l, ...p } : l); store.updateTournament(t.id, { levels: lvs }); };
  const rmLv = (i: number) => store.updateTournament(t.id, { levels: t.levels.filter((_, j) => j !== i) });
  const loadPreset = (p: typeof PRESET_OPTIONS[number]) => store.updateTournament(t.id, { levels: [...p.levels], currentLevelIndex: 0, remainingMs: p.levels[0].duration * 1000, status: 'idle', timerStartedAt: null });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Blind Structure</div>
        <div className="flex gap-1">{PRESET_OPTIONS.map(p => <button key={p.value} onClick={() => loadPreset(p)} className="btn btn-ghost btn-sm">{p.label}</button>)}</div>
      </div>
      <div className="space-y-1">
        {t.levels.map((lv, i) => (
          <div key={i} className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${i === t.currentLevelIndex ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/[0.02]'}`}>
            <button onClick={() => store.tJumpLevel(t.id, i)} className="text-[11px] text-white/20 hover:text-blue-400 w-5 text-center cursor-pointer transition-colors">{i === t.currentLevelIndex ? '\u25B8' : (i + 1)}</button>
            {lv.type === 'break' ? (
              <><span className="text-green-400 text-xs font-semibold flex-1">BREAK</span><input type="number" className="input input-sm w-16 text-center" value={Math.floor(lv.duration / 60)} onChange={e => upLv(i, { duration: +e.target.value * 60 })} min={1} /><span className="text-[11px] text-white/20">min</span></>
            ) : (
              <><span className="text-[11px] text-white/30 w-6">Lv{lv.level}</span><input type="number" className="input input-sm w-16" value={lv.smallBlind} onChange={e => upLv(i, { smallBlind: +e.target.value })} /><span className="text-white/15">/</span><input type="number" className="input input-sm w-16" value={lv.bigBlind} onChange={e => upLv(i, { bigBlind: +e.target.value })} /><span className="text-[11px] text-white/20 ml-1">A:</span><input type="number" className="input input-sm w-14" value={lv.ante} onChange={e => upLv(i, { ante: +e.target.value })} /><input type="number" className="input input-sm w-14 text-center" value={Math.floor(lv.duration / 60)} onChange={e => upLv(i, { duration: +e.target.value * 60 })} min={1} /><span className="text-[11px] text-white/20">m</span></>
            )}
            <button onClick={() => rmLv(i)} className="text-white/15 hover:text-red-400 text-xs ml-1 transition-colors">x</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2"><button onClick={() => addLevel('play')} className="btn btn-ghost btn-sm">+ Level</button><button onClick={() => addLevel('break')} className="btn btn-success btn-sm">+ Break</button></div>
    </div>
  );
}

function CashTab() {
  const { cashGames, addCashGame, removeCashGame } = useStore();
  const [selectedId, setSelectedId] = useState(cashGames[0]?.id || '');

  useEffect(() => {
    if (cashGames.length === 0) {
      setSelectedId('');
      return;
    }
    if (!cashGames.find(c => c.id === selectedId)) {
      setSelectedId(cashGames[0]?.id || '');
    }
  }, [cashGames, selectedId]);

  const handleDelete = (id: string) => {
    removeCashGame(id);
    if (id === selectedId) {
      const remaining = cashGames.filter(c => c.id !== id);
      setSelectedId(remaining[0]?.id || '');
    }
  };

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-2 flex-wrap">
        {cashGames.map(c => (
          <button key={c.id} onClick={() => setSelectedId(c.id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${selectedId === c.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/[0.05] text-white/40 border border-white/[0.08] hover:border-white/[0.15]'}`}>
            {c.name}{c.status === 'running' && <span className="ml-2 text-xs text-green-400">LIVE</span>}
          </button>
        ))}
        <button onClick={() => { const id = addCashGame(`Cash ${cashGames.length + 1}`); setSelectedId(id); }} className="btn btn-ghost btn-sm">+ Add</button>
      </div>
      {selectedId && <CashEditor id={selectedId} onDelete={handleDelete} />}
      {cashGames.length === 0 && (
        <div className="g-card p-8 text-center text-white/20">
          <p className="text-sm">No cash games. Click &quot;+ Add&quot; to create one.</p>
        </div>
      )}
    </div>
  );
}

function CashEditor({ id, onDelete }: { id: string; onDelete: (id: string) => void }) {
  const store = useStore();
  const c = store.cashGames.find(x => x.id === id);

  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!c) return;
    setCountdown(c.countdownRemainingMs);
    const iv = setInterval(() => {
      if (c.status === 'running' && c.timerStartedAt) {
        const e = Date.now() - c.timerStartedAt;
        setElapsed(c.elapsedMs + e);
        if (c.countdownMode) setCountdown(Math.max(0, c.countdownRemainingMs - e));
      } else { setElapsed(c.elapsedMs); setCountdown(c.countdownRemainingMs); }
    }, 500);
    return () => clearInterval(iv);
  }, [c]);

  if (!c) return null;

  return (
    <div className="g-card p-4 space-y-4 fade-in">
      <div className="flex items-center gap-3">
        <input className="input flex-1" value={c.name} onChange={e => store.updateCashGame(id, { name: e.target.value })} placeholder="Cash game name" />
        <button onClick={() => onDelete(id)} className="btn btn-danger btn-sm">Delete</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-[11px] text-white/25 block mb-1">SB</label><input type="number" className="input input-sm" value={c.smallBlind} onChange={e => store.updateCashGame(id, { smallBlind: +e.target.value })} /></div>
        <div><label className="text-[11px] text-white/25 block mb-1">BB</label><input type="number" className="input input-sm" value={c.bigBlind} onChange={e => store.updateCashGame(id, { bigBlind: +e.target.value })} /></div>
        <div><label className="text-[11px] text-white/25 block mb-1">Ante</label><input type="number" className="input input-sm" value={c.ante} onChange={e => store.updateCashGame(id, { ante: +e.target.value })} /></div>
      </div>
      <div><label className="text-[11px] text-white/25 block mb-1">Memo</label><input className="input" value={c.memo} onChange={e => store.updateCashGame(id, { memo: e.target.value })} placeholder="Table info" /></div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2"><div className={`toggle ${!c.countdownMode ? 'on' : ''}`} onClick={() => store.updateCashGame(id, { countdownMode: false })} /><span className="text-xs text-white/40">Count Up</span></div>
        <div className="flex items-center gap-2"><div className={`toggle ${c.countdownMode ? 'on' : ''}`} onClick={() => store.updateCashGame(id, { countdownMode: true })} /><span className="text-xs text-white/40">Countdown</span></div>
        {c.countdownMode && <div className="flex items-center gap-1 ml-2"><input type="number" className="input input-sm w-16" value={Math.floor(c.countdownTotalMs / 60000)} onChange={e => { const ms = +e.target.value * 60000; store.updateCashGame(id, { countdownTotalMs: ms, countdownRemainingMs: ms }); }} min={1} /><span className="text-xs text-white/20">min</span></div>}
      </div>
      <div className="text-center py-2"><div className="text-4xl font-bold timer-font text-white">{c.countdownMode ? formatTimerHMS(countdown) : formatTimerHMS(elapsed)}</div></div>
      <div className="flex items-center justify-center gap-2">
        {c.status === 'idle' && <button onClick={() => store.cStart(id)} className="btn btn-primary">Start</button>}
        {c.status === 'running' && <button onClick={() => store.cPause(id)} className="btn btn-warning">Pause</button>}
        {c.status === 'paused' && <button onClick={() => store.cResume(id)} className="btn btn-success">Resume</button>}
        {c.status !== 'idle' && <button onClick={() => store.cReset(id)} className="btn btn-danger btn-sm">Reset</button>}
      </div>
    </div>
  );
}

/* ── Display Preview (scaled iframe) ── */
function DisplayPreview({ route, displayId }: { route: string; displayId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        setScale(w / 1280);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const src = route === 'split'
    ? `/display/split?display=${displayId}`
    : route === 'cash'
    ? `/display/cash?display=${displayId}`
    : `/display/tournament?display=${displayId}`;

  return (
    <div ref={containerRef} className="mt-3 rounded-xl overflow-hidden border border-white/[0.08] bg-black/30 relative" style={{ height: `${Math.round(scale * 720)}px` }}>
      <iframe
        src={src}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1280px',
          height: '720px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          border: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function DisplaysTab() {
  const { displays, tournaments, cashGames, themes, setDisplay, removeDisplay } = useStore();
  const [newId, setNewId] = useState('');

  const detectType = (id: string): 'tournament' | 'cash' => {
    if (cashGames.find(c => c.id === id)) return 'cash';
    return 'tournament';
  };

  const allTimers = [
    ...tournaments.map(t => ({ id: t.id, name: t.name, kind: 'tournament' as const })),
    ...cashGames.map(c => ({ id: c.id, name: c.name, kind: 'cash' as const })),
  ];

  return (
    <div className="space-y-4 fade-in">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Display Assignments</div>
      <div className="g-card p-3 space-y-2">
        <p className="text-xs text-white/20">ディスプレイURLに <code className="text-blue-400/60">?display=TV1</code> を付けてアクセス</p>
        <div className="text-[10px] text-white/15 space-y-0.5">
          <div>Tournament: <code className="text-blue-400/40">/display/tournament?display=TV1</code></div>
          <div>Cash: <code className="text-blue-400/40">/display/cash?display=TV1</code></div>
          <div>Split (2画面): <code className="text-blue-400/40">/display/split?display=TV1</code></div>
        </div>
      </div>
      {displays.map(d => (
        <div key={d.displayId} className="g-card p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-sm text-blue-400 min-w-[60px]">{d.displayId}</span>
            <select className="input input-sm w-32" value={d.route} onChange={e => {
              const route = e.target.value as 'tournament' | 'cash' | 'split';
              if (route === 'split') {
                const firstId = allTimers[0]?.id || '';
                const secondId = allTimers[1]?.id || allTimers[0]?.id || '';
                setDisplay({ ...d, route, targetId: firstId, leftRoute: detectType(firstId), splitTargetId: secondId, splitRoute: detectType(secondId) });
              } else {
                setDisplay({ ...d, route, targetId: route === 'tournament' ? (tournaments[0]?.id || '') : (cashGames[0]?.id || '') });
              }
            }}>
              <option value="tournament">Tournament</option>
              <option value="cash">Cash</option>
              <option value="split">Split (2画面)</option>
            </select>
            {d.route !== 'split' && (
              <select className="input input-sm w-40" value={d.targetId} onChange={e => setDisplay({ ...d, targetId: e.target.value })}>
                {d.route === 'tournament' ? tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>) : cashGames.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <select className="input input-sm w-32" value={d.themeId} onChange={e => setDisplay({ ...d, themeId: e.target.value })}>{themes.map(th => <option key={th.id} value={th.id}>{th.name}</option>)}</select>
            <button onClick={() => removeDisplay(d.displayId)} className="btn btn-danger btn-sm ml-auto">Remove</button>
          </div>
          {/* Split panel selection */}
          {d.route === 'split' && (
            <div className="space-y-2 pl-4 border-l-2 border-blue-500/20 ml-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-white/40 font-semibold w-16">左パネル</span>
                <select className="input input-sm flex-1 max-w-[200px]" value={d.targetId} onChange={e => {
                  const id = e.target.value;
                  setDisplay({ ...d, targetId: id, leftRoute: detectType(id) });
                }}>
                  {tournaments.length > 0 && <optgroup label="Tournament">{tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
                  {cashGames.length > 0 && <optgroup label="Cash Game">{cashGames.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                </select>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${detectType(d.targetId) === 'tournament' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                  {detectType(d.targetId) === 'tournament' ? 'Tournament' : 'Cash'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-white/40 font-semibold w-16">右パネル</span>
                <select className="input input-sm flex-1 max-w-[200px]" value={d.splitTargetId || ''} onChange={e => {
                  const id = e.target.value;
                  setDisplay({ ...d, splitTargetId: id, splitRoute: detectType(id) });
                }}>
                  {tournaments.length > 0 && <optgroup label="Tournament">{tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>}
                  {cashGames.length > 0 && <optgroup label="Cash Game">{cashGames.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                </select>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${detectType(d.splitTargetId || '') === 'tournament' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                  {detectType(d.splitTargetId || '') === 'tournament' ? 'Tournament' : 'Cash'}
                </span>
              </div>
            </div>
          )}
          {/* Live Preview */}
          <DisplayPreview route={d.route} displayId={d.displayId} />
        </div>
      ))}
      <div className="flex gap-2">
        <input className="input w-32" value={newId} onChange={e => setNewId(e.target.value)} placeholder="e.g. TV1" />
        <button className="btn btn-primary" onClick={() => { if (!newId.trim()) return; setDisplay({ displayId: newId.trim(), route: 'tournament', targetId: tournaments[0]?.id || '', themeId: 'come-on-blue' }); setNewId(''); }}>Add Display</button>
      </div>
    </div>
  );
}

function SettingsTab() {
  return <div className="space-y-6 fade-in"><SoundPanel /><DisplaySettingsPanel /><TogglesPanel /></div>;
}

function SoundPanel() {
  const { sound, updateSound } = useStore();
  return (
    <div className="g-card p-4 space-y-4">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Sound Settings</div>
      <div className="flex items-center gap-3"><span className="text-sm text-white/50 w-20">Volume</span><input type="range" min={0} max={1} step={0.05} value={sound.masterVolume} onChange={e => updateSound({ masterVolume: +e.target.value })} className="flex-1" /><span className="text-sm text-white/30 w-10 text-right">{Math.round(sound.masterVolume * 100)}%</span></div>
      <div className="flex items-center gap-3"><span className="text-sm text-white/50 w-20">Sound</span>
        <select className="input input-sm flex-1" value={sound.soundPreset} onChange={e => updateSound({ soundPreset: e.target.value as SoundPreset })}>
          {(Object.keys(PRESET_LABELS) as SoundPreset[]).map(k => <option key={k} value={k}>{PRESET_LABELS[k]}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => playTestSound(sound.soundPreset, sound.masterVolume)}>Test</button>
      </div>
      {(['blindChangeEnabled', 'breakStartEnabled', 'oneMinWarningEnabled'] as const).map(k => (
        <div key={k} className="flex items-center justify-between"><span className="text-sm text-white/50">{k === 'blindChangeEnabled' ? 'Blind Change' : k === 'breakStartEnabled' ? 'Break Start' : '1-Min Warning'}</span><div className={`toggle ${sound[k] ? 'on' : ''}`} onClick={() => updateSound({ [k]: !sound[k] })} /></div>
      ))}
      <div className="border-t border-white/5 pt-4 space-y-3">
        <div className="flex items-center justify-between"><span className="text-sm text-white/50">TTS (読み上げ)</span><div className={`toggle ${sound.ttsEnabled ? 'on' : ''}`} onClick={() => updateSound({ ttsEnabled: !sound.ttsEnabled })} /></div>
        {sound.ttsEnabled && <>
          <div className="flex items-center gap-3"><span className="text-xs text-white/30 w-20">Lang</span><select className="input input-sm flex-1" value={sound.ttsLang} onChange={e => updateSound({ ttsLang: e.target.value as 'ja' | 'en' })}><option value="ja">日本語</option><option value="en">English</option></select></div>
          <div className="space-y-2">
            <div className="text-xs text-white/20">Messages (&#123;level&#125;, &#123;sb&#125;, &#123;bb&#125;, &#123;ante&#125;)</div>
            {sound.ttsMessages.map((msg, i) => (
              <div key={msg.id} className="flex items-center gap-2">
                <div className={`toggle ${msg.enabled ? 'on' : ''}`} onClick={() => { const m = [...sound.ttsMessages]; m[i] = { ...m[i], enabled: !m[i].enabled }; updateSound({ ttsMessages: m }); }} />
                <input className="input input-sm w-24" value={msg.label} onChange={e => { const m = [...sound.ttsMessages]; m[i] = { ...m[i], label: e.target.value }; updateSound({ ttsMessages: m }); }} />
                <input className="input input-sm flex-1" value={msg.template} onChange={e => { const m = [...sound.ttsMessages]; m[i] = { ...m[i], template: e.target.value }; updateSound({ ttsMessages: m }); }} />
                <button className="btn btn-ghost btn-sm" onClick={() => speakTTS(fillTTSTemplate(msg.template, { level: 5, sb: 200, bb: 400, ante: 50 }), sound.ttsLang)}>Test</button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => updateSound({ ttsMessages: [...sound.ttsMessages, { id: uid(), label: 'Custom', template: '', enabled: true }] })}>+ Add</button>
          </div>
        </>}
      </div>
    </div>
  );
}

function DisplaySettingsPanel() {
  const { displayToggles: dt, updateDisplayToggles: up } = useStore();
  const speedOptions = [
    { value: 15, label: 'Fast (15s)' },
    { value: 20, label: 'Medium-Fast (20s)' },
    { value: 25, label: 'Normal (25s)' },
    { value: 35, label: 'Slow (35s)' },
    { value: 50, label: 'Very Slow (50s)' },
  ];
  return (
    <div className="g-card p-4 space-y-4">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Display Settings</div>
      <div>
        <label className="text-[11px] text-white/25 block mb-1">Ticker Text (テロップ)</label>
        <input
          className="input"
          value={dt.tickerText}
          onChange={e => up({ tickerText: e.target.value })}
          placeholder="画面下部に表示するテキストを入力..."
        />
        <p className="text-[10px] text-white/15 mt-1">ディスプレイ画面の下部にスクロール表示されます</p>
      </div>
      <div>
        <label className="text-[11px] text-white/25 block mb-1">Ticker Speed (テロップ速度)</label>
        <select
          className="input input-sm"
          value={dt.tickerSpeed || 25}
          onChange={e => up({ tickerSpeed: +e.target.value })}
        >
          {speedOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-white/15 mt-1">テロップのスクロール速度を選択</p>
      </div>
      <div>
        <label className="text-[11px] text-white/25 block mb-1">Background Image URL (背景画像)</label>
        <input
          className="input"
          value={dt.backgroundImageUrl}
          onChange={e => up({ backgroundImageUrl: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />
        <p className="text-[10px] text-white/15 mt-1">トーナメント表示画面の背景画像URL</p>
      </div>
    </div>
  );
}

function TogglesPanel() {
  const { displayToggles: dt, updateDisplayToggles: up } = useStore();
  const items: { key: keyof typeof dt; label: string }[] = [
    { key: 'showTournamentName', label: 'Tournament Name' }, { key: 'showLevelInfo', label: 'Level Info' },
    { key: 'showBlinds', label: 'Blinds' }, { key: 'showTimer', label: 'Timer' },
    { key: 'showProgressBar', label: 'Progress Bar' }, { key: 'showNextLevel', label: 'Next Level' },
    { key: 'showTimeToBreak', label: 'Time to Break' }, { key: 'showTimeToEnd', label: 'Time to End' },
    { key: 'showPrizeStructure', label: 'Prize Structure' }, { key: 'showEntryCount', label: 'Entry Count' },
    { key: 'showChipInfo', label: 'Chip Info' }, { key: 'showFooter', label: 'Footer' },
    { key: 'showCashRate', label: 'Cash: Rate' }, { key: 'showCashMemo', label: 'Cash: Memo' },
    { key: 'showCashTimer', label: 'Cash: Timer' },
  ];
  return (
    <div className="g-card p-4 space-y-3">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Display Elements</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-1"><span className="text-sm text-white/50">{label}</span><div className={`toggle ${dt[key] ? 'on' : ''}`} onClick={() => up({ [key]: !dt[key] })} /></div>
        ))}
      </div>
    </div>
  );
}

function fireTTS(store: ReturnType<typeof useStore.getState>, event: 'level' | 'break' | 'warning', lv: BlindLevel | null) {
  if (!store.sound.ttsEnabled) return;
  const msgs = store.sound.ttsMessages.filter(m => m.enabled);
  const vars = { level: String(lv?.level || ''), sb: String(lv?.smallBlind || ''), bb: String(lv?.bigBlind || ''), ante: String(lv?.ante || '') };
  for (const msg of msgs) {
    const text = fillTTSTemplate(msg.template, vars);
    if (event === 'level' && (msg.label.includes('レベル') || msg.label.toLowerCase().includes('level'))) { speakTTS(text, store.sound.ttsLang); return; }
    if (event === 'break' && (msg.label.includes('ブレイク') || msg.label.includes('休憩') || msg.label.toLowerCase().includes('break'))) { speakTTS(text, store.sound.ttsLang); return; }
    if (event === 'warning' && (msg.label.includes('残り') || msg.label.toLowerCase().includes('min'))) { speakTTS(text, store.sound.ttsLang); return; }
  }
}
