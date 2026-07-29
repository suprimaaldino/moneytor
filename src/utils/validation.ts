import type {
  ExpenseCategory,
  IncomeCategory,
  ParsedTransaction,
  TransactionType,
} from '../types/index.js';

const expenseCategories: readonly ExpenseCategory[] = [
  'food', 'transport', 'bills', 'shopping', 'health',
  'entertainment', 'other', 'unclear',
];

const incomeCategories: readonly IncomeCategory[] = [
  'gaji', 'freelance', 'bonus', 'transfer', 'lainnya',
];

export function isValidTransactionType(value: unknown): value is TransactionType {
  return value === 'expense' || value === 'income';
}

export function isValidExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && expenseCategories.includes(value as ExpenseCategory);
}

export function isValidIncomeCategory(value: unknown): value is IncomeCategory {
  return typeof value === 'string' && incomeCategories.includes(value as IncomeCategory);
}

export function validateParsedTransaction(value: unknown): value is ParsedTransaction {
  if (!value || typeof value !== 'object') return false;
  const transaction = value as Record<string, unknown>;
  const validCategory = transaction.type === 'expense'
    ? isValidExpenseCategory(transaction.category)
    : isValidIncomeCategory(transaction.category);

  return isValidTransactionType(transaction.type)
    && (transaction.amount === null
      || (typeof transaction.amount === 'number'
        && Number.isFinite(transaction.amount)
        && transaction.amount > 0))
    && validCategory
    && typeof transaction.merchant === 'string'
    && typeof transaction.note === 'string'
    && typeof transaction.confidence === 'number'
    && Number.isFinite(transaction.confidence)
    && transaction.confidence >= 0
    && transaction.confidence <= 1;
}
