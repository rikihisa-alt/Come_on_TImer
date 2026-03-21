import { BlindLevel, ThemeConfig, TTSMessage, DisplayToggles, SoundSettings, SectionLayout, CashSectionLayout, SystemStyle, AspectRatioMode, SystemThemeId, UnifiedThemePreset } from './types';
import { uid } from './utils';

function bl(level: number, sb: number, bb: number, ante: number, dur: number): BlindLevel {
  return { level, type: 'play', smallBlind: sb, bigBlind: bb, ante, duration: dur };
}
function brk(dur: number): BlindLevel {
  return { level: 0, type: 'break', smallBlind: 0, bigBlind: 0, ante: 0, duration: dur };
}

export const TURBO_PRESET: BlindLevel[] = [
  bl(1,25,50,0,600), bl(2,50,100,0,600), bl(3,75,150,0,600), bl(4,100,200,25,600), brk(300),
  bl(5,150,300,50,600), bl(6,200,400,50,600), bl(7,300,600,75,600), bl(8,400,800,100,600), brk(300),
  bl(9,500,1000,100,600), bl(10,600,1200,200,600), bl(11,800,1600,200,600), bl(12,1000,2000,300,600),
];
export const STANDARD_PRESET: BlindLevel[] = [
  bl(1,25,50,0,900), bl(2,50,100,0,900), bl(3,75,150,0,900), bl(4,100,200,25,900), brk(600),
  bl(5,150,300,50,900), bl(6,200,400,50,900), bl(7,300,600,75,900), bl(8,400,800,100,900), brk(600),
  bl(9,500,1000,100,900), bl(10,600,1200,200,900), bl(11,800,1600,200,900), bl(12,1000,2000,300,900),
  bl(13,1500,3000,400,900), bl(14,2000,4000,500,900),
];
export const DEEP_PRESET: BlindLevel[] = [
  bl(1,25,50,0,1200), bl(2,50,100,0,1200), bl(3,75,150,0,1200), bl(4,100,200,0,1200), brk(600),
  bl(5,100,200,25,1200), bl(6,150,300,50,1200), bl(7,200,400,50,1200), bl(8,300,600,75,1200), brk(600),
  bl(9,400,800,100,1200), bl(10,500,1000,100,1200), bl(11,600,1200,200,1200), bl(12,800,1600,200,1200), brk(600),
  bl(13,1000,2000,300,1200), bl(14,1500,3000,400,1200), bl(15,2000,4000,500,1200), bl(16,3000,6000,1000,1200),
];
export const PRESET_OPTIONS = [
  { label: 'Turbo (10min)', value: 'turbo', levels: TURBO_PRESET },
  { label: 'Standard (15min)', value: 'standard', levels: STANDARD_PRESET },
  { label: 'Deep (20min)', value: 'deep', levels: DEEP_PRESET },
] as const;

export const DEFAULT_THEMES: ThemeConfig[] = [
  { id: 'come-on-blue', name: 'COME ON Blue', type: 'gradient', gradientFrom: '#0f172a', gradientTo: '#1e3a5f', overlayOpacity: 0, primaryColor: '#60a5fa', accentColor: '#22d3ee' },
  { id: 'midnight', name: 'Midnight', type: 'gradient', gradientFrom: '#0c0c1d', gradientTo: '#1a1a3e', overlayOpacity: 0, primaryColor: '#818cf8', accentColor: '#a78bfa' },
  { id: 'ocean', name: 'Ocean', type: 'gradient', gradientFrom: '#042f2e', gradientTo: '#0f766e', overlayOpacity: 0, primaryColor: '#5eead4', accentColor: '#2dd4bf' },
  { id: 'solid-dark', name: 'Solid Dark', type: 'solid', bgColor: '#0a0e1a', overlayOpacity: 0, primaryColor: '#e2e8f0', accentColor: '#94a3b8' },
];

export const DEFAULT_TTS_MESSAGES: TTSMessage[] = [
  { id: uid(), label: 'レベルアップ', template: 'レベル{level}、{sb}/{bb}', enabled: true },
  { id: uid(), label: 'ブレイク開始', template: '休憩です', enabled: true },
  { id: uid(), label: '残り1分', template: '残り1分', enabled: true },
  { id: uid(), label: 'Level Up (EN)', template: 'Level {level}, {sb} {bb}', enabled: false },
  { id: uid(), label: 'Break (EN)', template: 'Break time', enabled: false },
];

