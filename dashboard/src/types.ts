import type { Timestamp } from 'firebase/firestore';

export type ExpenseCategory = 'food' | 'transport' | 'bills' | 'shopping' | 'health' | 'entertainment' | 'other' | 'unclear';
export type IncomeCategory = 'gaji' | 'freelance' | 'bonus' | 'transfer' | 'lainnya';

export interface DashboardTransaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  label: string;
  note: string;
  createdAt: Timestamp;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  net: number;
  byCategory: Record<string, number>;
}
