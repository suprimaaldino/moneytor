import type { Context } from 'grammy';
import { getExpensesThisMonth } from '../../db/expenses.js';
import { getIncomeThisMonth } from '../../db/income.js';

export async function monthCommand(ctx: Context): Promise<void> {
  const userId = String(ctx.from?.id ?? '');
  const [expenses, income] = await Promise.all([getExpensesThisMonth(userId), getIncomeThisMonth(userId)]);
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const categories = new Map<string, number>();
  expenses.forEach((item) => categories.set(item.category, (categories.get(item.category) ?? 0) + item.amount));
  const categoryLines = [...categories].map(([category, total]) => `- ${category}: Rp${total}`);
  const net = totalIncome - totalExpense;
  await ctx.reply(`📅 Rekap Bulan Ini\n\nPemasukan: Rp${totalIncome}\nPengeluaran: Rp${totalExpense}\nNet: Rp${net} ${net >= 0 ? '✅' : '⚠️'}\n\nPer kategori:\n${categoryLines.join('\n') || '-'}`);
}
