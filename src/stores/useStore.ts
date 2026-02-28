import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Tournament, CashGame, DisplayAssignment, ThemeConfig, SoundSettings, DisplayToggles, BlindLevel, SectionLayout, TournamentSectionId, SectionPosition, CashSectionId, CashSectionLayout, SystemStyle, BlindTemplate, TournamentPreset } from '@/lib/types';
import { uid } from '@/lib/utils';
import { broadcast } from '@/lib/sync';
import { DEFAULT_THEMES, STANDARD_PRESET, DEFAULT_TTS_MESSAGES, DEFAULT_DISPLAY_TOGGLES, DEFAULT_SOUND, DEFAULT_SECTION_LAYOUT, DEFAULT_CASH_SECTION_LAYOUT, DEFAULT_SYSTEM_STYLE } from '@/lib/presets';

interface AppState {
  tournaments: Tournament[];
  cashGames: CashGame[];
  displays: DisplayAssignment[];
  themes: ThemeConfig[];
  sound: SoundSettings;
  displayToggles: DisplayToggles;
  defaultThemeId: string;
  systemStyle: SystemStyle;
  blindTemplates: BlindTemplate[];
  tournamentPresets: TournamentPreset[];
  updateSystemStyle: (partial: Partial<SystemStyle>) => void;
  addTournament: (name?: string, levels?: BlindLevel[]) => string;
  removeTournament: (id: string) => void;
  updateTournament: (id: string, partial: Partial<Tournament>) => void;
  tStart: (id: string) => void;
  tPause: (id: string) => void;
  tResume: (id: string) => void;
  tReset: (id: string) => void;
  tNextLevel: (id: string) => void;
  tPrevLevel: (id: string) => void;
  tJumpLevel: (id: string, index: number) => void;
  tAdjust: (id: string, deltaMs: number) => void;
  tSeek: (id: string, positionMs: number) => void;
  tTick: (id: string) => void;
  addCashGame: (name?: string) => string;
  removeCashGame: (id: string) => void;
  updateCashGame: (id: string, partial: Partial<CashGame>) => void;
  cStart: (id: string) => void;
  cPause: (id: string) => void;
  cResume: (id: string) => void;
  cReset: (id: string) => void;
  cEndPreLevel: (id: string) => void;
  setDisplay: (d: DisplayAssignment) => void;
  removeDisplay: (displayId: string) => void;
  updateSound: (partial: Partial<SoundSettings>) => void;
  updateDisplayToggles: (partial: Partial<DisplayToggles>) => void;
  updateTournamentToggles: (id: string, partial: Partial<DisplayToggles>) => void;
  updateTournamentSound: (id: string, partial: Partial<SoundSettings>) => void;
  updateCashToggles: (id: string, partial: Partial<DisplayToggles>) => void;
  updateCashSound: (id: string, partial: Partial<SoundSettings>) => void;
  setDefaultThemeId: (id: string) => void;
  updateTournamentTheme: (id: string, themeId: string) => void;
  updateCashTheme: (id: string, themeId: string) => void;
  updateSectionLayout: (id: string, layout: SectionLayout) => void;
  updateSectionPosition: (id: string, sectionId: TournamentSectionId, pos: SectionPosition) => void;
  resetSectionLayout: (id: string) => void;
  updateCashSectionPosition: (id: string, sectionId: CashSectionId, pos: SectionPosition) => void;
  resetCashSectionLayout: (id: string) => void;
  addTheme: (theme: ThemeConfig) => void;
  updateTheme: (id: string, partial: Partial<ThemeConfig>) => void;
  removeTheme: (id: string) => void;
  addBlindTemplate: (name: string, levels: BlindLevel[]) => void;
  removeBlindTemplate: (id: string) => void;
  loadBlindTemplate: (tournamentId: string, templateId: string) => void;
  updateSplitSectionPosition: (id: string, sectionId: TournamentSectionId, pos: SectionPosition) => void;
  resetSplitSectionLayout: (id: string) => void;
  addTournamentPreset: (name: string, tournament: Tournament) => void;
  removeTournamentPreset: (id: string) => void;
  loadTournamentPreset: (tournamentId: string, presetId: string) => void;
  updateTournamentPreset: (presetId: string, tournament: Tournament) => void;
  broadcastAll: () => void;
}

