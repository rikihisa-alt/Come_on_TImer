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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-blue-400 tracking-tight">COME ON</h1>
          <p className="text-white/30 text-sm mt-1">Timer</p>
        </div>

        {/* Login Card */}
        <div className="g-card p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-6 text-center">ログイン</h2>

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5">メールアドレス</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs font-medium mb-1.5">パスワード</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                placeholder="パスワード"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-white/[0.06] border border-white/[0.1] accent-blue-500"
              />
              <span className="text-white/40 text-sm">ログイン状態を保持する</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <p className="text-center text-white/30 text-sm mt-6">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors">
              新規登録
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