export const DEFAULT_SOUND: SoundSettings = {
  masterVolume: 0.7,
  soundPreset: 'chime',
  blindChangeEnabled: true,
  blindChangeSoundId: 'sound_01',
  breakStartEnabled: true,
  breakStartSoundId: 'sound_22',
  oneMinWarningEnabled: true,
  oneMinWarningSoundId: 'sound_15',
  thirtySecWarningEnabled: false,
  thirtySecSoundId: 'sound_19',
  ttsEnabled: false,
  ttsLang: 'ja',
  ttsMessages: [...DEFAULT_TTS_MESSAGES],
};

export const DEFAULT_SECTION_LAYOUT: SectionLayout = {
  players:    { x: 0.8, y: 8.5,  w: 12.5, h: 12 },
  reEntry:    { x: 0.8, y: 21.5, w: 12.5, h: 12 },
  rebuy:      { x: 0.8, y: 34.5, w: 12.5, h: 12 },
  addon:      { x: 0.8, y: 47.5, w: 12.5, h: 12 },
  avgStack:   { x: 0.8, y: 60.5, w: 12.5, h: 12 },
  timer:      { x: 14.5, y: 8.5,  w: 71, h: 60 },
  nextLevel:  { x: 14.5, y: 70,   w: 71, h: 10 },
  cornerTime: { x: 86.7, y: 8.5,  w: 12.5, h: 18 },
  regClose:   { x: 86.7, y: 28,   w: 12.5, h: 18 },
  nextBreak:  { x: 86.7, y: 47.5, w: 12.5, h: 18 },
  prizeTable: { x: 86.7, y: 67,   w: 12.5, h: 22 },
  ticker:         { x: 0.8, y: 91,    w: 98.4, h: 7.5 },
  tournamentName: { x: 25,  y: 0.5,  w: 50,   h: 7 },
  memo:           { x: 14.5, y: 81,  w: 71,   h: 9 },
};

export const DEFAULT_CASH_SECTION_LAYOUT: CashSectionLayout = {
  cashName: { x: 25,  y: 0.5,  w: 50,   h: 7 },
  rate:     { x: 14.5, y: 8.5,  w: 71,   h: 45 },
  memo:     { x: 86.7, y: 8.5,  w: 12.5, h: 18 },
  timer:    { x: 14.5, y: 55,   w: 71,   h: 25 },
  sbCard:   { x: 0.8,  y: 8.5,  w: 12.5, h: 25 },
  bbCard:   { x: 0.8,  y: 35,   w: 12.5, h: 25 },
  anteCard: { x: 0.8,  y: 62,   w: 12.5, h: 25 },
  nextBlinds: { x: 14.5, y: 82, w: 71,   h: 8 },
  players:  { x: 86.7, y: 28,   w: 12.5, h: 12 },
  reEntry:  { x: 86.7, y: 41,   w: 12.5, h: 12 },
  rebuy:    { x: 86.7, y: 54,   w: 12.5, h: 12 },
  addon:    { x: 86.7, y: 67,   w: 12.5, h: 12 },
  avgStack: { x: 86.7, y: 80,   w: 12.5, h: 8 },
  ticker:   { x: 0.8,  y: 91,   w: 98.4, h: 7.5 },
};

export type FontOption = {
  id: string;
  label: string;
  value: string;
  category: 'sans' | 'display' | 'mono';
  googleFamily?: string;
};

