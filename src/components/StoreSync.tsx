'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { createClient } from '@/lib/supabase/client';
import { isFirebaseAvailable, writeOrgState, onOrgStateChange } from '@/lib/firebase';

const SUPABASE_DEBOUNCE_MS = 3000; // Supabase = persistence only, can be slower
const FIREBASE_THROTTLE_MS = 300;  // Firebase = instant sync, throttle to max ~3 writes/sec
const PERSISTED_KEYS = ['tournaments', 'cashGames', 'displays', 'themes', 'sound', 'displayToggles', 'defaultThemeId', 'systemStyle', 'blindTemplates', 'tournamentPresets', 'cashPresets'] as const;

/**
 * StoreSync: Headless component that syncs Zustand store across devices.
 *
 * Architecture (v88):
 *   Firebase RTDB  = instant cross-device sync (<100ms) via org-level channel
 *   Supabase       = persistent storage (debounced writes for durability)
 *
 * Flow:
 *   Local change → Firebase write (throttled 300ms) → other devices get instant update
 *   Local change → Supabase PUT (debounced 3s)      → durable persistence
 *   On login     → Supabase GET (initial state load) → hydrate store
 */
export function StoreSync() {
  const isRemoteUpdate = useRef(false);
  const supabaseDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJson = useRef<string>('');
  const lastFirebaseJson = useRef<string>('');
  const lastFirebaseWrite = useRef(0);
  const firebaseWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAuthenticated = useRef(false);
  const initialLoadDone = useRef(false);
  const isLoading = useRef(false);
  const orgId = useRef<string>('');
  const firebaseUnsub = useRef<(() => void) | null>(null);
  const firebaseAvailable = isFirebaseAvailable();

  // Save current state to Supabase (persistence layer)
  const saveToSupabase = useCallback(async (storeData: Record<string, unknown>) => {
    if (!isAuthenticated.current) return;

    const json = JSON.stringify(storeData);
    if (json === lastSavedJson.current) return;
    lastSavedJson.current = json;

    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_data: storeData }),
      });
      if (!res.ok) {
        console.error('[StoreSync] Supabase save failed:', res.status);
      }
    } catch (err) {
      console.error('[StoreSync] Supabase save error:', err);
    }
  }, []);

  // Write to Firebase for instant sync (throttled)
  const writeToFirebase = useCallback((storeData: Record<string, unknown>) => {
    if (!firebaseAvailable || !orgId.current) return;

    const json = JSON.stringify(storeData);
    if (json === lastFirebaseJson.current) return;
    lastFirebaseJson.current = json;

    const now = Date.now();
    const elapsed = now - lastFirebaseWrite.current;

    if (elapsed >= FIREBASE_THROTTLE_MS) {
      // Write immediately
      lastFirebaseWrite.current = now;
      writeOrgState(orgId.current, storeData).catch(() => {});
    } else {
      // Schedule write after throttle period
      if (firebaseWriteTimer.current) clearTimeout(firebaseWriteTimer.current);
      firebaseWriteTimer.current = setTimeout(() => {
        lastFirebaseWrite.current = Date.now();
        writeOrgState(orgId.current, storeData).catch(() => {});
      }, FIREBASE_THROTTLE_MS - elapsed);
    }
  }, [firebaseAvailable]);

  // Load initial state from Supabase + start Firebase listener
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
        lastFirebaseJson.current = json;
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);

        // Also push to Firebase so other connected devices get it
        if (firebaseAvailable && orgId.current) {
          writeOrgState(orgId.current, store_data).catch(() => {});
        }
      } else {
        // No remote data — save current local state as initial
        const currentState = useStore.getState()._getPersistedState();
        await saveToSupabase(currentState);
        if (firebaseAvailable && orgId.current) {
          writeOrgState(orgId.current, currentState).catch(() => {});
        }
      }

      // 3. Start Firebase realtime listener for this org
      if (firebaseAvailable && orgId.current) {
        // Clean up any previous listener
        if (firebaseUnsub.current) firebaseUnsub.current();

        firebaseUnsub.current = onOrgStateChange(orgId.current, (state) => {
          if (!state) return;

          const remoteJson = JSON.stringify(state);
          // Skip if this matches what we just wrote (echo suppression)
          if (remoteJson === lastFirebaseJson.current) return;
          lastFirebaseJson.current = remoteJson;

          // Apply remote changes instantly
          isRemoteUpdate.current = true;
          // Remove _ts before hydrating
          const { _ts, ...cleanState } = state;
          void _ts; // unused
          useStore.getState()._hydrateFromRemote(cleanState);
          lastSavedJson.current = remoteJson;
          setTimeout(() => { isRemoteUpdate.current = false; }, 150);
        });
      }
    } catch (err) {
      console.error('[StoreSync] Load error:', err);
    } finally {
      isLoading.current = false;
      initialLoadDone.current = true;
    }
  }, [saveToSupabase, writeToFirebase, firebaseAvailable]);

  // Session guard: auto-signout if "remember me" was NOT checked and browser was reopened
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const noRemember = localStorage.getItem('come-on-no-remember');
    const sessionActive = sessionStorage.getItem('come-on-session');

    if (noRemember === 'true' && !sessionActive) {
      const supabase = createClient();
      supabase.auth.signOut().then(() => {
        window.location.href = '/login';
      });
    }
  }, []);

  // Auth state listener — triggers loadRemote on sign-in
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
        lastFirebaseJson.current = '';
        orgId.current = '';
        isLoading.current = false;
        // Clean up Firebase listener
        if (firebaseUnsub.current) {
          firebaseUnsub.current();
          firebaseUnsub.current = null;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadRemote]);

  // Subscribe to local store changes → write to Firebase (instant) + Supabase (debounced)
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      if (isRemoteUpdate.current) return;
      if (!initialLoadDone.current) return;
      if (!isAuthenticated.current) return;

      // Extract persisted state
      const persisted: Record<string, unknown> = {};
      for (const key of PERSISTED_KEYS) {
        persisted[key] = state[key];
      }

      // Firebase: instant sync (throttled 300ms)
      writeToFirebase(persisted);

      // Supabase: debounced persistence (3s)
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

  // Clean up Firebase listener on unmount
  useEffect(() => {
    return () => {
      if (firebaseUnsub.current) {
        firebaseUnsub.current();
        firebaseUnsub.current = null;
      }
    };
  }, []);

  return null;
}
