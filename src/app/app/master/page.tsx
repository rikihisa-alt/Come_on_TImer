'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type CodeInfo = {
  code: string;
  type: string;
  used: boolean;
  organization_name: string | null;
  used_at: string | null;
};

type StoreInfo = {
  id: string;
  name: string;
  created_at: string;
  owner: {
    display_name: string;
    email: string;
    password_plain: string;
  } | null;
  employees: {
    display_name: string;
    email: string;
    password_plain: string;
  }[];
};

export default function MasterPage() {
  const router = useRouter();
  const [codes, setCodes] = useState<CodeInfo[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/master');
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          router.push('/operator');
          return;
        }
        setError(data.error || 'データの取得に失敗しました');
        return;
      }

      setCodes(data.codes || []);
      setStores(data.stores || []);
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePassword = (key: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
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
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">マスター管理</h1>
            <p className="text-white/30 text-sm mt-1">認証コード・店舗・従業員の一括管理</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white/70 rounded-xl text-sm transition-colors"
          >
            戻る
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        {/* Invitation Codes Section */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            認証コード一覧
          </h2>
          <div className="g-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left text-white/40 text-xs font-medium px-4 py-3">コード</th>
                  <th className="text-left text-white/40 text-xs font-medium px-4 py-3">タイプ</th>
                  <th className="text-left text-white/40 text-xs font-medium px-4 py-3">ステータス</th>
                  <th className="text-left text-white/40 text-xs font-medium px-4 py-3 hidden md:table-cell">紐づき店舗</th>
                  <th className="text-left text-white/40 text-xs font-medium px-4 py-3 hidden md:table-cell">使用日</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.code} className={`border-b border-white/[0.04] last:border-0 ${c.used ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-white font-medium tracking-wider">{c.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                        c.type === 'master'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {c.type === 'master' ? 'マスター' : '店舗'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                        c.used
                          ? 'bg-white/[0.06] text-white/40'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {c.used ? '使用済み' : '未使用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/50 text-sm hidden md:table-cell">
                      {c.organization_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs hidden md:table-cell">
                      {formatDate(c.used_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stores Section */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" />
            </svg>
            店舗一覧
            <span className="text-white/30 text-sm font-normal">({stores.length}店舗)</span>
          </h2>

          {stores.length === 0 ? (
            <div className="g-card p-8 text-center text-white/30 text-sm">
              まだ店舗が登録されていません。
            </div>
          ) : (
            <div className="space-y-4">
              {stores.map((store) => (
                <div key={store.id} className="g-card p-4 md:p-5">
                  {/* Store header */}
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-white font-bold text-base">{store.name}</h3>
                    <span className="text-white/20 text-xs">
                      {formatDate(store.created_at)}登録
                    </span>
                  </div>

                  {/* Owner */}
                  {store.owner && (
                    <div className="mb-3">
                      <div className="text-white/40 text-xs font-medium mb-2 flex items-center gap-1.5">
                        <span className="inline-block px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold">オーナー</span>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <span className="text-white/30 text-[10px] block">名前</span>
                            <span className="text-white text-sm">{store.owner.display_name}</span>
                          </div>
                          <div>
                            <span className="text-white/30 text-[10px] block">メール</span>
                            <span className="text-white/70 text-sm break-all">{store.owner.email}</span>
                          </div>
                          <div>
                            <span className="text-white/30 text-[10px] block">パスワード</span>
                            <button
                              onClick={() => togglePassword(`owner-${store.id}`)}
                              className="text-sm font-mono hover:text-white/80 transition-colors"
                            >
                              {visiblePasswords.has(`owner-${store.id}`) ? (
                                <span className="text-yellow-400">{store.owner.password_plain || '(未設定)'}</span>
                              ) : (
                                <span className="text-white/30">{'••••••••'} <span className="text-[10px] text-blue-400/60">表示</span></span>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employees */}
                  {store.employees.length > 0 && (
                    <div>
                      <div className="text-white/40 text-xs font-medium mb-2 flex items-center gap-1.5">
                        <span className="inline-block px-1.5 py-0.5 bg-white/[0.06] text-white/50 rounded text-[10px] font-bold">従業員</span>
                        <span className="text-white/20 text-xs">{store.employees.length}名</span>
                      </div>
                      <div className="space-y-2">
                        {store.employees.map((emp, i) => (
                          <div key={i} className="bg-white/[0.03] rounded-lg p-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div>
                                <span className="text-white/30 text-[10px] block">名前</span>
                                <span className="text-white text-sm">{emp.display_name}</span>
                              </div>
                              <div>
                                <span className="text-white/30 text-[10px] block">メール</span>
                                <span className="text-white/70 text-sm break-all">{emp.email}</span>
                              </div>
                              <div>
                                <span className="text-white/30 text-[10px] block">パスワード</span>
                                <button
                                  onClick={() => togglePassword(`emp-${store.id}-${i}`)}
                                  className="text-sm font-mono hover:text-white/80 transition-colors"
                                >
                                  {visiblePasswords.has(`emp-${store.id}-${i}`) ? (
                                    <span className="text-yellow-400">{emp.password_plain || '(未設定)'}</span>
                                  ) : (
                                    <span className="text-white/30">{'••••••••'} <span className="text-[10px] text-blue-400/60">表示</span></span>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {store.employees.length === 0 && (
                    <div className="text-white/20 text-xs mt-1">従業員なし</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
