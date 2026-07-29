import { ANALYZE_LIST_PROMPT } from './prompts.js';
import { AllKeysExhaustedError, type GeminiKeyPool } from './geminiPool.js';

export async function analyzeExpenseList(
  text: string,
  pool: GeminiKeyPool,
): Promise<string> {
  try {
    const response = await pool.callWithFailover(`${ANALYZE_LIST_PROMPT}\n\n${text}`);
    return response.trim() || 'Wah, aku kurang paham nih daftarnya. Coba kirim satu-satu aja ya.';
  } catch (error) {
    if (error instanceof AllKeysExhaustedError) {
      return 'Maaf, kuota AI hari ini habis. Coba lagi besok ya.';
    }
    console.error('analyzeExpenseList error:', error);
    return 'Maaf, lagi error. Coba ulangi nanti ya.';
  }
}
