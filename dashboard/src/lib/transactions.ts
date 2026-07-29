import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { DashboardTransaction } from '../types';

export async function getTransactions(userId: string, startDate: string, endDate: string): Promise<DashboardTransaction[]> {
  const start = Timestamp.fromDate(new Date(`${startDate}T00:00:00+07:00`));
  const end = Timestamp.fromDate(new Date(`${endDate}T23:59:59.999+07:00`));
  const [expenseSnapshot, incomeSnapshot] = await Promise.all([
    getDocs(query(collection(firestore, 'expenses'), where('telegramUserId', '==', userId))),
    getDocs(query(collection(firestore, 'income'), where('telegramUserId', '==', userId))),
  ]);

  const expenses = expenseSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      return { id: doc.id, type: 'expense' as const, amount: data.amount, category: data.category, label: data.merchant, note: data.note ?? '', createdAt: data.createdAt };
    })
    .filter((e) => e.createdAt.toMillis() >= start.toMillis() && e.createdAt.toMillis() <= end.toMillis());

  const income = incomeSnapshot.docs
    .map((doc) => {
      const data = doc.data();
      return { id: doc.id, type: 'income' as const, amount: data.amount, category: data.source, label: data.source, note: data.note ?? '', createdAt: data.createdAt };
    })
    .filter((e) => e.createdAt.toMillis() >= start.toMillis() && e.createdAt.toMillis() <= end.toMillis());

  return [...expenses, ...income].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}
