import type { Context } from 'grammy';
import { createTelegramLinkCode } from '../../db/accountLinks.js';

export async function linkCommand(ctx: Context): Promise<void> {
  const code = await createTelegramLinkCode(String(ctx.from?.id ?? ''));
  await ctx.reply(`Kode linking dashboard Anda: ${code}\nBerlaku 10 menit dan hanya dapat digunakan sekali.`);
}
