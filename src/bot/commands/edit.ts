import type { Context } from 'grammy';
import { updateLastExpense } from '../../db/expenses.js';
import { isValidExpenseCategory } from '../../utils/validation.js';

export async function editCommand(ctx: Context): Promise<void> {
  const args = ctx.message && 'text' in ctx.message ? (ctx.message.text ?? '').split(/\s+/).slice(1) : [];
  const [field, value] = args;
  if (!field || !value || (field !== 'amount' && field !== 'category') || (field === 'amount' && (!Number.isFinite(Number(value)) || Number(value) <= 0)) || (field === 'category' && !isValidExpenseCategory(value))) {
    await ctx.reply('Format: /edit amount 40000 atau /edit category transport');
    return;
  }
  const updates = field === 'amount' ? { amount: Number(value) } : { category: value as never };
  const updated = await updateLastExpense(String(ctx.from?.id ?? ''), updates);
  await ctx.reply(updated ? '✅ Catatan terakhir diperbarui.' : 'Tidak ada pengeluaran untuk diedit.');
}
