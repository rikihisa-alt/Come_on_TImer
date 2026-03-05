'use client';

import { useState, useEffect } from 'react';

interface Profile {
  email: string;
  display_name: string;
  role: string;
}

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editing, setEditing] = useState<'name' | 'email' | 'password' | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/auth/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setProfile(data);
          setNewName(data.display_name);
          setNewEmail(data.email);
        }
      })
      .catch(() => setError('プロフィールの取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const cancelEdit = () => {
    setEditing(null);
    setError('');
    setNewName(profile?.display_name || '');
    setNewEmail(profile?.email || '');
    setNewPassword('');
    setConfirmPassword('');
  };

  const updateName = async () => {
    if (!newName.trim()) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: newName.trim() }),
      });
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, display_name: newName.trim() } : null);
        setEditing(null);
        showMsg('表示名を更新しました');
      } else {
        const d = await res.json();
        setError(d.error || '更新に失敗しました');
      }
    } catch { setError('更新に失敗しました'); }
    finally { setSaving(false); }
  };

  const updateEmail = async () => {
    if (!newEmail.trim()) return;
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/auth/profile/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() }),
      });
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, email: newEmail.trim() } : null);
        setEditing(null);
        showMsg('メールアドレスを更新しました');
        // Update saved remember credentials
        try {
          const saved = localStorage.getItem('come-on-remember');
          if (saved) {
            const data = JSON.parse(saved);
            if (data.rememberMe) {
              data.email = newEmail.trim();
              localStorage.setItem('come-on-remember', JSON.stringify(data));
            }
          }
        } catch { /* ignore */ }
      } else {
        const d = await res.json();
        setError(d.error || '更新に失敗しました');
      }
    } catch { setError('更新に失敗しました'); }
    finally { setSaving(false); }
  };

  const updatePassword = async () => {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) { setError('パスワードが一致しません'); return; }
    if (newPassword.length < 6) { setError('パスワードは6文字以上必要です'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/auth/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setEditing(null);
        setNewPassword(''); setConfirmPassword('');
        showMsg('パスワードを更新しました');
        // Update saved remember credentials
        try {
          const saved = localStorage.getItem('come-on-remember');
          if (saved) {
            const data = JSON.parse(saved);
            if (data.rememberMe) {
              data.p = btoa(newPassword);
              localStorage.setItem('come-on-remember', JSON.stringify(data));
            }
          }
        } catch { /* ignore */ }
      } else {
        const d = await res.json();
        setError(d.error || '更新に失敗しました');
      }
    } catch { setError('更新に失敗しました'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/30 text-sm">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-lg mx-auto pt-2">
        <h1 className="text-2xl font-bold text-white mb-6">アカウント管理</h1>

        {message && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-sm mb-4 fade-in">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-4 fade-in">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* Display Name */}
          <div className="g-card p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/50 text-xs font-medium flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                表示名
              </label>
              {editing !== 'name' && (
                <button onClick={() => { setEditing('name'); setError(''); }} className="text-blue-400 text-xs hover:text-blue-300 transition-colors">変更</button>
              )}
            </div>
            {editing === 'name' ? (
              <div className="space-y-2">
                <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)} autoFocus
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                />
                <div className="flex gap-2">
                  <button onClick={updateName} disabled={saving} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">保存</button>
                  <button onClick={cancelEdit} className="px-3 py-1.5 text-white/40 hover:text-white/60 text-xs transition-colors">キャンセル</button>
                </div>
              </div>
            ) : (
              <p className="text-white font-medium">{profile?.display_name}</p>
            )}
          </div>

          {/* Email */}
          <div className="g-card p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/50 text-xs font-medium flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                メールアドレス
              </label>
              {editing !== 'email' && (
                <button onClick={() => { setEditing('email'); setError(''); }} className="text-blue-400 text-xs hover:text-blue-300 transition-colors">変更</button>
              )}
            </div>
            {editing === 'email' ? (
              <div className="space-y-2">
                <input
                  type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} autoFocus
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                />
                <div className="flex gap-2">
                  <button onClick={updateEmail} disabled={saving} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">保存</button>
                  <button onClick={cancelEdit} className="px-3 py-1.5 text-white/40 hover:text-white/60 text-xs transition-colors">キャンセル</button>
                </div>
              </div>
            ) : (
              <p className="text-white font-medium text-sm break-all">{profile?.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="g-card p-4 md:p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/50 text-xs font-medium flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                パスワード
              </label>
              {editing !== 'password' && (
                <button onClick={() => { setEditing('password'); setError(''); }} className="text-blue-400 text-xs hover:text-blue-300 transition-colors">変更</button>
              )}
            </div>
            {editing === 'password' ? (
              <div className="space-y-2">
                <input
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="新しいパスワード" autoFocus
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                />
                <input
                  type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="パスワード確認"
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-lg text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                />
                <div className="flex gap-2">
                  <button onClick={updatePassword} disabled={saving} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">保存</button>
                  <button onClick={cancelEdit} className="px-3 py-1.5 text-white/40 hover:text-white/60 text-xs transition-colors">キャンセル</button>
                </div>
              </div>
            ) : (
              <p className="text-white/30">••••••••</p>
            )}
          </div>

          {/* Role (read-only) */}
          <div className="g-card p-4 md:p-5">
            <label className="text-white/50 text-xs font-medium flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              ロール
            </label>
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${
                profile?.role === 'master'
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                  : profile?.role === 'owner'
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                  : 'bg-white/[0.06] text-white/50 border border-white/[0.1]'
              }`}>
                {profile?.role === 'master' ? 'マスター' : profile?.role === 'owner' ? 'オーナー' : '従業員'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
