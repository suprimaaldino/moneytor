import { db } from './firestore.js';
import type { IncomeRecord } from '../types/index.js';
import { getWibMonth } from '../utils/dateHelpers.js';

const collection = db.collection('income');

export async function createIncome(data: Omit<IncomeRecord, 'id'>): Promise<string> {
  const ref = await collection.add(data);
  return ref.id;
}

export async function getIncomeThisMonth(userId: string): Promise<IncomeRecord[]> {
  const snapshot = await collection.where('telegramUserId', '==', userId).where('month', '==', getWibMonth()).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as IncomeRecord));
}
