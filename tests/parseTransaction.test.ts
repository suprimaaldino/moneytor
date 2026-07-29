import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseTransaction } from '../src/ai/parseTransaction.js';
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
});

describe('GeminiKeyPool', () => {
  beforeEach(() => vi.resetModules());

  it('moves to the next key at the request threshold', async () => {
    let active = 'key-0';
    vi.doMock('../src/db/keyPoolState.js', () => ({
      resetKeyIfNewDay: vi.fn(),
      getKeyState: vi.fn(async (label: string) => ({ keyLabel: label, requestCount: label === active ? 1400 : 0, lastReset: '2026-07-29' })),
      incrementKeyUsage: vi.fn(),
    }));
    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: class {
        getGenerativeModel() { return { generateContent: async () => ({ response: { text: () => { active = 'key-1'; return '{"ok":true}'; } } }) }; }
      },
    }));
    const { GeminiKeyPool } = await import('../src/ai/geminiPool.js');
    const pool = new GeminiKeyPool(['one', 'two']);
    await expect(pool.callWithFailover('test')).resolves.toBe('{"ok":true}');
    expect(active).toBe('key-1');
  });
});
