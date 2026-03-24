import { SoundPreset, SoundId } from './types';

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

export function unlockAudio() {
  if (audioUnlocked) return;
  try {
    audioCtx = new AudioContext();
    const buf = audioCtx.createBuffer(1, 1, 22050);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start();
    audioUnlocked = true;
  } catch { /* ignore */ }
}

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// ─── Legacy preset sounds (kept for backward compat) ───

function playChime(ctx: AudioContext, vol: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
  g.connect(ctx.destination);
  [880, 1108.73, 1318.51].forEach((freq, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    o.connect(g);
    o.start(ctx.currentTime + i * 0.15);
    o.stop(ctx.currentTime + 1.2);
  });
}

function playBell(ctx: AudioContext, vol: number) {
  [523.25, 659.25, 783.99].forEach((freq) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 2);
  });
}

function playAlert(ctx: AudioContext, vol: number) {
  for (let i = 0; i < 3; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 1000;
    g.gain.setValueAtTime(vol * 0.25, ctx.currentTime + i * 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.15);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.2);
    o.stop(ctx.currentTime + i * 0.2 + 0.15);
  }
}

function playHorn(ctx: AudioContext, vol: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.3);
  g.gain.setValueAtTime(vol * 0.35, ctx.currentTime);
  g.gain.setValueAtTime(vol * 0.35, ctx.currentTime + 0.8);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(ctx.currentTime);
  o.stop(ctx.currentTime + 1.5);
}

function playDrum(ctx: AudioContext, vol: number) {
  for (let i = 0; i < 2; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, ctx.currentTime + i * 0.25);
    o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + i * 0.25 + 0.2);
    g.gain.setValueAtTime(vol * 0.6, ctx.currentTime + i * 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.25);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.25);
    o.stop(ctx.currentTime + i * 0.25 + 0.3);
  }
}

const PRESET_MAP: Record<SoundPreset, (ctx: AudioContext, vol: number) => void> = {
  chime: playChime, bell: playBell, alert: playAlert, horn: playHorn, drum: playDrum,
};

export const PRESET_LABELS: Record<SoundPreset, string> = {
  chime: 'Chime (チャイム)', bell: 'Bell (ベル)', alert: 'Alert (アラート)',
  horn: 'Horn (ホーン)', drum: 'Drum (ドラム)',
};

export function playSound(preset: SoundPreset, volume: number) {
  try { const ctx = getCtx(); PRESET_MAP[preset](ctx, volume); } catch { /* ignore */ }
}

export function playWarningBeep(volume: number) {
  try {
    const ctx = getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.5);
  } catch { /* ignore */ }
}

export function playTestSound(preset: SoundPreset, volume: number) {
  playSound(preset, volume);
}

// ─── MP3 Sound Library (効果音ラボ) ───

export type SoundEntry = {
  id: SoundId;
  name: string;
  nameJa: string;
  category: string;
};

