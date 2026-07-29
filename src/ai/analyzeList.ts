import { ANALYZE_LIST_PROMPT } from './prompts.js';
import type { GeminiKeyPool } from './geminiPool.js';

export async function analyzeExpenseList(
  text: string,
  pool: GeminiKeyPool,
): Promise<string> {
  try {
    const response = await pool.callWithFailover(`${ANALYZE_LIST_PROMPT}\n\n${text}`);
    return response.trim() || 'Wah, aku kurang paham nih daftarnya. Coba kirim satu-satu aja ya.';
  } catch {
    return 'Maaf, lagi error. Coba ulangi nanti ya.';
  }
}
