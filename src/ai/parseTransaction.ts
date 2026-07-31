import type { ParsedTransaction } from '../types/index.js';
import { BATCH_TRANSACTION_PARSE_PROMPT, TRANSACTION_PARSE_PROMPT } from './prompts.js';
import { validateParsedTransaction } from '../utils/validation.js';
import type { AIProviderPool } from './aiPool.js';

const fallback: ParsedTransaction = {
  type: 'expense',
  amount: null,
  category: 'unclear',
  merchant: '',
  note: '',
  confidence: 0,
};

function extractJson(response: string, isArray: boolean): string {
  const pattern = isArray ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = response.match(pattern);
  if (match) return match[0];
  return response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

export async function parseTransaction(
  text: string,
  pool: AIProviderPool,
): Promise<ParsedTransaction> {
  try {
    const response = await pool.callWithFailover(`${TRANSACTION_PARSE_PROMPT}${text}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(response, false));
    } catch (parseError) {
      console.error('parseTransaction JSON parse failed. Raw AI response:', response);
      throw parseError;
    }
    return validateParsedTransaction(parsed) ? parsed : fallback;
  } catch (error) {
    console.error('parseTransaction error:', error);
    return fallback;
  }
}

export async function parseMultiTransactions(
  text: string,
  pool: AIProviderPool,
): Promise<ParsedTransaction[]> {
  try {
    const response = await pool.callWithFailover(`${BATCH_TRANSACTION_PARSE_PROMPT}${text}`);
    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(response, true));
    } catch (parseError) {
      console.error('parseMultiTransactions JSON parse failed. Raw AI response:', response);
      throw parseError;
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validateParsedTransaction);
  } catch (error) {
    console.error('parseMultiTransactions error:', error);
    return [];
  }
}



