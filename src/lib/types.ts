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
  label: string;  // 自由テキスト（例: "旅行券", "¥50,000", "1位トロフィー"）
};

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
  // エントリー管理
  initialEntries: number;   // 初回参加者数
  reEntryCount: number;     // リエントリー数（プレイヤー増加）
  reEntryChips: number;     // リエントリー時のチップ数
  rebuyCount: number;       // リバイ数（チップのみ）
  rebuyChips: number;       // リバイ時のチップ数
  addonCount: number;
  addonChips: number;       // アドオン時のチップ数
  // 単価
  buyInAmount: number;
  reEntryAmount: number;
  rebuyAmount: number;
  addonAmount: number;
  // アーリーバード / 特典
  earlyBirdCount: number;   // アーリーバード該当者数
  earlyBirdBonus: number;   // ボーナスチップ数
  // プライズ（自由テキスト）
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
