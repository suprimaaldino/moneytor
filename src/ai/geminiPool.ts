import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  getKeyState,
  incrementKeyUsage,
  resetKeyIfNewDay,
} from '../db/keyPoolState.js';

export class AllKeysExhaustedError extends Error {
  constructor() {
    super('All Gemini API keys are exhausted for today');
    this.name = 'AllKeysExhaustedError';
  }
}

export class GeminiKeyPool {
  private readonly keys: string[];
  private activeIndex = 0;

  constructor(keys: string[]) {
    this.keys = keys.map((key) => key.trim()).filter(Boolean);
    if (this.keys.length === 0) throw new Error('At least one Gemini API key is required');
  }

  async callWithFailover(prompt: string): Promise<string> {
    for (let attempts = 0; attempts < this.keys.length; attempts += 1) {
      const keyLabel = `key-${this.activeIndex}`;
      await resetKeyIfNewDay(keyLabel);
      const state = await getKeyState(keyLabel);

      if (state.requestCount >= 1400) {
        this.moveToNextKey();
        continue;
      }

      try {
        const client = new GoogleGenerativeAI(this.keys[this.activeIndex]);
        const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const result = await model.generateContent(prompt);
        await incrementKeyUsage(keyLabel);
        return result.response.text();
      } catch (error) {
        if (!this.isRateLimitError(error)) {
          console.error('callWithFailover error:', error);
          throw error;
        }
        this.moveToNextKey();
      }
    }

    throw new AllKeysExhaustedError();
  }

  private moveToNextKey(): void {
    this.activeIndex = (this.activeIndex + 1) % this.keys.length;
  }

  private isRateLimitError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { status?: number; message?: string };
    return candidate.status === 429 || candidate.message?.includes('429') === true;
  }
}
