'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { createClient } from '@/lib/supabase/client';

const DEBOUNCE_MS = 2000;
const PERSISTED_KEYS = ['tournaments', 'cashGames', 'displays', 'themes', 'sound', 'displayToggles', 'defaultThemeId', 'systemStyle', 'blindTemplates', 'tournamentPresets', 'cashPresets'] as const;

/**
 * StoreSync: Headless component that syncs Zustand store ↔ Supabase org_store.
 * - On mount: loads remote state and hydrates store
 * - On store change: debounced save to remote
 * - Subscribes to Supabase Realtime for cross-device sync
 */
export function StoreSync() {
  const isRemoteUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJson = useRef<string>('');
  const isMounted = useRef(false);
  const initialLoadDone = useRef(false);

  // Save current state to Supabase
  const saveToRemote = useCallback(async (storeData: Record<string, unknown>) => {
    const json = JSON.stringify(storeData);
    // Skip if nothing changed
    if (json === lastSavedJson.current) return;
    lastSavedJson.current = json;

    try {
      await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_data: storeData }),
      });
    } catch (err) {
      console.error('[StoreSync] Failed to save:', err);
    }
  }, []);

  // Load remote state on mount
  useEffect(() => {
    if (isMounted.current) return;
    isMounted.current = true;

    const loadRemote = async () => {
      try {
        const res = await fetch('/api/store');
        if (!res.ok) return;
        const { store_data } = await res.json();

        if (store_data && typeof store_data === 'object' && Object.keys(store_data).length > 0) {
          // Mark as remote update to skip saving it back
          isRemoteUpdate.current = true;
          useStore.getState()._hydrateFromRemote(store_data);
          lastSavedJson.current = JSON.stringify(store_data);
          // Wait a tick before clearing the flag
          setTimeout(() => { isRemoteUpdate.current = false; }, 100);
        } else {
          // No remote data — save current local state as initial
          const currentState = useStore.getState()._getPersistedState();
          await saveToRemote(currentState);
        }
      } catch (err) {
        console.error('[StoreSync] Failed to load remote:', err);
      } finally {
        initialLoadDone.current = true;
      }
    };

    loadRemote();
  }, [saveToRemote]);

  // Subscribe to store changes and debounce save
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      // Skip if this is a remote update (prevent echo)
      if (isRemoteUpdate.current) return;
      // Skip if initial load hasn't completed
      if (!initialLoadDone.current) return;

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
          // Only apply if we didn't trigger this update
          const newData = payload.new as { store_data?: Record<string, unknown>; updated_by?: string };
          if (!newData.store_data) return;

          // Check if this change matches what we just saved (echo suppression)
          const remoteJson = JSON.stringify(newData.store_data);
          if (remoteJson === lastSavedJson.current) return;

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

  // Render nothing — headless component
  return null;
}
