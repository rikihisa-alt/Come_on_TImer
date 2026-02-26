'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, off, remove, Database, get } from 'firebase/database';

/* ── Firebase config (Vercel env vars or fallback) ── */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let db: Database | null = null;

function isConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId);
}

function getDb(): Database | null {
  if (!isConfigured()) return null;
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  if (!db) {
    db = getDatabase(app);
  }
  return db;
}

/* ── Room Code Generator ── */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoid confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/* ── Public API ── */

export function isFirebaseAvailable(): boolean {
  return isConfigured();
}

/** Create a new room and return the 4-char code */
export async function createRoom(): Promise<string | null> {
  const database = getDb();
  if (!database) return null;
  const code = generateRoomCode();
  const roomRef = ref(database, `rooms/${code}`);
  await set(roomRef, { createdAt: Date.now(), state: null });
  return code;
}

/** Check if room exists */
export async function roomExists(code: string): Promise<boolean> {
  const database = getDb();
  if (!database) return false;
  const roomRef = ref(database, `rooms/${code}`);
  const snapshot = await get(roomRef);
  return snapshot.exists();
}

/** Write state to a room */
export async function writeRoom(code: string, state: Record<string, unknown>): Promise<void> {
  const database = getDb();
  if (!database) return;
  const stateRef = ref(database, `rooms/${code}/state`);
  await set(stateRef, state);
}

/** Listen for state changes in a room */
export function onRoomChange(code: string, cb: (state: Record<string, unknown> | null) => void): () => void {
  const database = getDb();
  if (!database) return () => {};
  const stateRef = ref(database, `rooms/${code}/state`);
  const handler = onValue(stateRef, (snapshot) => {
    cb(snapshot.val() as Record<string, unknown> | null);
  });
  // Return unsubscribe
  return () => off(stateRef, 'value', handler);
}

/** Leave / destroy a room */
export async function destroyRoom(code: string): Promise<void> {
  const database = getDb();
  if (!database) return;
  const roomRef = ref(database, `rooms/${code}`);
  await remove(roomRef);
}
