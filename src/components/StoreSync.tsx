'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { createClient } from '@/lib/supabase/client';
import { isFirebaseAvailable, writeOrgState, onOrgStateChange } from '@/lib/firebase';

const SUPABASE_DEBOUNCE_MS = 800;  // Supabase save debounce (fast for sync)
const FIREBASE_THROTTLE_MS = 300;  // Firebase instant sync throttle
const POLL_INTERVAL_MS = 2000;     // Polling fallback: every 2 seconds
const PERSISTED_KEYS = ['tournaments', 'cashGames', 'displays', 'themes', 'sound', 'displayToggles', 'defaultThemeId', 'systemStyle', 'blindTemplates', 'tournamentPresets', 'cashPresets'] as const;

/**
 * StoreSync v89: Hybrid realtime sync
 *
 * 3-layer sync architecture:
 *   1. Firebase RTDB  (if configured) → instant <100ms
 *   2. Supabase Realtime (always)     → near-instant when enabled
 *   3. Polling fallback (always)      → guaranteed every 2s
 *
 * All 3 layers run simultaneously. Firebase is optional.
 * Supabase Realtime needs: ALTER PUBLICATION supabase_realtime ADD TABLE org_store;
 * Polling always works as guaranteed fallback.
 */
export function StoreSync() {
  const isRemoteUpdate = useRef(false);
  const supabaseDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJson = useRef<string>('');
  const lastRemoteJson = useRef<string>('');
  const lastFirebaseWrite = useRef(0);
  const firebaseWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuthenticated = useRef(false);
  const initialLoadDone = useRef(false);
  const isLoading = useRef(false);
  const orgId = useRef<string>('');
  const firebaseUnsub = useRef<(() => void) | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const firebaseAvailable = isFirebaseAvailable();

  // Apply remote data to store (shared logic)
  const applyRemote = useCallback((data: Record<string, unknown>) => {
    const json = JSON.stringify(data);
    if (json === lastRemoteJson.current) return; // no change
    lastRemoteJson.current = json;
    lastSavedJson.current = json;

    isRemoteUpdate.current = true;
    useStore.getState()._hydrateFromRemote(data);
    setTimeout(() => { isRemoteUpdate.current = false; }, 150);
  }, []);

  // Save to Supabase (persistence + triggers Realtime for other clients)
  const saveToSupabase = useCallback(async (storeData: Record<string, unknown>) => {
    if (!isAuthenticated.current) return;

    const json = JSON.stringify(storeData);
    if (json === lastSavedJson.current) return;
    lastSavedJson.current = json;
    lastRemoteJson.current = json;

    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_data: storeData }),
      });
      if (!res.ok) console.error('[StoreSync] Supabase save failed:', res.status);
    } catch (err) {
      console.error('[StoreSync] Supabase save error:', err);
    }
  }, []);

  // Write to Firebase for instant sync (throttled)
  const writeToFirebase = useCallback((storeData: Record<string, unknown>) => {
    if (!firebaseAvailable || !orgId.current) return;

    const json = JSON.stringify(storeData);
    if (json === lastRemoteJson.current) return;

    const now = Date.now();
    const elapsed = now - lastFirebaseWrite.current;

    const doWrite = () => {
      lastFirebaseWrite.current = Date.now();
      lastRemoteJson.current = JSON.stringify(storeData);
      writeOrgState(orgId.current, storeData).catch(() => {});
    };

    if (elapsed >= FIREBASE_THROTTLE_MS) {
      doWrite();
    } else {
      if (firebaseWriteTimer.current) clearTimeout(firebaseWriteTimer.current);
      firebaseWriteTimer.current = setTimeout(doWrite, FIREBASE_THROTTLE_MS - elapsed);
    }
  }, [firebaseAvailable]);

  // Load initial state from Supabase + start all sync listeners
  const loadRemote = useCallback(async () => {
    if (isLoading.current) return;
    isLoading.current = true;

    try {
      // 1. Fetch profile to get organization_id
      const profileRes = await fetch('/api/auth/profile');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.organization_id) {
          orgId.current = profileData.organization_id;
        }
      }

      // 2. Load initial state from Supabase
      const res = await fetch('/api/store');
      if (!res.ok) {
        console.error('[StoreSync] Initial load failed:', res.status);
        return;
      }
      const { store_data } = await res.json();

      if (store_data && typeof store_data === 'object' && Object.keys(store_data).length > 0) {
        isRemoteUpdate.current = true;
        useStore.getState()._hydrateFromRemote(store_data);
        const json = JSON.stringify(store_data);
        lastSavedJson.current = json;
        lastRemoteJson.current = json;
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);

        // Push to Firebase so connected devices get it
        if (firebaseAvailable && orgId.current) {
          writeOrgState(orgId.current, store_data).catch(() => {});
        }
      } else {
        // No remote data — save current local state
        const currentState = useStore.getState()._getPersistedState();
        await saveToSupabase(currentState);
        if (firebaseAvailable && orgId.current) {
          writeOrgState(orgId.current, currentState).catch(() => {});
        }
      }

      // 3. Start Firebase realtime listener (Layer 1 - instant)
      if (firebaseAvailable && orgId.current) {
        if (firebaseUnsub.current) firebaseUnsub.current();
        firebaseUnsub.current = onOrgStateChange(orgId.current, (state) => {
          if (!state) return;
          const { _ts, ...cleanState } = state;
          void _ts;
          applyRemote(cleanState);
        });
      }

      // 4. Start polling (Layer 3 - guaranteed fallback)
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = setInterval(() => {
        if (!isAuthenticated.current || !initialLoadDone.current || isLoading.current) return;

        fetch('/api/store')
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (!data?.store_data) return;
            applyRemote(data.store_data);
          })
          .catch(() => {});
      }, POLL_INTERVAL_MS);

    } catch (err) {
      console.error('[StoreSync] Load error:', err);
    } finally {
      isLoading.current = false;
      initialLoadDone.current = true;
    }
  }, [saveToSupabase, writeToFirebase, firebaseAvailable, applyRemote]);

  // Session guard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const noRemember = localStorage.getItem('come-on-no-remember');
    const sessionActive = sessionStorage.getItem('come-on-session');
    if (noRemember === 'true' && !sessionActive) {
      const supabase = createClient();
      supabase.auth.signOut().then(() => { window.location.href = '/login'; });
    }
  }, []);

  // Auth state listener
  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session) {
        if (!isAuthenticated.current) {
          isAuthenticated.current = true;
          loadRemote();
        }
      } else if (event === 'SIGNED_OUT') {
        isAuthenticated.current = false;
        initialLoadDone.current = false;
        lastSavedJson.current = '';
        lastRemoteJson.current = '';
        orgId.current = '';
        isLoading.current = false;
        if (firebaseUnsub.current) { firebaseUnsub.current(); firebaseUnsub.current = null; }
        if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [loadRemote]);

  // Store change listener → Firebase (instant) + Supabase (debounced)
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      if (isRemoteUpdate.current) return;
      if (!initialLoadDone.current) return;
      if (!isAuthenticated.current) return;

      const persisted: Record<string, unknown> = {};
      for (const key of PERSISTED_KEYS) {
        persisted[key] = state[key];
      }

      // Layer 1: Firebase instant sync (if available)
      writeToFirebase(persisted);

      // Layer 2+3: Supabase debounced save (triggers Realtime for other clients + persistence)
      if (supabaseDebounceTimer.current) clearTimeout(supabaseDebounceTimer.current);
      supabaseDebounceTimer.current = setTimeout(() => {
        saveToSupabase(persisted);
      }, SUPABASE_DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (supabaseDebounceTimer.current) clearTimeout(supabaseDebounceTimer.current);
      if (firebaseWriteTimer.current) clearTimeout(firebaseWriteTimer.current);
    };
  }, [saveToSupabase, writeToFirebase]);

  // Supabase Realtime subscription (Layer 2 - near-instant when enabled)
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('org_store_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'org_store' },
        (payload) => {
          const newData = payload.new as { store_data?: Record<string, unknown> };
          if (!newData.store_data) return;
          applyRemote(newData.store_data);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [applyRemote]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (firebaseUnsub.current) { firebaseUnsub.current(); firebaseUnsub.current = null; }
      if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
    };
  }, []);

  return null;
}
