'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fill from saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('come-on-remember');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.rememberMe && data.email) {
          setEmail(data.email);
          if (data.p) {
            try { setPassword(atob(data.p)); } catch { /* ignore */ }
          }
          setRememberMe(true);
        }
      }
    } catch { /* ignore parse errors */ }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('メールアドレスまたはパスワードが正しくありません');
        } else {
          setError('ログインに失敗しました');
        }
        return;
      }

      // Handle "remember me" preference
      if (rememberMe) {
        localStorage.setItem('come-on-remember', JSON.stringify({
          email,
          p: btoa(password),
          rememberMe: true,
        }));
        localStorage.removeItem('come-on-no-remember');
      } else {
        localStorage.removeItem('come-on-remember');
        localStorage.setItem('come-on-no-remember', 'true');
      }

      // Clear previous user's store data to prevent data bleed between accounts
      localStorage.removeItem('come-on-timer-v3');

      // Mark this browser session as active (for session guard)
      sessionStorage.setItem('come-on-session', 'active');

      router.push('/');
      router.refresh();
    } catch {
      setError('予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0f1e]">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0a0f1e]" />
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/[0.07] blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-indigo-500/[0.05] blur-[100px]" />
        <div className="absolute top-[30%] right-[20%] w-[200px] h-[200px] rounded-full bg-cyan-500/[0.04] blur-[80px]" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">COME ON</span>
            </h1>
          </div>
          <p className="text-white/30 text-sm font-medium tracking-wider">カモンタイマー</p>
          <p className="text-white/15 text-xs mt-1 tracking-[0.2em] uppercase">Poker Tournament Timer</p>
        </div>

        {/* Login Card */}
        <div className="backdrop-blur-xl bg-white/[0.04] rounded-2xl border border-white/[0.08] p-7 md:p-9 shadow-2xl shadow-black/20">
          <h2 className="text-lg font-bold text-white/90 mb-6 text-center tracking-wide">ログイン</h2>

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="on">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-white/30 text-[11px] font-medium mb-2 tracking-wide uppercase">メールアドレス</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-blue-500/20 transition-all"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-white/30 text-[11px] font-medium mb-2 tracking-wide uppercase">パスワード</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-blue-500/20 transition-all"
                placeholder="パスワード"
              />
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${rememberMe ? 'bg-blue-500 border-blue-500' : 'border-white/20 bg-white/[0.04] group-hover:border-white/30'}`}>
                {rememberMe && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </div>
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only" />
              <span className="text-white/30 text-sm group-hover:text-white/40 transition-colors">ログイン状態を保持する</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-blue-600/50 disabled:to-blue-500/50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" className="opacity-25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>
                  ログイン中...
                </span>
              ) : 'ログイン'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-white/15 text-[10px] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <p className="text-center text-white/25 text-sm">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
              新規登録
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-white/10 text-[10px] mt-8 tracking-wide">&copy; COME ON Timer</p>
      </div>
    </div>
  );
}
