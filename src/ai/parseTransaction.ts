import type { ParsedTransaction } from '../types/index.js';
import { TRANSACTION_PARSE_PROMPT } from './prompts.js';
import { validateParsedTransaction } from '../utils/validation.js';
import type { GeminiKeyPool } from './geminiPool.js';

const fallback: ParsedTransaction = {
  type: 'expense',
  amount: null,
  category: 'unclear',
  merchant: '',
  note: '',
  confidence: 0,
};

export async function parseTransaction(
  text: string,
  pool: GeminiKeyPool,
): Promise<ParsedTransaction> {
  try {
    const response = await pool.callWithFailover(`${TRANSACTION_PARSE_PROMPT}${text}`);
    const json = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed: unknown = JSON.parse(json);
    return validateParsedTransaction(parsed) ? parsed : fallback;
  } catch (error) {
    console.error('parseTransaction error:', error);
    return fallback;
  }
}
