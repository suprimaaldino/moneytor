import type { Context } from 'grammy';
import { deleteLastExpense } from '../../db/expenses.js';

export async function undoCommand(ctx: Context): Promise<void> {
  const deleted = await deleteLastExpense(String(ctx.from?.id ?? ''));
  await ctx.reply(deleted ? '✅ Catatan pengeluaran terakhir dihapus.' : 'Tidak ada pengeluaran yang bisa di-undo.');
}
