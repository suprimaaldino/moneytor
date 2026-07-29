import type { Context } from 'grammy';
import { getExpensesToday } from '../../db/expenses.js';

export async function todayCommand(ctx: Context): Promise<void> {
  const userId = String(ctx.from?.id ?? '');
  const expenses = await getExpensesToday(userId);
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const lines = expenses.map((item) => `- ${item.merchant}: Rp${item.amount} (${item.category})`);
  await ctx.reply(`📊 Pengeluaran Hari Ini\nTotal: Rp${total}\n\n${lines.join('\n') || 'Belum ada pengeluaran.'}`);
}
