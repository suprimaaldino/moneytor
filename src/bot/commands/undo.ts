import type { Context, SessionFlavor } from 'grammy';
import { deleteLastExpense, hasLastExpense } from '../../db/expenses.js';
import type { ConversationSession } from '../messageHandler.js';

export async function undoCommand(ctx: Context & SessionFlavor<ConversationSession>): Promise<void> {
  if (ctx.session.confirmUndo) {
    ctx.session.confirmUndo = false;
    const deleted = await deleteLastExpense(String(ctx.from?.id ?? ''));
    await ctx.reply(deleted ? '✅ Catatan pengeluaran terakhir dihapus.' : 'Tidak ada pengeluaran yang bisa di-undo.');
    return;
  }

  const exists = await hasLastExpense(String(ctx.from?.id ?? ''));
  if (!exists) {
    await ctx.reply('Tidak ada pengeluaran yang bisa di-undo.');
    return;
  }

  ctx.session.confirmUndo = true;
  await ctx.reply('Kamu yakin ingin menghapus pengeluaran terakhir? Kirim /undo lagi untuk konfirmasi, atau /cancel untuk batal.');
}
