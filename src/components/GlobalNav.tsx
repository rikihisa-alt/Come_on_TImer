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

type AuthInfo = {
  displayName: string;
  role: string;
} | null;

export function GlobalNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPreview = searchParams.get('preview') === '1';
  const [isFs, setIsFs] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [auth, setAuth] = useState<AuthInfo>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Fetch auth state
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const fetchAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, role')
            .eq('id', user.id)
            .single();

          if (!cancelled) {
            setAuth(profile ? { displayName: profile.display_name, role: profile.role } : null);
          }
        } else {
          if (!cancelled) setAuth(null);
        }
      } catch {
        if (!cancelled) setAuth(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    fetchAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAuth();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setAuth(null);
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

  if (isFs || isPreview) return null;

  // Hide nav completely if not authenticated (except on login/signup pages where we show nothing)
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  if (isAuthPage) return null;

  // While loading auth state, show minimal nav
  if (authLoading) {
    return (
      <nav className="g-topbar flex items-center justify-between px-3 md:px-5 py-2 md:py-3 border-b border-white/[0.06] sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span className="text-xl font-black text-blue-400 tracking-tight group-hover:text-blue-300 transition-colors">COME ON</span>
          <span className="text-white/25 font-medium text-base">Timer</span>
        </Link>
      </nav>
    );
  }

  // Not authenticated - hide nav entirely
  if (!auth) return null;

  return (
    <nav className="g-topbar flex items-center justify-between px-3 md:px-5 py-2 md:py-3 border-b border-white/[0.06] sticky top-0 z-50">
      <Link href="/" className="hidden md:flex items-center gap-2 group shrink-0">
        <span className="text-xl font-black text-blue-400 tracking-tight group-hover:text-blue-300 transition-colors">COME ON</span>
        <span className="text-white/25 font-medium text-base">Timer</span>
      </Link>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}>
            {item.label}
          </Link>
        ))}
      </div>

      {/* Auth section (desktop) - always show logout when authenticated */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <span className="text-white/40 text-xs">{auth.displayName}</span>
        <button onClick={handleLogout}
          className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-lg transition-colors">
          ログアウト
        </button>
      </div>

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
            {/* Mobile auth - logout */}
            <div className="border-t border-white/[0.06] my-1" />
            <div className="px-4 py-2 text-xs text-white/30">{auth.displayName}</div>
            <button onClick={handleLogout}
              className="block w-full text-left px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
              ログアウト
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
