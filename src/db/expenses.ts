import { db } from './firestore.js';
import type { ExpenseRecord } from '../types/index.js';
import { getWibDayRange, getWibMonthRange } from '../utils/dateHelpers.js';

const collection = db.collection('expenses');

function records(snapshot: FirebaseFirestore.QuerySnapshot): ExpenseRecord[] {
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ExpenseRecord));
}

export async function createExpense(data: Omit<ExpenseRecord, 'id'>): Promise<string> {
  const ref = await collection.add(data);
  return ref.id;
}

async function getExpensesInRange(userId: string, start: Date, end: Date): Promise<ExpenseRecord[]> {
  const snapshot = await collection
    .where('telegramUserId', '==', userId)
    .where('createdAt', '>=', start)
    .where('createdAt', '<', end)
    .orderBy('createdAt', 'desc')
    .get();
  return records(snapshot);
}

export function getExpensesToday(userId: string): Promise<ExpenseRecord[]> {
  const { start, end } = getWibDayRange();
  return getExpensesInRange(userId, start, end);
}

export function getExpensesThisMonth(userId: string): Promise<ExpenseRecord[]> {
  const { start, end } = getWibMonthRange();
  return getExpensesInRange(userId, start, end);
}

export async function deleteLastExpense(userId: string): Promise<boolean> {
  const snapshot = await collection.where('telegramUserId', '==', userId).orderBy('createdAt', 'desc').limit(1).get();
  if (snapshot.empty) return false;
  await snapshot.docs[0].ref.delete();
  return true;
}

export async function updateLastExpense(userId: string, updates: Partial<ExpenseRecord>): Promise<boolean> {
  const snapshot = await collection.where('telegramUserId', '==', userId).orderBy('createdAt', 'desc').limit(1).get();
  if (snapshot.empty) return false;
  const safeUpdates = { ...updates };
  delete safeUpdates.id;
  delete safeUpdates.createdAt;
  delete safeUpdates.telegramUserId;
  await snapshot.docs[0].ref.update(safeUpdates);
  return true;
}
