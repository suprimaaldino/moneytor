import type { Context, SessionFlavor } from 'grammy';
import type { ConversationSession } from '../messageHandler.js';

export async function cancelCommand(ctx: Context & SessionFlavor<ConversationSession>): Promise<void> {
  const hadPending = Boolean(ctx.session.pendingText || ctx.session.confirmUndo);
  ctx.session.pendingText = undefined;
  ctx.session.confirmUndo = false;
  await ctx.reply(hadPending ? 'Oke, dibatalkan.' : 'Tidak ada proses yang sedang berjalan.');
}
