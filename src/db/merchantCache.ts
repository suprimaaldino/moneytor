import { db } from './firestore.js';
import type { ExpenseCategory } from '../types/index.js';
import { MERCHANT_CACHE_MIN_HITS } from '../utils/constants.js';

const collection = db.collection('merchant_cache');

export async function getCachedCategory(merchant: string): Promise<ExpenseCategory | null> {
  const doc = await collection.doc(merchant.trim().toLowerCase()).get();
  if (!doc.exists) return null;
  const data = doc.data() as { defaultCategory?: ExpenseCategory; hitCount?: number };
  return data.hitCount && data.hitCount >= MERCHANT_CACHE_MIN_HITS ? data.defaultCategory ?? null : null;
}

export async function upsertMerchantCache(merchant: string, category: ExpenseCategory): Promise<void> {
  const ref = collection.doc(merchant.trim().toLowerCase());
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    const current = doc.exists ? doc.data() : undefined;
    transaction.set(ref, {
      merchant,
      defaultCategory: category,
      hitCount: (current?.hitCount ?? 0) + 1,
    });
  });
}
