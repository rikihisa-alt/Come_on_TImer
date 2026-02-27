'use client';

import { useEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { FONT_OPTIONS, DEFAULT_SYSTEM_STYLE, getSystemTheme } from '@/lib/presets';

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

    // Apply display font scale
    document.documentElement.style.setProperty('--display-font-scale', String(systemStyle.displayFontScale || 1));

    // Apply system theme CSS variables
    const theme = getSystemTheme(
      systemStyle.systemThemeId || 'bright-blue',
      systemStyle.customBgFrom,
      systemStyle.customBgTo,
    );
    const el = document.documentElement;
    el.style.setProperty('--sys-bg-from', theme.bgFrom);
    el.style.setProperty('--sys-bg-to', theme.bgTo);
    // Apply custom text color override if set
    const ctc = systemStyle.customTextColor;
    if (ctc) {
      el.style.setProperty('--sys-text', ctc);
      // Derive secondary/muted from custom color with opacity
      const tr = parseInt(ctc.slice(1, 3), 16);
      const tg = parseInt(ctc.slice(3, 5), 16);
      const tb = parseInt(ctc.slice(5, 7), 16);
      el.style.setProperty('--sys-text-secondary', `rgba(${tr},${tg},${tb},0.65)`);
      el.style.setProperty('--sys-text-muted', `rgba(${tr},${tg},${tb},0.4)`);
    } else {
      el.style.setProperty('--sys-text', theme.textPrimary);
      el.style.setProperty('--sys-text-secondary', theme.textSecondary);
      el.style.setProperty('--sys-text-muted', theme.textMuted);
    }
    el.style.setProperty('--sys-glass-bg', theme.glassBg);
    el.style.setProperty('--sys-glass-border', theme.glassBorder);
    el.style.setProperty('--sys-glass-inner-bg', theme.glassInnerBg);
    el.style.setProperty('--sys-nav-bg', theme.navBg);
    el.style.setProperty('--sys-input-bg', theme.inputBg);
    el.style.setProperty('--sys-input-border', theme.inputBorder);

    // Set theme mode attribute for light-mode CSS overrides
    el.setAttribute('data-theme-mode', theme.mode);
  }, [systemStyle]);

  return null;
}
