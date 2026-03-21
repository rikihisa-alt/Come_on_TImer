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

// ─── New Sound Library (10 sounds: 5 short + 5 long) ───

function synthBellShort(ctx: AudioContext, vol: number) {
  // Single bright bell hit ~0.8s
  const freqs = [523.25, 659.25, 783.99];
  freqs.forEach((freq) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 0.35, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.8);
  });
}

function synthChimeShort(ctx: AudioContext, vol: number) {
  // 3-note ascending chime ~1s
  [880, 1108.73, 1318.51].forEach((freq, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol * 0.35, ctx.currentTime + i * 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.7);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.15); o.stop(ctx.currentTime + i * 0.15 + 0.7);
  });
}

function synthAlertShort(ctx: AudioContext, vol: number) {
  // 3 quick square-wave pulses ~0.6s
  for (let i = 0; i < 3; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 1000;
    g.gain.setValueAtTime(vol * 0.2, ctx.currentTime + i * 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.12);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.2); o.stop(ctx.currentTime + i * 0.2 + 0.15);
  }
}

function synthBeepShort(ctx: AudioContext, vol: number) {
  // Simple sine beep ~0.5s
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = 880;
  g.gain.setValueAtTime(vol * 0.3, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  o.connect(g); g.connect(ctx.destination);
  o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.5);
}

function synthKnockShort(ctx: AudioContext, vol: number) {
  // 2 percussive hits ~0.5s
  for (let i = 0; i < 2; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, ctx.currentTime + i * 0.2);
    o.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + i * 0.2 + 0.15);
    g.gain.setValueAtTime(vol * 0.5, ctx.currentTime + i * 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.15);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + i * 0.2); o.stop(ctx.currentTime + i * 0.2 + 0.2);
  }
}

function synthChimeLong(ctx: AudioContext, vol: number) {
  // Extended 5-note descending chime ~3.5s
  const notes = [1318.51, 1174.66, 1046.5, 880, 783.99];
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.5;
    g.gain.setValueAtTime(vol * 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 1.2);
  });
}

function synthFanfareLong(ctx: AudioContext, vol: number) {
  // Triumphant fanfare ~4s - ascending major sequence
  const notes = [
    { freq: 523.25, start: 0, dur: 0.3 },
    { freq: 659.25, start: 0.3, dur: 0.3 },
    { freq: 783.99, start: 0.6, dur: 0.5 },
    { freq: 1046.5, start: 1.2, dur: 0.8 },
    { freq: 783.99, start: 2.2, dur: 0.3 },
    { freq: 1046.5, start: 2.5, dur: 0.3 },
    { freq: 1318.51, start: 2.8, dur: 1.2 },
  ];
  notes.forEach(({ freq, start, dur }) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + start;
    g.gain.setValueAtTime(vol * 0.3, t);
    g.gain.setValueAtTime(vol * 0.3, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur);
  });
}

function synthAlertLong(ctx: AudioContext, vol: number) {
  // Escalating alert ~3s - rising pitch pattern x3
  for (let r = 0; r < 3; r++) {
    const baseT = ctx.currentTime + r * 1.0;
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 800 + i * 200 + r * 100;
      const t = baseT + i * 0.2;
      g.gain.setValueAtTime(vol * 0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.18);
    }
  }
}

function synthBellLong(ctx: AudioContext, vol: number) {
  // Rich bell with harmonics ~4s
  const fundamentals = [523.25, 659.25, 783.99];
  fundamentals.forEach((freq, i) => {
    [1, 2, 3].forEach((harmonic) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * harmonic;
      const g = ctx.createGain();
      const amp = vol * 0.2 / harmonic;
      const t = ctx.currentTime + i * 0.8;
      g.gain.setValueAtTime(amp, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 3.0);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 3.0);
    });
  });
}

function synthHornLong(ctx: AudioContext, vol: number) {
  // Extended horn sweep ~4s
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(220, ctx.currentTime);
  o.frequency.linearRampToValueAtTime(440, ctx.currentTime + 1.0);
  o.frequency.setValueAtTime(440, ctx.currentTime + 2.0);
  o.frequency.linearRampToValueAtTime(660, ctx.currentTime + 3.0);
  g.gain.setValueAtTime(vol * 0.25, ctx.currentTime);
  g.gain.setValueAtTime(vol * 0.3, ctx.currentTime + 1.5);
  g.gain.setValueAtTime(vol * 0.25, ctx.currentTime + 3.0);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.0);
  o.connect(g); g.connect(ctx.destination);
  o.start(ctx.currentTime); o.stop(ctx.currentTime + 4.0);
}

// ─── Sound Library ───

export type SoundEntry = {
  id: SoundId;
  name: string;
  nameJa: string;
  durationType: 'short' | 'long';
};

export const SOUND_LIBRARY: SoundEntry[] = [
  { id: 'bell-short',   name: 'Bell (Short)',        nameJa: 'ベル (短)',        durationType: 'short' },
  { id: 'chime-short',  name: 'Chime (Short)',       nameJa: 'チャイム (短)',    durationType: 'short' },
  { id: 'alert-short',  name: 'Alert (Short)',       nameJa: 'アラート (短)',    durationType: 'short' },
  { id: 'beep-short',   name: 'Beep (Short)',        nameJa: 'ビープ (短)',      durationType: 'short' },
  { id: 'knock-short',  name: 'Knock (Short)',       nameJa: 'ノック (短)',      durationType: 'short' },
  { id: 'chime-long',   name: 'Chime (Long)',        nameJa: 'チャイム (長)',    durationType: 'long' },
  { id: 'fanfare-long', name: 'Fanfare (Long)',      nameJa: 'ファンファーレ (長)', durationType: 'long' },
  { id: 'alert-long',   name: 'Alert (Long)',        nameJa: 'アラート (長)',    durationType: 'long' },
  { id: 'bell-long',    name: 'Bell (Long)',         nameJa: 'ベル (長)',        durationType: 'long' },
  { id: 'horn-long',    name: 'Horn (Long)',         nameJa: 'ホーン (長)',      durationType: 'long' },
];

const SOUND_ID_MAP: Record<SoundId, (ctx: AudioContext, vol: number) => void> = {
  'bell-short':   synthBellShort,
  'chime-short':  synthChimeShort,
  'alert-short':  synthAlertShort,
  'beep-short':   synthBeepShort,
  'knock-short':  synthKnockShort,
  'chime-long':   synthChimeLong,
  'fanfare-long': synthFanfareLong,
  'alert-long':   synthAlertLong,
  'bell-long':    synthBellLong,
  'horn-long':    synthHornLong,
};

export function playSoundById(soundId: SoundId, volume: number) {
  try {
    const ctx = getCtx();
    const fn = SOUND_ID_MAP[soundId];
    if (fn) fn(ctx, volume);
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
