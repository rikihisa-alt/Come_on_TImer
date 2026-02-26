'use client';

import { useState, useEffect, useCallback } from 'react';

function getFullscreenElement(): Element | null {
  return document.fullscreenElement || (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement || null;
}

function exitFullscreen(): Promise<void> {
  if (document.exitFullscreen) return document.exitFullscreen();
  const doc = document as unknown as { webkitExitFullscreen?: () => Promise<void> };
  if (doc.webkitExitFullscreen) return doc.webkitExitFullscreen();
  return Promise.reject(new Error('Fullscreen API not supported'));
}

function requestFullscreen(el: HTMLElement): Promise<void> {
  if (el.requestFullscreen) return el.requestFullscreen();
  const elem = el as unknown as { webkitRequestFullscreen?: () => Promise<void> };
  if (elem.webkitRequestFullscreen) return elem.webkitRequestFullscreen();
  return Promise.reject(new Error('Fullscreen API not supported'));
}

export function FullscreenButton() {
  const [isFs, setIsFs] = useState(false);

  const updateState = useCallback(() => {
    setIsFs(!!getFullscreenElement());
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', updateState);
    document.addEventListener('webkitfullscreenchange', updateState);
    return () => {
      document.removeEventListener('fullscreenchange', updateState);
      document.removeEventListener('webkitfullscreenchange', updateState);
    };
  }, [updateState]);

  const toggle = () => {
    if (getFullscreenElement()) {
      exitFullscreen().catch((e) => console.warn('Exit fullscreen failed:', e));
    } else {
      requestFullscreen(document.documentElement).catch((e) => console.warn('Request fullscreen failed:', e));
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] hover:border-white/[0.25] text-white/50 hover:text-white/80 transition-all duration-200 shrink-0"
      title={isFs ? '全画面解除' : '全画面表示'}
    >
      {isFs ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
      )}
    </button>
  );
}
