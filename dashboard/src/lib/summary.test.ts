import { describe, expect, it } from 'vitest';
import { calculateSummary } from './summary';

describe('calculateSummary', () => {
  it('calculates income, expense, net, and categories', () => {
    const summary = calculateSummary([
      { id: '1', type: 'income', amount: 5000000, category: 'gaji', label: 'gaji', note: '', createdAt: { toMillis: () => 1 } } as never,
      { id: '2', type: 'expense', amount: 35000, category: 'food', label: 'makan', note: '', createdAt: { toMillis: () => 2 } } as never,
      { id: '3', type: 'expense', amount: 25000, category: 'transport', label: 'grab', note: '', createdAt: { toMillis: () => 3 } } as never,
    ]);
    expect(summary).toEqual({ totalIncome: 5000000, totalExpense: 60000, net: 4940000, byCategory: { food: 35000, transport: 25000 } });
  });
});
