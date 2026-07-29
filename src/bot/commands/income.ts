import type { Context } from 'grammy';
import { createIncome } from '../../db/income.js';
import { getWibMonth } from '../../utils/dateHelpers.js';
import type { IncomeCategory } from '../../types/index.js';
import { Timestamp } from 'firebase-admin/firestore';

const categories: readonly IncomeCategory[] = ['gaji', 'freelance', 'bonus', 'transfer', 'lainnya'];

export async function incomeCommand(ctx: Context): Promise<void> {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  const [, amountText, source, ...noteParts] = (text ?? '').split(/\s+/);
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0 || !categories.includes(source as IncomeCategory)) {
    await ctx.reply('Format: /income 5000000 gaji bulanan');
    return;
  }
  await createIncome({ amount, source: source as IncomeCategory, note: noteParts.join(' '), month: getWibMonth(), createdAt: Timestamp.now(), telegramUserId: String(ctx.from?.id ?? '') });
  await ctx.reply(`✅ Pemasukan dicatat: Rp${amount} (${source})`);
}
