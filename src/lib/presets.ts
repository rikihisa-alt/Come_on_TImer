import { BlindLevel, ThemeConfig, TTSMessage, DisplayToggles, SoundSettings, SectionLayout, CashSectionLayout } from './types';
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
  players:    { x: 0.8, y: 8.5,  w: 12.5, h: 18 },
  rebuy:      { x: 0.8, y: 28,   w: 12.5, h: 18 },
  addon:      { x: 0.8, y: 47.5, w: 12.5, h: 18 },
  avgStack:   { x: 0.8, y: 67,   w: 12.5, h: 18 },
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
  cashName: { x: 20, y: 2,  w: 60, h: 8 },
  rate:     { x: 10, y: 12, w: 80, h: 30 },
  memo:     { x: 20, y: 44, w: 60, h: 8 },
  timer:    { x: 20, y: 54, w: 60, h: 22 },
  sbCard:   { x: 5,  y: 80, w: 28, h: 14 },
  bbCard:   { x: 36, y: 80, w: 28, h: 14 },
  anteCard: { x: 67, y: 80, w: 28, h: 14 },
  ticker:   { x: 1,  y: 93, w: 98, h: 6 },
};

export const DEFAULT_DISPLAY_TOGGLES: DisplayToggles = {
  showTournamentName: true, showLevelInfo: true, showBlinds: true, showTimer: true,
  showProgressBar: true, showNextLevel: true, showTimeToBreak: true, showTimeToEnd: true,
  showPrizeStructure: true, showEntryCount: true, showChipInfo: true, showFooter: true,
  showCashRate: true, showCashMemo: true, showCashTimer: true,
  tickerText: '', tickerSpeed: 25, backgroundImageUrl: '',
};
