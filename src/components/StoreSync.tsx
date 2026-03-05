'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { createClient } from '@/lib/supabase/client';

const DEBOUNCE_MS = 2000;
const POLL_INTERVAL_MS = 5000; // Polling fallback every 5 seconds
const PERSISTED_KEYS = ['tournaments', 'cashGames', 'displays', 'themes', 'sound', 'displayToggles', 'defaultThemeId', 'systemStyle', 'blindTemplates', 'tournamentPresets', 'cashPresets'] as const;

/**
 * StoreSync: Headless component that syncs Zustand store <-> Supabase org_store.
 * - Listens for auth state changes (SIGNED_IN / SIGNED_OUT)
 * - On auth: loads remote state and hydrates store
 * - On store change: debounced save to remote
 * - Subscribes to Supabase Realtime for cross-device sync
 * - Polling fallback for reliable cross-account sync
 * - Session guard: auto-signout if "remember me" was not checked
 */
export function StoreSync() {
  const isRemoteUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJson = useRef<string>('');
  const lastRemoteJson = useRef<string>('');
  const isAuthenticated = useRef(false);
  const initialLoadDone = useRef(false);
  const isLoading = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Save current state to Supabase
  const saveToRemote = useCallback(async (storeData: Record<string, unknown>) => {
    if (!isAuthenticated.current) return;

    const json = JSON.stringify(storeData);
    // Skip if nothing changed
    if (json === lastSavedJson.current) return;
    lastSavedJson.current = json;
    lastRemoteJson.current = json;

    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_data: storeData }),
      });
      if (!res.ok) {
        console.error('[StoreSync] Save failed:', res.status);
      }
    } catch (err) {
      console.error('[StoreSync] Failed to save:', err);
    }
  }, []);

  // Load remote state and apply if changed
  const loadRemote = useCallback(async () => {
    if (isLoading.current) return;
    isLoading.current = true;

    try {
      const res = await fetch('/api/store');
      if (!res.ok) {
        console.error('[StoreSync] Load failed:', res.status);
        return;
      }
      const { store_data } = await res.json();

      if (store_data && typeof store_data === 'object' && Object.keys(store_data).length > 0) {
        const remoteJson = JSON.stringify(store_data);

        // Skip if data hasn't changed from what we know
        if (remoteJson === lastRemoteJson.current) return;
        lastRemoteJson.current = remoteJson;

        // Mark as remote update to skip saving it back
        isRemoteUpdate.current = true;
        useStore.getState()._hydrateFromRemote(store_data);
        lastSavedJson.current = remoteJson;
        // Wait a tick before clearing the flag
        setTimeout(() => { isRemoteUpdate.current = false; }, 100);
      } else if (!initialLoadDone.current) {
        // No remote data — save current local state as initial
        const currentState = useStore.getState()._getPersistedState();
        await saveToRemote(currentState);
      }
    } catch (err) {
      console.error('[StoreSync] Failed to load remote:', err);
    } finally {
      isLoading.current = false;
      initialLoadDone.current = true;
    }
  }, [saveToRemote]);

  // Session guard: auto-signout if "remember me" was NOT checked and browser was reopened
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const noRemember = localStorage.getItem('come-on-no-remember');
    const sessionActive = sessionStorage.getItem('come-on-session');

    if (noRemember === 'true' && !sessionActive) {
      // Browser was closed and reopened without "remember me" — sign out
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
        lastRemoteJson.current = '';
        isLoading.current = false;
        // Stop polling on sign out
        if (pollTimer.current) {
          clearInterval(pollTimer.current);
          pollTimer.current = null;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadRemote]);

  // Subscribe to store changes and debounce save
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      // Skip if this is a remote update (prevent echo)
      if (isRemoteUpdate.current) return;
      // Skip if initial load hasn't completed
      if (!initialLoadDone.current) return;
      // Skip if not authenticated
      if (!isAuthenticated.current) return;

      // Extract persisted state
      const persisted: Record<string, unknown> = {};
      for (const key of PERSISTED_KEYS) {
        persisted[key] = state[key];
      }

      // Debounce the save
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        saveToRemote(persisted);
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [saveToRemote]);

  // Subscribe to Supabase Realtime for cross-device sync
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('org_store_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'org_store',
        },
        (payload) => {
          const newData = payload.new as { store_data?: Record<string, unknown> };
          if (!newData.store_data) return;

          // Check if this change matches what we already have (echo suppression)
          const remoteJson = JSON.stringify(newData.store_data);
          if (remoteJson === lastRemoteJson.current) return;
          lastRemoteJson.current = remoteJson;

          // Apply remote changes
          isRemoteUpdate.current = true;
          useStore.getState()._hydrateFromRemote(newData.store_data);
          lastSavedJson.current = remoteJson;
          setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Polling fallback: periodically fetch remote state for reliable cross-account sync
  // This ensures sync works even if Supabase Realtime is not enabled for the table
  useEffect(() => {
    // Start polling after initial load
    const startPolling = () => {
      if (pollTimer.current) return;
      pollTimer.current = setInterval(() => {
        if (!isAuthenticated.current || !initialLoadDone.current) return;
        // Only poll if not currently saving (avoid conflicts)
        if (isLoading.current) return;

        fetch('/api/store')
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (!data?.store_data) return;
            const remoteJson = JSON.stringify(data.store_data);

            // Skip if data hasn't changed
            if (remoteJson === lastRemoteJson.current) return;
            lastRemoteJson.current = remoteJson;

            // Apply remote changes
            isRemoteUpdate.current = true;
            useStore.getState()._hydrateFromRemote(data.store_data);
            lastSavedJson.current = remoteJson;
            setTimeout(() => { isRemoteUpdate.current = false; }, 100);
          })
          .catch(() => { /* ignore polling errors */ });
      }, POLL_INTERVAL_MS);
    };

    // Wait a bit after mount for initial load to complete, then start polling
    const initTimer = setTimeout(startPolling, 3000);

    return () => {
      clearTimeout(initTimer);
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, []);

  // Render nothing — headless component
  return null;
}
