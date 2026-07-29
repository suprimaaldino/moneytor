import { db } from './firestore.js';
import type { KeyPoolState } from '../types/index.js';
import { getPacificDate } from '../utils/dateHelpers.js';

const collection = db.collection('key_pool_state');

export async function getKeyState(keyLabel: string): Promise<KeyPoolState> {
  const ref = collection.doc(keyLabel);
  const snapshot = await ref.get();
  if (snapshot.exists) return snapshot.data() as KeyPoolState;
  const state: KeyPoolState = { keyLabel, requestCount: 0, lastReset: getPacificDate() };
  await ref.set(state);
  return state;
}

export async function incrementKeyUsage(keyLabel: string): Promise<void> {
  await collection.doc(keyLabel).set({ requestCount: (await getKeyState(keyLabel)).requestCount + 1 }, { merge: true });
}

export async function resetKeyIfNewDay(keyLabel: string): Promise<void> {
  const state = await getKeyState(keyLabel);
  const today = getPacificDate();
  if (state.lastReset !== today) {
    await collection.doc(keyLabel).set({ requestCount: 0, lastReset: today }, { merge: true });
  }
}
