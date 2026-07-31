import { db } from './firestore.js';
import type { StorageAdapter } from 'grammy';

const collection = db.collection('sessions');

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) out[key] = stripUndefined(item);
    }
    return out;
  }
  return value;
}

export class FirestoreSessionStore<T> implements StorageAdapter<T> {
  async read(key: string): Promise<T | undefined> {
    const doc = await collection.doc(key).get();
    if (!doc.exists) return undefined;
    const data = doc.data();
    return (data?.value as T) ?? undefined;
  }

  async write(key: string, value: T): Promise<void> {
    await collection.doc(key).set({ value: stripUndefined(value), updatedAt: Date.now() });
  }

  async delete(key: string): Promise<void> {
    await collection.doc(key).delete();
  }
}
