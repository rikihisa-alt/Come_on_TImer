'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [invitationCode, setInvitationCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCodeNotice, setShowCodeNotice] = useState(true);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create owner via API
      const res = await fetch('/api/auth/signup-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, organizationName, displayName, invitationCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes('already been registered')) {
          setError('このメールアドレスは既に登録されています');
        } else if (data.error?.includes('Invalid invitation code')) {
          setError('認証コードが無効です');
        } else if (data.error?.includes('already been used')) {
          setError('この認証コードは既に使用されています');
        } else if (data.error?.includes('Invitation code is required')) {
          setError('認証コードを入力してください');
        } else {
          setError(data.error || '登録に失敗しました');
        }
        return;
      }

      // 2. Auto-login
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError('アカウントは作成されましたが、ログインに失敗しました。ログインページからお試しください。');
        return;
      }

      // Clear previous user's store data to prevent data bleed between accounts
      localStorage.removeItem('come-on-timer-v3');

      router.push('/');
      router.refresh();
    } catch {
      setError('予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-blue-500/20 transition-all";
  const labelClass = "block text-white/50 text-[11px] font-medium mb-2 tracking-wide uppercase";

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
          <h1 className="text-4xl font-black tracking-tight mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            <span className="text-white">COME ON</span>{' '}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-lg">Timer</span>
          </h1>
          <p className="text-white/40 text-xs font-medium tracking-[0.3em] uppercase">Poker Tournament Timer</p>
        </div>

        {/* Signup Card */}
        <div className="backdrop-blur-xl bg-white/[0.06] rounded-2xl border border-white/[0.1] p-7 md:p-9 shadow-2xl shadow-black/30">
          <h2 className="text-lg font-bold text-white mb-6 text-center tracking-wide">新規登録</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            {showCodeNotice && (
              <div className="relative bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-xl backdrop-blur-sm">
                <button type="button" onClick={() => setShowCodeNotice(false)}
                  className="absolute top-2 right-2 text-amber-400/50 hover:text-amber-400 transition-colors p-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="text-amber-400/80 text-xs leading-relaxed pr-4">
                  認証コードがない場合はアカウントを作成できません。
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            <div>
              <label className={labelClass}>認証コード</label>
              <input type="text" value={invitationCode} onChange={(e) => setInvitationCode(e.target.value.toUpperCase())} required
                className={`${inputClass} tracking-widest font-mono`} placeholder="認証コードを入力" />
            </div>

            <div>
              <label className={labelClass}>店舗名</label>
              <input type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)}
                className={inputClass} placeholder="ポーカールーム名" />
            </div>

            <div>
              <label className={labelClass}>表示名</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required
                className={inputClass} placeholder="あなたの名前" />
            </div>

            <div>
              <label className={labelClass}>メールアドレス</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className={inputClass} placeholder="email@example.com" />
            </div>

            <div>
              <label className={labelClass}>パスワード</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className={inputClass} placeholder="6文字以上" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-blue-600/50 disabled:to-blue-500/50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 active:scale-[0.98]">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" className="opacity-25" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>
                  登録中...
                </span>
              ) : 'アカウント作成'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-white/15 text-[10px] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <p className="text-center text-white/40 text-sm">
            既にアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
              ログイン
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-white/10 text-[10px] mt-8 tracking-wide">&copy; COME ON Timer</p>
      </div>
    </div>
  );
}
