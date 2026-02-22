import { SoundPreset } from './types';

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
