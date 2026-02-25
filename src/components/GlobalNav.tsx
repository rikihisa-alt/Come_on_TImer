'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/operator', label: 'Operator' },
  { href: '/display/tournament', label: 'Tournament' },
  { href: '/display/cash', label: 'Cash' },
  { href: '/display/split', label: 'Split' },
];

export function GlobalNav() {
  const pathname = usePathname();
  const isDisplay = pathname?.startsWith('/display');

  if (isDisplay) {
    return (
      <div className="fixed top-3 right-3 z-50 hidden md:flex gap-1 glass-sm px-2 py-1 opacity-20 hover:opacity-90 transition-opacity duration-300">
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${pathname === item.href ? 'text-blue-400' : 'text-white/40 hover:text-white/70'}`}>
            {item.label}
          </Link>
        ))}
      </div>
    );
  }

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
