import { createHash } from 'node:crypto';
import type { Context, SessionFlavor } from 'grammy';
import { createExpense } from '../db/expenses.js';
import { createIncome } from '../db/income.js';
import { getCachedCategory, upsertMerchantCache } from '../db/merchantCache.js';
import { analyzeExpenseList } from '../ai/analyzeList.js';
import { parseMultiTransactions, parseTransaction } from '../ai/parseTransaction.js';
import type { GeminiKeyPool } from '../ai/geminiPool.js';
import type { ExpenseCategory, IncomeCategory, ParsedTransaction } from '../types/index.js';
import { getWibMonth } from '../utils/dateHelpers.js';
import { Timestamp } from 'firebase-admin/firestore';

export interface ConversationSession {
  pendingText?: string;
  lastInputHash?: string;
  lastTotalAmount?: number;
  lastItemCount?: number;
}

function merchantFromText(text: string): string {
  return text.replace(/\d[\d.,]*/g, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 4).join(' ');
}

function hashInput(text: string): string {
  return createHash('md5').update(text).digest('hex');
}

export function createMessageHandler(pool: GeminiKeyPool) {
  return async (ctx: Context & SessionFlavor<ConversationSession>): Promise<void> => {
    const text = ctx.message && 'text' in ctx.message ? (ctx.message.text ?? '').trim() : '';
    if (!text) return;
    const userId = String(ctx.from?.id ?? '');
    const input = ctx.session.pendingText ? `${ctx.session.pendingText} ${text}` : text;
    ctx.session.pendingText = undefined;

    const h = hashInput(input);
    if (h === ctx.session.lastInputHash) {
      const total = ctx.session.lastTotalAmount ?? 0;
      const count = ctx.session.lastItemCount ?? 0;
      await ctx.reply(`✅ Udah dicatat sebelumnya: ${count} item, Rp${total.toLocaleString('id-ID')}`);
      return;
    }

    const lines = input.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      const multiParsed = await parseMultiTransactions(input, pool);
      const validItems = multiParsed.filter(
        (t): t is ParsedTransaction & { amount: number } =>
          t.amount !== null && t.amount > 0 && t.confidence >= 0.5 && t.category !== 'unclear'
      );

      if (validItems.length > 0) {
        let totalAmount = 0;
        const catCount = new Map<string, number>();

        for (const item of validItems) {
          totalAmount += item.amount;
          if (item.type === 'income') {
            await createIncome({
              amount: item.amount,
              source: item.category as IncomeCategory,
              note: item.note || item.merchant,
              createdAt: Timestamp.now(),
              month: getWibMonth(),
              telegramUserId: userId,
            });
            catCount.set(item.category, (catCount.get(item.category) ?? 0) + 1);
          } else {
            const m = item.merchant || 'Pengeluaran';
            await createExpense({
              amount: item.amount,
              merchant: m,
              category: item.category as ExpenseCategory,
              note: item.note || m,
              createdAt: Timestamp.now(),
              source: 'telegram_text',
              confidence: item.confidence,
              needsReview: false,
              telegramUserId: userId,
            });
            await upsertMerchantCache(m, item.category as ExpenseCategory);
            catCount.set(item.category, (catCount.get(item.category) ?? 0) + 1);
          }
        }

        const breakdown = [...catCount.entries()].map(([cat, n]) => `${cat}:${n}`).join(' | ');
        await ctx.reply(`✅ ${validItems.length} transaksi | Rp${totalAmount.toLocaleString('id-ID')}\n${breakdown}`);

        ctx.session.lastInputHash = h;
        ctx.session.lastTotalAmount = totalAmount;
        ctx.session.lastItemCount = validItems.length;
        return;
      }

      if (lines.length > 3) {
        const analysis = await analyzeExpenseList(input, pool);
        await ctx.reply(analysis);
        ctx.session.lastInputHash = h;
        return;
      }
    }

    const merchant = merchantFromText(input);
    const cachedCategory = await getCachedCategory(merchant);
    const parsed = cachedCategory
      ? { type: 'expense' as const, amount: Number(input.match(/\d[\d.,]*/)?.[0]?.replace(/[.,]/g, '') ?? 0), category: cachedCategory, merchant, note: input, confidence: 1 }
      : await parseTransaction(input, pool);

    if (parsed.amount === null) {
      if (lines.length > 3) {
        const analysis = await analyzeExpenseList(input, pool);
        await ctx.reply(analysis);
      } else {
        ctx.session.pendingText = input;
        await ctx.reply('Berapa nominalnya, kak?');
      }
      return;
    }
    if (parsed.confidence < 0.8 || parsed.category === 'unclear') {
      ctx.session.pendingText = input;
      await ctx.reply('Kategorinya apa nih — food/transport/bills/shopping/health/entertainment/other?');
      return;
    }

    if (parsed.type === 'income') {
      await createIncome({ amount: parsed.amount, source: parsed.category as IncomeCategory, note: parsed.note, createdAt: Timestamp.now(), month: getWibMonth(), telegramUserId: userId });
      await ctx.reply(`✅ ${parsed.category} Rp${parsed.amount}`);
      return;
    }
    await createExpense({ amount: parsed.amount, merchant: parsed.merchant || merchant, category: parsed.category as ExpenseCategory, note: parsed.note, createdAt: Timestamp.now(), source: 'telegram_text', confidence: parsed.confidence, needsReview: false, telegramUserId: userId });
    await upsertMerchantCache(parsed.merchant || merchant, parsed.category as ExpenseCategory);
    await ctx.reply(`✅ ${parsed.merchant || merchant} Rp${parsed.amount} (${parsed.category})`);
  };
}
