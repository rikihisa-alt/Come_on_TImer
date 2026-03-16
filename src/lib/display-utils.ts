import { DisplayToggles, ThemeConfig } from '@/lib/types';

/** Compute background style from display toggles + theme */
export function computeBgStyle(
  dt: Pick<DisplayToggles, 'backgroundImageUrl'>,
  theme?: ThemeConfig | null,
): React.CSSProperties {
  if (dt.backgroundImageUrl) {
    return { backgroundImage: `url(${dt.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  if (theme?.type === 'gradient') {
    return { background: `linear-gradient(160deg, ${theme.gradientFrom || '#0e1c36'}, ${theme.gradientTo || '#1c3d6e'})` };
  }
  if (theme?.type === 'image' && theme.imageUrl) {
    return { backgroundImage: `url(${theme.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  return { background: 'linear-gradient(160deg, #0e1c36 0%, #152d52 50%, #1c3d6e 100%)' };
}

/** Compute text effect styles (shadow + stroke) for display pages */
export function computeTextEffectStyle(dt: Pick<DisplayToggles, 'textShadowEnabled' | 'textStrokeEnabled' | 'textStrokeWidth' | 'textStrokeColor'>): React.CSSProperties {
  return {
    ...(dt.textShadowEnabled ? { textShadow: '0 0 8px rgba(0,0,0,0.8), 0 2px 16px rgba(0,0,0,0.6), 0 0 40px rgba(0,0,0,0.4)' } : {}),
    ...(dt.textStrokeEnabled ? { WebkitTextStroke: `${dt.textStrokeWidth ?? 1.5}px ${dt.textStrokeColor || '#000000'}`, paintOrder: 'stroke fill' as const } : {}),
  };
}

/** Check if background image overlay should show */
export function hasBgImage(dt: Pick<DisplayToggles, 'backgroundImageUrl'>, theme?: ThemeConfig | null): boolean {
  return !!(dt.backgroundImageUrl || (theme?.type === 'image' && theme.imageUrl));
}

/** Get background overlay opacity (0-1) */
export function getBgOverlayOpacity(dt: Pick<DisplayToggles, 'bgOverlayOpacity'>): number {
  return (dt.bgOverlayOpacity ?? 50) / 100;
}

/** ordinalLabel: 1→"1st", 2→"2nd", etc. */
export function ordinalLabel(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}
