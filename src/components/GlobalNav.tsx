'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/operator', label: 'Operator' },
  { href: '/display/tournament', label: 'Tournament' },
  { href: '/display/cash', label: 'Ring Game' },
  { href: '/display/split', label: 'Split' },
];

export function GlobalNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPreview = searchParams.get('preview') === '1';
  const [isFs, setIsFs] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Just check if session exists — middleware already guarantees auth on protected pages
    supabase.auth.getUser().then(() => setAuthReady(true));
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Only hide: fullscreen or login/signup pages
  if (isFs || isPreview) return null;
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  if (isAuthPage) return null;

  return (
    <nav className="g-topbar flex items-center justify-between px-3 md:px-5 py-2 md:py-3 border-b border-white/[0.06] sticky top-0 z-50">
      {/* Left: Logo */}
      <Link href="/" className="flex items-center gap-2 group shrink-0">
        <span className="text-xl font-black text-blue-400 tracking-tight group-hover:text-blue-300 transition-colors">COME ON</span>
        <span className="text-white/25 font-medium text-base">Timer</span>
      </Link>

      {/* Center: Desktop nav links — always visible */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}>
            {item.label}
          </Link>
        ))}
      </div>

      {/* Right: Logout + Mobile hamburger */}
      <div className="flex items-center gap-1 shrink-0">
        {authReady && (
          <button onClick={handleLogout}
            className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-lg transition-colors">
            ログアウト
          </button>
        )}

        {/* Mobile hamburger */}
        <div className="md:hidden relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(v => !v)}
            className="p-2 rounded-lg hover:bg-white/[0.08] text-white/50 transition-colors"
            aria-label="メニュー">
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 py-1 rounded-xl bg-[var(--sys-bg-from)] border border-white/[0.1] shadow-lg z-50 fade-in">
              {NAV_ITEMS.map(item => (
                <Link key={item.href} href={item.href}
                  className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                    pathname === item.href ? 'text-blue-400 bg-blue-500/10' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                  }`}>
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-white/[0.06] my-1" />
              <button onClick={handleLogout}
                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
