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
  const [accountOpen, setAccountOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
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
    setAccountOpen(false);
    setMenuOpen(false);
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

  // Close menus on outside click
  useEffect(() => {
    if (!menuOpen && !accountOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, accountOpen]);

  // Close menus on route change
  useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [pathname]);

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

      {/* Right: Account dropdown + Mobile hamburger */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Account dropdown (desktop) — person icon + name */}
        {userProfile && (
          <div className="hidden md:block relative" ref={accountRef}>
            <button
              onClick={() => setAccountOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors group"
            >
              <svg className="w-4 h-4 text-white/40 group-hover:text-blue-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="text-white/50 text-xs group-hover:text-white/70 transition-colors max-w-[120px] truncate">
                {userProfile.display_name}
              </span>
              <svg className={`w-3 h-3 text-white/25 transition-transform ${accountOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 py-1 rounded-xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.1] shadow-2xl z-50 fade-in">
                <Link href="/app/account"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors">
                  <svg className="w-4 h-4 text-blue-400/70 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  アカウント管理
                </Link>
                {userProfile.role === 'owner' && (
                  <Link href="/app/users"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors">
                    <svg className="w-4 h-4 text-blue-400/70 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    従業員管理
                  </Link>
                )}
                <div className="border-t border-white/[0.06] my-1" />
                <button onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  ログアウト
                </button>
              </div>
            )}
          </div>
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
            <div className="absolute right-0 top-full mt-1 w-52 py-1 rounded-xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.1] shadow-2xl z-50 fade-in">
              {/* Account section */}
              {userProfile && (
                <>
                  {/* User info header */}
                  <div className="px-4 py-2.5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400/70 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      <span className="text-white/70 text-sm font-medium truncate">{userProfile.display_name}</span>
                    </div>
                  </div>
                  <Link href="/app/account"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors">
                    <svg className="w-4 h-4 text-blue-400/70 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    アカウント管理
                  </Link>
                  {userProfile.role === 'owner' && (
                    <Link href="/app/users"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors">
                      <svg className="w-4 h-4 text-blue-400/70 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
                    pathname === item.href ? 'text-blue-400 bg-blue-500/10' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
                  }`}>
                  {item.label}
                </Link>
              ))}
              {isLoggedIn && (
                <>
                  <div className="border-t border-white/[0.06] my-1" />
                  <button onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full text-left px-4 py-2.5 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    ログアウト
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
