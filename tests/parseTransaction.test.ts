import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseMultiTransactions, parseTransaction } from '../src/ai/parseTransaction.js';
import { validateParsedTransaction, isValidExpenseCategory } from '../src/utils/validation.js';

describe('parseTransaction', () => {
  it('parses a valid Gemini response', async () => {
    const pool = { callWithFailover: vi.fn().mockResolvedValue('{"type":"expense","amount":35000,"category":"food","merchant":"ayam geprek","note":"makan","confidence":0.95}') };
    await expect(parseTransaction('Makan ayam geprek 35000', pool as never)).resolves.toMatchObject({ type: 'expense', amount: 35000, category: 'food' });
  });

  it('rejects a missing amount as fallback', async () => {
    const pool = { callWithFailover: vi.fn().mockResolvedValue('{"type":"expense","amount":null,"category":"food","merchant":"ayam","note":"","confidence":0}') };
    await expect(parseTransaction('abis makan tadi', pool as never)).resolves.toMatchObject({ amount: null, confidence: 0, category: 'food' });
  });

  it('rejects categories outside the valid enum', () => {
    expect(isValidExpenseCategory('invalid')).toBe(false);
    expect(validateParsedTransaction({ type: 'expense', amount: 1000, category: 'invalid', merchant: '', note: '', confidence: 1 })).toBe(false);
  });

  it('parses multi-line batch transaction response', async () => {
    const json = JSON.stringify([
      { type: 'expense', amount: 5900000, category: 'bills', merchant: 'Bayar cicilan rumah', note: '', confidence: 0.95 },
      { type: 'expense', amount: 2500000, category: 'bills', merchant: 'Bayar Indodana', note: '', confidence: 0.95 },
    ]);
    const pool = { callWithFailover: vi.fn().mockResolvedValue(json) };
    const res = await parseMultiTransactions('Catat pengeluaran berikut:\nBayar cicilan rumah 5900000\nBayar Indodana 2500000', pool as never);
    expect(res).toHaveLength(2);
    expect(res[0]).toMatchObject({ amount: 5900000, merchant: 'Bayar cicilan rumah' });
    expect(res[1]).toMatchObject({ amount: 2500000, merchant: 'Bayar Indodana' });
  });
});


describe('GeminiKeyPool', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('moves to the next key at the request threshold', async () => {
    let active = 'key-0';
    vi.doMock('../src/db/keyPoolState.js', () => ({
      resetKeyIfNewDay: vi.fn(),
      getKeyState: vi.fn(async (label: string) => ({ keyLabel: label, requestCount: label === active ? 5000 : 0, lastReset: '2026-07-29' })),
      incrementKeyUsage: vi.fn(),
    }));

    const mockFetch = vi.fn(async (url: string, options: Record<string, unknown>) => {
      const body = JSON.parse(options.body as string);
      if (body.messages[0].content === 'success') {
        active = 'key-1';
        return { ok: true, json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }) };
      }
      return { ok: false, status: 500, text: async () => 'error' };
    });
    vi.stubGlobal('fetch', mockFetch);

    const { GeminiKeyPool } = await import('../src/ai/geminiPool.js');
    const pool = new GeminiKeyPool(['one', 'two']);
    await expect(pool.callWithFailover('success')).resolves.toBe('{"ok":true}');
    expect(active).toBe('key-1');
  });
});
