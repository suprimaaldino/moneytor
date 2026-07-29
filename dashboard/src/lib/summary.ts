import type { DashboardSummary, DashboardTransaction } from '../types';

export function calculateSummary(transactions: DashboardTransaction[]): DashboardSummary {
  const summary: DashboardSummary = { totalIncome: 0, totalExpense: 0, net: 0, byCategory: {} };
  transactions.forEach((transaction) => {
    if (transaction.type === 'income') summary.totalIncome += transaction.amount;
    else {
      summary.totalExpense += transaction.amount;
      summary.byCategory[transaction.category] = (summary.byCategory[transaction.category] ?? 0) + transaction.amount;
    }
  });
  summary.net = summary.totalIncome - summary.totalExpense;
  return summary;
}
