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
  amount: number;  // 直接金額（円）
};

export type RakeType = 'fixed' | 'percent';

export type BlindTemplate = {
  id: string;
  name: string;
  levels: BlindLevel[];
  createdAt: number;
};

export type TournamentSectionId =
  | 'players' | 'reEntry' | 'rebuy' | 'addon' | 'avgStack'
  | 'timer' | 'nextLevel'
  | 'cornerTime' | 'regClose' | 'nextBreak'
  | 'prizeTable' | 'ticker'
  | 'tournamentName';

export type SectionPosition = {
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize?: number;
};

export type SectionLayout = Record<TournamentSectionId, SectionPosition>;

export type CashSectionId =
  | 'cashName' | 'rate' | 'memo'
  | 'timer' | 'sbCard' | 'bbCard' | 'anteCard' | 'ticker';

export type CashSectionLayout = Record<CashSectionId, SectionPosition>;

export type Tournament = {
  id: string;
  name: string;
  levels: BlindLevel[];
  currentLevelIndex: number;
  status: TournamentStatus;
  timerStartedAt: number | null;
  remainingMs: number;
  startingChips: number;
  // F5: リエントリー/リバイ分離
  initialEntries: number;   // 初回参加者数
  reEntryCount: number;     // リエントリー数（プレイヤー増加）
  rebuyCount: number;       // リバイ数（チップのみ）
  addonCount: number;
  // F4: 個別単価 + Rake
  buyInAmount: number;      // 初回バイイン
  reEntryAmount: number;    // リエントリー単価
  rebuyAmount: number;      // リバイ単価
  addonAmount: number;      // アドオン単価
  rakeType: RakeType;
  rakeValue: number;        // 固定額 or %
  // F3: プライズ（金額直接入力）
  prizeStructure: PrizeEntry[];
  createdAt: number;
  regCloseLevel?: number;
  preLevelDuration?: number;
  displayToggles?: DisplayToggles;
  sound?: SoundSettings;
  themeId?: string;
  sectionLayout?: SectionLayout;
  // F6: Split用別レイアウト
  splitSectionLayout?: SectionLayout;
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
  preLevelDuration?: number;
  preLevelRemainingMs: number;
  createdAt: number;
  displayToggles?: DisplayToggles;
  sound?: SoundSettings;
  themeId?: string;
  sectionLayout?: CashSectionLayout;
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

export type AspectRatioMode = '16:9' | '4:3' | 'panorama' | 'zoom';

export type SystemStyle = {
  fontFamily: string;
  uiAccentColor: string;
  displayAspectRatio: AspectRatioMode;
  displayFontScale: number;
};

export type SyncMessageType = 'FULL_SYNC' | 'TIMER_TICK' | 'LEVEL_CHANGE';

export type SyncMessage = {
  type: SyncMessageType;
  payload: unknown;
  timestamp: number;
};
