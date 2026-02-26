'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { formatTimer, formatTimerHMS, formatChips, uid } from '@/lib/utils';
import { PRESET_OPTIONS, DEFAULT_DISPLAY_TOGGLES, DEFAULT_SOUND, DEFAULT_OVERLAY_STYLE } from '@/lib/presets';
import { playSound, playTestSound, playWarningBeep, speakTTS, fillTTSTemplate, PRESET_LABELS } from '@/lib/audio';
import { BlindLevel, Tournament, CashGame, SoundPreset, PrizeEntry, SoundSettings, DisplayToggles, ThemeConfig, OverlayElement, OverlayZone, OverlayFontFamily, OverlayFontSize, OverlayElementStyle } from '@/lib/types';

export default function OperatorPage() {
  const [tab, setTab] = useState<'tournaments' | 'cash' | 'settings'>('tournaments');
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0e1c36 0%, #152d52 50%, #1c3d6e 100%)' }}>
      {/* Glass Tab Nav */}
      <nav className="flex px-3 py-2 gap-1.5 border-b border-white/[0.06]">
        {(['tournaments', 'cash', 'settings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${tab === t ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04] border border-transparent'}`}>
            {t === 'tournaments' ? 'Tournaments' : t === 'cash' ? 'Cash Games' : 'Settings'}
          </button>
        ))}
      </nav>
      <div className="p-4 max-w-7xl mx-auto">
        {tab === 'tournaments' && <TournamentsTab />}
        {tab === 'cash' && <CashTab />}
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
  const [showSettings, setShowSettings] = useState(false);
  if (!t) return null;
  return (
    <div className="flex flex-col lg:flex-row gap-4 fade-in">
      {/* ── Left: Live Preview (sticky on desktop) ── */}
      <div className="lg:w-[55%] xl:w-[60%] shrink-0">
        <div className="lg:sticky lg:top-4">
          <InlinePreview timerId={id} timerType="tournament" sticky />
        </div>
      </div>

      {/* ── Right: Settings (scrollable) ── */}
      <div className="flex-1 space-y-4 min-w-0">
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

        {/* Collapsible Display & Sound Settings */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between px-4 py-3 g-card hover:bg-white/[0.04] transition-colors"
        >
          <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Display & Sound Settings</span>
          <svg className={`w-4 h-4 text-white/30 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showSettings && (
          <div className="space-y-4 fade-in">
            <div className="g-card p-4"><ThemeSelector timerId={id} timerType="tournament" /></div>
            <div className="g-card p-4"><TickerPanel timerId={id} timerType="tournament" /></div>
            <div className="g-card p-4"><TogglesPanel timerId={id} timerType="tournament" /></div>
            <div className="g-card p-4"><OverlayEditor tournament={t} /></div>
            <div className="g-card p-4"><DisplaySettingsPanel timerId={id} timerType="tournament" /></div>
            <div className="g-card p-4"><SoundPanel timerId={id} timerType="tournament" /></div>
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentTimer({ tournament: t }: { tournament: Tournament }) {
  const store = useStore();
  const snd = t.sound || DEFAULT_SOUND;
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
          if (snd.breakStartEnabled) playSound(snd.soundPreset, snd.masterVolume);
          fireTTS(snd, 'break', lv);
        } else if (lv) {
          if (snd.blindChangeEnabled) playSound(snd.soundPreset, snd.masterVolume);
          fireTTS(snd, 'level', lv);
        }
      }
    }
  }, [t.currentLevelIndex, t.status, t.levels, snd]);
  useEffect(() => {
    if (t.status !== 'running') return;
    if (displayMs <= 60000 && displayMs > 55000 && !warnedRef.current) {
      warnedRef.current = true;
      if (snd.oneMinWarningEnabled) playWarningBeep(snd.masterVolume);
      fireTTS(snd, 'warning', null);
    }
  }, [displayMs, t.status, snd]);
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

/* ── Per-Timer Panels (shared by Tournament & Cash editors) ── */