function mkTournament(name?: string, levels?: BlindLevel[]): Tournament {
  const lvls = levels || [...STANDARD_PRESET];
  return {
    id: uid(), name: name || 'Tournament 1', levels: lvls, currentLevelIndex: 0,
    status: 'idle', timerStartedAt: null, remainingMs: lvls[0]?.duration ? lvls[0].duration * 1000 : 900000,
    startingChips: 10000,
    initialEntries: 0, reEntryCount: 0, reEntryChips: 10000, rebuyCount: 0, rebuyChips: 10000, addonCount: 0, addonChips: 10000,
    buyInAmount: 0, reEntryAmount: 0, rebuyAmount: 0, addonAmount: 0,
    earlyBirdCount: 0, earlyBirdBonus: 0,
    prizeStructure: [{ place: 1, label: '' }, { place: 2, label: '' }, { place: 3, label: '' }],
    createdAt: Date.now(),
    displayToggles: { ...DEFAULT_DISPLAY_TOGGLES },
    sound: { ...DEFAULT_SOUND },
    themeId: 'come-on-blue',
  };
}

function mkCash(name?: string): CashGame {
  return {
    id: uid(), name: name || 'Cash Game 1', smallBlind: 100, bigBlind: 200, ante: 0,
    memo: '', status: 'idle', timerStartedAt: null, elapsedMs: 0,
    countdownMode: false, countdownTotalMs: 3600000, countdownRemainingMs: 3600000,
    preLevelRemainingMs: 0,
    createdAt: Date.now(),
    displayToggles: { ...DEFAULT_DISPLAY_TOGGLES },
    sound: { ...DEFAULT_SOUND },
    themeId: 'come-on-blue',
  };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      tournaments: [mkTournament()],
      cashGames: [mkCash()],
      displays: [],
      themes: [...DEFAULT_THEMES],
      sound: {
        masterVolume: 0.7, soundPreset: 'chime',
        blindChangeEnabled: true, breakStartEnabled: true, oneMinWarningEnabled: true,
        ttsEnabled: false, ttsLang: 'ja', ttsMessages: [...DEFAULT_TTS_MESSAGES],
      },
      displayToggles: { ...DEFAULT_DISPLAY_TOGGLES },
      defaultThemeId: 'come-on-blue',
      systemStyle: { ...DEFAULT_SYSTEM_STYLE },
      blindTemplates: [],
      tournamentPresets: [],

      updateSystemStyle: (partial) => { set(s => ({ systemStyle: { ...s.systemStyle, ...partial } })); get().broadcastAll(); },
      addTournament: (name, levels) => {
        const t = mkTournament(name, levels);
        set(s => ({ tournaments: [...s.tournaments, t] }));
        get().broadcastAll();
        return t.id;
      },
      removeTournament: (id) => { set(s => ({ tournaments: s.tournaments.filter(t => t.id !== id) })); get().broadcastAll(); },
      updateTournament: (id, partial) => { set(s => ({ tournaments: s.tournaments.map(t => t.id === id ? { ...t, ...partial } : t) })); get().broadcastAll(); },
      tStart: (id) => {
        set(s => ({ tournaments: s.tournaments.map(t => {
          if (t.id !== id || t.status === 'running') return t;
          const hasPreLevel = t.status === 'idle' && (t.preLevelDuration || 0) > 0;
          return { ...t, status: 'running' as const, timerStartedAt: Date.now(),
            currentLevelIndex: hasPreLevel ? -1 : t.currentLevelIndex,
            remainingMs: hasPreLevel ? (t.preLevelDuration || 0) * 1000
              : t.status === 'idle' ? (t.levels[t.currentLevelIndex]?.duration || 900) * 1000 : t.remainingMs };
        }) }));
        get().broadcastAll();
      },
      tPause: (id) => {
        set(s => ({ tournaments: s.tournaments.map(t => {
          if (t.id !== id || t.status !== 'running') return t;
          const elapsed = t.timerStartedAt ? Date.now() - t.timerStartedAt : 0;
          return { ...t, status: 'paused' as const, remainingMs: Math.max(0, t.remainingMs - elapsed), timerStartedAt: null };
        }) }));
        get().broadcastAll();
      },
      tResume: (id) => {
        set(s => ({ tournaments: s.tournaments.map(t => {
          if (t.id !== id || t.status !== 'paused') return t;
          return { ...t, status: 'running' as const, timerStartedAt: Date.now() };
        }) }));
        get().broadcastAll();
      },
      tReset: (id) => {
        set(s => ({ tournaments: s.tournaments.map(t => {
          if (t.id !== id) return t;
          return { ...t, status: 'idle' as const, currentLevelIndex: 0, timerStartedAt: null,
            remainingMs: (t.levels[0]?.duration || 900) * 1000 };
        }) }));
        get().broadcastAll();
      },
      tNextLevel: (id) => {
        set(s => ({ tournaments: s.tournaments.map(t => {
          if (t.id !== id) return t;
          const next = Math.min(t.currentLevelIndex + 1, t.levels.length - 1);
          if (next === t.currentLevelIndex && next === t.levels.length - 1) {
            return { ...t, status: 'finished' as const, timerStartedAt: null };
          }
          return { ...t, currentLevelIndex: next, remainingMs: (t.levels[next]?.duration || 900) * 1000,
            timerStartedAt: t.status === 'running' ? Date.now() : null };
        }) }));
        get().broadcastAll();
      },
      tPrevLevel: (id) => {
        set(s => ({ tournaments: s.tournaments.map(t => {
          if (t.id !== id) return t;
          const prev = Math.max(0, t.currentLevelIndex - 1);
          return { ...t, currentLevelIndex: prev, remainingMs: (t.levels[prev]?.duration || 900) * 1000,
            timerStartedAt: t.status === 'running' ? Date.now() : null };
        }) }));
        get().broadcastAll();
      },
      tJumpLevel: (id, index) => {
        set(s => ({ tournaments: s.tournaments.map(t => {
          if (t.id !== id) return t;
          const idx = Math.max(0, Math.min(index, t.levels.length - 1));
          return { ...t, currentLevelIndex: idx, remainingMs: (t.levels[idx]?.duration || 900) * 1000,
            timerStartedAt: t.status === 'running' ? Date.now() : null };
        }) }));
        get().broadcastAll();
      },
      tAdjust: (id, deltaMs) => {
        set(s => ({ tournaments: s.tournaments.map(t => {
          if (t.id !== id) return t;
          if (t.status === 'running' && t.timerStartedAt) {
            const now = Date.now();
            const cur = t.remainingMs - (now - t.timerStartedAt);
            return { ...t, remainingMs: Math.max(0, cur + deltaMs), timerStartedAt: now };
          }
          return { ...t, remainingMs: Math.max(0, t.remainingMs + deltaMs) };
        }) }));
        get().broadcastAll();
      },
      tSeek: (id, positionMs) => {
        set(s => ({ tournaments: s.tournaments.map(t => {
          if (t.id !== id) return t;
          const duration = (t.levels[t.currentLevelIndex]?.duration || 900) * 1000;
          const newRem = Math.max(0, Math.min(duration, duration - positionMs));
          return { ...t, remainingMs: newRem, timerStartedAt: t.status === 'running' ? Date.now() : t.timerStartedAt };
        }) }));
        get().broadcastAll();
      },
      tTick: (id) => {
        const s = get();
        const t = s.tournaments.find(x => x.id === id);
        if (!t || t.status !== 'running') return;
        const rem = t.timerStartedAt ? t.remainingMs - (Date.now() - t.timerStartedAt) : t.remainingMs;
        if (rem <= 0) s.tNextLevel(id);
      },
      addCashGame: (name) => { const c = mkCash(name); set(s => ({ cashGames: [...s.cashGames, c] })); get().broadcastAll(); return c.id; },
      removeCashGame: (id) => { set(s => ({ cashGames: s.cashGames.filter(c => c.id !== id) })); get().broadcastAll(); },
      updateCashGame: (id, partial) => { set(s => ({ cashGames: s.cashGames.map(c => c.id === id ? { ...c, ...partial } : c) })); get().broadcastAll(); },
      cStart: (id) => {
        set(s => ({ cashGames: s.cashGames.map(c => {
          if (c.id !== id || c.status === 'running') return c;
          const hasPreLevel = c.status === 'idle' && (c.preLevelDuration || 0) > 0;
          return { ...c, status: 'running' as const, timerStartedAt: Date.now(),
            preLevelRemainingMs: hasPreLevel ? (c.preLevelDuration || 0) * 1000 : 0,
            ...(c.status === 'idle' && c.countdownMode && !hasPreLevel ? { countdownRemainingMs: c.countdownTotalMs } : {}) };
        }) }));
        get().broadcastAll();
      },
      cPause: (id) => {
        set(s => ({ cashGames: s.cashGames.map(c => {
          if (c.id !== id || c.status !== 'running') return c;
          const elapsed = c.timerStartedAt ? Date.now() - c.timerStartedAt : 0;
          if (c.preLevelRemainingMs > 0) {
            return { ...c, status: 'paused' as const, preLevelRemainingMs: Math.max(0, c.preLevelRemainingMs - elapsed), timerStartedAt: null };
          }
          return { ...c, status: 'paused' as const, elapsedMs: c.elapsedMs + elapsed,
            ...(c.countdownMode ? { countdownRemainingMs: Math.max(0, c.countdownRemainingMs - elapsed) } : {}),
            timerStartedAt: null };
        }) }));
        get().broadcastAll();
      },
      cResume: (id) => {
        set(s => ({ cashGames: s.cashGames.map(c => {
          if (c.id !== id || c.status !== 'paused') return c;
          return { ...c, status: 'running' as const, timerStartedAt: Date.now() };
        }) }));
        get().broadcastAll();
      },
      cReset: (id) => {
        set(s => ({ cashGames: s.cashGames.map(c => {
          if (c.id !== id) return c;
          return { ...c, status: 'idle' as const, timerStartedAt: null, elapsedMs: 0, countdownRemainingMs: c.countdownTotalMs, preLevelRemainingMs: 0 };
        }) }));
        get().broadcastAll();
      },
      cEndPreLevel: (id) => {
        set(s => ({ cashGames: s.cashGames.map(c => {
          if (c.id !== id) return c;
          return { ...c, preLevelRemainingMs: 0, timerStartedAt: Date.now(),
            ...(c.countdownMode ? { countdownRemainingMs: c.countdownTotalMs } : {}) };
        }) }));
        get().broadcastAll();
      },
      setDisplay: (d) => { set(s => ({ displays: [...s.displays.filter(x => x.displayId !== d.displayId), d] })); get().broadcastAll(); },
      removeDisplay: (displayId) => { set(s => ({ displays: s.displays.filter(x => x.displayId !== displayId) })); get().broadcastAll(); },
      updateSound: (partial) => { set(s => ({ sound: { ...s.sound, ...partial } })); get().broadcastAll(); },
      updateDisplayToggles: (partial) => { set(s => ({ displayToggles: { ...s.displayToggles, ...partial } })); get().broadcastAll(); },
      updateTournamentToggles: (id, partial) => {
        set(s => ({ tournaments: s.tournaments.map(t => t.id === id ? { ...t, displayToggles: { ...(t.displayToggles || DEFAULT_DISPLAY_TOGGLES), ...partial } } : t) }));
        get().broadcastAll();
      },
      updateTournamentSound: (id, partial) => {
        set(s => ({ tournaments: s.tournaments.map(t => t.id === id ? { ...t, sound: { ...(t.sound || DEFAULT_SOUND), ...partial } } : t) }));
        get().broadcastAll();
      },
      updateCashToggles: (id, partial) => {
        set(s => ({ cashGames: s.cashGames.map(c => c.id === id ? { ...c, displayToggles: { ...(c.displayToggles || DEFAULT_DISPLAY_TOGGLES), ...partial } } : c) }));
        get().broadcastAll();
      },
      updateCashSound: (id, partial) => {
        set(s => ({ cashGames: s.cashGames.map(c => c.id === id ? { ...c, sound: { ...(c.sound || DEFAULT_SOUND), ...partial } } : c) }));
        get().broadcastAll();
      },
      setDefaultThemeId: (id) => { set({ defaultThemeId: id }); get().broadcastAll(); },
      updateTournamentTheme: (id, themeId) => {
        set(s => ({ tournaments: s.tournaments.map(t => t.id === id ? { ...t, themeId } : t) }));
        get().broadcastAll();
      },
      updateCashTheme: (id, themeId) => {
        set(s => ({ cashGames: s.cashGames.map(c => c.id === id ? { ...c, themeId } : c) }));
        get().broadcastAll();
      },
      updateSectionLayout: (id, layout) => {
        set(s => ({ tournaments: s.tournaments.map(t => t.id === id ? { ...t, sectionLayout: layout } : t) }));
        get().broadcastAll();
      },
      updateSectionPosition: (id, sectionId, pos) => {
        set(s => ({ tournaments: s.tournaments.map(t => {
          if (t.id !== id) return t;
          const current = t.sectionLayout || { ...DEFAULT_SECTION_LAYOUT };
          return { ...t, sectionLayout: { ...current, [sectionId]: pos } };
        }) }));
        get().broadcastAll();
      },
      resetSectionLayout: (id) => {
        set(s => ({ tournaments: s.tournaments.map(t => t.id === id ? { ...t, sectionLayout: undefined } : t) }));
        get().broadcastAll();
      },
      updateCashSectionPosition: (id, sectionId, pos) => {
        set(s => ({ cashGames: s.cashGames.map(c => {
          if (c.id !== id) return c;
          const current = c.sectionLayout || { ...DEFAULT_CASH_SECTION_LAYOUT };
          return { ...c, sectionLayout: { ...current, [sectionId]: pos } };
        }) }));
        get().broadcastAll();
      },
      resetCashSectionLayout: (id) => {
        set(s => ({ cashGames: s.cashGames.map(c => c.id === id ? { ...c, sectionLayout: undefined } : c) }));
        get().broadcastAll();
      },
      addTheme: (theme) => { set(s => ({ themes: [...s.themes, theme] })); get().broadcastAll(); },
      updateTheme: (id, partial) => { set(s => ({ themes: s.themes.map(t => t.id === id ? { ...t, ...partial } : t) })); get().broadcastAll(); },
      removeTheme: (id) => { set(s => ({ themes: s.themes.filter(t => t.id !== id) })); get().broadcastAll(); },
      addBlindTemplate: (name, levels) => {
        set(s => ({ blindTemplates: [...s.blindTemplates, { id: uid(), name, levels: [...levels], createdAt: Date.now() }] }));
      },
      removeBlindTemplate: (id) => {
        set(s => ({ blindTemplates: s.blindTemplates.filter(t => t.id !== id) }));
      },
      loadBlindTemplate: (tournamentId, templateId) => {
        const tmpl = get().blindTemplates.find(t => t.id === templateId);
        if (!tmpl) return;
        set(s => ({ tournaments: s.tournaments.map(t => t.id === tournamentId ? { ...t, levels: [...tmpl.levels], currentLevelIndex: 0, remainingMs: tmpl.levels[0]?.duration ? tmpl.levels[0].duration * 1000 : 900000, status: 'idle' as const, timerStartedAt: null } : t) }));
        get().broadcastAll();
      },
      updateSplitSectionPosition: (id, sectionId, pos) => {
        set(s => ({ tournaments: s.tournaments.map(t => {
          if (t.id !== id) return t;
          const current = t.splitSectionLayout || { ...DEFAULT_SECTION_LAYOUT };
          return { ...t, splitSectionLayout: { ...current, [sectionId]: pos } };
        }) }));
        get().broadcastAll();
      },
      resetSplitSectionLayout: (id) => {
        set(s => ({ tournaments: s.tournaments.map(t => t.id === id ? { ...t, splitSectionLayout: undefined } : t) }));
        get().broadcastAll();
      },
      addTournamentPreset: (name, tournament) => {
        const preset: TournamentPreset = {
          id: uid(), name, tournamentName: tournament.name,
          levels: [...tournament.levels],
          startingChips: tournament.startingChips,
          buyInAmount: tournament.buyInAmount, reEntryAmount: tournament.reEntryAmount,
          rebuyAmount: tournament.rebuyAmount, addonAmount: tournament.addonAmount,
          reEntryChips: tournament.reEntryChips, rebuyChips: tournament.rebuyChips, addonChips: tournament.addonChips,
          regCloseLevel: tournament.regCloseLevel, preLevelDuration: tournament.preLevelDuration,
          preLevelNote: tournament.preLevelNote,
          earlyBirdBonus: tournament.earlyBirdBonus,
          prizeStructure: tournament.prizeStructure.map(p => ({ ...p })),
          displayToggles: tournament.displayToggles ? { ...tournament.displayToggles } : undefined,
          sound: tournament.sound ? { ...tournament.sound } : undefined,
          themeId: tournament.themeId,
          sectionLayout: tournament.sectionLayout ? { ...tournament.sectionLayout } : undefined,
          splitSectionLayout: tournament.splitSectionLayout ? { ...tournament.splitSectionLayout } : undefined,
          createdAt: Date.now(),
        };
        set(s => ({ tournamentPresets: [...s.tournamentPresets, preset] }));
      },
      removeTournamentPreset: (id) => {
        set(s => ({ tournamentPresets: s.tournamentPresets.filter(p => p.id !== id) }));
      },
      loadTournamentPreset: (tournamentId, presetId) => {
        const preset = get().tournamentPresets.find(p => p.id === presetId);
        if (!preset) return;
        set(s => ({ tournaments: s.tournaments.map(t => t.id === tournamentId ? {
          ...t, name: preset.tournamentName || t.name,
          levels: [...preset.levels], startingChips: preset.startingChips,
          buyInAmount: preset.buyInAmount, reEntryAmount: preset.reEntryAmount,
          rebuyAmount: preset.rebuyAmount, addonAmount: preset.addonAmount,
          reEntryChips: preset.reEntryChips, rebuyChips: preset.rebuyChips, addonChips: preset.addonChips,
          regCloseLevel: preset.regCloseLevel, preLevelDuration: preset.preLevelDuration,
          preLevelNote: preset.preLevelNote,
          earlyBirdBonus: preset.earlyBirdBonus ?? t.earlyBirdBonus,
          prizeStructure: preset.prizeStructure ? preset.prizeStructure.map(p => ({ ...p })) : t.prizeStructure,
          displayToggles: preset.displayToggles ? { ...preset.displayToggles } : t.displayToggles,
          sound: preset.sound ? { ...preset.sound } : t.sound,
          themeId: preset.themeId ?? t.themeId,
          sectionLayout: preset.sectionLayout ? { ...preset.sectionLayout } : t.sectionLayout,
          splitSectionLayout: preset.splitSectionLayout ? { ...preset.splitSectionLayout } : t.splitSectionLayout,
          sourcePresetId: presetId,
          currentLevelIndex: 0, remainingMs: preset.levels[0]?.duration ? preset.levels[0].duration * 1000 : 900000,
          status: 'idle' as const, timerStartedAt: null,
        } : t) }));
        get().broadcastAll();
      },
      updateTournamentPreset: (presetId, tournament) => {
        set(s => ({ tournamentPresets: s.tournamentPresets.map(p => p.id === presetId ? {
          ...p, tournamentName: tournament.name,
          levels: [...tournament.levels], startingChips: tournament.startingChips,
          buyInAmount: tournament.buyInAmount, reEntryAmount: tournament.reEntryAmount,
          rebuyAmount: tournament.rebuyAmount, addonAmount: tournament.addonAmount,
          reEntryChips: tournament.reEntryChips, rebuyChips: tournament.rebuyChips, addonChips: tournament.addonChips,
          regCloseLevel: tournament.regCloseLevel, preLevelDuration: tournament.preLevelDuration,
          preLevelNote: tournament.preLevelNote,
          earlyBirdBonus: tournament.earlyBirdBonus,
          prizeStructure: tournament.prizeStructure.map(pe => ({ ...pe })),
          displayToggles: tournament.displayToggles ? { ...tournament.displayToggles } : undefined,
          sound: tournament.sound ? { ...tournament.sound } : undefined,
          themeId: tournament.themeId,
          sectionLayout: tournament.sectionLayout ? { ...tournament.sectionLayout } : undefined,
          splitSectionLayout: tournament.splitSectionLayout ? { ...tournament.splitSectionLayout } : undefined,
        } : p) }));
      },
      broadcastAll: () => {
        const s = get();
        broadcast('FULL_SYNC', { tournaments: s.tournaments, cashGames: s.cashGames, displays: s.displays, themes: s.themes, sound: s.sound, displayToggles: s.displayToggles, defaultThemeId: s.defaultThemeId, systemStyle: s.systemStyle, blindTemplates: s.blindTemplates, tournamentPresets: s.tournamentPresets });
      },
    }),
    {
      name: 'come-on-timer-v3',
      version: 17,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 4) {
          const globalToggles = (state.displayToggles as DisplayToggles) || { ...DEFAULT_DISPLAY_TOGGLES };
          const globalSound = (state.sound as SoundSettings) || { ...DEFAULT_SOUND };
          const tours = (state.tournaments as Tournament[]) || [];
          const cashes = (state.cashGames as CashGame[]) || [];
          state.tournaments = tours.map(t => ({
            ...t,
            displayToggles: t.displayToggles || { ...globalToggles },
            sound: t.sound || { ...globalSound },
          }));
          state.cashGames = cashes.map(c => ({
            ...c,
            displayToggles: c.displayToggles || { ...globalToggles },
            sound: c.sound || { ...globalSound },
          }));
        }
        if (version < 5) {
          const defTheme = (state.defaultThemeId as string) || 'come-on-blue';
          state.defaultThemeId = defTheme;
          const tours = (state.tournaments as Tournament[]) || [];
          const cashes = (state.cashGames as CashGame[]) || [];
          state.tournaments = tours.map(t => ({
            ...t,
            themeId: t.themeId || defTheme,
          }));
          state.cashGames = cashes.map(c => ({
            ...c,
            themeId: c.themeId || defTheme,
          }));
        }
        if (version < 6) {
          // v6 migration (overlays - now removed, kept for compat)
        }
        if (version < 7) {
          const tours = (state.tournaments as Tournament[]) || [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          state.tournaments = tours.map((t: any) => {
            const { overlays, ...rest } = t;
            return { ...rest };
          });
        }
        if (version < 8) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tours = (state.tournaments as any[]) || [];
          state.tournaments = tours.map((t) => {
            const { scheduledStartTime, ...rest } = t;
            return { ...rest, preLevelDuration: 0 };
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cashes = (state.cashGames as any[]) || [];
          state.cashGames = cashes.map((c) => ({
            ...c, preLevelDuration: 0, preLevelRemainingMs: 0,
          }));
        }
        if (version < 9) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tours = (state.tournaments as any[]) || [];
          state.tournaments = tours.map((t) => {
            if (t.sectionLayout && !t.sectionLayout.tournamentName) {
              return { ...t, sectionLayout: { ...t.sectionLayout, tournamentName: { x: 25, y: 0.5, w: 50, h: 7 } } };
            }
            return t;
          });
        }
        if (version < 10) {
          state.systemStyle = state.systemStyle || { ...DEFAULT_SYSTEM_STYLE };
        }
        if (version < 11) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ss = (state.systemStyle as any) || {};
          ss.displayAspectRatio = ss.displayAspectRatio || 'zoom';
          ss.displayFontScale = ss.displayFontScale || 1.0;
          state.systemStyle = ss;
        }
        if (version < 12) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tours = (state.tournaments as any[]) || [];
          state.tournaments = tours.map((t: Record<string, unknown>) => {
            const initialEntries = (t.entryCount as number) ?? (t.initialEntries as number) ?? 0;
            const rebuyCount = (t.rebuyCount as number) || 0;
            const buyInAmount = (t.buyInAmount as number) || 0;
            const oldPool = (initialEntries + rebuyCount) * buyInAmount;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prizeStructure = ((t.prizeStructure as any[]) || []).map((p: Record<string, unknown>) => ({
              place: p.place as number,
              amount: p.amount !== undefined ? (p.amount as number) : Math.round(oldPool * ((p.percent as number) || 0) / 100),
            }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sl = t.sectionLayout as any;
            if (sl && !sl.reEntry) {
              sl.reEntry = { x: 0.8, y: 21.5, w: 12.5, h: 12 };
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { entryCount, ...rest } = t;
            return {
              ...rest,
              initialEntries,
              reEntryCount: (t.reEntryCount as number) ?? 0,
              reEntryAmount: (t.reEntryAmount as number) ?? buyInAmount,
              rebuyAmount: (t.rebuyAmount as number) ?? buyInAmount,
              addonAmount: (t.addonAmount as number) ?? buyInAmount,
              rakeType: (t.rakeType as string) ?? 'fixed',
              rakeValue: (t.rakeValue as number) ?? 0,
              prizeStructure,
              sectionLayout: sl,
            };
          });
          state.blindTemplates = (state.blindTemplates as unknown[]) || [];
        }
        if (version < 13) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tours = (state.tournaments as any[]) || [];
          state.tournaments = tours.map((t: Record<string, unknown>) => {
            // PrizeEntry: amount→label (テキスト化)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const prizeStructure = ((t.prizeStructure as any[]) || []).map((p: Record<string, unknown>) => ({
              place: p.place as number,
              label: p.label !== undefined ? String(p.label) : (p.amount ? `¥${Number(p.amount).toLocaleString()}` : ''),
            }));
            return {
              ...t,
              earlyBirdCount: (t.earlyBirdCount as number) ?? 0,
              earlyBirdBonus: (t.earlyBirdBonus as number) ?? 0,
              prizeStructure,
            };
          });
        }
        if (version < 14) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tours = (state.tournaments as any[]) || [];
          state.tournaments = tours.map((t: Record<string, unknown>) => {
            const sc = (t.startingChips as number) || 10000;
            return {
              ...t,
              reEntryChips: (t.reEntryChips as number) ?? sc,
              rebuyChips: (t.rebuyChips as number) ?? sc,
              addonChips: (t.addonChips as number) ?? sc,
            };
          });
        }
        if (version < 15) {
          state.tournamentPresets = (state.tournamentPresets as unknown[]) || [];
        }
        if (version < 16) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ss = (state.systemStyle as any) || {};
          ss.systemThemeId = ss.systemThemeId || 'dark-navy';
          state.systemStyle = ss;
        }
        if (version < 17) {
          // preLevelNote, sourcePresetId are optional — no migration needed
          // renumber blind levels for existing tournaments
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tours = (state.tournaments as any[]) || [];
          state.tournaments = tours.map((t) => {
            let playNum = 1;
            const levels = (t.levels || []).map((l: { type: string; level: number }) =>
              l.type === 'play' ? { ...l, level: playNum++ } : l
            );
            return { ...t, levels };
          });
        }
        return state as unknown as AppState;
      },
      partialize: (s) => ({ tournaments: s.tournaments, cashGames: s.cashGames, displays: s.displays, themes: s.themes, sound: s.sound, displayToggles: s.displayToggles, defaultThemeId: s.defaultThemeId, systemStyle: s.systemStyle, blindTemplates: s.blindTemplates, tournamentPresets: s.tournamentPresets }),
    }
  )
);
