'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { isFirebaseAvailable, createRoom, roomExists, writeRoom, onRoomChange, destroyRoom } from '@/lib/firebase';
import { useStore } from '@/stores/useStore';

type RoomRole = 'host' | 'viewer' | null;

export function RoomSync() {
  const [role, setRole] = useState<RoomRole>(null);
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const lastWriteRef = useRef(0);

  const available = isFirebaseAvailable();

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  // Host: broadcast state to Firebase on store changes
  useEffect(() => {
    if (role !== 'host' || status !== 'connected' || !roomCode) return;

    const unsub = useStore.subscribe((state) => {
      // Throttle writes to max once per second
      const now = Date.now();
      if (now - lastWriteRef.current < 1000) return;
      lastWriteRef.current = now;

      const data: Record<string, unknown> = {
        tournaments: state.tournaments,
        cashGames: state.cashGames,
        displays: state.displays,
        themes: state.themes,
        sound: state.sound,
        displayToggles: state.displayToggles,
        defaultThemeId: state.defaultThemeId,
        systemStyle: state.systemStyle,
        blindTemplates: state.blindTemplates,
        _ts: Date.now(),
      };
      writeRoom(roomCode, data).catch(() => {});
    });

    // Also do an initial write
    const state = useStore.getState();
    writeRoom(roomCode, {
      tournaments: state.tournaments,
      cashGames: state.cashGames,
      displays: state.displays,
      themes: state.themes,
      sound: state.sound,
      displayToggles: state.displayToggles,
      defaultThemeId: state.defaultThemeId,
      systemStyle: state.systemStyle,
      blindTemplates: state.blindTemplates,
      _ts: Date.now(),
    }).catch(() => {});

    return unsub;
  }, [role, status, roomCode]);

  const handleCreate = useCallback(async () => {
    setStatus('connecting');
    setErrorMsg('');
    try {
      const code = await createRoom();
      if (!code) { setStatus('error'); setErrorMsg('Firebase not configured'); return; }
      setRoomCode(code);
      setRole('host');
      setStatus('connected');
    } catch (e) {
      setStatus('error');
      setErrorMsg(String(e));
    }
  }, []);

  const handleJoin = useCallback(async () => {
    const code = joinInput.trim().toUpperCase();
    if (code.length !== 4) { setErrorMsg('4-character code required'); return; }
    setStatus('connecting');
    setErrorMsg('');
    try {
      const exists = await roomExists(code);
      if (!exists) { setStatus('error'); setErrorMsg('Room not found'); return; }

      setRoomCode(code);
      setRole('viewer');

      // Listen for state changes
      const unsub = onRoomChange(code, (state) => {
        if (!state) return;
        const s = state as Record<string, unknown>;
        if (s.tournaments) useStore.setState({ tournaments: s.tournaments as never });
        if (s.cashGames) useStore.setState({ cashGames: s.cashGames as never });
        if (s.displays) useStore.setState({ displays: s.displays as never });
        if (s.themes) useStore.setState({ themes: s.themes as never });
        if (s.sound) useStore.setState({ sound: s.sound as never });
        if (s.displayToggles) useStore.setState({ displayToggles: s.displayToggles as never });
        if (s.defaultThemeId) useStore.setState({ defaultThemeId: s.defaultThemeId as never });
        if (s.systemStyle) useStore.setState({ systemStyle: s.systemStyle as never });
        if (s.blindTemplates) useStore.setState({ blindTemplates: s.blindTemplates as never });
      });
      unsubRef.current = unsub;
      setStatus('connected');
    } catch (e) {
      setStatus('error');
      setErrorMsg(String(e));
    }
  }, [joinInput]);

  const handleDisconnect = useCallback(async () => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    if (role === 'host' && roomCode) await destroyRoom(roomCode).catch(() => {});
    setRole(null);
    setRoomCode('');
    setJoinInput('');
    setStatus('idle');
    setErrorMsg('');
  }, [role, roomCode]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomCode]);

  if (!available) return null;

  // Connected state
  if (status === 'connected' && roomCode) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-green-400 font-bold tracking-wider">{roomCode}</span>
        <span className="text-[10px] text-white/30">{role === 'host' ? 'Host' : 'Viewer'}</span>
        {role === 'host' && (
          <button onClick={handleCopy} className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
        <button onClick={handleDisconnect} className="text-[10px] text-red-400 hover:text-red-300 transition-colors ml-1">
          Disconnect
        </button>
      </div>
    );
  }

  // Idle / connecting state
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCreate}
        disabled={status === 'connecting'}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 transition-all text-xs text-blue-400 font-medium disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.07-9.07a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
        {status === 'connecting' ? 'Connecting...' : 'Create Room'}
      </button>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={joinInput}
          onChange={(e) => setJoinInput(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="Code"
          className="w-16 px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs text-white/70 text-center placeholder:text-white/20 font-mono tracking-wider focus:outline-none focus:border-blue-500/40"
        />
        <button
          onClick={handleJoin}
          disabled={joinInput.length !== 4 || status === 'connecting'}
          className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-xs text-white/50 font-medium transition-all disabled:opacity-30"
        >
          Join
        </button>
      </div>
      {errorMsg && <span className="text-[10px] text-red-400">{errorMsg}</span>}
    </div>
  );
}