export const SOUND_LIBRARY: SoundEntry[] = [
  // 決定音 (1-11)
  { id: 'sound_01', name: 'Decision 1',  nameJa: '決定音 1',  category: '決定音' },
  { id: 'sound_02', name: 'Decision 2',  nameJa: '決定音 2',  category: '決定音' },
  { id: 'sound_03', name: 'Decision 3',  nameJa: '決定音 3',  category: '決定音' },
  { id: 'sound_04', name: 'Decision 4',  nameJa: '決定音 4',  category: '決定音' },
  { id: 'sound_05', name: 'Decision 5',  nameJa: '決定音 5',  category: '決定音' },
  { id: 'sound_06', name: 'Decision 6',  nameJa: '決定音 6',  category: '決定音' },
  { id: 'sound_07', name: 'Decision 7',  nameJa: '決定音 7',  category: '決定音' },
  { id: 'sound_08', name: 'Decision 8',  nameJa: '決定音 8',  category: '決定音' },
  { id: 'sound_09', name: 'Decision 9',  nameJa: '決定音 9',  category: '決定音' },
  { id: 'sound_10', name: 'Decision 10', nameJa: '決定音 10', category: '決定音' },
  { id: 'sound_11', name: 'Decision 11', nameJa: '決定音 11', category: '決定音' },
  // 正解音 (12-14)
  { id: 'sound_12', name: 'Correct 1',   nameJa: '正解音 1',  category: '正解音' },
  { id: 'sound_13', name: 'Correct 2',   nameJa: '正解音 2',  category: '正解音' },
  { id: 'sound_14', name: 'Correct 3',   nameJa: '正解音 3',  category: '正解音' },
  // 警告音 (15-16)
  { id: 'sound_15', name: 'Warning 1',   nameJa: '警告音 1',  category: '警告音' },
  { id: 'sound_16', name: 'Warning 2',   nameJa: '警告音 2',  category: '警告音' },
  // キャンセル (17-18)
  { id: 'sound_17', name: 'Cancel 1',    nameJa: 'キャンセル 1', category: 'キャンセル' },
  { id: 'sound_18', name: 'Cancel 2',    nameJa: 'キャンセル 2', category: 'キャンセル' },
  // ビープ (19)
  { id: 'sound_19', name: 'Beep',        nameJa: 'ビープ',    category: 'ビープ' },
  // ベル (20)
  { id: 'sound_20', name: 'Bell',        nameJa: 'ベル',      category: 'ベル' },
  // 成功音 (21)
  { id: 'sound_21', name: 'Success',     nameJa: '成功音',    category: '成功音' },
  // ファンファーレ (22-23)
  { id: 'sound_22', name: 'Trumpet 1',   nameJa: 'トランペット 1', category: 'ファンファーレ' },
  { id: 'sound_23', name: 'Trumpet 2',   nameJa: 'トランペット 2', category: 'ファンファーレ' },
  // 金属音 (24-25)
  { id: 'sound_24', name: 'Tin 1',       nameJa: 'チーン 1',  category: '金属音' },
  { id: 'sound_25', name: 'Tin 2',       nameJa: 'チーン 2',  category: '金属音' },
  // ゴング (26)
  { id: 'sound_26', name: 'Gong',        nameJa: 'ゴング',    category: '金属音' },
  // ホーン (27)
  { id: 'sound_27', name: 'Air Horn',    nameJa: 'エアホーン', category: 'ホーン' },
  // ブザー (28)
  { id: 'sound_28', name: 'Buzzer',      nameJa: 'ブザー',    category: 'ブザー' },
  // 決定音 追加 (29-31)
  { id: 'sound_29', name: 'Decision 12', nameJa: '決定音 12', category: '決定音' },
  { id: 'sound_30', name: 'Decision 13', nameJa: '決定音 13', category: '決定音' },
  { id: 'sound_31', name: 'Decision 14', nameJa: '決定音 14', category: '決定音' },
  // カーソル (32-34)
  { id: 'sound_32', name: 'Cursor 1',    nameJa: 'カーソル 1', category: 'カーソル' },
  { id: 'sound_33', name: 'Cursor 2',    nameJa: 'カーソル 2', category: 'カーソル' },
  { id: 'sound_34', name: 'Cursor 3',    nameJa: 'カーソル 3', category: 'カーソル' },
  // 決定音 追加 (35-36)
  { id: 'sound_35', name: 'Decision 15', nameJa: '決定音 15', category: '決定音' },
  { id: 'sound_36', name: 'Decision 16', nameJa: '決定音 16', category: '決定音' },
  // キャンセル 追加 (37-40)
  { id: 'sound_37', name: 'Cancel 3',    nameJa: 'キャンセル 3', category: 'キャンセル' },
  { id: 'sound_38', name: 'Cancel 4',    nameJa: 'キャンセル 4', category: 'キャンセル' },
  { id: 'sound_39', name: 'Cancel 5',    nameJa: 'キャンセル 5', category: 'キャンセル' },
  { id: 'sound_40', name: 'Cancel 6',    nameJa: 'キャンセル 6', category: 'キャンセル' },
  // ビープ 追加 (41-42)
  { id: 'sound_41', name: 'Beep 2',      nameJa: 'ビープ 2',  category: 'ビープ' },
  { id: 'sound_42', name: 'Beep 3',      nameJa: 'ビープ 3',  category: 'ビープ' },
  // メニュー (43-44)
  { id: 'sound_43', name: 'Menu 1',      nameJa: 'メニュー 1', category: 'メニュー' },
  { id: 'sound_44', name: 'Menu 2',      nameJa: 'メニュー 2', category: 'メニュー' },
  // データ表示 (45-46)
  { id: 'sound_45', name: 'Data 1',      nameJa: 'データ表示 1', category: 'データ表示' },
  { id: 'sound_46', name: 'Data 2',      nameJa: 'データ表示 2', category: 'データ表示' },
  // ゲージ回復 (47-48)
  { id: 'sound_47', name: 'Recovery 1',  nameJa: 'ゲージ回復 1', category: 'ゲージ回復' },
  { id: 'sound_48', name: 'Recovery 2',  nameJa: 'ゲージ回復 2', category: 'ゲージ回復' },
  // メッセージ表示 (49-50)
  { id: 'sound_49', name: 'Message 1',   nameJa: 'メッセージ 1', category: 'メッセージ' },
  { id: 'sound_50', name: 'Message 2',   nameJa: 'メッセージ 2', category: 'メッセージ' },
  // ビープ 追加 (51-52)
  { id: 'sound_51', name: 'Beep 4',      nameJa: 'ビープ 4',  category: 'ビープ' },
  { id: 'sound_52', name: 'Beep 5',      nameJa: 'ビープ 5',  category: 'ビープ' },
  // ウィンドウ (53)
  { id: 'sound_53', name: 'Window',      nameJa: 'ウィンドウ', category: 'ウィンドウ' },
];

// Preload audio buffers for instant playback
const audioCache: Map<string, HTMLAudioElement> = new Map();

function getAudioElement(soundId: SoundId): HTMLAudioElement {
  const cached = audioCache.get(soundId);
  if (cached) return cached;
  const audio = new Audio(`/audio/${soundId}.mp3`);
  audio.preload = 'auto';
  audioCache.set(soundId, audio);
  return audio;
}

// Preload all sounds on first user interaction
let preloaded = false;
export function preloadSounds() {
  if (preloaded) return;
  preloaded = true;
  SOUND_LIBRARY.forEach(s => {
    const audio = getAudioElement(s.id);
    audio.load();
  });
}

export function playSoundById(soundId: SoundId, volume: number) {
  try {
    const audio = getAudioElement(soundId);
    // Clone to allow overlapping plays (but we generally avoid it)
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = Math.max(0, Math.min(1, volume));
    clone.play().catch(() => { /* autoplay blocked */ });
  } catch { /* ignore */ }
}

// ─── TTS ───

let lastTTSText = '';
let lastTTSTime = 0;

export function speakTTS(text: string, lang: string = 'ja') {
  const now = Date.now();
  if (text === lastTTSText && now - lastTTSTime < 3000) return;
  lastTTSText = text;
  lastTTSTime = now;
  try {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang === 'ja' ? 'ja-JP' : 'en-US';
    utt.rate = 0.9;
    utt.volume = 1;
    window.speechSynthesis.speak(utt);
  } catch { /* ignore */ }
}

export function fillTTSTemplate(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
  }
  return result;
}
