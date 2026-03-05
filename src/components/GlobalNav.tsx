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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<{ display_name: string; role: string } | null>(null);

  // Fetch profile via API route
  useEffect(() => {
    const supabase = createClient();

    const fetchProfile = () => {
      fetch('/api/auth/profile')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.display_name) {
            setIsLoggedIn(true);
            setUserProfile({ display_name: data.display_name, role: data.role });
          }
        })
        .catch(() => { /* ignore */ });
    };

    // Listen for auth state changes (handles login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session) {
        setIsLoggedIn(true);
        fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserProfile(null);
    setIsLoggedIn(false);
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

      {/* Center: Desktop nav links */}
      <div className="hidden md:flex items-center gap-1">
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            className={`nav-link ${pathname === item.href ? 'active' : ''}`}>
            {item.label}
          </Link>
        ))}
      </div>

      {/* Right: User info + Logout + Mobile hamburger */}
      <div className="flex items-center gap-1 shrink-0">
        {/* User badge — links to account settings */}
        {userProfile && (
          <Link
            href="/app/account"
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors group"
          >
            <svg className="w-4 h-4 text-white/40 group-hover:text-blue-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-white/50 text-xs group-hover:text-white/70 transition-colors max-w-[80px] md:max-w-[120px] truncate">
              {userProfile.display_name}
            </span>
          </Link>
        )}

        {/* Logout button (desktop) — always visible when logged in */}
        {isLoggedIn && (
          <button onClick={handleLogout}
            className="hidden md:block px-3 py-1.5 text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-lg transition-colors">
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
            <div className="absolute right-0 top-full mt-1 w-52 py-1 rounded-xl bg-[var(--sys-bg-from)] border border-white/[0.1] shadow-lg z-50 fade-in">
              {/* Account section */}
              {userProfile && (
                <>
                  <Link href="/app/account"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-colors">
                    <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    アカウント設定
                  </Link>
                  {userProfile.role === 'owner' && (
                    <Link href="/app/users"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-colors">
                      <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      従業員管理
                    </Link>
                  )}
                  <div className="border-t border-white/[0.06] my-1" />
                </>
              )}
              {/* Nav links */}
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
