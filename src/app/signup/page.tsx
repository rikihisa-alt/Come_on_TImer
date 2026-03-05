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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-blue-600 tracking-tight">COME ON</h1>
          <p className="text-gray-400 text-sm mt-1">Timer</p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">新規登録</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            {showCodeNotice && (
              <div className="relative bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
                <button
                  type="button"
                  onClick={() => setShowCodeNotice(false)}
                  className="absolute top-2 right-2 text-amber-400 hover:text-amber-600 transition-colors p-0.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="text-amber-700 text-xs leading-relaxed pr-4">
                  認証コードがない場合はアカウントを作成できません。
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-gray-500 text-xs font-medium mb-1.5">認証コード</label>
              <input
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors tracking-widest font-mono"
                placeholder="認証コードを入力"
              />
            </div>

            <div>
              <label className="block text-gray-500 text-xs font-medium mb-1.5">店舗名</label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                placeholder="ポーカールーム名"
              />
            </div>

            <div>
              <label className="block text-gray-500 text-xs font-medium mb-1.5">表示名</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                placeholder="あなたの名前"
              />
            </div>

            <div>
              <label className="block text-gray-500 text-xs font-medium mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-gray-500 text-xs font-medium mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                placeholder="6文字以上"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors"
            >
              {loading ? '登録中...' : 'アカウント作成'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            既にアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-500 transition-colors font-medium">
              ログイン
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
