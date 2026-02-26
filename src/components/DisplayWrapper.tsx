'use client';

import { useStore } from '@/stores/useStore';
import { DEFAULT_SYSTEM_STYLE } from '@/lib/presets';

const RATIOS: Record<string, { w: number; h: number }> = {
  '16:9': { w: 16, h: 9 },
  '4:3': { w: 4, h: 3 },
  'panorama': { w: 21, h: 9 },
};

export function DisplayWrapper({
  children,
  bgStyle,
  className = '',
}: {
  children: React.ReactNode;
  bgStyle?: React.CSSProperties;
  className?: string;
}) {
  const aspectRatio = useStore(s => s.systemStyle?.displayAspectRatio) || DEFAULT_SYSTEM_STYLE.displayAspectRatio;
  const fontScale = useStore(s => s.systemStyle?.displayFontScale) || 1;

  const cssVars = { '--fs': String(fontScale) } as React.CSSProperties;

  if (aspectRatio === 'zoom') {
    return (
      <div
        className={`w-screen h-screen overflow-hidden ${className}`}
        style={{ ...cssVars, ...bgStyle }}
      >
        {children}
      </div>
    );
  }

  const r = RATIOS[aspectRatio] || RATIOS['16:9'];

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-black overflow-hidden">
      <div
        className={`relative overflow-hidden ${className}`}
        style={{
          width: `min(100vw, calc(100vh * ${r.w} / ${r.h}))`,
          height: `min(100vh, calc(100vw * ${r.h} / ${r.w}))`,
          ...cssVars,
          ...bgStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
