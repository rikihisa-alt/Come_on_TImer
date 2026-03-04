'use client';

import { SectionPosition } from '@/lib/types';

function hexToRgbStr(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function AbsoluteSection({ pos, children }: { pos: SectionPosition; children: React.ReactNode }) {
  const sfs = pos.fontSize ?? 1;
  const frameRgb = pos.frameColor ? hexToRgbStr(pos.frameColor) : undefined;
  const frameVis = pos.frameVisibility !== undefined ? pos.frameVisibility / 50 : undefined;

  return (
    <div className="absolute overflow-hidden" style={{
      left: `${pos.x}%`, top: `${pos.y}%`,
      width: `${pos.w}%`, height: `${pos.h}%`,
      ...(pos.textColor ? { '--section-text-color': pos.textColor } : {}),
      ...(frameRgb ? { '--frame-rgb': frameRgb } : {}),
      ...(frameVis !== undefined ? { '--frame-vis': String(frameVis) } : {}),
    } as React.CSSProperties}>
      <div className="w-full h-full origin-center" style={{
        transform: sfs !== 1 ? `scale(${sfs})` : undefined,
      }}>
        {children}
      </div>
    </div>
  );
}
