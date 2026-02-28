'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/stores/useStore';
import { formatTimer, formatTimerHMS, formatChips, uid, toHalfWidthNumber } from '@/lib/utils';
import { DEFAULT_DISPLAY_TOGGLES, DEFAULT_SOUND, DEFAULT_SECTION_LAYOUT, DEFAULT_CASH_SECTION_LAYOUT, FONT_OPTIONS, DEFAULT_SYSTEM_STYLE, ASPECT_RATIO_OPTIONS, SYSTEM_THEMES, getSystemTheme } from '@/lib/presets';
import { playSound, playTestSound, playWarningBeep, speakTTS, fillTTSTemplate, PRESET_LABELS } from '@/lib/audio';
import { BlindLevel, Tournament, CashGame, SoundPreset, PrizeEntry, SoundSettings, DisplayToggles, ThemeConfig, TournamentSectionId, SectionPosition, SectionLayout, CashSectionId, CashSectionLayout, AspectRatioMode, TournamentPreset, CashGamePreset, SystemThemeId } from '@/lib/types';
import { RoomSync } from '@/components/RoomSync';

const TAB_ORDER = ['tournaments', 'cash', 'split', 'settings'] as const;
const TAB_LABELS: Record<string, string> = { tournaments: 'Tournaments', cash: 'Ring Games', split: 'Split', settings: 'Settings' };

