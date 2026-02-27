export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatTimer(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatTimerHMS(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatChips(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'K';
  return n.toLocaleString();
}

export function computeTimeToBreak(
  levels: { type: string; duration: number }[],
  currentIndex: number,
  currentRemainingMs: number
): number | null {
  let totalMs = currentRemainingMs;
  for (let i = currentIndex + 1; i < levels.length; i++) {
    if (levels[i].type === 'break') return totalMs;
    totalMs += levels[i].duration * 1000;
  }
  return null;
}

export function computeTimeToEnd(
  levels: { duration: number }[],
  currentIndex: number,
  currentRemainingMs: number
): number {
  let totalMs = currentRemainingMs;
  for (let i = currentIndex + 1; i < levels.length; i++) {
    totalMs += levels[i].duration * 1000;
  }
  return totalMs;
}

/** Convert full-width digits (０-９) to half-width and strip non-numeric chars */
export function toHalfWidthNumber(str: string): string {
  return str.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[^0-9]/g, '');
}

export function computeRegCloseTime(
  levels: { type: string; duration: number; level: number }[],
  currentIndex: number,
  currentRemainingMs: number,
  regCloseLevel?: number
): number | null {
  if (!regCloseLevel || regCloseLevel <= 0) return null;
  let targetIndex = -1;
  for (let i = 0; i < levels.length; i++) {
    if (levels[i].type === 'play' && levels[i].level === regCloseLevel) {
      targetIndex = i;
      break;
    }
  }
  if (targetIndex < 0 || targetIndex <= currentIndex) return null;
  let totalMs = currentRemainingMs;
  for (let i = currentIndex + 1; i <= targetIndex; i++) {
    totalMs += levels[i].duration * 1000;
  }
  return totalMs;
}
