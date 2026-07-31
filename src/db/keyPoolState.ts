import { db } from './firestore.js';
import type { KeyPoolState } from '../types/index.js';
import { getWibDate } from '../utils/dateHelpers.js';

const collection = db.collection('key_pool_state');

export async function getKeyState(keyLabel: string): Promise<KeyPoolState> {
  const ref = collection.doc(keyLabel);
  const snapshot = await ref.get();
  if (snapshot.exists) return snapshot.data() as KeyPoolState;
  const state: KeyPoolState = { keyLabel, requestCount: 0, lastReset: getWibDate() };
  await ref.set(state);
  return state;
}

export async function incrementKeyUsage(keyLabel: string): Promise<void> {
  await db.runTransaction(async (transaction) => {
    const ref = collection.doc(keyLabel);
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists ? (snapshot.data() as KeyPoolState) : { keyLabel, requestCount: 0, lastReset: getWibDate() };
    transaction.set(ref, { ...current, requestCount: current.requestCount + 1 });
  });
}

export async function resetKeyIfNewDay(keyLabel: string): Promise<void> {
  const state = await getKeyState(keyLabel);
  const today = getWibDate();
  if (state.lastReset !== today) {
    await collection.doc(keyLabel).set({ requestCount: 0, lastReset: today }, { merge: true });
  }
}