function MobileBottomTabs({ tab, switchTab }: { tab: string; switchTab: (t: typeof TAB_ORDER[number]) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex px-3 py-2 gap-1.5 border-t border-white/[0.06] overflow-x-auto"
      style={{ background: 'var(--tab-bg, var(--sys-bg-from))', paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      {TAB_ORDER.map(t => (
        <button key={t} onClick={() => switchTab(t)}
          className={`flex-1 shrink-0 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${tab === t ? 'border' : 'hover:bg-white/[0.04] border border-transparent'}`}
          style={tab === t
            ? { background: 'rgba(var(--tab-active-rgb), 0.2)', color: 'var(--tab-active)', borderColor: 'rgba(var(--tab-active-rgb), 0.3)' }
            : { color: 'var(--tab-text, var(--sys-text-muted))' }}>
          {TAB_LABELS[t]}
        </button>
      ))}
    </nav>,
    document.body,
  );
}

export default function OperatorPage() {
  const [tab, setTab] = useState<'tournaments' | 'cash' | 'split' | 'settings'>('tournaments');
  const [slideClass, setSlideClass] = useState('');
  const [animKey, setAnimKey] = useState(0);

  const switchTab = (newTab: typeof tab) => {
    if (newTab === tab) return;
    const oldIdx = TAB_ORDER.indexOf(tab);
    const newIdx = TAB_ORDER.indexOf(newTab);
    setSlideClass(newIdx > oldIdx ? 'slide-in-right' : 'slide-in-left');
    setAnimKey(k => k + 1);
    setTab(newTab);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, var(--sys-bg-from) 0%, var(--sys-bg-to) 100%)' }}>
      {/* Room Sync Bar */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-white/[0.04]">
        <RoomSync />
      </div>
      {/* Glass Tab Nav — desktop: top inline */}
      <nav className="hidden md:flex px-3 py-2 gap-1.5 border-b border-white/[0.06] overflow-x-auto"
        style={{ background: 'var(--tab-bg, transparent)' }}>
        {TAB_ORDER.map(t => (
          <button key={t} onClick={() => switchTab(t)}
            className={`flex-1 shrink-0 py-2.5 rounded-xl text-base font-semibold transition-all duration-200 whitespace-nowrap ${tab === t ? 'border' : 'hover:bg-white/[0.04] border border-transparent'}`}
            style={tab === t
              ? { background: 'rgba(var(--tab-active-rgb), 0.2)', color: 'var(--tab-active)', borderColor: 'rgba(var(--tab-active-rgb), 0.3)' }
              : { color: 'var(--tab-text, var(--sys-text-muted))' }}>
            {t === 'tournaments' ? 'Tournaments' : t === 'cash' ? 'Ring Games' : t === 'split' ? 'Split' : 'Settings'}
          </button>
        ))}
      </nav>
      {/* Glass Tab Nav — mobile: fixed bottom (portal to body to avoid backdrop-filter containment) */}
      <MobileBottomTabs tab={tab} switchTab={switchTab} />
      <div className="p-4 pb-20 md:pb-4 max-w-7xl mx-auto">
        <div key={animKey} className={slideClass} style={{ overflow: 'visible' }}>
          {tab === 'tournaments' && <TournamentsTab />}
          {tab === 'cash' && <CashTab />}
          {tab === 'split' && <SplitTab />}
          {tab === 'settings' && <SettingsTab />}
        </div>
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
    <>
      {/* ── Mobile: stacked ── */}
      <div className="lg:hidden space-y-4 fade-in">
        <InlinePreview timerId={id} timerType="tournament" sticky />
        <div className="g-card p-4"><TournamentPresetPanel tournament={t} /></div>
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
        <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between px-4 py-3 g-card hover:bg-white/[0.04] transition-colors">
          <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Display & Sound Settings</span>
          <svg className={`w-4 h-4 text-white/30 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
        </button>
        {showSettings && (
          <div className="space-y-4 fade-in">
            <div className="g-card p-4"><ThemeSelector timerId={id} timerType="tournament" /></div>
            <div className="g-card p-4"><TickerPanel timerId={id} timerType="tournament" /></div>
            <div className="g-card p-4"><TogglesPanel timerId={id} timerType="tournament" /></div>
            <div className="g-card p-4"><DisplaySettingsPanel timerId={id} timerType="tournament" /></div>
            <div className="g-card p-4"><SoundPanel timerId={id} timerType="tournament" /></div>
          </div>
        )}
      </div>

      {/* ── Desktop: two independent scroll columns ── */}
      <div className="hidden lg:flex gap-4 fade-in" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Left: Preview (固定・独立スクロール) */}
        <div className="w-[55%] xl:w-[60%] shrink-0 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
          <InlinePreview timerId={id} timerType="tournament" sticky />
        </div>
        {/* Right: Settings (独立スクロール) */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 min-w-0 pr-1 custom-scrollbar">
          <div className="g-card p-4"><TournamentPresetPanel tournament={t} /></div>
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
          <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between px-4 py-3 g-card hover:bg-white/[0.04] transition-colors">
            <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Display & Sound Settings</span>
            <svg className={`w-4 h-4 text-white/30 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
          </button>
          {showSettings && (
            <div className="space-y-4 fade-in">
              <div className="g-card p-4"><ThemeSelector timerId={id} timerType="tournament" /></div>
              <div className="g-card p-4"><TickerPanel timerId={id} timerType="tournament" /></div>
              <div className="g-card p-4"><TogglesPanel timerId={id} timerType="tournament" /></div>
              <div className="g-card p-4"><DisplaySettingsPanel timerId={id} timerType="tournament" /></div>
              <div className="g-card p-4"><SoundPanel timerId={id} timerType="tournament" /></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function hasPresetChanges(t: Tournament, preset: TournamentPreset): boolean {
  return JSON.stringify(t.levels) !== JSON.stringify(preset.levels)
    || t.startingChips !== preset.startingChips
    || t.buyInAmount !== preset.buyInAmount
    || t.reEntryAmount !== preset.reEntryAmount
    || t.rebuyAmount !== preset.rebuyAmount
    || t.addonAmount !== preset.addonAmount
    || t.reEntryChips !== preset.reEntryChips
    || t.rebuyChips !== preset.rebuyChips
    || t.addonChips !== preset.addonChips
    || t.earlyBirdBonus !== preset.earlyBirdBonus
    || t.regCloseLevel !== preset.regCloseLevel
    || t.preLevelDuration !== preset.preLevelDuration
    || t.preLevelNote !== preset.preLevelNote
    || (t.name || '') !== (preset.tournamentName || '')
    || JSON.stringify(t.prizeStructure) !== JSON.stringify(preset.prizeStructure)
    || JSON.stringify(t.sectionLayout) !== JSON.stringify(preset.sectionLayout)
    || JSON.stringify(t.splitSectionLayout) !== JSON.stringify(preset.splitSectionLayout)
    || JSON.stringify(t.displayToggles) !== JSON.stringify(preset.displayToggles)
    || t.themeId !== preset.themeId;
}

function TournamentPresetPanel({ tournament: t }: { tournament: Tournament }) {
  const store = useStore();
  const [presetName, setPresetName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const savePreset = () => {
    if (!presetName.trim()) return;
    store.addTournamentPreset(presetName.trim(), t);
    setPresetName('');
    setShowSave(false);
  };
  const firstPlay = (levels: BlindLevel[]) => levels.find(l => l.type === 'play');
  const sourcePreset = t.sourcePresetId ? store.tournamentPresets.find(p => p.id === t.sourcePresetId) : null;
  const hasChanges = sourcePreset ? hasPresetChanges(t, sourcePreset) : false;
  return (
    <div className="space-y-2">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Tournament Presets</div>
        <svg className={`w-4 h-4 text-white/30 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {/* Update Preset button (always visible when changes detected) */}
      {hasChanges && sourcePreset && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-[10px] text-amber-400/70 flex-1 truncate">Preset &quot;{sourcePreset.name}&quot; に変更あり</span>
          <button className="btn btn-sm px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-[10px] font-semibold"
            onClick={() => { store.updateTournamentPreset(sourcePreset.id, t); }}>
            Update Preset
          </button>
        </div>
      )}
      {expanded && (
        <div className="space-y-2 fade-in">
          {store.tournamentPresets.length > 0 && (
            <div className="space-y-1">
              {store.tournamentPresets.map(p => {
                const fp = firstPlay(p.levels);
                const isSource = t.sourcePresetId === p.id;
                return (
                  <div key={p.id} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${isSource ? 'bg-blue-500/5 border border-blue-500/15' : 'hover:bg-white/[0.03]'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/50 font-medium truncate">{p.name}{isSource && <span className="ml-1.5 text-[9px] text-blue-400/60">(loaded)</span>}</div>
                      <div className="text-[10px] text-white/20">
                        {p.tournamentName ? `${p.tournamentName} · ` : ''}{(p.startingChips / 1000).toFixed(0)}K · {fp ? `${fp.smallBlind}/${fp.bigBlind}` : '--'} · {p.levels.filter(l => l.type === 'play').length}lvl
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm text-[10px]" onClick={() => store.loadTournamentPreset(t.id, p.id)}>Load</button>
                    <button className="text-white/15 hover:text-red-400 text-xs transition-colors" onClick={() => store.removeTournamentPreset(p.id)}>x</button>
                  </div>
                );
              })}
            </div>
          )}
          {showSave ? (
            <div className="flex items-center gap-2">
              <input className="input input-sm flex-1" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="プリセット名" onKeyDown={e => e.key === 'Enter' && savePreset()} autoFocus />
              <button className="btn btn-primary btn-sm" onClick={savePreset}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSave(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm text-[10px]" onClick={() => setShowSave(true)}>Save Current as Preset</button>
          )}
        </div>
      )}
    </div>
  );
}

function hasCashPresetChanges(c: CashGame, preset: CashGamePreset): boolean {
  return (c.name || '') !== (preset.cashName || '')
    || c.smallBlind !== preset.smallBlind
    || c.bigBlind !== preset.bigBlind
    || c.ante !== preset.ante
    || (c.memo || '') !== (preset.memo || '')
    || c.countdownMode !== preset.countdownMode
    || c.countdownTotalMs !== preset.countdownTotalMs
    || c.preLevelDuration !== preset.preLevelDuration
    || JSON.stringify(c.sectionLayout) !== JSON.stringify(preset.sectionLayout)
    || JSON.stringify(c.splitSectionLayout) !== JSON.stringify(preset.splitSectionLayout)
    || JSON.stringify(c.displayToggles) !== JSON.stringify(preset.displayToggles)
    || c.themeId !== preset.themeId;
}

function CashPresetPanel({ cashGame: c }: { cashGame: CashGame }) {
  const store = useStore();
  const [presetName, setPresetName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const savePreset = () => {
    if (!presetName.trim()) return;
    store.addCashPreset(presetName.trim(), c);
    setPresetName('');
    setShowSave(false);
  };
  const sourcePreset = c.sourcePresetId ? store.cashPresets.find(p => p.id === c.sourcePresetId) : null;
  const hasChanges = sourcePreset ? hasCashPresetChanges(c, sourcePreset) : false;
  return (
    <div className="space-y-2">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Ring Game Presets</div>
        <svg className={`w-4 h-4 text-white/30 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {hasChanges && sourcePreset && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-[10px] text-amber-400/70 flex-1 truncate">Preset &quot;{sourcePreset.name}&quot; に変更あり</span>
          <button className="btn btn-sm px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-[10px] font-semibold"
            onClick={() => { store.updateCashPreset(sourcePreset.id, c); }}>
            Update Preset
          </button>
        </div>
      )}
      {expanded && (
        <div className="space-y-2 fade-in">
          {store.cashPresets.length > 0 && (
            <div className="space-y-1">
              {store.cashPresets.map(p => {
                const isSource = c.sourcePresetId === p.id;
                return (
                  <div key={p.id} className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${isSource ? 'bg-green-500/5 border border-green-500/15' : 'hover:bg-white/[0.03]'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/50 font-medium truncate">{p.name}{isSource && <span className="ml-1.5 text-[9px] text-green-400/60">(loaded)</span>}</div>
                      <div className="text-[10px] text-white/20">
                        {p.cashName ? `${p.cashName} · ` : ''}{p.smallBlind}/{p.bigBlind}{p.ante > 0 ? ` (${p.ante})` : ''}{p.memo ? ` · ${p.memo}` : ''}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm text-[10px]" onClick={() => store.loadCashPreset(c.id, p.id)}>Load</button>
                    <button className="text-white/15 hover:text-red-400 text-xs transition-colors" onClick={() => store.removeCashPreset(p.id)}>x</button>
                  </div>
                );
              })}
            </div>
          )}
          {showSave ? (
            <div className="flex items-center gap-2">
              <input className="input input-sm flex-1" value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="プリセット名" onKeyDown={e => e.key === 'Enter' && savePreset()} autoFocus />
              <button className="btn btn-primary btn-sm" onClick={savePreset}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowSave(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm text-[10px]" onClick={() => setShowSave(true)}>Save Current as Preset</button>
          )}
        </div>
      )}
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
  const activePlayers = t.initialEntries + t.reEntryCount;
  const totalChips = t.initialEntries * t.startingChips
    + t.reEntryCount * t.reEntryChips
    + t.rebuyCount * t.rebuyChips
    + t.addonCount * t.addonChips
    + t.earlyBirdCount * t.earlyBirdBonus;
  const avg = activePlayers > 0 ? Math.round(totalChips / activePlayers) : 0;

  const CountRow = ({ label, count, countKey, chips, chipsKey }: { label: string; count: number; countKey: keyof Tournament; chips?: number; chipsKey?: keyof Tournament }) => (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-white/30 w-16 shrink-0">{label}</span>
      <div className="flex gap-0.5 items-center shrink-0">
        <button className="btn btn-ghost btn-sm px-1" onClick={() => up({ [countKey]: Math.max(0, count - 1) } as Partial<Tournament>)}>-</button>
        <input type="number" className="input input-sm w-12 text-center" value={count} onChange={e => up({ [countKey]: Math.max(0, +e.target.value) } as Partial<Tournament>)} />
        <button className="btn btn-ghost btn-sm px-1" onClick={() => up({ [countKey]: count + 1 } as Partial<Tournament>)}>+</button>
      </div>
      {chipsKey && (
        <div className="flex items-center gap-0.5 shrink-0">
          <input type="number" className="input input-sm w-16 text-center" value={chips || 0} onChange={e => up({ [chipsKey]: Math.max(0, +e.target.value) } as Partial<Tournament>)} />
          <span className="text-[9px] text-white/20">chips</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Tournament Info</div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11px] text-white/25 block mb-1">Starting Chips</label><input type="number" className="input input-sm" value={t.startingChips} onChange={e => up({ startingChips: +e.target.value })} /></div>
        <div>
          <label className="text-[11px] text-white/25 block mb-1">Reg Close Level</label>
          <select className="input input-sm" value={t.regCloseLevel || 0} onChange={e => up({ regCloseLevel: +e.target.value || undefined })}>
            <option value={0}>-- None --</option>
            {Array.from({ length: totalPlayLevels }, (_, i) => (
              <option key={i + 1} value={i + 1}>Level {i + 1}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Entry / Re-Entry / Rebuy / Add-on カウント */}
      <div className="border-t border-white/[0.06] pt-3 space-y-2">
        <CountRow label="Entry" count={t.initialEntries} countKey="initialEntries" />
        <CountRow label="Re-Entry" count={t.reEntryCount} countKey="reEntryCount" chips={t.reEntryChips} chipsKey="reEntryChips" />
        <CountRow label="Rebuy" count={t.rebuyCount} countKey="rebuyCount" chips={t.rebuyChips} chipsKey="rebuyChips" />
        <CountRow label="Add-on" count={t.addonCount} countKey="addonCount" chips={t.addonChips} chipsKey="addonChips" />
      </div>

      {/* アーリーバード / 特典 */}
      <div className="border-t border-white/[0.06] pt-3">
        <div className="text-[11px] text-white/25 font-semibold mb-2">Early Bird / 特典</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-white/30 w-24 shrink-0">対象者数</span>
          <div className="flex gap-0.5 items-center">
            <button className="btn btn-ghost btn-sm px-1.5" onClick={() => up({ earlyBirdCount: Math.max(0, t.earlyBirdCount - 1) })}>-</button>
            <input type="number" className="input input-sm w-14 text-center" value={t.earlyBirdCount} onChange={e => up({ earlyBirdCount: Math.max(0, +e.target.value) })} />
            <button className="btn btn-ghost btn-sm px-1.5" onClick={() => up({ earlyBirdCount: t.earlyBirdCount + 1 })}>+</button>
          </div>
          <span className="text-[10px] text-white/15 mx-1">+</span>
          <input type="number" className="input input-sm w-24" value={t.earlyBirdBonus} onChange={e => up({ earlyBirdBonus: Math.max(0, +e.target.value) })} placeholder="ボーナスチップ" />
          <span className="text-[10px] text-white/20">chips</span>
        </div>
        {t.earlyBirdCount > 0 && t.earlyBirdBonus > 0 && (
          <div className="text-[10px] text-white/20 mt-1 pl-24">合計 +{(t.earlyBirdCount * t.earlyBirdBonus).toLocaleString()} chips</div>
        )}
      </div>

      {/* チップサマリー */}
      <div className="border-t border-white/[0.06] pt-3">
        <div className="text-[11px] text-white/25 font-semibold mb-2">Chip Summary</div>
        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <span className="text-white/30">Players (総数)</span><span className="text-white/50 font-bold text-right">{activePlayers}</span>
          <span className="text-white/30">Total Chips</span><span className="text-white/50 font-bold text-right">{totalChips.toLocaleString()}</span>
          <span className="text-white/30">Avg Stack</span><span className="text-white/50 font-bold text-right">{avg > 0 ? formatChips(avg) : '--'}</span>
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
  const fontScale = store.systemStyle?.displayFontScale || 1.0;

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

      {/* 文字サイズ調整 */}
      <div className="border-t border-white/[0.06] pt-3">
        <div className="text-xs text-white/30 font-semibold uppercase tracking-wider mb-2">Display Font Size</div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/20">小</span>
          <input type="range" className="flex-1 accent-blue-500" min={0.5} max={2.0} step={0.05} value={fontScale}
            onChange={e => store.updateSystemStyle({ displayFontScale: +e.target.value })} />
          <span className="text-[10px] text-white/20">大</span>
          <span className="text-xs text-white/40 font-mono w-10 text-center">{fontScale.toFixed(2)}</span>
          {fontScale !== 1.0 && (
            <button className="btn btn-ghost btn-sm text-[10px]" onClick={() => store.updateSystemStyle({ displayFontScale: 1.0 })}>Reset</button>
          )}
        </div>
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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('ファイルサイズは2MB以下にしてください'); return; }
    // Compress image via canvas to avoid localStorage quota issues
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const MAX_DIM = 1280;
        let w = img.width, h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
          w = Math.round(w * ratio); h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        up({ backgroundImageUrl: compressed });
      } catch (err) {
        alert('画像の処理に失敗しました');
        console.error(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => { alert('画像の読み込みに失敗しました'); URL.revokeObjectURL(objectUrl); };
    img.src = objectUrl;
    e.target.value = '';
  };
  return (
    <div className="space-y-3">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Background Image</div>
      {/* Preview */}
      {dt.backgroundImageUrl && (
        <div className="relative rounded-xl overflow-hidden border border-white/[0.08]" style={{ height: '80px' }}>
          <img src={dt.backgroundImageUrl} alt="bg preview" className="w-full h-full object-cover" />
          <button onClick={() => up({ backgroundImageUrl: '' })}
            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white/60 hover:text-red-400 transition-colors" title="Clear">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      {/* Upload button */}
      <div className="flex gap-2">
        <button onClick={() => fileInputRef.current?.click()}
          className="btn btn-ghost btn-sm flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
          Upload Image
        </button>
        <button onClick={() => setShowUrlInput(!showUrlInput)} className="btn btn-ghost btn-sm text-[10px] text-white/20">URLで指定</button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      <p className="text-[10px] text-white/15">最大2MB · JPG/PNG/WebP</p>
      {/* URL input (collapsible) */}
      {showUrlInput && (
        <div className="fade-in">
          <input className="input input-sm" value={dt.backgroundImageUrl.startsWith('data:') ? '' : dt.backgroundImageUrl}
            onChange={e => up({ backgroundImageUrl: e.target.value })} placeholder="https://example.com/image.jpg" />
        </div>
      )}
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
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Prize Structure</div>
        <button className="btn btn-ghost btn-sm" onClick={() => update([...t.prizeStructure, { place: t.prizeStructure.length + 1, label: '' }])}>+ Add</button>
      </div>
      {t.prizeStructure.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-white/30 w-6 shrink-0">{p.place}位</span>
          <input type="text" className="input input-sm flex-1" value={p.label} onChange={e => { const arr = [...t.prizeStructure]; arr[i] = { ...arr[i], label: e.target.value }; update(arr); }} placeholder="例: ¥50,000 / 旅行券 / トロフィー" />
          <button className="btn btn-danger btn-sm shrink-0" onClick={() => update(t.prizeStructure.filter((_, j) => j !== i))}>x</button>
        </div>
      ))}
    </div>
  );
}

function BlindEditor({ tournament: t }: { tournament: Tournament }) {
  const store = useStore();
  const renumberLevels = (levels: BlindLevel[]): BlindLevel[] => {
    let playNum = 1;
    return levels.map(l => l.type === 'play' ? { ...l, level: playNum++ } : l);
  };
  const up = (p: Partial<Tournament>) => store.updateTournament(t.id, p);
  const hasPreLevel = (t.preLevelDuration || 0) > 0;
  const addLevel = (type: 'play' | 'break') => {
    const levels = [...t.levels];
    const last = [...levels].reverse().find(l => l.type === 'play');
    if (type === 'play') levels.push({ level: 0, type: 'play', smallBlind: (last?.smallBlind || 100) * 2, bigBlind: (last?.bigBlind || 200) * 2, ante: last?.ante || 0, duration: last?.duration || 900 });
    else levels.push({ level: 0, type: 'break', smallBlind: 0, bigBlind: 0, ante: 0, duration: 600 });
    store.updateTournament(t.id, { levels: renumberLevels(levels) });
  };
  const upLv = (i: number, p: Partial<BlindLevel>) => { const lvs = t.levels.map((l, j) => j === i ? { ...l, ...p } : l); store.updateTournament(t.id, { levels: lvs }); };
  const rmLv = (i: number) => store.updateTournament(t.id, { levels: renumberLevels(t.levels.filter((_, j) => j !== i)) });
  return (
    <div className="space-y-3">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Blind Structure</div>

      {/* Pre-Level row */}
      <div className={`p-2 rounded-xl border ${hasPreLevel ? 'bg-amber-500/5 border-amber-500/20' : 'border-white/[0.06] hover:bg-white/[0.02]'}`}>
        <div className="flex items-center gap-2">
          <div className={`toggle ${hasPreLevel ? 'on' : ''}`} onClick={() => up({ preLevelDuration: hasPreLevel ? 0 : 300 })} />
          <span className="text-amber-400 text-xs font-semibold shrink-0">PRE-LEVEL</span>
          {hasPreLevel && (
            <>
              <input type="text" inputMode="numeric" className="input input-sm w-16 text-center" value={Math.floor((t.preLevelDuration || 0) / 60)} onChange={e => { const v = toHalfWidthNumber(e.target.value); up({ preLevelDuration: Math.max(0, Number(v) || 0) * 60 }); }} />
              <span className="text-[11px] text-white/20">min</span>
            </>
          )}
        </div>
        {hasPreLevel && (
          <div className="mt-1 ml-11">
            <input className="input input-sm text-[10px] w-full" value={t.preLevelNote || ''} onChange={e => up({ preLevelNote: e.target.value })} placeholder="コメント（例: 席についてお待ちください）" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        {t.levels.map((lv, i) => (
          <div key={i} className={`p-2 rounded-xl transition-colors ${i === t.currentLevelIndex ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/[0.02]'}`}>
            <div className="flex items-center gap-2">
              <button onClick={() => store.tJumpLevel(t.id, i)} className="text-[11px] text-white/20 hover:text-blue-400 w-5 text-center cursor-pointer transition-colors shrink-0">{i === t.currentLevelIndex ? '\u25B8' : (i + 1)}</button>
              {lv.type === 'break' ? (
                <><span className="text-green-400 text-xs font-semibold flex-1">BREAK</span><input type="text" inputMode="numeric" className="input input-sm w-16 text-center" value={Math.floor(lv.duration / 60)} onChange={e => { const v = toHalfWidthNumber(e.target.value); upLv(i, { duration: (Number(v) || 1) * 60 }); }} /><span className="text-[11px] text-white/20">min</span></>
              ) : (
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 flex-1 min-w-0">
                  <span className="text-[11px] text-white/30 w-6 shrink-0">Lv{lv.level}</span>
                  <input type="text" inputMode="numeric" className="input input-sm shrink-0" style={{ width: '4.5rem' }} value={lv.smallBlind} onChange={e => { const v = Number(toHalfWidthNumber(e.target.value)) || 0; upLv(i, { smallBlind: v, bigBlind: v * 2, ante: v * 2 }); }} />
                  <span className="text-white/15">/</span>
                  <input type="text" inputMode="numeric" className="input input-sm shrink-0" style={{ width: '4.5rem' }} value={lv.bigBlind} onChange={e => { const v = toHalfWidthNumber(e.target.value); upLv(i, { bigBlind: Number(v) || 0 }); }} />
                  <span className="text-[11px] text-white/20 ml-1">A:</span>
                  <input type="text" inputMode="numeric" className="input input-sm shrink-0" style={{ width: '3.5rem' }} value={lv.ante} onChange={e => { const v = toHalfWidthNumber(e.target.value); upLv(i, { ante: Number(v) || 0 }); }} />
                  <input type="text" inputMode="numeric" className="input input-sm text-center shrink-0" style={{ width: '3.5rem' }} value={Math.floor(lv.duration / 60)} onChange={e => { const v = toHalfWidthNumber(e.target.value); upLv(i, { duration: (Number(v) || 1) * 60 }); }} />
                  <span className="text-[11px] text-white/20">m</span>
                </div>
              )}
              <button onClick={() => rmLv(i)} className="text-white/15 hover:text-red-400 text-xs ml-1 transition-colors shrink-0">x</button>
            </div>
            {/* F5: Break note/subtitle */}
            {lv.type === 'break' && (
              <div className="mt-1 ml-7">
                <input className="input input-sm text-[10px] w-full" value={lv.note || ''} onChange={e => upLv(i, { note: e.target.value })} placeholder="サブタイトル（例: 100chips カラーアップ）" />
              </div>
            )}
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
        <button onClick={() => { const id = addCashGame(`Ring ${cashGames.length + 1}`); setSelectedId(id); }} className="btn btn-ghost btn-sm">+ Add</button>
      </div>
      {selectedId && <CashEditor id={selectedId} onDelete={handleDelete} />}
      {cashGames.length === 0 && (
        <div className="g-card p-8 text-center text-white/20">
          <p className="text-sm">No ring games. Click &quot;+ Add&quot; to create one.</p>
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

  const [preLevelMs, setPreLevelMs] = useState(0);

  useEffect(() => {
    if (!c) return;
    setCountdown(c.countdownRemainingMs);
    setPreLevelMs(c.preLevelRemainingMs);
    const iv = setInterval(() => {
      if (c.status === 'running' && c.timerStartedAt) {
        const e = Date.now() - c.timerStartedAt;
        if (c.preLevelRemainingMs > 0) {
          const rem = Math.max(0, c.preLevelRemainingMs - e);
          setPreLevelMs(rem);
          if (rem <= 0) store.cEndPreLevel(c.id);
        } else {
          setElapsed(c.elapsedMs + e);
          if (c.countdownMode) setCountdown(Math.max(0, c.countdownRemainingMs - e));
        }
      } else { setElapsed(c.elapsedMs); setCountdown(c.countdownRemainingMs); setPreLevelMs(c.preLevelRemainingMs); }
    }, 500);
    return () => clearInterval(iv);
  }, [c, store]);

  if (!c) return null;

  const cashSettings = (
    <div className="g-card p-4 space-y-4">
      <div className="flex items-center gap-3">
        <input className="input flex-1" value={c.name} onChange={e => store.updateCashGame(id, { name: e.target.value })} placeholder="Ring game name" />
        <button onClick={() => onDelete(id)} className="btn btn-danger btn-sm">Delete</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-[11px] text-white/25 block mb-1">SB</label><input type="number" className="input input-sm" value={c.smallBlind} onChange={e => store.updateCashGame(id, { smallBlind: +e.target.value })} /></div>
        <div><label className="text-[11px] text-white/25 block mb-1">BB</label><input type="number" className="input input-sm" value={c.bigBlind} onChange={e => store.updateCashGame(id, { bigBlind: +e.target.value })} /></div>
        <div><label className="text-[11px] text-white/25 block mb-1">Ante</label><input type="number" className="input input-sm" value={c.ante} onChange={e => store.updateCashGame(id, { ante: +e.target.value })} /></div>
      </div>
      <div><label className="text-[11px] text-white/25 block mb-1">Memo</label><input className="input" value={c.memo} onChange={e => store.updateCashGame(id, { memo: e.target.value })} placeholder="Table info" /></div>
      <div>
        <label className="text-[11px] text-white/25 block mb-1">Pre-Level (開始前カウントダウン)</label>
        <div className="flex items-center gap-2">
          <input type="number" className="input input-sm w-20 text-center" value={Math.floor((c.preLevelDuration || 0) / 60)} onChange={e => store.updateCashGame(id, { preLevelDuration: Math.max(0, +e.target.value) * 60 })} min={0} />
          <span className="text-xs text-white/25">min</span>
        </div>
        <p className="text-[10px] text-white/15 mt-1">Start押下後、この時間のカウントダウン後にゲームが開始します</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2"><div className={`toggle ${!c.countdownMode ? 'on' : ''}`} onClick={() => store.updateCashGame(id, { countdownMode: false })} /><span className="text-xs text-white/40">Count Up</span></div>
        <div className="flex items-center gap-2"><div className={`toggle ${c.countdownMode ? 'on' : ''}`} onClick={() => store.updateCashGame(id, { countdownMode: true })} /><span className="text-xs text-white/40">Countdown</span></div>
        {c.countdownMode && <div className="flex items-center gap-1 ml-2"><input type="number" className="input input-sm w-16" value={Math.floor(c.countdownTotalMs / 60000)} onChange={e => { const ms = +e.target.value * 60000; store.updateCashGame(id, { countdownTotalMs: ms, countdownRemainingMs: ms }); }} min={1} /><span className="text-xs text-white/20">min</span></div>}
      </div>
      <div className="text-center py-2">
        {preLevelMs > 0 && c.status === 'running' ? (
          <div>
            <div className="text-[10px] text-blue-400/60 uppercase tracking-widest font-semibold mb-1">Starting In</div>
            <div className="text-4xl font-bold timer-font text-blue-400">{formatTimerHMS(preLevelMs)}</div>
          </div>
        ) : (
          <div className="text-4xl font-bold timer-font text-white">{c.countdownMode ? formatTimerHMS(countdown) : formatTimerHMS(elapsed)}</div>
        )}
      </div>
      <div className="flex items-center justify-center gap-2">
        {c.status === 'idle' && <button onClick={() => store.cStart(id)} className="btn btn-primary">Start</button>}
        {c.status === 'running' && <button onClick={() => store.cPause(id)} className="btn btn-warning">Pause</button>}
        {c.status === 'paused' && <button onClick={() => store.cResume(id)} className="btn btn-success">Resume</button>}
        {c.status !== 'idle' && <button onClick={() => store.cReset(id)} className="btn btn-danger btn-sm">Reset</button>}
      </div>
    </div>
  );

  const cashDisplaySettings = (
    <>
      <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between px-4 py-3 g-card hover:bg-white/[0.04] transition-colors">
        <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Display & Sound Settings</span>
        <svg className={`w-4 h-4 text-white/30 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
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
    </>
  );

  return (
    <>
      {/* Mobile: stacked */}
      <div className="lg:hidden space-y-4 fade-in">
        <InlinePreview timerId={id} timerType="cash" sticky />
        <div className="g-card p-4"><CashPresetPanel cashGame={c} /></div>
        {cashSettings}
        {cashDisplaySettings}
      </div>
      {/* Desktop: two independent scroll columns */}
      <div className="hidden lg:flex gap-4 fade-in" style={{ height: 'calc(100vh - 120px)' }}>
        <div className="w-[55%] xl:w-[60%] shrink-0 overflow-y-auto min-h-0 pr-1 custom-scrollbar">
          <InlinePreview timerId={id} timerType="cash" sticky />
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 min-w-0 pr-1 custom-scrollbar">
          <div className="g-card p-4"><CashPresetPanel cashGame={c} /></div>
          {cashSettings}
          {cashDisplaySettings}
        </div>
      </div>
    </>
  );
}

/* ── Layout Editor (generic) ── */

const SECTION_LABELS: Record<TournamentSectionId, string> = {
  players: 'Players', reEntry: 'Re-Entry', rebuy: 'Rebuy', addon: 'Add-on', avgStack: 'Avg Stack',
  timer: 'Timer', nextLevel: 'Next Level',
  cornerTime: 'Time', regClose: 'Reg Close', nextBreak: 'Next Break',
  prizeTable: 'Prize', ticker: 'Ticker', tournamentName: 'Name',
};

const CASH_SECTION_LABELS: Record<CashSectionId, string> = {
  cashName: 'Name', rate: 'Rate', memo: 'Memo',
  timer: 'Timer', sbCard: 'SB', bbCard: 'BB',
  anteCard: 'Ante', ticker: 'Ticker',
};

function isSectionVisible(id: TournamentSectionId, dt: DisplayToggles): boolean {
  switch (id) {
    case 'players': case 'reEntry': case 'rebuy': case 'addon': return dt.showEntryCount;
    case 'avgStack': return dt.showChipInfo;
    case 'timer': return true;
    case 'nextLevel': return dt.showNextLevel;
    case 'cornerTime': return dt.showTimeToEnd;
    case 'regClose': return true;
    case 'nextBreak': return dt.showTimeToBreak;
    case 'prizeTable': return dt.showPrizeStructure;
    case 'ticker': return !!dt.tickerText;
    case 'tournamentName': return dt.showTournamentName;
  }
}

function isCashSectionVisible(id: CashSectionId, dt: DisplayToggles): boolean {
  switch (id) {
    case 'cashName': return true;
    case 'rate': return dt.showCashRate;
    case 'memo': return dt.showCashMemo;
    case 'timer': return dt.showCashTimer;
    case 'sbCard': case 'bbCard': case 'anteCard': return dt.showCashRate;
    case 'ticker': return !!dt.tickerText;
  }
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';
const RESIZE_HANDLES: { handle: ResizeHandle; pos: React.CSSProperties; cursor: string }[] = [
  { handle: 'nw', pos: { top: -3, left: -3, width: 7, height: 7 }, cursor: 'nwse-resize' },
  { handle: 'ne', pos: { top: -3, right: -3, width: 7, height: 7 }, cursor: 'nesw-resize' },
  { handle: 'sw', pos: { bottom: -3, left: -3, width: 7, height: 7 }, cursor: 'nesw-resize' },
  { handle: 'se', pos: { bottom: -3, right: -3, width: 7, height: 7 }, cursor: 'nwse-resize' },
  { handle: 'n', pos: { top: -3, left: '50%', transform: 'translateX(-50%)', width: 14, height: 5 }, cursor: 'ns-resize' },
  { handle: 's', pos: { bottom: -3, left: '50%', transform: 'translateX(-50%)', width: 14, height: 5 }, cursor: 'ns-resize' },
  { handle: 'e', pos: { right: -3, top: '50%', transform: 'translateY(-50%)', width: 5, height: 14 }, cursor: 'ew-resize' },
  { handle: 'w', pos: { left: -3, top: '50%', transform: 'translateY(-50%)', width: 5, height: 14 }, cursor: 'ew-resize' },
];

function GenericLayoutEditor<T extends string>({
  layout, defaultLayout, labels, timerName,
  visibleIds, onUpdatePosition, onReset, onBroadcast,
}: {
  layout: Record<T, SectionPosition>;
  defaultLayout: Record<T, SectionPosition>;
  labels: Record<T, string>;
  timerName: string;
  visibleIds: T[];
  onUpdatePosition: (sectionId: T, pos: SectionPosition) => void;
  onReset: () => void;
  onBroadcast: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<T | null>(null);
  const [dragging, setDragging] = useState<T | null>(null);
  const [resizing, setResizing] = useState<{ sectionId: T; handle: ResizeHandle } | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<T, SectionPosition>>(layout);
  const dragStartRef = useRef<{ mx: number; my: number; ox: number; oy: number; w: number; h: number } | null>(null);
  const resizeStartRef = useRef<{ mx: number; my: number; orig: SectionPosition } | null>(null);
  const cachedRectRef = useRef<DOMRect | null>(null);
  const latestPosRef = useRef<Record<T, SectionPosition>>(layout);

  useEffect(() => { setLocalPositions(layout); latestPosRef.current = layout; }, [layout]);

  const handlePointerDown = (e: React.PointerEvent, sectionId: T) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    cachedRectRef.current = canvasRef.current?.getBoundingClientRect() || null;
    const pos = latestPosRef.current[sectionId];
    dragStartRef.current = { mx: e.clientX, my: e.clientY, ox: pos.x, oy: pos.y, w: pos.w, h: pos.h };
    setDragging(sectionId); setSelected(sectionId);
  };

  const handleResizeDown = (e: React.PointerEvent, sectionId: T, handle: ResizeHandle) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    cachedRectRef.current = canvasRef.current?.getBoundingClientRect() || null;
    resizeStartRef.current = { mx: e.clientX, my: e.clientY, orig: { ...latestPosRef.current[sectionId] } };
    setResizing({ sectionId, handle }); setSelected(sectionId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = cachedRectRef.current;
    if (!rect) return;
    if (resizing && resizeStartRef.current) {
      const dx = ((e.clientX - resizeStartRef.current.mx) / rect.width) * 100;
      const dy = ((e.clientY - resizeStartRef.current.my) / rect.height) * 100;
      const o = resizeStartRef.current.orig;
      let { x, y, w, h } = o;
      const hd = resizing.handle;
      if (hd.includes('e')) w = Math.max(3, Math.min(100 - x, o.w + dx));
      if (hd.includes('w')) { const nx = Math.max(0, o.x + dx); w = Math.max(3, o.w - (nx - o.x)); x = nx; }
      if (hd.includes('s')) h = Math.max(3, Math.min(100 - y, o.h + dy));
      if (hd.includes('n')) { const ny = Math.max(0, o.y + dy); h = Math.max(3, o.h - (ny - o.y)); y = ny; }
      const r = (v: number) => Math.round(v * 10) / 10;
      setLocalPositions(prev => {
        const next = { ...prev, [resizing.sectionId]: { ...prev[resizing.sectionId], x: r(x), y: r(y), w: r(w), h: r(h) } };
        latestPosRef.current = next;
        return next;
      });
      return;
    }
    if (dragging && dragStartRef.current) {
      const dx = ((e.clientX - dragStartRef.current.mx) / rect.width) * 100;
      const dy = ((e.clientY - dragStartRef.current.my) / rect.height) * 100;
      const { ox, oy, w: dw, h: dh } = dragStartRef.current;
      const nx = Math.max(0, Math.min(100 - dw, ox + dx));
      const ny = Math.max(0, Math.min(100 - dh, oy + dy));
      setLocalPositions(prev => {
        const next = { ...prev, [dragging as T]: { ...prev[dragging as T], x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 } };
        latestPosRef.current = next;
        return next;
      });
    }
  };

  const handlePointerUp = () => {
    cachedRectRef.current = null;
    if (resizing) { onUpdatePosition(resizing.sectionId, latestPosRef.current[resizing.sectionId]); setResizing(null); resizeStartRef.current = null; onBroadcast(); return; }
    if (dragging) { onUpdatePosition(dragging, latestPosRef.current[dragging]); onBroadcast(); }
    setDragging(null); dragStartRef.current = null;
  };

  const updateField = (field: 'x' | 'y' | 'w' | 'h' | 'fontSize' | 'timerDigitScale' | 'blindsScale' | 'anteScale', val: number) => {
    if (!selected) return;
    const newPos = { ...localPositions[selected], [field]: val };
    setLocalPositions(prev => ({ ...prev, [selected as T]: newPos }));
    onUpdatePosition(selected, newPos);
    onBroadcast();
  };

  const undoLayoutRef = useRef<Record<T, SectionPosition> | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const handleReset = () => {
    if (!window.confirm('本当にレイアウトをリセットしますか？')) return;
    undoLayoutRef.current = { ...localPositions };
    onReset();
    setLocalPositions(defaultLayout);
    setSelected(null);
    setShowUndo(true);
    onBroadcast();
    setTimeout(() => setShowUndo(false), 8000);
  };
  const handleUndo = () => {
    if (!undoLayoutRef.current) return;
    setLocalPositions(undoLayoutRef.current);
    Object.entries(undoLayoutRef.current).forEach(([k, v]) => onUpdatePosition(k as T, v as SectionPosition));
    undoLayoutRef.current = null;
    setShowUndo(false);
    onBroadcast();
  };

  /* Returns: { overlay, propertiesPanel } for parent to compose */
  return { showUndo, handleUndo, handleReset,
    overlay: (
      <div ref={canvasRef}
        className="absolute inset-0 z-10 select-none"
        onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
        onClick={() => setSelected(null)}
      >
        {visibleIds.map(sectionId => {
          const pos = localPositions[sectionId];
          if (!pos) return null;
          const isSel = selected === sectionId;
          const isDrag = dragging === sectionId;
          return (
            <div key={sectionId}
              className={`absolute rounded-lg cursor-grab flex flex-col items-center justify-center
                ${isDrag ? 'cursor-grabbing z-30' : 'z-20'}
                ${isSel ? 'border-2 border-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.4)]' : 'border border-dashed border-white/20 hover:border-white/40'}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${pos.w}%`, height: `${pos.h}%`,
                background: isSel ? 'rgba(96,165,250,0.08)' : isDrag ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)',
                touchAction: 'none', willChange: isDrag ? 'left,top' : undefined }}
              onPointerDown={e => handlePointerDown(e, sectionId)}
              onClick={e => { e.stopPropagation(); setSelected(sectionId); }}
            >
              <span className="text-white/50 font-semibold text-center leading-tight pointer-events-none" style={{ fontSize: 'clamp(5px, 0.6vw, 10px)' }}>
                {labels[sectionId]}
              </span>
              {isSel && !isDrag && RESIZE_HANDLES.map(rh => (
                <div key={rh.handle}
                  className="absolute bg-blue-400 rounded-sm z-40 hover:bg-blue-300 hover:scale-125 transition-transform"
                  style={{ ...rh.pos, cursor: rh.cursor }}
                  onPointerDown={e => handleResizeDown(e, sectionId, rh.handle)}
                />
              ))}
            </div>
          );
        })}
      </div>
    ),
    propertiesPanel: selected && localPositions[selected] ? (
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2 fade-in">
        <div className="text-xs text-white/40 font-semibold">{labels[selected]} — Position & Size</div>
        <div className="grid grid-cols-5 gap-2">
          {(['x', 'y', 'w', 'h'] as const).map(f => (
            <div key={f}>
              <label className="text-[11px] text-white/25 block mb-1 uppercase">{f} (%)</label>
              <input type="number" step={0.1} min={0} max={100} className="input input-sm text-center"
                value={localPositions[selected!][f]} onChange={e => updateField(f, +e.target.value)} />
            </div>
          ))}
          <div>
            <label className="text-[11px] text-white/25 block mb-1">Font</label>
            <input type="number" step={0.1} min={0.3} max={3.0} className="input input-sm text-center"
              value={localPositions[selected!].fontSize ?? 1.0} onChange={e => updateField('fontSize', +e.target.value)} />
          </div>
        </div>
        {(selected === 'timer' || selected === ('timer' as T)) && (
          <div className="border-t border-white/[0.06] pt-2 mt-2">
            <div className="text-[10px] text-white/30 font-semibold mb-1.5">Timer Sub-Elements Font Size</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-white/20 block mb-0.5">Timer Digit</label>
                <input type="number" step={0.1} min={0.3} max={3.0} className="input input-sm text-center"
                  value={localPositions[selected!].timerDigitScale ?? 1.0} onChange={e => updateField('timerDigitScale', +e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-white/20 block mb-0.5">Blinds</label>
                <input type="number" step={0.1} min={0.3} max={3.0} className="input input-sm text-center"
                  value={localPositions[selected!].blindsScale ?? 1.0} onChange={e => updateField('blindsScale', +e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-white/20 block mb-0.5">Ante</label>
                <input type="number" step={0.1} min={0.3} max={3.0} className="input input-sm text-center"
                  value={localPositions[selected!].anteScale ?? 1.0} onChange={e => updateField('anteScale', +e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </div>
    ) : null,
  };
}

/* Hook for tournament layout editor — supports Single/Split toggle */
function useTournamentLayoutEditor(t: Tournament) {
  const store = useStore();
  const [layoutMode, setLayoutMode] = useState<'single' | 'split'>('single');
  const layout = layoutMode === 'split'
    ? (t.splitSectionLayout || DEFAULT_SECTION_LAYOUT)
    : (t.sectionLayout || DEFAULT_SECTION_LAYOUT);
  const dt = t.displayToggles || DEFAULT_DISPLAY_TOGGLES;
  const visibleIds = (Object.keys(DEFAULT_SECTION_LAYOUT) as TournamentSectionId[]).filter(id => isSectionVisible(id, dt));
  const editor = GenericLayoutEditor<TournamentSectionId>({
    layout, defaultLayout: DEFAULT_SECTION_LAYOUT, labels: SECTION_LABELS,
    timerName: t.name, visibleIds,
    onUpdatePosition: (sid, pos) => layoutMode === 'split' ? store.updateSplitSectionPosition(t.id, sid, pos) : store.updateSectionPosition(t.id, sid, pos),
    onReset: () => { layoutMode === 'split' ? store.resetSplitSectionLayout(t.id) : store.resetSectionLayout(t.id); },
    onBroadcast: () => store.broadcastAll(),
  });
  return { ...editor, layoutMode, setLayoutMode };
}

/* Hook for cash layout editor — supports Single/Split toggle */
function useCashLayoutEditor(c: CashGame) {
  const store = useStore();
  const [layoutMode, setLayoutMode] = useState<'single' | 'split'>('single');
  const layout = layoutMode === 'split'
    ? (c.splitSectionLayout || DEFAULT_CASH_SECTION_LAYOUT)
    : (c.sectionLayout || DEFAULT_CASH_SECTION_LAYOUT);
  const dt = c.displayToggles || DEFAULT_DISPLAY_TOGGLES;
  const visibleIds = (Object.keys(DEFAULT_CASH_SECTION_LAYOUT) as CashSectionId[]).filter(id => isCashSectionVisible(id, dt));
  const editor = GenericLayoutEditor<CashSectionId>({
    layout, defaultLayout: DEFAULT_CASH_SECTION_LAYOUT, labels: CASH_SECTION_LABELS,
    timerName: c.name, visibleIds,
    onUpdatePosition: (sid, pos) => layoutMode === 'split' ? store.updateCashSplitSectionPosition(c.id, sid, pos) : store.updateCashSectionPosition(c.id, sid, pos),
    onReset: () => { layoutMode === 'split' ? store.resetCashSplitSectionLayout(c.id) : store.resetCashSectionLayout(c.id); },
    onBroadcast: () => store.broadcastAll(),
  });
  return { ...editor, layoutMode, setLayoutMode };
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

/* ── Inline Preview (per-timer) — combined live preview + layout editor ── */
function InlinePreview({ timerId, timerType, sticky }: { timerId: string; timerType: 'tournament' | 'cash'; sticky?: boolean }) {
  const store = useStore();
  const timer = timerType === 'tournament'
    ? store.tournaments.find(t => t.id === timerId)
    : store.cashGames.find(c => c.id === timerId);
  const themeId = timer?.themeId || store.defaultThemeId || 'come-on-blue';
  const themeName = store.themes.find(th => th.id === themeId)?.name || '';
  const [showPreview, setShowPreview] = useState(sticky ? true : false);
  const [editMode, setEditMode] = useState(false);

  const route = timerType === 'tournament' ? 'tournament' : 'cash';

  // Layout editor hooks (always called — React rules of hooks)
  const tournamentEditor = useTournamentLayoutEditor(
    timerType === 'tournament' && timer ? (timer as Tournament) : store.tournaments[0]
  );
  const cashEditor = useCashLayoutEditor(
    timerType === 'cash' && timer ? (timer as CashGame) : store.cashGames[0]
  );
  const editor = timerType === 'tournament' ? tournamentEditor : cashEditor;
  const layoutMode = timerType === 'tournament' ? tournamentEditor.layoutMode : cashEditor.layoutMode;
  const layoutSuffix = layoutMode === 'split' ? '&layout=split' : '';

  return (
    <div>
      {!sticky && (
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="w-full flex items-center justify-between px-4 py-3 g-card hover:bg-white/[0.04] transition-colors"
        >
          <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">Display Preview</span>
          <svg className={`w-4 h-4 text-white/30 transition-transform duration-200 ${showPreview ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      )}
      {showPreview && timer && (
        <CombinedPreview
          route={route}
          targetName={timer.name}
          themeLabel={themeName}
          path={`/display/${route}?timer=${timerId}&theme=${themeId}&preview=1${layoutSuffix}`}
          editMode={editMode}
          setEditMode={setEditMode}
          editor={editor}
          isTournament={timerType === 'tournament'}
        />
      )}
    </div>
  );
}

/* ── Combined Preview: iframe + draggable overlay ── */
function CombinedPreview({ route, targetName, themeLabel, path, editMode, setEditMode, editor, isTournament }: {
  route: string; targetName: string; themeLabel: string; path: string;
  editMode: boolean; setEditMode: (v: boolean) => void;
  editor: ReturnType<typeof useTournamentLayoutEditor> | ReturnType<typeof useCashLayoutEditor>;
  isTournament: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setScale(containerRef.current.offsetWidth / 1280);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const routeLabel = route === 'cash' ? 'Ring Game' : 'Tournament';

  // Layout mode toggle (both tournament and cash editors now support it)
  const editorWithMode = editor as { layoutMode: 'single' | 'split'; setLayoutMode: (m: 'single' | 'split') => void };

  return (
    <div className="mt-2 space-y-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 bg-white/[0.03] rounded-t-xl border border-white/[0.08] border-b-0">
        <span className={`text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md shrink-0 ${
          route === 'tournament' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
        }`}>{routeLabel}</span>
        <span className="text-[11px] text-white/40 truncate min-w-0">{targetName}</span>
        <span className="text-[10px] text-white/20 shrink-0 hidden sm:inline">{themeLabel}</span>
        <div className="ml-auto flex items-center gap-1">
          {/* Edit mode toggle */}
          <button onClick={() => setEditMode(!editMode)}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${editMode ? 'bg-blue-500/25 text-blue-400 border border-blue-500/30' : 'bg-white/[0.05] text-white/30 hover:text-white/60 hover:bg-white/[0.1] border border-transparent'}`}
            title={editMode ? 'Exit layout edit' : 'Edit layout'}>
            <svg className="w-3.5 h-3.5 inline-block mr-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Layout
          </button>
          <button onClick={() => setIframeKey(k => k + 1)}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/25 hover:text-white/60 transition-colors" title="Refresh">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          </button>
          <button onClick={() => window.open(path, '_blank')}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-white/25 hover:text-white/60 transition-colors" title="Open in new tab">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
        </div>
      </div>

      {/* Edit mode: Single/Split toggle + Reset */}
      {editMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border-x border-white/[0.08]">
          {'layoutMode' in editorWithMode && (
            <div className="flex gap-1">
              <button onClick={() => editorWithMode.setLayoutMode('single')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${editorWithMode.layoutMode === 'single' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/25 border border-white/[0.06]'}`}>
                Single
              </button>
              <button onClick={() => editorWithMode.setLayoutMode('split')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${editorWithMode.layoutMode === 'split' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'text-white/25 border border-white/[0.06]'}`}>
                Split
              </button>
            </div>
          )}
          <div className="ml-auto flex gap-1">
            {editor.showUndo && <button className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse" onClick={editor.handleUndo}>↩ Undo</button>}
            <button className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.05] text-white/30 hover:text-white/60 border border-white/[0.06]" onClick={editor.handleReset}>Reset</button>
          </div>
        </div>
      )}

      {/* Preview area: iframe + overlay */}
      <div ref={containerRef} className="rounded-b-xl overflow-hidden border border-white/[0.08] border-t-0 bg-black/40 relative"
        style={{ height: `${Math.round(scale * 720)}px` }}>
        <iframe
          key={iframeKey}
          src={path}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '1280px', height: '720px',
            transform: `scale(${scale})`, transformOrigin: 'top left',
            border: 'none', pointerEvents: editMode ? 'none' : 'auto',
          }}
        />
        {/* Draggable overlay (edit mode only) */}
        {editMode && editor.overlay}
        {/* LIVE indicator */}
        {!editMode && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] text-white/40 font-semibold">LIVE</span>
          </div>
        )}
        {editMode && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 backdrop-blur-sm z-20 border border-blue-500/30">
            <span className="text-[9px] text-blue-400 font-semibold">EDIT MODE</span>
          </div>
        )}
      </div>

      {/* Properties panel (edit mode) */}
      {editMode && editor.propertiesPanel && (
        <div className="mt-2">
          {editor.propertiesPanel}
        </div>
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

  const routeLabel = route === 'split' ? 'Split View' : route === 'cash' ? 'Ring Game' : 'Tournament';

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

/* ── Split Tab ── */
function SplitTab() {
  const store = useStore();
  const { tournaments, cashGames } = store;
  const allTimers = [
    ...tournaments.map(t => ({ id: t.id, name: t.name, kind: 'T' as const, status: t.status as string })),
    ...cashGames.map(c => ({ id: c.id, name: c.name, kind: 'C' as const, status: c.status as string })),
  ];
  const [leftId, setLeftId] = useState(allTimers[0]?.id || '');
  const [rightId, setRightId] = useState(allTimers[1]?.id || allTimers[0]?.id || '');

  // Get theme for preview
  const leftTimer = tournaments.find(t => t.id === leftId) || cashGames.find(c => c.id === leftId);
  const leftThemeId = leftTimer?.themeId || store.defaultThemeId || 'come-on-blue';
  const themeName = store.themes.find(th => th.id === leftThemeId)?.name || '';

  // F7: Per-panel themes
  const rightTimer = tournaments.find(t => t.id === rightId) || cashGames.find(c => c.id === rightId);
  const rightThemeId = rightTimer?.themeId || store.defaultThemeId || 'come-on-blue';

  const splitPath = `/display/split?left=${leftId}&right=${rightId}&leftTheme=${leftThemeId}&rightTheme=${rightThemeId}`;

  if (allTimers.length < 2) {
    return (
      <div className="space-y-4 fade-in">
        <div className="g-card p-8 text-center text-white/20">
          <p className="text-sm">Split View には最低2つのタイマー（トーナメントまたはリングゲーム）が必要です。</p>
          <p className="text-xs mt-2 text-white/15">先にTournamentsまたはRing Gamesタブでタイマーを作成してください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="g-card p-4 space-y-4">
        <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Split Display — 左右パネル選択</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left panel selection */}
          <div>
            <label className="text-[11px] text-white/25 block mb-1">左パネル</label>
            <select className="input" value={leftId} onChange={e => setLeftId(e.target.value)}>
              {allTimers.map(t => (
                <option key={t.id} value={t.id}>
                  [{t.kind === 'T' ? 'Tournament' : 'Ring'}] {t.name} {t.status === 'running' ? '(LIVE)' : t.status === 'paused' ? '(PAUSED)' : ''}
                </option>
              ))}
            </select>
            <label className="text-[11px] text-white/25 block mb-1 mt-2">左テーマ</label>
            <select className="input input-sm" value={leftThemeId} onChange={e => { if (leftTimer) { if (tournaments.find(x => x.id === leftId)) store.updateTournamentTheme(leftId, e.target.value); else store.updateCashTheme(leftId, e.target.value); } }}>
              {store.themes.map(th => <option key={th.id} value={th.id}>{th.name}</option>)}
            </select>
          </div>
          {/* Right panel selection */}
          <div>
            <label className="text-[11px] text-white/25 block mb-1">右パネル</label>
            <select className="input" value={rightId} onChange={e => setRightId(e.target.value)}>
              {allTimers.map(t => (
                <option key={t.id} value={t.id}>
                  [{t.kind === 'T' ? 'Tournament' : 'Ring'}] {t.name} {t.status === 'running' ? '(LIVE)' : t.status === 'paused' ? '(PAUSED)' : ''}
                </option>
              ))}
            </select>
            <label className="text-[11px] text-white/25 block mb-1 mt-2">右テーマ</label>
            <select className="input input-sm" value={rightThemeId} onChange={e => { if (rightTimer) { if (tournaments.find(x => x.id === rightId)) store.updateTournamentTheme(rightId, e.target.value); else store.updateCashTheme(rightId, e.target.value); } }}>
              {store.themes.map(th => <option key={th.id} value={th.id}>{th.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Split Preview */}
      <DisplayPreview
        route="split"
        displayId=""
        targetName={`${leftTimer?.name || '左'} | ${rightTimer?.name || '右'}`}
        themeLabel={themeName}
        overridePath={splitPath}
      />
    </div>
  );
}

/* ── Settings Tab (Global Theme Only) ── */
/* ── HSL ↔ Hex conversion helpers ── */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function SystemStyleEditor() {
  const systemStyle = useStore(s => s.systemStyle) || DEFAULT_SYSTEM_STYLE;
  const updateSystemStyle = useStore(s => s.updateSystemStyle);
  const currentFont = FONT_OPTIONS.find(f => f.id === systemStyle.fontFamily) || FONT_OPTIONS[0];
  const hsl = hexToHsl(systemStyle.uiAccentColor || '#3b82f6');

  const setHsl = (h: number, s: number, l: number) => {
    updateSystemStyle({ uiAccentColor: hslToHex(h, s, l) });
  };

  return (
    <div className="g-card p-4 space-y-5">
      <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">
        System Style (システムスタイル)
      </div>
      <p className="text-[11px]" style={{ color: 'var(--sys-text-muted)' }}>アプリ全体のテーマ、フォント、アクセントカラー、ディスプレイ設定を変更できます。</p>

      {/* System Theme Picker */}
      <div>
        <label className="text-[11px] block mb-2" style={{ color: 'var(--sys-text-muted)' }}>System Theme (システムテーマ)</label>
        <div className="grid grid-cols-3 gap-2">
          {SYSTEM_THEMES.map(t => (
            <button key={t.id}
              onClick={() => updateSystemStyle({ systemThemeId: t.id as SystemThemeId })}
              className={`p-2 rounded-xl border transition-all ${
                (systemStyle.systemThemeId || 'bright-blue') === t.id
                  ? 'border-[var(--ui-accent)] ring-2 ring-[var(--ui-accent)]/30'
                  : 'border-[var(--sys-input-border)] hover:border-[var(--sys-glass-border)]'
              }`}>
              <div className="w-full h-8 rounded-lg mb-1.5"
                style={{ background: `linear-gradient(135deg, ${t.bgFrom}, ${t.bgTo})` }} />
              <div className="text-[10px] font-medium truncate" style={{ color: 'var(--sys-text)' }}>{t.name}</div>
              <div className="text-[9px] truncate" style={{ color: 'var(--sys-text-muted)' }}>{t.nameJa}</div>
            </button>
          ))}
          {/* Custom option */}
          <button
            onClick={() => updateSystemStyle({ systemThemeId: 'custom' })}
            className={`p-2 rounded-xl border transition-all ${
              systemStyle.systemThemeId === 'custom'
                ? 'border-[var(--ui-accent)] ring-2 ring-[var(--ui-accent)]/30'
                : 'border-[var(--sys-input-border)] hover:border-[var(--sys-glass-border)]'
            }`}>
            <div className="w-full h-8 rounded-lg mb-1.5 flex items-center justify-center text-[16px]"
              style={{ background: systemStyle.systemThemeId === 'custom'
                ? `linear-gradient(135deg, ${systemStyle.customBgFrom || '#0e1c36'}, ${systemStyle.customBgTo || '#1c3d6e'})`
                : 'var(--sys-glass-inner-bg)' }}>
              🎨
            </div>
            <div className="text-[10px] font-medium truncate" style={{ color: 'var(--sys-text)' }}>Custom</div>
            <div className="text-[9px] truncate" style={{ color: 'var(--sys-text-muted)' }}>カスタム</div>
          </button>
        </div>
        {systemStyle.systemThemeId === 'custom' && (
          <div className="grid grid-cols-2 gap-3 mt-3 g-card-inner p-3">
            <div>
              <label className="text-[10px] block mb-1" style={{ color: 'var(--sys-text-muted)' }}>Gradient Start</label>
              <div className="flex items-center gap-2">
                <input type="color" value={systemStyle.customBgFrom || '#0e1c36'} className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  onChange={e => updateSystemStyle({ customBgFrom: e.target.value })} />
                <input className="input input-sm flex-1 font-mono text-xs" value={systemStyle.customBgFrom || '#0e1c36'}
                  onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) updateSystemStyle({ customBgFrom: e.target.value }); }} />
              </div>
            </div>
            <div>
              <label className="text-[10px] block mb-1" style={{ color: 'var(--sys-text-muted)' }}>Gradient End</label>
              <div className="flex items-center gap-2">
                <input type="color" value={systemStyle.customBgTo || '#1c3d6e'} className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                  onChange={e => updateSystemStyle({ customBgTo: e.target.value })} />
                <input className="input input-sm flex-1 font-mono text-xs" value={systemStyle.customBgTo || '#1c3d6e'}
                  onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) updateSystemStyle({ customBgTo: e.target.value }); }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Font Selector */}
      <div>
        <label className="text-[11px] text-white/25 block mb-1">Font (フォント)</label>
        <select className="input input-sm" value={systemStyle.fontFamily}
          onChange={e => updateSystemStyle({ fontFamily: e.target.value })}>
          {FONT_OPTIONS.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Text Color Override */}
      <div>
        <label className="text-[11px] text-white/25 block mb-1">Text Color (文字色)</label>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-white/10 shrink-0"
            style={{ background: systemStyle.customTextColor || getSystemTheme(systemStyle.systemThemeId || 'bright-blue', systemStyle.customBgFrom, systemStyle.customBgTo).textPrimary }} />
          <input className="input input-sm flex-1 font-mono text-xs"
            value={systemStyle.customTextColor || ''}
            placeholder={getSystemTheme(systemStyle.systemThemeId || 'bright-blue', systemStyle.customBgFrom, systemStyle.customBgTo).textPrimary}
            onChange={e => {
              const v = e.target.value;
              if (v === '') { updateSystemStyle({ customTextColor: undefined }); }
              else if (/^#[0-9a-fA-F]{6}$/.test(v)) { updateSystemStyle({ customTextColor: v }); }
            }} />
          <input type="color"
            value={systemStyle.customTextColor || getSystemTheme(systemStyle.systemThemeId || 'bright-blue', systemStyle.customBgFrom, systemStyle.customBgTo).textPrimary}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
            onChange={e => updateSystemStyle({ customTextColor: e.target.value })} />
          {systemStyle.customTextColor && (
            <button className="btn btn-sm btn-ghost text-[10px] shrink-0"
              onClick={() => updateSystemStyle({ customTextColor: undefined })}>
              リセット
            </button>
          )}
        </div>
        <p className="text-[10px] text-white/15 mt-1">空欄でテーマデフォルトの文字色を使用します</p>
      </div>

      {/* UI Accent Color — Slider */}
      <div className="space-y-3">
        <label className="text-[11px] text-white/25 block">UI Accent Color (アクセントカラー)</label>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl border border-white/10 shrink-0" style={{ background: systemStyle.uiAccentColor }} />
          <input className="input input-sm flex-1 font-mono text-xs" value={systemStyle.uiAccentColor}
            onChange={e => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) updateSystemStyle({ uiAccentColor: e.target.value }); }} />
        </div>
        {/* Hue slider */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-white/20">色相 (Hue)</span>
            <span className="text-[10px] text-white/20">{hsl.h}°</span>
          </div>
          <input type="range" min={0} max={360} value={hsl.h}
            onChange={e => setHsl(+e.target.value, hsl.s, hsl.l)}
            className="w-full h-6 rounded-full cursor-pointer appearance-none"
            style={{ background: 'linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))' }} />
        </div>
        {/* Saturation slider */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-white/20">彩度 (Saturation)</span>
            <span className="text-[10px] text-white/20">{hsl.s}%</span>
          </div>
          <input type="range" min={10} max={100} value={hsl.s}
            onChange={e => setHsl(hsl.h, +e.target.value, hsl.l)}
            className="w-full h-6 rounded-full cursor-pointer appearance-none"
            style={{ background: `linear-gradient(to right, hsl(${hsl.h},10%,${hsl.l}%), hsl(${hsl.h},100%,${hsl.l}%))` }} />
        </div>
        {/* Lightness slider */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-white/20">明るさ (Lightness)</span>
            <span className="text-[10px] text-white/20">{hsl.l}%</span>
          </div>
          <input type="range" min={15} max={85} value={hsl.l}
            onChange={e => setHsl(hsl.h, hsl.s, +e.target.value)}
            className="w-full h-6 rounded-full cursor-pointer appearance-none"
            style={{ background: `linear-gradient(to right, hsl(${hsl.h},${hsl.s}%,15%), hsl(${hsl.h},${hsl.s}%,50%), hsl(${hsl.h},${hsl.s}%,85%))` }} />
        </div>
      </div>

      {/* Tab Bar Colors */}
      <div className="space-y-3 border-t border-white/[0.06] pt-5">
        <label className="text-[11px] text-white/25 block">Tab Bar Colors (タブバーカラー)</label>
        {/* Tab BG */}
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'var(--sys-text-muted)' }}>タブバー背景色</label>
          <div className="flex items-center gap-2">
            <input type="color" value={systemStyle.tabBgColor || '#0e1c36'} className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
              onChange={e => updateSystemStyle({ tabBgColor: e.target.value })} />
            <input className="input input-sm flex-1 font-mono text-xs" value={systemStyle.tabBgColor || ''}
              placeholder="transparent"
              onChange={e => { const v = e.target.value; if (v === '') updateSystemStyle({ tabBgColor: undefined }); else if (/^#[0-9a-fA-F]{6}$/.test(v)) updateSystemStyle({ tabBgColor: v }); }} />
            {systemStyle.tabBgColor && <button className="btn btn-sm btn-ghost text-[10px] shrink-0" onClick={() => updateSystemStyle({ tabBgColor: undefined })}>リセット</button>}
          </div>
        </div>
        {/* Active Tab Color */}
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'var(--sys-text-muted)' }}>アクティブタブ色</label>
          <div className="flex items-center gap-2">
            <input type="color" value={systemStyle.tabActiveColor || systemStyle.uiAccentColor || '#3b82f6'} className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
              onChange={e => updateSystemStyle({ tabActiveColor: e.target.value })} />
            <input className="input input-sm flex-1 font-mono text-xs" value={systemStyle.tabActiveColor || ''}
              placeholder={systemStyle.uiAccentColor || '#3b82f6'}
              onChange={e => { const v = e.target.value; if (v === '') updateSystemStyle({ tabActiveColor: undefined }); else if (/^#[0-9a-fA-F]{6}$/.test(v)) updateSystemStyle({ tabActiveColor: v }); }} />
            {systemStyle.tabActiveColor && <button className="btn btn-sm btn-ghost text-[10px] shrink-0" onClick={() => updateSystemStyle({ tabActiveColor: undefined })}>リセット</button>}
          </div>
        </div>
        {/* Tab Text Color */}
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'var(--sys-text-muted)' }}>タブ文字色</label>
          <div className="flex items-center gap-2">
            <input type="color" value={systemStyle.tabTextColor || '#999999'} className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
              onChange={e => updateSystemStyle({ tabTextColor: e.target.value })} />
            <input className="input input-sm flex-1 font-mono text-xs" value={systemStyle.tabTextColor || ''}
              placeholder="テーマデフォルト"
              onChange={e => { const v = e.target.value; if (v === '') updateSystemStyle({ tabTextColor: undefined }); else if (/^#[0-9a-fA-F]{6}$/.test(v)) updateSystemStyle({ tabTextColor: v }); }} />
            {systemStyle.tabTextColor && <button className="btn btn-sm btn-ghost text-[10px] shrink-0" onClick={() => updateSystemStyle({ tabTextColor: undefined })}>リセット</button>}
          </div>
        </div>
        {/* Mini preview */}
        <div className="rounded-xl p-2 flex gap-1" style={{ background: systemStyle.tabBgColor || 'var(--sys-glass-inner-bg)' }}>
          {['Tournaments', 'Ring Games', 'Split', 'Settings'].map((label, i) => (
            <div key={label} className="flex-1 py-1.5 rounded-lg text-[9px] font-semibold text-center border transition-all"
              style={i === 0
                ? { background: `rgba(var(--tab-active-rgb), 0.2)`, color: 'var(--tab-active)', borderColor: `rgba(var(--tab-active-rgb), 0.3)` }
                : { color: 'var(--tab-text, var(--sys-text-muted))', borderColor: 'transparent' }}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* UI Colors */}
      <div className="space-y-3 border-t border-white/[0.06] pt-5">
        <label className="text-[11px] text-white/25 block">UI Colors (UIカラー)</label>
        {/* Card BG */}
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'var(--sys-text-muted)' }}>カード背景色</label>
          <div className="flex items-center gap-2">
            <input type="color" value={systemStyle.cardBgColor || '#ffffff'} className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
              onChange={e => updateSystemStyle({ cardBgColor: e.target.value })} />
            <input className="input input-sm flex-1 font-mono text-xs" value={systemStyle.cardBgColor || ''}
              placeholder="テーマデフォルト"
              onChange={e => { const v = e.target.value; if (v === '') updateSystemStyle({ cardBgColor: undefined }); else if (/^#[0-9a-fA-F]{6}$/.test(v)) updateSystemStyle({ cardBgColor: v }); }} />
            {systemStyle.cardBgColor && <button className="btn btn-sm btn-ghost text-[10px] shrink-0" onClick={() => updateSystemStyle({ cardBgColor: undefined })}>リセット</button>}
          </div>
        </div>
        {/* Card Border */}
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'var(--sys-text-muted)' }}>カードボーダー色</label>
          <div className="flex items-center gap-2">
            <input type="color" value={systemStyle.cardBorderColor || '#ffffff'} className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
              onChange={e => updateSystemStyle({ cardBorderColor: e.target.value })} />
            <input className="input input-sm flex-1 font-mono text-xs" value={systemStyle.cardBorderColor || ''}
              placeholder="テーマデフォルト"
              onChange={e => { const v = e.target.value; if (v === '') updateSystemStyle({ cardBorderColor: undefined }); else if (/^#[0-9a-fA-F]{6}$/.test(v)) updateSystemStyle({ cardBorderColor: v }); }} />
            {systemStyle.cardBorderColor && <button className="btn btn-sm btn-ghost text-[10px] shrink-0" onClick={() => updateSystemStyle({ cardBorderColor: undefined })}>リセット</button>}
          </div>
        </div>
        {/* Input BG */}
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'var(--sys-text-muted)' }}>入力欄背景色</label>
          <div className="flex items-center gap-2">
            <input type="color" value={systemStyle.inputBgColor || '#ffffff'} className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
              onChange={e => updateSystemStyle({ inputBgColor: e.target.value })} />
            <input className="input input-sm flex-1 font-mono text-xs" value={systemStyle.inputBgColor || ''}
              placeholder="テーマデフォルト"
              onChange={e => { const v = e.target.value; if (v === '') updateSystemStyle({ inputBgColor: undefined }); else if (/^#[0-9a-fA-F]{6}$/.test(v)) updateSystemStyle({ inputBgColor: v }); }} />
            {systemStyle.inputBgColor && <button className="btn btn-sm btn-ghost text-[10px] shrink-0" onClick={() => updateSystemStyle({ inputBgColor: undefined })}>リセット</button>}
          </div>
        </div>
        {/* Input Border */}
        <div>
          <label className="text-[10px] block mb-1" style={{ color: 'var(--sys-text-muted)' }}>入力欄ボーダー色</label>
          <div className="flex items-center gap-2">
            <input type="color" value={systemStyle.inputBorderColor || '#ffffff'} className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
              onChange={e => updateSystemStyle({ inputBorderColor: e.target.value })} />
            <input className="input input-sm flex-1 font-mono text-xs" value={systemStyle.inputBorderColor || ''}
              placeholder="テーマデフォルト"
              onChange={e => { const v = e.target.value; if (v === '') updateSystemStyle({ inputBorderColor: undefined }); else if (/^#[0-9a-fA-F]{6}$/.test(v)) updateSystemStyle({ inputBorderColor: v }); }} />
            {systemStyle.inputBorderColor && <button className="btn btn-sm btn-ghost text-[10px] shrink-0" onClick={() => updateSystemStyle({ inputBorderColor: undefined })}>リセット</button>}
          </div>
        </div>
        {/* Mini preview */}
        <div className="g-card p-3 space-y-2">
          <div className="text-[10px]" style={{ color: 'var(--sys-text-muted)' }}>プレビュー</div>
          <input className="input input-sm text-xs" value="入力サンプル" readOnly />
          <div className="g-card-inner p-2 text-[10px]" style={{ color: 'var(--sys-text-secondary)' }}>カード内カード</div>
        </div>
      </div>

      {/* Display Aspect Ratio */}
      <div>
        <label className="text-[11px] text-white/25 block mb-2">Display Aspect Ratio (ディスプレイ比率)</label>
        <div className="grid grid-cols-2 gap-2">
          {ASPECT_RATIO_OPTIONS.map(opt => (
            <button key={opt.id}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                systemStyle.displayAspectRatio === opt.id
                  ? 'border-[var(--ui-accent)] bg-[rgba(var(--ui-accent-rgb),0.2)] text-white'
                  : 'border-white/[0.08] bg-white/[0.04] text-white/40 hover:bg-white/[0.08]'
              }`}
              onClick={() => updateSystemStyle({ displayAspectRatio: opt.id as AspectRatioMode })}>
              <div>{opt.label}</div>
              <div className="text-[9px] text-white/20 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Display Font Size */}
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-[11px] text-white/25">Display Font Size (文字サイズ)</label>
          <span className="text-[11px] text-white/30 font-mono">{Math.round((systemStyle.displayFontScale || 1) * 100)}%</span>
        </div>
        <input type="range" min={50} max={200} step={5}
          value={Math.round((systemStyle.displayFontScale || 1) * 100)}
          onChange={e => updateSystemStyle({ displayFontScale: +e.target.value / 100 })}
          className="w-full h-3 rounded-full cursor-pointer appearance-none bg-white/10" />
        <div className="flex justify-between text-[9px] text-white/15 mt-1">
          <span>50%</span><span>100%</span><span>200%</span>
        </div>
      </div>

      {/* Preview */}
      <div className="g-card-inner p-4 space-y-2">
        <div className="text-[11px] text-white/25 mb-2">Preview</div>
        <div style={{ fontFamily: currentFont.value, fontSize: `${(systemStyle.displayFontScale || 1) * 100}%` }}>
          <div className="text-lg font-bold" style={{ color: systemStyle.uiAccentColor }}>
            COME ON Timer
          </div>
          <div className="text-sm text-white/50">
            The quick brown fox jumps over the lazy dog
          </div>
          <div className="text-2xl font-black timer-font text-white/70 mt-1">
            12:34
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-6 fade-in">
      <SystemStyleEditor />
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
        <div className="text-xs text-white/30 font-semibold uppercase tracking-wider">Timer Themes (タイマーテーマ)</div>
        <button className="btn btn-ghost btn-sm" onClick={handleAdd}>+ Add Theme</button>
      </div>
      <p className="text-[11px] text-white/20">各ディスプレイの背景・カラーテーマを管理します。各タイマーの設定で個別にテーマを選択できます。</p>

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
