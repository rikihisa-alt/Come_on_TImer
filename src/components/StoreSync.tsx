'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { createClient } from '@/lib/supabase/client';
import { isFirebaseAvailable, writeOrgState, onOrgStateChange } from '@/lib/firebase';

const SUPABASE_DEBOUNCE_MS = 800;
const FIREBASE_THROTTLE_MS = 500;
const POLL_INTERVAL_MS = 10000;   // Poll every 10s (reduced from 3s to prevent flicker)
const FLUSH_COOLDOWN_MS = 12000;  // Ignore remote echoes for 12s after own write
const PERSISTED_KEYS = ['tournaments', 'cashGames', 'displays', 'themes', 'sound', 'displayToggles', 'defaultThemeId', 'systemStyle', 'blindTemplates', 'tournamentPresets', 'cashPresets'] as const;

/**
 * StoreSync v92: Fix background image snap-back
 *
 * Key fixes:
 *   - isDirty stays true until flush PUT succeeds (not before)
 *   - lastSavedJson only updated after successful PUT
 *   - Cooldown starts immediately on local change (not just on flush)
 *   - Increased cooldown to 8s for large payloads (base64 images)
 *   - Failed flush keeps isDirty=true so next change retries
 */
export function StoreSync() {
  const isRemoteUpdate = useRef(false);
  const supabaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firebaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFirebaseWrite = useRef(0);
  const lastSavedJson = useRef('');
  const isAuthenticated = useRef(false);
  const initialLoadDone = useRef(false);
  const isLoading = useRef(false);
  const isDirty = useRef(false);
  const lastFlushTime = useRef(0);
  const orgId = useRef('');
  const firebaseUnsub = useRef<(() => void) | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const firebaseAvailable = isFirebaseAvailable();

  // Full JSON hash for reliable comparison (catches ALL field changes)
  const stableHash = useCallback((data: Record<string, unknown>): string => {
    try {
      return JSON.stringify(data);
    } catch {
      return '';
    }
  }, []);

  // Get persisted state
  const getPersistedState = useCallback((): Record<string, unknown> => {
    const state = useStore.getState();
    const persisted: Record<string, unknown> = {};
    for (const key of PERSISTED_KEYS) {
      persisted[key] = state[key];
    }
    return persisted;
  }, []);

  // Track when last local change happened (separate from flush time)
  const lastLocalChange = useRef(0);

  // Apply remote data — with guards against snap-back
  const applyRemote = useCallback((data: Record<string, unknown>) => {
    // Guard 1: Skip if we have unsaved local changes
    if (isDirty.current) return;

    // Guard 2: Skip during cooldown after our own flush (echo protection)
    if (Date.now() - lastFlushTime.current < FLUSH_COOLDOWN_MS) return;

    // Guard 3: Skip if too soon after any local change (even already flushed)
    if (Date.now() - lastLocalChange.current < 3000) return;

    // Guard 4: Skip if data is identical to what we last saved
    const json = stableHash(data);
    if (!json || json === lastSavedJson.current) return;
    lastSavedJson.current = json;

    isRemoteUpdate.current = true;
    useStore.getState()._hydrateFromRemote(data);
    setTimeout(() => { isRemoteUpdate.current = false; }, 150);
  }, [stableHash]);

  // Flush: send data to Supabase + Firebase
  const flush = useCallback(async () => {
    if (!isAuthenticated.current || !isDirty.current) return;
    // Keep isDirty=true until flush succeeds to block remote overwrites

    const persisted = getPersistedState();
    const json = stableHash(persisted);
    if (!json || json === lastSavedJson.current) { isDirty.current = false; return; }
    lastFlushTime.current = Date.now();  // Start echo cooldown immediately

    // Firebase: instant
    if (firebaseAvailable && orgId.current) {
      const now = Date.now();
      const elapsed = now - lastFirebaseWrite.current;
      if (elapsed >= FIREBASE_THROTTLE_MS) {
        lastFirebaseWrite.current = now;
        writeOrgState(orgId.current, persisted).catch(() => {});
      } else if (!firebaseTimer.current) {
        firebaseTimer.current = setTimeout(() => {
          firebaseTimer.current = null;
          lastFirebaseWrite.current = Date.now();
          const fresh = getPersistedState();
          writeOrgState(orgId.current, fresh).catch(() => {});
        }, FIREBASE_THROTTLE_MS - elapsed);
      }
    }

    // Supabase: persistence
    try {
      await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_data: persisted }),
      });
      // Only update saved hash and clear dirty AFTER successful PUT
      lastSavedJson.current = json;
      isDirty.current = false;
      lastFlushTime.current = Date.now();  // Reset cooldown after success
    } catch {
      // PUT failed — keep isDirty so we retry on next change
      // Don't update lastSavedJson so remote data won't be skipped
    }
  }, [getPersistedState, stableHash, firebaseAvailable]);

  // Load initial state
  const loadRemote = useCallback(async () => {
    if (isLoading.current) return;
    isLoading.current = true;

    try {
      const profileRes = await fetch('/api/auth/profile');
      if (profileRes.ok) {
        const p = await profileRes.json();
        if (p.organization_id) orgId.current = p.organization_id;
      }

      const res = await fetch('/api/store');
      if (!res.ok) return;
      const { store_data } = await res.json();

      const localState = getPersistedState();
      const localJson = stableHash(localState);

      if (store_data && typeof store_data === 'object' && Object.keys(store_data).length > 0) {
        const remoteJson = stableHash(store_data);
        if (remoteJson !== localJson) {
          // Only apply remote if local has no meaningful data (fresh install)
          const localTournaments = (localState.tournaments as { id?: string }[]) || [];
          const remoteTournaments = (store_data.tournaments as { id?: string }[]) || [];
          const hasLocalData = localTournaments.length > 0;
          const hasRemoteData = remoteTournaments.length > 0;

          if (!hasLocalData && hasRemoteData) {
            // Fresh install: accept remote fully
            isRemoteUpdate.current = true;
            useStore.getState()._hydrateFromRemote(store_data);
            lastSavedJson.current = remoteJson;
            setTimeout(() => { isRemoteUpdate.current = false; }, 100);
          } else if (hasLocalData) {
            // Local has data: smart merge (remote as base, keep local additions)
            isRemoteUpdate.current = true;
            useStore.getState()._hydrateFromRemote(store_data);
            setTimeout(() => { isRemoteUpdate.current = false; }, 100);
            // Then push local state back to remote
            const merged = getPersistedState();
            lastSavedJson.current = stableHash(merged);
            fetch('/api/store', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ store_data: merged }),
            }).catch(() => {});
            if (firebaseAvailable && orgId.current) {
              writeOrgState(orgId.current, merged).catch(() => {});
            }
          }
        } else {
          lastSavedJson.current = localJson;
        }

        if (firebaseAvailable && orgId.current && !localJson) {
          writeOrgState(orgId.current, store_data).catch(() => {});
        }
      } else {
        // No remote data — push local to remote
        await fetch('/api/store', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ store_data: localState }),
        });
        lastSavedJson.current = localJson;
        if (firebaseAvailable && orgId.current) {
          writeOrgState(orgId.current, localState).catch(() => {});
        }
      }

      // Firebase listener
      if (firebaseAvailable && orgId.current) {
        if (firebaseUnsub.current) firebaseUnsub.current();
        firebaseUnsub.current = onOrgStateChange(orgId.current, (state) => {
          if (!state) return;
          const { _ts, ...clean } = state;
          void _ts;
          applyRemote(clean);
        });
      }

      // Polling fallback — skips when dirty or in cooldown (applyRemote guards handle it)
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = setInterval(() => {
        if (!isAuthenticated.current || !initialLoadDone.current || isLoading.current) return;
        // Don't poll if we have pending local changes or just flushed
        if (isDirty.current) return;
        if (Date.now() - lastFlushTime.current < FLUSH_COOLDOWN_MS) return;
        fetch('/api/store')
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data?.store_data) applyRemote(data.store_data); })
          .catch(() => {});
      }, POLL_INTERVAL_MS);

    } catch (err) {
      console.error('[StoreSync] Load error:', err);
    } finally {
      isLoading.current = false;
      initialLoadDone.current = true;
    }
  }, [getPersistedState, stableHash, applyRemote, firebaseAvailable, flush]);

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

  // Auth listener
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
        lastFlushTime.current = 0;
        orgId.current = '';
        isDirty.current = false;
        isLoading.current = false;
        if (firebaseUnsub.current) { firebaseUnsub.current(); firebaseUnsub.current = null; }
        if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
      }
    });
    return () => { subscription.unsubscribe(); };
  }, [loadRemote]);

  // Store change → mark dirty + debounced flush (LIGHTWEIGHT - no serialization here)
  useEffect(() => {
    const unsub = useStore.subscribe(() => {
      if (isRemoteUpdate.current) return;
      if (!initialLoadDone.current || !isAuthenticated.current) return;

      isDirty.current = true;
      lastLocalChange.current = Date.now();
      lastFlushTime.current = Date.now();  // Protect from remote overwrite immediately

      if (supabaseTimer.current) clearTimeout(supabaseTimer.current);
      supabaseTimer.current = setTimeout(flush, SUPABASE_DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (supabaseTimer.current) clearTimeout(supabaseTimer.current);
      if (firebaseTimer.current) clearTimeout(firebaseTimer.current);
    };
  }, [flush]);

  // Supabase Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('org_store_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'org_store' },
        (payload) => {
          const d = payload.new as { store_data?: Record<string, unknown> };
          if (d.store_data) applyRemote(d.store_data);
        })
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
