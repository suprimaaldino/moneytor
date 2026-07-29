import type { Context } from 'grammy';

export async function startCommand(ctx: Context): Promise<void> {
  await ctx.reply('Halo! Saya Moneytor. Kirim catatan seperti "Makan ayam 35000" atau gunakan /income 5000000 gaji. Gunakan /today, /month, /undo, dan /edit untuk mengelola catatan.');
}