export const FONT_OPTIONS: FontOption[] = [
  // Sans-serif
  { id: 'inter', label: 'Inter', value: "'Inter', sans-serif", category: 'sans', googleFamily: 'Inter' },
  { id: 'poppins', label: 'Poppins', value: "'Poppins', sans-serif", category: 'sans', googleFamily: 'Poppins' },
  { id: 'montserrat', label: 'Montserrat', value: "'Montserrat', sans-serif", category: 'sans', googleFamily: 'Montserrat' },
  { id: 'roboto', label: 'Roboto', value: "'Roboto', sans-serif", category: 'sans', googleFamily: 'Roboto' },
  { id: 'noto-sans', label: 'Noto Sans', value: "'Noto Sans', sans-serif", category: 'sans', googleFamily: 'Noto+Sans' },
  { id: 'dm-sans', label: 'DM Sans', value: "'DM Sans', sans-serif", category: 'sans', googleFamily: 'DM+Sans' },
  { id: 'lato', label: 'Lato', value: "'Lato', sans-serif", category: 'sans', googleFamily: 'Lato' },
  { id: 'raleway', label: 'Raleway', value: "'Raleway', sans-serif", category: 'sans', googleFamily: 'Raleway' },
  { id: 'ibm-plex-sans', label: 'IBM Plex Sans', value: "'IBM Plex Sans', sans-serif", category: 'sans', googleFamily: 'IBM+Plex+Sans' },
  { id: 'manrope', label: 'Manrope', value: "'Manrope', sans-serif", category: 'sans', googleFamily: 'Manrope' },
  { id: 'space-grotesk', label: 'Space Grotesk', value: "'Space Grotesk', sans-serif", category: 'sans', googleFamily: 'Space+Grotesk' },
  { id: 'archivo', label: 'Archivo', value: "'Archivo', sans-serif", category: 'sans', googleFamily: 'Archivo' },
  // Display
  { id: 'oswald', label: 'Oswald', value: "'Oswald', sans-serif", category: 'display', googleFamily: 'Oswald' },
  { id: 'bebas-neue', label: 'Bebas Neue', value: "'Bebas Neue', sans-serif", category: 'display', googleFamily: 'Bebas+Neue' },
  { id: 'orbitron', label: 'Orbitron', value: "'Orbitron', sans-serif", category: 'display', googleFamily: 'Orbitron' },
  { id: 'rajdhani', label: 'Rajdhani', value: "'Rajdhani', sans-serif", category: 'display', googleFamily: 'Rajdhani' },
  { id: 'exo-2', label: 'Exo 2', value: "'Exo 2', sans-serif", category: 'display', googleFamily: 'Exo+2' },
  { id: 'teko', label: 'Teko', value: "'Teko', sans-serif", category: 'display', googleFamily: 'Teko' },
  { id: 'playfair-display', label: 'Playfair Display', value: "'Playfair Display', serif", category: 'display', googleFamily: 'Playfair+Display' },
  // Monospace
  { id: 'share-tech-mono', label: 'Share Tech Mono', value: "'Share Tech Mono', monospace", category: 'mono', googleFamily: 'Share+Tech+Mono' },
];

export const ASPECT_RATIO_OPTIONS: { id: AspectRatioMode; label: string; desc: string }[] = [
  { id: 'zoom', label: 'ズーム (全画面)', desc: '画面いっぱいに表示' },
  { id: '16:9', label: '16:9 (ワイド)', desc: 'TV標準' },
  { id: '4:3', label: '4:3 (スタンダード)', desc: '旧型TV' },
  { id: 'panorama', label: 'パノラマ (21:9)', desc: 'ウルトラワイド' },
];

export type SystemThemePreset = {
  id: SystemThemeId;
  name: string;
  nameJa: string;
  bgFrom: string;
  bgTo: string;
  mode: 'dark' | 'light';
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  glassBg: string;
  glassBorder: string;
  glassInnerBg: string;
  navBg: string;
  inputBg: string;
  inputBorder: string;
};

