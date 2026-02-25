export type BlindLevel = {
  level: number;
  type: 'play' | 'break';
  smallBlind: number;
  bigBlind: number;
  ante: number;
  duration: number;
};

export type TournamentStatus = 'idle' | 'running' | 'paused' | 'finished';
export type CashGameStatus = 'idle' | 'running' | 'paused';

export type PrizeEntry = {
  place: number;
  percent: number;
};

export type Tournament = {
  id: string;
  name: string;
  levels: BlindLevel[];
  currentLevelIndex: number;
  status: TournamentStatus;
  timerStartedAt: number | null;
  remainingMs: number;
  startingChips: number;
  entryCount: number;
  rebuyCount: number;
  addonCount: number;
  buyInAmount: number;
  prizeStructure: PrizeEntry[];
  createdAt: number;
  regCloseLevel?: number;
  scheduledStartTime?: number | null;
};

export type CashGame = {
  id: string;
  name: string;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  memo: string;
  status: CashGameStatus;
  timerStartedAt: number | null;
  elapsedMs: number;
  countdownMode: boolean;
  countdownTotalMs: number;
  countdownRemainingMs: number;
  createdAt: number;
};

export type DisplayAssignment = {
  displayId: string;
  route: 'tournament' | 'cash' | 'split';
  targetId: string;
  themeId: string;
  leftRoute?: 'tournament' | 'cash';
  splitTargetId?: string;
  splitRoute?: 'tournament' | 'cash';
};

export type ThemeConfig = {
  id: string;
  name: string;
  type: 'gradient' | 'solid' | 'image';
  bgColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  imageUrl?: string;
  overlayOpacity: number;
  primaryColor: string;
  accentColor: string;
};

export type SoundPreset = 'chime' | 'bell' | 'alert' | 'horn' | 'drum';

export type TTSMessage = {
  id: string;
  label: string;
  template: string;
  enabled: boolean;
};

export type SoundSettings = {
  masterVolume: number;
  soundPreset: SoundPreset;
  blindChangeEnabled: boolean;
  breakStartEnabled: boolean;
  oneMinWarningEnabled: boolean;
  ttsEnabled: boolean;
  ttsLang: 'ja' | 'en';
  ttsMessages: TTSMessage[];
};

export type DisplayToggles = {
  showTournamentName: boolean;
  showLevelInfo: boolean;
  showBlinds: boolean;
  showTimer: boolean;
  showProgressBar: boolean;
  showNextLevel: boolean;
  showTimeToBreak: boolean;
  showTimeToEnd: boolean;
  showPrizeStructure: boolean;
  showEntryCount: boolean;
  showChipInfo: boolean;
  showFooter: boolean;
  showCashRate: boolean;
  showCashMemo: boolean;
  showCashTimer: boolean;
  tickerText: string;
  tickerSpeed: number;
  backgroundImageUrl: string;
};

export type SyncMessageType = 'FULL_SYNC' | 'TIMER_TICK' | 'LEVEL_CHANGE';

export type SyncMessage = {
  type: SyncMessageType;
  payload: unknown;
  timestamp: number;
};
