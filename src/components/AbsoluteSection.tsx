'use client';

import { SectionPosition } from '@/lib/types';

export function AbsoluteSection({ pos, children }: { pos: SectionPosition; children: React.ReactNode }) {
  return (
    <div className="absolute" style={{
      left: `${pos.x}%`, top: `${pos.y}%`,
      width: `${pos.w}%`, height: `${pos.h}%`,
      fontSize: pos.fontSize ? `${pos.fontSize}em` : undefined,
    }}>
      <div className="w-full h-full">{children}</div>
    </div>
  );
}