export const SYSTEM_THEMES: SystemThemePreset[] = [
  {
    id: 'dark-navy', name: 'Dark Navy', nameJa: 'ダークネイビー',
    bgFrom: '#0e1c36', bgTo: '#1c3d6e', mode: 'dark',
    textPrimary: '#e2e8f0', textSecondary: 'rgba(255,255,255,0.6)', textMuted: 'rgba(255,255,255,0.3)',
    glassBg: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.13)',
    glassInnerBg: 'rgba(255,255,255,0.04)', navBg: 'rgba(10,14,26,0.9)',
    inputBg: 'rgba(255,255,255,0.05)', inputBorder: 'rgba(255,255,255,0.1)',
  },
  {
    id: 'bright-blue', name: 'Bright Blue', nameJa: 'ブライトブルー',
    bgFrom: '#1e3a5f', bgTo: '#3b82f6', mode: 'dark',
    textPrimary: '#f0f4ff', textSecondary: 'rgba(255,255,255,0.7)', textMuted: 'rgba(255,255,255,0.4)',
    glassBg: 'rgba(255,255,255,0.10)', glassBorder: 'rgba(255,255,255,0.18)',
    glassInnerBg: 'rgba(255,255,255,0.06)', navBg: 'rgba(15,23,42,0.85)',
    inputBg: 'rgba(255,255,255,0.08)', inputBorder: 'rgba(255,255,255,0.15)',
  },
  {
    id: 'light', name: 'Light', nameJa: 'ライト',
    bgFrom: '#e8ecf1', bgTo: '#d1d9e6', mode: 'light',
    textPrimary: '#0f172a', textSecondary: 'rgba(15,23,42,0.65)', textMuted: 'rgba(15,23,42,0.45)',
    glassBg: 'rgba(255,255,255,0.6)', glassBorder: 'rgba(0,0,0,0.1)',
    glassInnerBg: 'rgba(255,255,255,0.4)', navBg: 'rgba(255,255,255,0.85)',
    inputBg: 'rgba(255,255,255,0.7)', inputBorder: 'rgba(0,0,0,0.12)',
  },
  {
    id: 'dark-gray', name: 'Dark Gray', nameJa: 'ダークグレー',
    bgFrom: '#1a1a2e', bgTo: '#16213e', mode: 'dark',
    textPrimary: '#e2e8f0', textSecondary: 'rgba(255,255,255,0.6)', textMuted: 'rgba(255,255,255,0.3)',
    glassBg: 'rgba(255,255,255,0.06)', glassBorder: 'rgba(255,255,255,0.1)',
    glassInnerBg: 'rgba(255,255,255,0.03)', navBg: 'rgba(10,10,20,0.9)',
    inputBg: 'rgba(255,255,255,0.05)', inputBorder: 'rgba(255,255,255,0.08)',
  },
  {
    id: 'emerald', name: 'Emerald', nameJa: 'エメラルド',
    bgFrom: '#042f2e', bgTo: '#115e59', mode: 'dark',
    textPrimary: '#e2e8f0', textSecondary: 'rgba(255,255,255,0.6)', textMuted: 'rgba(255,255,255,0.3)',
    glassBg: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.12)',
    glassInnerBg: 'rgba(255,255,255,0.04)', navBg: 'rgba(4,30,28,0.9)',
    inputBg: 'rgba(255,255,255,0.05)', inputBorder: 'rgba(255,255,255,0.1)',
  },
];

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

export function getSystemTheme(id: SystemThemeId, customFrom?: string, customTo?: string): SystemThemePreset {
  if (id === 'custom') {
    const from = customFrom || '#0e1c36';
    const to = customTo || '#1c3d6e';
    const light = isLightColor(from);
    const template = light ? SYSTEM_THEMES.find(t => t.mode === 'light')! : SYSTEM_THEMES[0];
    return { ...template, id: 'custom', name: 'Custom', nameJa: 'カスタム', bgFrom: from, bgTo: to };
  }
  return SYSTEM_THEMES.find(t => t.id === id) || SYSTEM_THEMES[0];
}

export const DEFAULT_SYSTEM_STYLE: SystemStyle = {
  fontFamily: 'inter',
  uiAccentColor: '#3b82f6',
  displayAspectRatio: 'zoom',
  displayFontScale: 1.0,
  systemThemeId: 'bright-blue',
};

export const DEFAULT_DISPLAY_TOGGLES: DisplayToggles = {
  showTournamentName: true, showLevelInfo: true, showBlinds: true, showTimer: true,
  showProgressBar: true, showNextLevel: true, showTimeToBreak: true, showTimeToEnd: true,
  showPrizeStructure: true, showEntryCount: true,
  showPlayers: true, showReEntry: true, showRebuy: true, showAddon: true,
  showChipInfo: true, showRegClose: true, showTournamentMemo: false, showFooter: true,
  showCashName: true, showCashRate: true, showCashMemo: true, showCashTimer: true,
  showCashPlayers: false, showCashReEntry: false, showCashRebuy: false, showCashAddon: false,
  showCashChipInfo: false, showCashNextBlinds: true,
  tickerText: '', tickerSpeed: 25, backgroundImageUrl: '',
  bgOverlayOpacity: 50, textShadowEnabled: false, textStrokeEnabled: false,
  textStrokeColor: '#000000', textStrokeWidth: 1.5,
  prizeLabelFormat: 'jp',
};

