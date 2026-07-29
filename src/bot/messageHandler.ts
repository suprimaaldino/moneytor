import type { Context, SessionFlavor } from 'grammy';
import { createExpense } from '../db/expenses.js';
import { createIncome } from '../db/income.js';
import { getCachedCategory, upsertMerchantCache } from '../db/merchantCache.js';
import { parseTransaction } from '../ai/parseTransaction.js';
import type { GeminiKeyPool } from '../ai/geminiPool.js';
import type { ExpenseCategory, IncomeCategory } from '../types/index.js';
import { getWibMonth } from '../utils/dateHelpers.js';
import { Timestamp } from 'firebase-admin/firestore';

export interface ConversationSession {
  pendingText?: string;
}

function merchantFromText(text: string): string {
  return text.replace(/\d[\d.,]*/g, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 4).join(' ');
}

export function createMessageHandler(pool: GeminiKeyPool) {
  return async (ctx: Context & SessionFlavor<ConversationSession>): Promise<void> => {
    const text = ctx.message && 'text' in ctx.message ? (ctx.message.text ?? '').trim() : '';
    if (!text) return;
    const userId = String(ctx.from?.id ?? '');
    const input = ctx.session.pendingText ? `${ctx.session.pendingText} ${text}` : text;
    ctx.session.pendingText = undefined;
    const merchant = merchantFromText(input);
    const cachedCategory = await getCachedCategory(merchant);
    const parsed = cachedCategory
      ? { type: 'expense' as const, amount: Number(input.match(/\d[\d.,]*/)?.[0]?.replace(/[.,]/g, '') ?? 0), category: cachedCategory, merchant, note: input, confidence: 1 }
      : await parseTransaction(input, pool);

    if (parsed.amount === null) {
      ctx.session.pendingText = input;
      await ctx.reply('Berapa nominalnya, kak?');
      return;
    }
    if (parsed.confidence < 0.8 || parsed.category === 'unclear') {
      ctx.session.pendingText = input;
      await ctx.reply('Kategorinya apa nih — food/transport/bills/shopping/health/entertainment/other?');
      return;
    }

    if (parsed.type === 'income') {
      await createIncome({ amount: parsed.amount, source: parsed.category as IncomeCategory, note: parsed.note, createdAt: Timestamp.now(), month: getWibMonth(), telegramUserId: userId });
      await ctx.reply(`✅ Dicatat: ${parsed.category} - Rp${parsed.amount}`);
      return;
    }
    await createExpense({ amount: parsed.amount, merchant: parsed.merchant || merchant, category: parsed.category as ExpenseCategory, note: parsed.note, createdAt: Timestamp.now(), source: 'telegram_text', confidence: parsed.confidence, needsReview: false, telegramUserId: userId });
    await upsertMerchantCache(parsed.merchant || merchant, parsed.category as ExpenseCategory);
    await ctx.reply(`✅ Dicatat: ${parsed.merchant || merchant} - Rp${parsed.amount} (${parsed.category})`);
  };
}
