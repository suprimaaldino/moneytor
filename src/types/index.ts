import type { Timestamp } from 'firebase-admin/firestore';

export type TransactionType = 'expense' | 'income';

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'bills'
  | 'shopping'
  | 'health'
  | 'entertainment'
  | 'other'
  | 'unclear';

export type IncomeCategory =
  | 'gaji'
  | 'freelance'
  | 'bonus'
  | 'transfer'
  | 'lainnya';

export interface ParsedTransaction {
  type: TransactionType;
  amount: number | null;
  category: string;
  merchant: string;
  note: string;
  confidence: number;
}

export interface ExpenseRecord {
  id?: string;
  amount: number;
  merchant: string;
  category: ExpenseCategory;
  note: string;
  createdAt: Timestamp;
  source: 'telegram_text';
  confidence: number;
  needsReview: boolean;
  telegramUserId: string;
}

export interface IncomeRecord {
  id?: string;
  amount: number;
  source: IncomeCategory;
  note: string;
  createdAt: Timestamp;
  month: string;
  telegramUserId: string;
}

export interface MerchantCacheRecord {
  merchant: string;
  defaultCategory: ExpenseCategory;
  hitCount: number;
}

export interface KeyPoolState {
  keyLabel: string;
  requestCount: number;
  lastReset: string;
}
