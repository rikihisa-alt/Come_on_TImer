import { BlindLevel, ThemeConfig, TTSMessage, DisplayToggles, SoundSettings, SectionLayout, CashSectionLayout, SystemStyle, AspectRatioMode, SystemThemeId } from './types';
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
  breakStartEnabled: true,
  oneMinWarningEnabled: true,
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
};

export const DEFAULT_CASH_SECTION_LAYOUT: CashSectionLayout = {
  cashName: { x: 25,  y: 0.5,  w: 50,   h: 7 },
  rate:     { x: 14.5, y: 8.5,  w: 71,   h: 45 },
  memo:     { x: 86.7, y: 8.5,  w: 12.5, h: 18 },
  timer:    { x: 14.5, y: 55,   w: 71,   h: 25 },
  sbCard:   { x: 0.8,  y: 8.5,  w: 12.5, h: 25 },
  bbCard:   { x: 0.8,  y: 35,   w: 12.5, h: 25 },
  anteCard: { x: 0.8,  y: 62,   w: 12.5, h: 25 },
  players:  { x: 86.7, y: 28,   w: 12.5, h: 12 },
  reEntry:  { x: 86.7, y: 41,   w: 12.5, h: 12 },
  rebuy:    { x: 86.7, y: 54,   w: 12.5, h: 12 },
  addon:    { x: 86.7, y: 67,   w: 12.5, h: 12 },
  avgStack: { x: 86.7, y: 80,   w: 12.5, h: 8 },
  ticker:   { x: 0.8,  y: 91,   w: 98.4, h: 7.5 },
};

export const FONT_OPTIONS = [
  { id: 'serif', label: 'Serif (Classic)', value: "'Times New Roman', Times, serif" },
  { id: 'sans', label: 'Sans Serif (Modern)', value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: 'mono', label: 'Monospace (Digital)', value: "'Courier New', Courier, monospace" },
  { id: 'rounded', label: 'Rounded', value: "'Trebuchet MS', 'Lucida Grande', sans-serif" },
] as const;

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
  fontFamily: 'serif',
  uiAccentColor: '#3b82f6',
  displayAspectRatio: 'zoom',
  displayFontScale: 1.0,
  systemThemeId: 'bright-blue',
};

export const DEFAULT_DISPLAY_TOGGLES: DisplayToggles = {
  showTournamentName: true, showLevelInfo: true, showBlinds: true, showTimer: true,
  showProgressBar: true, showNextLevel: true, showTimeToBreak: true, showTimeToEnd: true,
  showPrizeStructure: true, showEntryCount: true, showChipInfo: true, showFooter: true,
  showCashName: true, showCashRate: true, showCashMemo: true, showCashTimer: true,
  showCashPlayers: false, showCashChipInfo: false,
  tickerText: '', tickerSpeed: 25, backgroundImageUrl: '',
};
