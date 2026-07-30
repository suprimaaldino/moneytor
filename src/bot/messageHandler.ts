import { createHash } from 'node:crypto';
import type { Context, SessionFlavor } from 'grammy';
import { createExpense } from '../db/expenses.js';
import { createIncome } from '../db/income.js';
import { getCachedCategory, upsertMerchantCache } from '../db/merchantCache.js';
import { analyzeExpenseList } from '../ai/analyzeList.js';
import { parseTransaction } from '../ai/parseTransaction.js';
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

function amountFromText(text: string): number {
  return Number(text.match(/\d[\d.,]*/)?.[0]?.replace(/[.,]/g, '') ?? 0);
}

function clampAmount(parsed: number, text: string): number {
  const raw = amountFromText(text);
  if (raw <= 0) return parsed;
  if (parsed <= 0) return raw;
  return Math.abs(parsed - raw) <= raw * 0.5 ? parsed : raw;
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
      const merchants = lines.map(merchantFromText);
      const cached = await Promise.all(merchants.map(getCachedCategory));

      async function parseLine(line: string, m: string, cc: string | null): Promise<ParsedTransaction> {
        const rawAmount = amountFromText(line);
        if (cc) {
          return { type: 'expense' as const, amount: rawAmount, category: cc, merchant: m, note: line, confidence: 1 };
        }
        const first = await parseTransaction(line, pool);
        const safeAmount = first.amount ? clampAmount(first.amount, line) : rawAmount;
        if (safeAmount > 0 && first.confidence >= 0.5 && first.category !== 'unclear') {
          return { ...first, amount: safeAmount };
        }
        const second = await parseTransaction(line, pool);
        const safeAmount2 = second.amount ? clampAmount(second.amount, line) : rawAmount;
        return { ...second, amount: safeAmount2 };
      }

      const parsedResults = await Promise.all(
        lines.map((line, i) => parseLine(line, merchants[i], cached[i])),
      );

      let totalAmount = 0;
      const catCount = new Map<string, number>();
      const failed: { line: string; i: number }[] = [];

      for (let i = 0; i < parsedResults.length; i++) {
        const parsed = parsedResults[i];
        if (parsed.amount === null || parsed.amount <= 0 || parsed.confidence < 0.5 || parsed.category === 'unclear') {
          failed.push({ line: lines[i], i });
          continue;
        }

        totalAmount += parsed.amount;
        if (parsed.type === 'income') {
          await createIncome({
            amount: parsed.amount,
            source: parsed.category as IncomeCategory,
            note: parsed.note || parsed.merchant,
            createdAt: Timestamp.now(),
            month: getWibMonth(),
            telegramUserId: userId,
          });
          catCount.set(parsed.category, (catCount.get(parsed.category) ?? 0) + 1);
        } else {
          const m = parsed.merchant || merchants[i] || 'Pengeluaran';
          await createExpense({
            amount: parsed.amount,
            merchant: m,
            category: parsed.category as ExpenseCategory,
            note: parsed.note || m,
            createdAt: Timestamp.now(),
            source: 'telegram_text',
            confidence: parsed.confidence,
            needsReview: false,
            telegramUserId: userId,
          });
          await upsertMerchantCache(m, parsed.category as ExpenseCategory);
          catCount.set(parsed.category, (catCount.get(parsed.category) ?? 0) + 1);
        }
      }

      const successCount = [...catCount.values()].reduce((a, b) => a + b, 0);
      if (successCount > 0) {
        const breakdown = [...catCount.entries()].map(([cat, n]) => `${cat}:${n}`).join(' | ');
        let reply = `✅ ${successCount} transaksi | Rp${totalAmount.toLocaleString('id-ID')}\n${breakdown}`;
        if (failed.length > 0) {
          reply += `\n\n❌ ${failed.length} gagal diparse:\n${failed.map(f => f.line).join('\n')}`;
        }
        await ctx.reply(reply);

        ctx.session.lastInputHash = h;
        ctx.session.lastTotalAmount = totalAmount;
        ctx.session.lastItemCount = successCount;
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
    let parsed: ParsedTransaction;
    if (cachedCategory) {
      parsed = { type: 'expense' as const, amount: amountFromText(input), category: cachedCategory, merchant, note: input, confidence: 1 };
    } else {
      const p = await parseTransaction(input, pool);
      parsed = { ...p, amount: p.amount ? clampAmount(p.amount, input) : amountFromText(input) };
    }

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
