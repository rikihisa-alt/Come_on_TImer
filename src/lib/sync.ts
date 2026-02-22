import { SyncMessage, SyncMessageType } from './types';

const CHANNEL_NAME = 'come-on-timer-sync';
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!channel) {
    try { channel = new BroadcastChannel(CHANNEL_NAME); } catch { return null; }
  }
  return channel;
}

export function broadcast(type: SyncMessageType, payload: unknown) {
  const ch = getChannel();
  if (!ch) return;
  const msg: SyncMessage = { type, payload, timestamp: Date.now() };
  ch.postMessage(msg);
}

export function onSync(callback: (msg: SyncMessage) => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};
  const handler = (e: MessageEvent<SyncMessage>) => {
    if (e.data?.type && e.data?.timestamp) callback(e.data);
  };
  ch.addEventListener('message', handler);
  return () => ch.removeEventListener('message', handler);
}