function TickerPanel({ timerId, timerType }: { timerId: string; timerType: 'tournament' | 'cash' }) {
  const store = useStore();
  const timer = timerType === 'tournament'
    ? store.tournaments.find(t => t.id === timerId)
    : store.cashGames.find(c => c.id === timerId);
  const dt = timer?.displayToggles || DEFAULT_DISPLAY_TOGGLES;
  const up = (partial: Partial<DisplayToggles>) => {
    if (timerType === 'tournament') store.updateTournamentToggles(timerId, partial);
    else store.updateCashToggles(timerId, partial);
  };
  const speedOptions = [
    { value: 15, label: 'Fast (15s)' },
    { value: 20, label: 'Medium-Fast (20s)' },
    { value: 25, label: 'Normal (25s)' },
    { value: 35, label: 'Slow (35s)' },
    { value: 50, label: 'Very Slow (50s)' },
  ];
  return (
    <div className="space-y-3">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Ticker (テロップ)</div>
      <div>
        <label className="text-[11px] text-white/25 block mb-1">Ticker Text</label>
        <input className="input" value={dt.tickerText} onChange={e => up({ tickerText: e.target.value })} placeholder="画面下部に表示するテキストを入力..." />
      </div>
      <div>
        <label className="text-[11px] text-white/25 block mb-1">Ticker Speed</label>
        <select className="input input-sm" value={dt.tickerSpeed || 25} onChange={e => up({ tickerSpeed: +e.target.value })}>
          {speedOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}

function TogglesPanel({ timerId, timerType }: { timerId: string; timerType: 'tournament' | 'cash' }) {
  const store = useStore();
  const timer = timerType === 'tournament'
    ? store.tournaments.find(t => t.id === timerId)
    : store.cashGames.find(c => c.id === timerId);
  const dt = timer?.displayToggles || DEFAULT_DISPLAY_TOGGLES;
  const up = (partial: Partial<DisplayToggles>) => {
    if (timerType === 'tournament') store.updateTournamentToggles(timerId, partial);
    else store.updateCashToggles(timerId, partial);
  };

  const tournamentItems: { key: keyof DisplayToggles; label: string }[] = [
    { key: 'showTournamentName', label: 'Tournament Name' }, { key: 'showLevelInfo', label: 'Level Info' },
    { key: 'showBlinds', label: 'Blinds' }, { key: 'showTimer', label: 'Timer' },
    { key: 'showProgressBar', label: 'Progress Bar' }, { key: 'showNextLevel', label: 'Next Level' },
    { key: 'showTimeToBreak', label: 'Time to Break' }, { key: 'showTimeToEnd', label: 'Time to End' },
    { key: 'showPrizeStructure', label: 'Prize Structure' }, { key: 'showEntryCount', label: 'Entry Count' },
    { key: 'showChipInfo', label: 'Chip Info' }, { key: 'showFooter', label: 'Footer' },
  ];
  const cashItems: { key: keyof DisplayToggles; label: string }[] = [
    { key: 'showCashRate', label: 'Rate' }, { key: 'showCashMemo', label: 'Memo' },
    { key: 'showCashTimer', label: 'Timer' },
  ];
  const items = timerType === 'tournament' ? tournamentItems : cashItems;

  return (
    <div className="space-y-3">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Display Elements</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-1">
            <span className="text-sm text-white/50">{label}</span>
            <div className={`toggle ${dt[key] ? 'on' : ''}`} onClick={() => up({ [key]: !dt[key] })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DisplaySettingsPanel({ timerId, timerType }: { timerId: string; timerType: 'tournament' | 'cash' }) {
  const store = useStore();
  const timer = timerType === 'tournament'
    ? store.tournaments.find(t => t.id === timerId)
    : store.cashGames.find(c => c.id === timerId);
  const dt = timer?.displayToggles || DEFAULT_DISPLAY_TOGGLES;
  const up = (partial: Partial<DisplayToggles>) => {
    if (timerType === 'tournament') store.updateTournamentToggles(timerId, partial);
    else store.updateCashToggles(timerId, partial);
  };
  return (
    <div className="space-y-3">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Background Image</div>
      <div>
        <label className="text-[11px] text-white/25 block mb-1">Background Image URL (背景画像)</label>
        <input
          className="input"
          value={dt.backgroundImageUrl}
          onChange={e => up({ backgroundImageUrl: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />
        <p className="text-[10px] text-white/15 mt-1">ディスプレイ画面の背景画像URL</p>
      </div>
    </div>
  );
}

function SoundPanel({ timerId, timerType }: { timerId: string; timerType: 'tournament' | 'cash' }) {
  const store = useStore();
  const timer = timerType === 'tournament'
    ? store.tournaments.find(t => t.id === timerId)
    : store.cashGames.find(c => c.id === timerId);
  const sound = timer?.sound || DEFAULT_SOUND;
  const updateSound = (partial: Partial<SoundSettings>) => {
    if (timerType === 'tournament') store.updateTournamentSound(timerId, partial);
    else store.updateCashSound(timerId, partial);
  };
  return (
    <div className="space-y-4">
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
  const [showSettings, setShowSettings] = useState(false);

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
    <div className="flex flex-col lg:flex-row gap-4 fade-in">
      {/* ── Left: Live Preview (sticky on desktop) ── */}
      <div className="lg:w-[55%] xl:w-[60%] shrink-0">
        <div className="lg:sticky lg:top-4">
          <InlinePreview timerId={id} timerType="cash" sticky />
        </div>
      </div>

      {/* ── Right: Settings (scrollable) ── */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="g-card p-4 space-y-4">
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

        {/* Collapsible Display & Sound Settings */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center justify-between px-4 py-3 g-card hover:bg-white/[0.04] transition-colors"
        >
          <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Display & Sound Settings</span>
          <svg className={`w-4 h-4 text-white/30 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {showSettings && (
          <div className="space-y-4 fade-in">
            <div className="g-card p-4"><ThemeSelector timerId={id} timerType="cash" /></div>
            <div className="g-card p-4"><TickerPanel timerId={id} timerType="cash" /></div>
            <div className="g-card p-4"><TogglesPanel timerId={id} timerType="cash" /></div>
            <div className="g-card p-4"><DisplaySettingsPanel timerId={id} timerType="cash" /></div>
            <div className="g-card p-4"><SoundPanel timerId={id} timerType="cash" /></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Overlay Editor (tournament only) ── */
function OverlayEditor({ tournament: t }: { tournament: Tournament }) {
  const store = useStore();
  const overlays = t.overlays || [];

  const addOverlay = (type: 'text' | 'divider') => {
    const newOverlay: OverlayElement = {
      id: uid(),
      type,
      content: type === 'text' ? 'Custom Text' : '',
      zone: 'center-bottom',
      style: { ...DEFAULT_OVERLAY_STYLE },
      order: overlays.length,
      visible: true,
    };
    store.addOverlay(t.id, newOverlay);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Custom Overlays</div>
        <div className="flex gap-1">
          <button className="btn btn-ghost btn-sm" onClick={() => addOverlay('text')}>+ Text</button>
          <button className="btn btn-ghost btn-sm" onClick={() => addOverlay('divider')}>+ Line</button>
        </div>
      </div>
      {overlays.length === 0 && (
        <p className="text-[11px] text-white/20">テキストや仕切り線を追加してディスプレイをカスタマイズできます</p>
      )}
      {overlays
        .sort((a, b) => a.order - b.order)
        .map((overlay) => (
          <OverlayItemEditor key={overlay.id} overlay={overlay} tournamentId={t.id} />
        ))
      }
    </div>
  );
}

function OverlayItemEditor({ overlay, tournamentId }: { overlay: OverlayElement; tournamentId: string }) {
  const store = useStore();
  const up = (partial: Partial<OverlayElement>) => store.updateOverlay(tournamentId, overlay.id, partial);
  const upStyle = (partial: Partial<OverlayElementStyle>) => up({ style: { ...overlay.style, ...partial } });

  const zoneOptions: { value: OverlayZone; label: string }[] = [
    { value: 'left', label: 'Left Sidebar' },
    { value: 'right', label: 'Right Sidebar' },
    { value: 'center-top', label: 'Center Top' },
    { value: 'center-bottom', label: 'Center Bottom' },
    { value: 'ticker-area', label: 'Above Ticker' },
  ];
  const fontFamilyOptions: { value: OverlayFontFamily; label: string }[] = [
    { value: 'default', label: 'Sans-serif' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Monospace' },
    { value: 'rounded', label: 'Rounded' },
  ];
  const fontSizeOptions: { value: OverlayFontSize; label: string }[] = [
    { value: 'xs', label: 'XS' }, { value: 'sm', label: 'S' }, { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' }, { value: 'xl', label: 'XL' }, { value: '2xl', label: '2XL' },
  ];

  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`toggle ${overlay.visible ? 'on' : ''}`} onClick={() => up({ visible: !overlay.visible })} />
          <span className="text-xs text-white/40 font-semibold uppercase">{overlay.type === 'text' ? 'Text' : 'Line'}</span>
        </div>
        <button className="text-white/20 hover:text-red-400 text-xs transition-colors" onClick={() => store.removeOverlay(tournamentId, overlay.id)}>x</button>
      </div>

      {overlay.type === 'text' && (
        <input className="input input-sm" value={overlay.content} onChange={e => up({ content: e.target.value })} placeholder="Display text..." />
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-white/25 block mb-1">Zone</label>
          <select className="input input-sm" value={overlay.zone} onChange={e => up({ zone: e.target.value as OverlayZone })}>
            {zoneOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-white/25 block mb-1">Size</label>
          <select className="input input-sm" value={overlay.style.fontSize} onChange={e => upStyle({ fontSize: e.target.value as OverlayFontSize })}>
            {fontSizeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {overlay.type === 'text' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-white/25 block mb-1">Font</label>
              <select className="input input-sm" value={overlay.style.fontFamily} onChange={e => upStyle({ fontFamily: e.target.value as OverlayFontFamily })}>
                {fontFamilyOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-white/25 block mb-1">Color</label>
              <div className="flex items-center gap-1">
                <input type="color" className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" value={overlay.style.color} onChange={e => upStyle({ color: e.target.value })} />
                <input className="input input-sm flex-1" value={overlay.style.color} onChange={e => upStyle({ color: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${overlay.style.bold ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/[0.05] text-white/30 border border-white/[0.08]'}`} onClick={() => upStyle({ bold: !overlay.style.bold })}>B</button>
            <button className={`px-2 py-1 rounded-lg text-xs italic transition-all ${overlay.style.italic ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/[0.05] text-white/30 border border-white/[0.08]'}`} onClick={() => upStyle({ italic: !overlay.style.italic })}>I</button>
            <div className="ml-2 flex items-center gap-1">
              {(['left', 'center', 'right'] as const).map(align => (
                <button key={align} className={`px-2 py-1 rounded-lg text-[10px] transition-all ${overlay.style.textAlign === align ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/[0.05] text-white/30 border border-white/[0.08]'}`} onClick={() => upStyle({ textAlign: align })}>
                  {align === 'left' ? 'L' : align === 'center' ? 'C' : 'R'}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {overlay.type === 'divider' && (
        <div>
          <label className="text-[11px] text-white/25 block mb-1">Color</label>
          <div className="flex items-center gap-1">
            <input type="color" className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" value={overlay.style.color} onChange={e => upStyle({ color: e.target.value })} />
            <input className="input input-sm flex-1" value={overlay.style.color} onChange={e => upStyle({ color: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Theme Selector (per-timer) ── */
function ThemeSelector({ timerId, timerType }: { timerId: string; timerType: 'tournament' | 'cash' }) {
  const store = useStore();
  const timer = timerType === 'tournament'
    ? store.tournaments.find(t => t.id === timerId)
    : store.cashGames.find(c => c.id === timerId);
  const currentThemeId = timer?.themeId || store.defaultThemeId || 'come-on-blue';

  const setTheme = (themeId: string) => {
    if (timerType === 'tournament') store.updateTournamentTheme(timerId, themeId);
    else store.updateCashTheme(timerId, themeId);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Color Theme</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {store.themes.map(th => (
          <button
            key={th.id}
            onClick={() => setTheme(th.id)}
            className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${currentThemeId === th.id ? 'border-blue-400 ring-1 ring-blue-400/30' : 'border-white/[0.08] hover:border-white/[0.2]'}`}
          >
            <div
              className="h-10 w-full"
              style={
                th.type === 'gradient'
                  ? { background: `linear-gradient(135deg, ${th.gradientFrom || '#0f172a'}, ${th.gradientTo || '#1e3a5f'})` }
                  : th.type === 'image' && th.imageUrl
                  ? { backgroundImage: `url(${th.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: th.bgColor || '#0a0e1a' }
              }
            />
            <div className="px-2 py-1.5 bg-white/[0.03]">
              <span className="text-[10px] text-white/50 font-medium">{th.name}</span>
            </div>
            {currentThemeId === th.id && (
              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Inline Preview (per-timer) ── */
function InlinePreview({ timerId, timerType, sticky }: { timerId: string; timerType: 'tournament' | 'cash'; sticky?: boolean }) {
  const store = useStore();
  const timer = timerType === 'tournament'
    ? store.tournaments.find(t => t.id === timerId)
    : store.cashGames.find(c => c.id === timerId);
  const themeId = timer?.themeId || store.defaultThemeId || 'come-on-blue';
  const themeName = store.themes.find(th => th.id === themeId)?.name || '';
  const [showPreview, setShowPreview] = useState(sticky ? true : false);

  const route = timerType === 'tournament' ? 'tournament' : 'cash';

  return (
    <div>
      {!sticky && (
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full flex items-center justify-between px-4 py-3 g-card hover:bg-white/[0.04] transition-colors"
        >
          <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Live Preview</span>
          <svg className={`w-4 h-4 text-white/30 transition-transform duration-200 ${showPreview ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      )}
      {showPreview && (
        <DisplayPreview
          route={route}
          displayId=""
          targetName={timer?.name || ''}
          themeLabel={themeName}
          overridePath={`/display/${route}?timer=${timerId}&theme=${themeId}`}
        />
      )}
    </div>
  );
}

/* ── Enhanced Display Preview ── */
function DisplayPreview({ route, displayId, targetName, themeLabel, overridePath }: {
  route: string; displayId: string; targetName: string; themeLabel: string; overridePath?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const [iframeKey, setIframeKey] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

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
  }, [expanded]);

  const path = overridePath || (route === 'split'
    ? `/display/split?display=${displayId}`
    : route === 'cash'
    ? `/display/cash?display=${displayId}`
    : `/display/tournament?display=${displayId}`);

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  const routeLabel = route === 'split' ? 'Split View' : route === 'cash' ? 'Cash Game' : 'Tournament';

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = () => {
    window.open(path, '_blank');
  };

  return (
    <div className="mt-3 space-y-0">
      {/* Preview Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] rounded-t-xl border border-white/[0.08] border-b-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
          route === 'tournament' ? 'bg-blue-500/20 text-blue-400' :
          route === 'cash' ? 'bg-green-500/20 text-green-400' :
          'bg-purple-500/20 text-purple-400'
        }`}>{routeLabel}</span>
        <span className="text-[11px] text-white/40 truncate">{targetName}</span>
        <span className="text-[10px] text-white/20 shrink-0">{themeLabel}</span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setIframeKey(k => k + 1)}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/25 hover:text-white/60 transition-colors" title="Refresh">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          </button>
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/25 hover:text-white/60 transition-colors" title={expanded ? 'Collapse' : 'Expand'}>
            {expanded ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
          <button onClick={handleOpen}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/25 hover:text-white/60 transition-colors" title="Open in new tab">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
        </div>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border-x border-white/[0.08]">
        <svg className="w-3 h-3 text-white/15 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
        </svg>
        <code className="text-[10px] text-blue-400/50 flex-1 truncate select-all">{fullUrl}</code>
        <button onClick={handleCopy}
          className={`text-[10px] px-2 py-0.5 rounded-md transition-all ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.05] text-white/30 hover:text-white/60 hover:bg-white/[0.1]'}`}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Preview iframe */}
      <div ref={containerRef} className="rounded-b-xl overflow-hidden border border-white/[0.08] border-t-0 bg-black/40 relative transition-all duration-300"
        style={{ height: expanded ? `${Math.round(scale * 720 * 2)}px` : `${Math.round(scale * 720)}px` }}>
        <iframe
          key={iframeKey}
          src={path}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '1280px',
            height: '720px',
            transform: `scale(${expanded ? scale * 2 : scale})`,
            transformOrigin: 'top left',
            border: 'none',
            pointerEvents: 'none',
          }}
        />
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] text-white/40 font-semibold">LIVE</span>
        </div>
      </div>
    </div>
  );
}

/* ── Settings Tab (Global Theme Only) ── */
function SettingsTab() {
  return (
    <div className="space-y-6 fade-in">
      <ThemePicker />
    </div>
  );
}

function ThemePicker() {
  const { themes, addTheme, updateTheme, removeTheme, defaultThemeId, setDefaultThemeId } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = () => {
    const newTheme: ThemeConfig = {
      id: uid(),
      name: 'Custom Theme',
      type: 'gradient',
      gradientFrom: '#0f172a',
      gradientTo: '#1e3a5f',
      overlayOpacity: 0,
      primaryColor: '#60a5fa',
      accentColor: '#22d3ee',
    };
    addTheme(newTheme);
    setEditingId(newTheme.id);
  };

  return (
    <div className="g-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Color Themes</div>
        <button className="btn btn-ghost btn-sm" onClick={handleAdd}>+ Add Theme</button>
      </div>
      <p className="text-[11px] text-white/20">システム全体のカラーテーマを管理します。各タイマーの設定で個別にテーマを選択できます。</p>

      {/* Default Theme Selector */}
      <div className="space-y-2">
        <div className="text-[11px] text-white/25 font-semibold">Default Theme (デフォルトテーマ)</div>
        <div className="flex items-center gap-2 flex-wrap">
          {themes.map(th => (
            <button
              key={th.id}
              onClick={() => setDefaultThemeId(th.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${defaultThemeId === th.id ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/[0.05] text-white/40 border border-white/[0.08] hover:border-white/[0.15]'}`}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0 border border-white/10"
                style={
                  th.type === 'gradient'
                    ? { background: `linear-gradient(135deg, ${th.gradientFrom || '#0f172a'}, ${th.gradientTo || '#1e3a5f'})` }
                    : { background: th.bgColor || '#0a0e1a' }
                }
              />
              {th.name}
              {defaultThemeId === th.id && <span className="text-[9px] text-blue-400/60">DEFAULT</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {themes.map(t => (
          <div key={t.id} className={`rounded-xl border transition-all duration-200 overflow-hidden ${editingId === t.id ? 'border-blue-500/40' : 'border-white/[0.08] hover:border-white/[0.15]'}`}>
            {/* Theme preview bar */}
            <div
              className="h-12 w-full cursor-pointer relative"
              style={
                t.type === 'gradient'
                  ? { background: `linear-gradient(135deg, ${t.gradientFrom || '#0f172a'}, ${t.gradientTo || '#1e3a5f'})` }
                  : t.type === 'image' && t.imageUrl
                  ? { backgroundImage: `url(${t.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: t.bgColor || '#0a0e1a' }
              }
              onClick={() => setEditingId(editingId === t.id ? null : t.id)}
            >
              <div className="absolute inset-0 flex items-center justify-between px-3">
                <span className="text-sm font-bold drop-shadow-lg" style={{ color: t.primaryColor }}>{t.name}</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/40 text-white/60">{t.type}</span>
              </div>
            </div>

            {/* Edit panel */}
            {editingId === t.id && (
              <div className="p-3 space-y-3 bg-white/[0.02]">
                <div>
                  <label className="text-[11px] text-white/25 block mb-1">Theme Name</label>
                  <input className="input input-sm" value={t.name} onChange={e => updateTheme(t.id, { name: e.target.value })} />
                </div>
                <div>
                  <label className="text-[11px] text-white/25 block mb-1">Type</label>
                  <select className="input input-sm" value={t.type} onChange={e => updateTheme(t.id, { type: e.target.value as 'gradient' | 'solid' | 'image' })}>
                    <option value="gradient">Gradient</option>
                    <option value="solid">Solid</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                {t.type === 'gradient' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-white/25 block mb-1">From</label>
                      <div className="flex items-center gap-2">
                        <input type="color" className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" value={t.gradientFrom || '#0f172a'} onChange={e => updateTheme(t.id, { gradientFrom: e.target.value })} />
                        <input className="input input-sm flex-1" value={t.gradientFrom || ''} onChange={e => updateTheme(t.id, { gradientFrom: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-white/25 block mb-1">To</label>
                      <div className="flex items-center gap-2">
                        <input type="color" className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" value={t.gradientTo || '#1e3a5f'} onChange={e => updateTheme(t.id, { gradientTo: e.target.value })} />
                        <input className="input input-sm flex-1" value={t.gradientTo || ''} onChange={e => updateTheme(t.id, { gradientTo: e.target.value })} />
                      </div>
                    </div>
                  </div>
                )}
                {t.type === 'solid' && (
                  <div>
                    <label className="text-[11px] text-white/25 block mb-1">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" value={t.bgColor || '#0a0e1a'} onChange={e => updateTheme(t.id, { bgColor: e.target.value })} />
                      <input className="input input-sm flex-1" value={t.bgColor || ''} onChange={e => updateTheme(t.id, { bgColor: e.target.value })} />
                    </div>
                  </div>
                )}
                {t.type === 'image' && (
                  <div>
                    <label className="text-[11px] text-white/25 block mb-1">Image URL</label>
                    <input className="input input-sm" value={t.imageUrl || ''} onChange={e => updateTheme(t.id, { imageUrl: e.target.value })} placeholder="https://example.com/bg.jpg" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-white/25 block mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" value={t.primaryColor} onChange={e => updateTheme(t.id, { primaryColor: e.target.value })} />
                      <input className="input input-sm flex-1" value={t.primaryColor} onChange={e => updateTheme(t.id, { primaryColor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/25 block mb-1">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" value={t.accentColor} onChange={e => updateTheme(t.id, { accentColor: e.target.value })} />
                      <input className="input input-sm flex-1" value={t.accentColor} onChange={e => updateTheme(t.id, { accentColor: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-white/25 block mb-1">Overlay Opacity</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={80} value={t.overlayOpacity} onChange={e => updateTheme(t.id, { overlayOpacity: +e.target.value })} className="flex-1" />
                    <span className="text-xs text-white/30 w-10 text-right">{t.overlayOpacity}%</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="btn btn-danger btn-sm" onClick={() => { removeTheme(t.id); setEditingId(null); }}>Delete Theme</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function fireTTS(sound: SoundSettings, event: 'level' | 'break' | 'warning', lv: BlindLevel | null) {
  if (!sound.ttsEnabled) return;
  const msgs = sound.ttsMessages.filter(m => m.enabled);
  const vars = { level: String(lv?.level || ''), sb: String(lv?.smallBlind || ''), bb: String(lv?.bigBlind || ''), ante: String(lv?.ante || '') };
  for (const msg of msgs) {
    const text = fillTTSTemplate(msg.template, vars);
    if (event === 'level' && (msg.label.includes('レベル') || msg.label.toLowerCase().includes('level'))) { speakTTS(text, sound.ttsLang); return; }
    if (event === 'break' && (msg.label.includes('ブレイク') || msg.label.includes('休憩') || msg.label.toLowerCase().includes('break'))) { speakTTS(text, sound.ttsLang); return; }
    if (event === 'warning' && (msg.label.includes('残り') || msg.label.toLowerCase().includes('min'))) { speakTTS(text, sound.ttsLang); return; }
  }
}