// ====================================
// Unified Theme Presets (10種)
// ====================================
export const UNIFIED_PRESETS: UnifiedThemePreset[] = [
  {
    id: 'royal-navy', name: 'Royal Navy', description: 'ネイビー×ゴールド', mode: 'dark',
    tokens: {
      'theme.primary': '#d4a853',
      'ui.background': '#0a1628', 'ui.backgroundTo': '#162a4a',
      'ui.surface': '#1a2d4d', 'ui.border': '#2a3f66',
      'text.primary': '#e8dcc8', 'text.secondary': '#9a8e7a',
      'button.background': '#d4a853', 'button.text': '#0a1628',
      'tab.background': '#0d1a30', 'tab.inactiveText': '#5a6a82',
      'tab.activeBackground': '#d4a853', 'tab.activeText': '#0a1628',
      'timer.background': '#0a1628', 'timer.backgroundTo': '#1a3358',
      'timer.text': '#d4a853',
    },
  },
  {
    id: 'midnight-pro', name: 'Midnight Pro', description: 'ブラック×エレクトリックブルー', mode: 'dark',
    tokens: {
      'theme.primary': '#3b9eff',
      'ui.background': '#06090f', 'ui.backgroundTo': '#0d1a2e',
      'ui.surface': '#111a2b', 'ui.border': '#1a2840',
      'text.primary': '#d8e4f0', 'text.secondary': '#6889a8',
      'button.background': '#3b9eff', 'button.text': '#060a10',
      'tab.background': '#080d16', 'tab.inactiveText': '#3a5068',
      'tab.activeBackground': '#3b9eff', 'tab.activeText': '#060a10',
      'timer.background': '#060a10', 'timer.backgroundTo': '#0e1f38',
      'timer.text': '#3b9eff',
    },
  },
  {
    id: 'vegas-red', name: 'Vegas Red', description: 'ダークレッド×ゴールド', mode: 'dark',
    tokens: {
      'theme.primary': '#e8b84a',
      'ui.background': '#1a0a0a', 'ui.backgroundTo': '#2e1216',
      'ui.surface': '#2a1418', 'ui.border': '#4a2228',
      'text.primary': '#f0e0c8', 'text.secondary': '#a08868',
      'button.background': '#c43030', 'button.text': '#f0e0c8',
      'tab.background': '#160c0c', 'tab.inactiveText': '#6a4a4a',
      'tab.activeBackground': '#c43030', 'tab.activeText': '#f0e0c8',
      'timer.background': '#1a0808', 'timer.backgroundTo': '#381018',
      'timer.text': '#e8b84a',
    },
  },
  {
    id: 'emerald-table', name: 'Emerald Table', description: '深緑×アイボリー', mode: 'dark',
    tokens: {
      'theme.primary': '#50c878',
      'ui.background': '#081a14', 'ui.backgroundTo': '#0f2e22',
      'ui.surface': '#132e20', 'ui.border': '#1e4432',
      'text.primary': '#e8f0e8', 'text.secondary': '#7aa088',
      'button.background': '#50c878', 'button.text': '#081a14',
      'tab.background': '#0a1810', 'tab.inactiveText': '#4a6858',
      'tab.activeBackground': '#50c878', 'tab.activeText': '#081a14',
      'timer.background': '#081a14', 'timer.backgroundTo': '#143828',
      'timer.text': '#50c878',
    },
  },
  {
    id: 'cyber-purple', name: 'Cyber Purple', description: 'ダークパープル×ネオンブルー', mode: 'dark',
    tokens: {
      'theme.primary': '#7c5cfc',
      'ui.background': '#0e0818', 'ui.backgroundTo': '#1a1030',
      'ui.surface': '#1a1230', 'ui.border': '#2e1e50',
      'text.primary': '#dcd0f8', 'text.secondary': '#8878b0',
      'button.background': '#7c5cfc', 'button.text': '#0e0818',
      'tab.background': '#0c0814', 'tab.inactiveText': '#504878',
      'tab.activeBackground': '#7c5cfc', 'tab.activeText': '#0e0818',
      'timer.background': '#0e0818', 'timer.backgroundTo': '#201440',
      'timer.text': '#7c5cfc',
    },
  },
  {
    id: 'ice-silver', name: 'Ice Silver', description: 'ダークグレー×シアン', mode: 'dark',
    tokens: {
      'theme.primary': '#4ecdc4',
      'ui.background': '#101418', 'ui.backgroundTo': '#1a2028',
      'ui.surface': '#1a2028', 'ui.border': '#283038',
      'text.primary': '#d8e0e8', 'text.secondary': '#7888a0',
      'button.background': '#4ecdc4', 'button.text': '#101418',
      'tab.background': '#0e1218', 'tab.inactiveText': '#485868',
      'tab.activeBackground': '#4ecdc4', 'tab.activeText': '#101418',
      'timer.background': '#101418', 'timer.backgroundTo': '#1a2830',
      'timer.text': '#4ecdc4',
    },
  },
  {
    id: 'dark-chrome', name: 'Dark Chrome', description: 'ブラック×シルバー', mode: 'dark',
    tokens: {
      'theme.primary': '#b0b8c8',
      'ui.background': '#0a0a0e', 'ui.backgroundTo': '#161618',
      'ui.surface': '#18181c', 'ui.border': '#2a2a30',
      'text.primary': '#d0d0d8', 'text.secondary': '#707078',
      'button.background': '#b0b8c8', 'button.text': '#0a0a0e',
      'tab.background': '#0c0c10', 'tab.inactiveText': '#484850',
      'tab.activeBackground': '#b0b8c8', 'tab.activeText': '#0a0a0e',
      'timer.background': '#0a0a0e', 'timer.backgroundTo': '#1a1a20',
      'timer.text': '#d0d8e8',
    },
  },
  {
    id: 'sunset-pro', name: 'Sunset Pro', description: 'ダークオレンジ×ネイビー', mode: 'dark',
    tokens: {
      'theme.primary': '#e8822a',
      'ui.background': '#0e1020', 'ui.backgroundTo': '#1a1830',
      'ui.surface': '#1a1828', 'ui.border': '#2a2840',
      'text.primary': '#f0e0d0', 'text.secondary': '#a09080',
      'button.background': '#e8822a', 'button.text': '#0e1020',
      'tab.background': '#0c0e1a', 'tab.inactiveText': '#585068',
      'tab.activeBackground': '#e8822a', 'tab.activeText': '#0e1020',
      'timer.background': '#0e1020', 'timer.backgroundTo': '#201828',
      'timer.text': '#e8822a',
    },
  },
  {
    id: 'arctic-blue', name: 'Arctic Blue', description: 'ネイビー×アイスブルー', mode: 'dark',
    tokens: {
      'theme.primary': '#7ec8e3',
      'ui.background': '#0a1420', 'ui.backgroundTo': '#142838',
      'ui.surface': '#142838', 'ui.border': '#1e3a50',
      'text.primary': '#d0e8f8', 'text.secondary': '#6898b8',
      'button.background': '#7ec8e3', 'button.text': '#0a1420',
      'tab.background': '#0c1218', 'tab.inactiveText': '#3a5870',
      'tab.activeBackground': '#7ec8e3', 'tab.activeText': '#0a1420',
      'timer.background': '#0a1420', 'timer.backgroundTo': '#163040',
      'timer.text': '#7ec8e3',
    },
  },
  {
    id: 'mono-pro', name: 'Mono Pro', description: '完全モノトーン高級仕様', mode: 'dark',
    tokens: {
      'theme.primary': '#e0e0e0',
      'ui.background': '#0c0c0c', 'ui.backgroundTo': '#161616',
      'ui.surface': '#1a1a1a', 'ui.border': '#2a2a2a',
      'text.primary': '#e0e0e0', 'text.secondary': '#787878',
      'button.background': '#e0e0e0', 'button.text': '#0c0c0c',
      'tab.background': '#0e0e0e', 'tab.inactiveText': '#505050',
      'tab.activeBackground': '#e0e0e0', 'tab.activeText': '#0c0c0c',
      'timer.background': '#0c0c0c', 'timer.backgroundTo': '#1a1a1a',
      'timer.text': '#e0e0e0',
    },
  },
  // ===== Light / Bright Presets =====
  {
    id: 'ivory-gold', name: 'Ivory Gold', description: 'アイボリー×ゴールド', mode: 'light',
    tokens: {
      'theme.primary': '#b8860b',
      'ui.background': '#faf7f0', 'ui.backgroundTo': '#f5eed8',
      'ui.surface': '#ffffff', 'ui.border': '#e0d5b8',
      'text.primary': '#2c2410', 'text.secondary': '#7a6b4e',
      'button.background': '#b8860b', 'button.text': '#ffffff',
      'tab.background': '#f0ead4', 'tab.inactiveText': '#9a8a68',
      'tab.activeBackground': '#b8860b', 'tab.activeText': '#ffffff',
      'timer.background': '#3a2e10', 'timer.backgroundTo': '#5c4a1e',
      'timer.text': '#f0d060',
    },
  },
  {
    id: 'light-sky', name: 'Light Sky', description: 'スカイブルー×ホワイト', mode: 'light',
    tokens: {
      'theme.primary': '#2563eb',
      'ui.background': '#f0f7ff', 'ui.backgroundTo': '#dbeafe',
      'ui.surface': '#ffffff', 'ui.border': '#bfdbfe',
      'text.primary': '#0f172a', 'text.secondary': '#475569',
      'button.background': '#2563eb', 'button.text': '#ffffff',
      'tab.background': '#e0effe', 'tab.inactiveText': '#6b8ab0',
      'tab.activeBackground': '#2563eb', 'tab.activeText': '#ffffff',
      'timer.background': '#0c1a3a', 'timer.backgroundTo': '#1e3a6e',
      'timer.text': '#60a5fa',
    },
  },
  {
    id: 'mint-glass', name: 'Mint Glass', description: 'ミント×ライトグレー', mode: 'light',
    tokens: {
      'theme.primary': '#059669',
      'ui.background': '#f0fdf8', 'ui.backgroundTo': '#d1fae5',
      'ui.surface': '#ffffff', 'ui.border': '#a7f3d0',
      'text.primary': '#0a2e1c', 'text.secondary': '#4a7a60',
      'button.background': '#059669', 'button.text': '#ffffff',
      'tab.background': '#d5f5e8', 'tab.inactiveText': '#5a8a70',
      'tab.activeBackground': '#059669', 'tab.activeText': '#ffffff',
      'timer.background': '#062e20', 'timer.backgroundTo': '#0e4a35',
      'timer.text': '#34d399',
    },
  },
  {
    id: 'coral-modern', name: 'Coral Modern', description: 'コーラル×チャコール', mode: 'light',
    tokens: {
      'theme.primary': '#e05050',
      'ui.background': '#fef2f2', 'ui.backgroundTo': '#fde8e8',
      'ui.surface': '#ffffff', 'ui.border': '#fca5a5',
      'text.primary': '#2a1010', 'text.secondary': '#7a4a4a',
      'button.background': '#e05050', 'button.text': '#ffffff',
      'tab.background': '#fee2e2', 'tab.inactiveText': '#9a6868',
      'tab.activeBackground': '#e05050', 'tab.activeText': '#ffffff',
      'timer.background': '#2a0e0e', 'timer.backgroundTo': '#4a1818',
      'timer.text': '#fca5a5',
    },
  },
  {
    id: 'lavender-air', name: 'Lavender Air', description: 'ラベンダー×ホワイト', mode: 'light',
    tokens: {
      'theme.primary': '#7c3aed',
      'ui.background': '#f5f0ff', 'ui.backgroundTo': '#ede4ff',
      'ui.surface': '#ffffff', 'ui.border': '#c4b5fd',
      'text.primary': '#1a0e30', 'text.secondary': '#5a4a78',
      'button.background': '#7c3aed', 'button.text': '#ffffff',
      'tab.background': '#e8deff', 'tab.inactiveText': '#7a68a0',
      'tab.activeBackground': '#7c3aed', 'tab.activeText': '#ffffff',
      'timer.background': '#14082e', 'timer.backgroundTo': '#28144e',
      'timer.text': '#a78bfa',
    },
  },
  {
    id: 'sand-beige', name: 'Sand Beige', description: 'ベージュ×ダークブラウン', mode: 'light',
    tokens: {
      'theme.primary': '#92400e',
      'ui.background': '#faf6f0', 'ui.backgroundTo': '#f0e8d8',
      'ui.surface': '#ffffff', 'ui.border': '#d6c8a8',
      'text.primary': '#2e2010', 'text.secondary': '#786040',
      'button.background': '#92400e', 'button.text': '#ffffff',
      'tab.background': '#efe4d0', 'tab.inactiveText': '#8a7458',
      'tab.activeBackground': '#92400e', 'tab.activeText': '#ffffff',
      'timer.background': '#1e1408', 'timer.backgroundTo': '#382810',
      'timer.text': '#d4a060',
    },
  },
  {
    id: 'aqua-clean', name: 'Aqua Clean', description: 'アクア×ネイビー', mode: 'light',
    tokens: {
      'theme.primary': '#0891b2',
      'ui.background': '#f0fdff', 'ui.backgroundTo': '#cffafe',
      'ui.surface': '#ffffff', 'ui.border': '#a5f3fc',
      'text.primary': '#0e2830', 'text.secondary': '#3a6878',
      'button.background': '#0891b2', 'button.text': '#ffffff',
      'tab.background': '#d0f5fa', 'tab.inactiveText': '#4a8898',
      'tab.activeBackground': '#0891b2', 'tab.activeText': '#ffffff',
      'timer.background': '#0a1e28', 'timer.backgroundTo': '#143848',
      'timer.text': '#22d3ee',
    },
  },
  {
    id: 'peach-soft', name: 'Peach Soft', description: 'ピーチ×グレー', mode: 'light',
    tokens: {
      'theme.primary': '#e07040',
      'ui.background': '#fff7f0', 'ui.backgroundTo': '#ffe8d8',
      'ui.surface': '#ffffff', 'ui.border': '#fdc8a0',
      'text.primary': '#2e1c10', 'text.secondary': '#7a5840',
      'button.background': '#e07040', 'button.text': '#ffffff',
      'tab.background': '#ffe0cc', 'tab.inactiveText': '#9a7058',
      'tab.activeBackground': '#e07040', 'tab.activeText': '#ffffff',
      'timer.background': '#1e1008', 'timer.backgroundTo': '#382018',
      'timer.text': '#f8a070',
    },
  },
  {
    id: 'frost-white', name: 'Frost White', description: 'ホワイト×アイスブルー', mode: 'light',
    tokens: {
      'theme.primary': '#3b82f6',
      'ui.background': '#f8faff', 'ui.backgroundTo': '#eef2ff',
      'ui.surface': '#ffffff', 'ui.border': '#c7d2fe',
      'text.primary': '#0f172a', 'text.secondary': '#4a5568',
      'button.background': '#3b82f6', 'button.text': '#ffffff',
      'tab.background': '#e8ecfe', 'tab.inactiveText': '#6878a0',
      'tab.activeBackground': '#3b82f6', 'tab.activeText': '#ffffff',
      'timer.background': '#0a1028', 'timer.backgroundTo': '#182848',
      'timer.text': '#93c5fd',
    },
  },
  {
    id: 'silver-minimal', name: 'Silver Minimal', description: 'ライトグレー×ブラック', mode: 'light',
    tokens: {
      'theme.primary': '#374151',
      'ui.background': '#f3f4f6', 'ui.backgroundTo': '#e5e7eb',
      'ui.surface': '#ffffff', 'ui.border': '#d1d5db',
      'text.primary': '#111827', 'text.secondary': '#4b5563',
      'button.background': '#374151', 'button.text': '#ffffff',
      'tab.background': '#e0e2e8', 'tab.inactiveText': '#6b7280',
      'tab.activeBackground': '#374151', 'tab.activeText': '#ffffff',
      'timer.background': '#0a0a0e', 'timer.backgroundTo': '#1a1a22',
      'timer.text': '#d1d5db',
    },
  },
];
