'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/operator', label: 'Operator' },
  { href: '/display/tournament', label: 'Tournament' },
  { href: '/display/cash', label: 'Cash' },
  { href: '/display/split', label: 'Split' },
];

export function GlobalNav() {
  const pathname = usePathname();
  const [isFs, setIsFs] = useState(false);

  const updateState = useCallback(() => {
    setIsFs(!!(document.fullscreenElement || (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement));
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', updateState);
    document.addEventListener('webkitfullscreenchange', updateState);
    return () => {
      document.removeEventListener('fullscreenchange', updateState);
      document.removeEventListener('webkitfullscreenchange', updateState);
    };
  }, [updateState]);

  if (isFs) return null;

  return (
    <nav className="g-topbar flex items-center justify-between px-5 py-3 border-b border-white/[0.06] sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2 group">
        <span className="text-lg font-black text-blue-400 tracking-tight group-hover:text-blue-300 transition-colors">COME ON</span>
        <span className="text-white/25 font-medium text-sm">Timer</span>
      </Link>
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
