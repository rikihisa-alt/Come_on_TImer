'use client';

import { SectionPosition } from '@/lib/types';

export function AbsoluteSection({ pos, children }: { pos: SectionPosition; children: React.ReactNode }) {
  const sfs = pos.fontSize ?? 1;
  return (
    <div className="absolute overflow-hidden" style={{
      left: `${pos.x}%`, top: `${pos.y}%`,
      width: `${pos.w}%`, height: `${pos.h}%`,
    }}>
      <div className="w-full h-full origin-center" style={{
        transform: sfs !== 1 ? `scale(${sfs})` : undefined,
      }}>
        {children}
      </div>
    </div>
  );
}
