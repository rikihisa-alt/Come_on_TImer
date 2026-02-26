'use client';

import { useEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { FONT_OPTIONS, DEFAULT_SYSTEM_STYLE } from '@/lib/presets';

export function SystemStyleProvider() {
  const systemStyle = useStore(s => s.systemStyle) || DEFAULT_SYSTEM_STYLE;

  useEffect(() => {
    // Apply font family
    const font = FONT_OPTIONS.find(f => f.id === systemStyle.fontFamily);
    if (font) {
      document.body.style.fontFamily = font.value;
    }

    // Apply UI accent color as CSS variable
    const accent = systemStyle.uiAccentColor || '#3b82f6';
    document.documentElement.style.setProperty('--ui-accent', accent);

    // Parse hex to RGB for rgba() usage
    const r = parseInt(accent.slice(1, 3), 16);
    const g = parseInt(accent.slice(3, 5), 16);
    const b = parseInt(accent.slice(5, 7), 16);
    document.documentElement.style.setProperty('--ui-accent-rgb', `${r}, ${g}, ${b}`);
  }, [systemStyle]);

  return null;
}
