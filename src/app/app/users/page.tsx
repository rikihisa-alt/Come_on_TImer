'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type UserProfile = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [callerRole, setCallerRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setUsers(data.users);
      setCallerRole(data.callerRole);

      if (data.callerRole !== 'owner') {
        router.push('/operator');
        return;
      }
    } catch {
      setError('従業員情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);

    try {
      const res = await fetch('/api/auth/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createEmail,
          password: createPassword,
          displayName: createName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes('already been registered')) {
          setCreateError('このメールアドレスは既に登録されています');
        } else {
          setCreateError(data.error || '作成に失敗しました');
        }
        return;
      }

      setShowCreate(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateName('');
      fetchUsers();
    } catch {
      setCreateError('従業員の作成に失敗しました');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError('');
    setResetLoading(true);

    try {
      const res = await fetch(`/api/auth/users/${resetTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResetError(data.error || 'パスワードリセットに失敗しました');
        return;
      }

      setResetTarget(null);
      setResetPassword('');
    } catch {
      setResetError('パスワードリセットに失敗しました');
    } finally {
      setResetLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/auth/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '削除に失敗しました');
        return;
      }

      setDeleteTarget(null);
      fetchUsers();
    } catch {
      setError('従業員の削除に失敗しました');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/30 text-sm">読み込み中...</div>
      </div>
    );
  }

  if (callerRole !== 'owner') return null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">従業員管理</h1>
            <p className="text-white/30 text-sm mt-1">チームメンバーの追加・管理</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white/70 rounded-xl text-sm transition-colors"
            >
              戻る
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition-colors"
            >
              + 従業員追加
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="g-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left text-white/40 text-xs font-medium px-4 py-3">名前</th>
                <th className="text-left text-white/40 text-xs font-medium px-4 py-3 hidden md:table-cell">メール</th>
                <th className="text-left text-white/40 text-xs font-medium px-4 py-3">ロール</th>
                <th className="text-right text-white/40 text-xs font-medium px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3">
                    <div className="text-white text-sm font-medium">{u.display_name}</div>
                    <div className="text-white/30 text-xs md:hidden">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-sm hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                      u.role === 'owner'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-white/[0.06] text-white/50'
                    }`}>
                      {u.role === 'owner' ? 'オーナー' : '従業員'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'owner' && (
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => { setResetTarget(u); setResetPassword(''); setResetError(''); }}
                          className="px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                          title="パスワードリセット"
                        >
                          PW変更
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="削除"
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-white/30 text-sm">
                    従業員がいません。「+ 従業員追加」から追加してください。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Employee Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowCreate(false)}>
          <div className="g-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">従業員を追加</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              {createError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-xl text-sm">
                  {createError}
                </div>
              )}
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1">表示名</label>
                <input
                  type="text"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  placeholder="従業員の名前"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={e => setCreateEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  placeholder="employee@example.com"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1">パスワード</label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={e => setCreatePassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  placeholder="6文字以上"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 rounded-xl text-sm transition-colors">
                  キャンセル
                </button>
                <button type="submit" disabled={createLoading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium rounded-xl text-sm transition-colors">
                  {createLoading ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setResetTarget(null)}>
          <div className="g-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">パスワードリセット</h3>
            <p className="text-white/40 text-sm mb-4">
              <span className="text-white/70">{resetTarget.display_name}</span> の新しいパスワードを設定
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              {resetError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-xl text-sm">
                  {resetError}
                </div>
              )}
              <div>
                <label className="block text-white/50 text-xs font-medium mb-1">新しいパスワード</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50"
                  placeholder="6文字以上"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setResetTarget(null)}
                  className="flex-1 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 rounded-xl text-sm transition-colors">
                  キャンセル
                </button>
                <button type="submit" disabled={resetLoading}
                  className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-600/50 text-white font-medium rounded-xl text-sm transition-colors">
                  {resetLoading ? '変更中...' : 'パスワード変更'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="g-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">従業員を削除</h3>
            <p className="text-white/40 text-sm mb-4">
              <span className="text-white/70">{deleteTarget.display_name}</span> を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/70 rounded-xl text-sm transition-colors">
                キャンセル
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white font-medium rounded-xl text-sm transition-colors">
                {deleteLoading ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
