'use client';

import { useEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { DEFAULT_SYSTEM_STYLE, FONT_OPTIONS } from '@/lib/presets';

const RATIOS: Record<string, { w: number; h: number }> = {
  '16:9': { w: 16, h: 9 },
  '4:3': { w: 4, h: 3 },
  'panorama': { w: 21, h: 9 },
};

function loadGoogleFont(googleFamily: string) {
  const linkId = `gfont-${googleFamily.replace(/\+/g, '-')}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${googleFamily}:wght@400;600;700;900&display=swap`;
  document.head.appendChild(link);
}

export function DisplayWrapper({
  children,
  bgStyle,
  className = '',
  fontOverride,
  timerFontOverride,
}: {
  children: React.ReactNode;
  bgStyle?: React.CSSProperties;
  className?: string;
  fontOverride?: string;
  timerFontOverride?: string;
}) {
  const aspectRatio = useStore(s => s.systemStyle?.displayAspectRatio) || DEFAULT_SYSTEM_STYLE.displayAspectRatio;
  const fontScale = useStore(s => s.systemStyle?.displayFontScale) || 1;

  // Load Google Fonts for per-timer overrides
  useEffect(() => {
    if (fontOverride) {
      const f = FONT_OPTIONS.find(o => o.id === fontOverride);
      if (f?.googleFamily) loadGoogleFont(f.googleFamily);
    }
    if (timerFontOverride) {
      const f = FONT_OPTIONS.find(o => o.id === timerFontOverride);
      if (f?.googleFamily) loadGoogleFont(f.googleFamily);
    }
  }, [fontOverride, timerFontOverride]);

  const fontStyle: React.CSSProperties = {};
  if (fontOverride) {
    const f = FONT_OPTIONS.find(o => o.id === fontOverride);
    if (f) fontStyle.fontFamily = f.value;
  }
  if (timerFontOverride) {
    const f = FONT_OPTIONS.find(o => o.id === timerFontOverride);
    if (f) (fontStyle as Record<string, string>)['--timer-font-family'] = f.value;
  }

  const cssVars = { '--fs': String(fontScale), ...fontStyle } as React.CSSProperties;

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
