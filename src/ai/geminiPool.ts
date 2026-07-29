import {
  getKeyState,
  incrementKeyUsage,
  resetKeyIfNewDay,
} from '../db/keyPoolState.js';

export class AllKeysExhaustedError extends Error {
  constructor() {
    super('All API keys are exhausted for today');
    this.name = 'AllKeysExhaustedError';
  }
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'qwen3:4b';

export class GeminiKeyPool {
  private readonly keys: string[];
  private activeIndex = 0;

  constructor(keys: string[]) {
    this.keys = keys.map((key) => key.trim()).filter(Boolean);
    if (this.keys.length === 0) this.keys.push('ollama-local');
  }

  async callWithFailover(prompt: string): Promise<string> {
    for (let attempts = 0; attempts < this.keys.length; attempts += 1) {
      const keyLabel = `key-${this.activeIndex}`;
      await resetKeyIfNewDay(keyLabel);
      const state = await getKeyState(keyLabel);

      if (state.requestCount >= 5000) {
        this.moveToNextKey();
        continue;
      }

      for (let retry = 0; retry < 3; retry += 1) {
        try {
          const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: OLLAMA_MODEL,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.1,
              stream: false,
            }),
          });

          if (!response.ok) {
            throw new Error(`Ollama API error ${response.status}: ${await response.text()}`);
          }

          const data = (await response.json()) as {
            choices: Array<{ message: { content: string } }>;
          };
          await incrementKeyUsage(keyLabel);
          return data.choices[0]?.message?.content ?? '';
        } catch (error) {
          console.warn(`Ollama request failed (attempt ${retry + 1}), retrying in ${(retry + 1) * 2}s...`);
          console.error(error);
          await new Promise((r) => setTimeout(r, (retry + 1) * 2000));
        }
      }

      this.moveToNextKey();
    }

    throw new AllKeysExhaustedError();
  }

  private moveToNextKey(): void {
    this.activeIndex = (this.activeIndex + 1) % this.keys.length;
  }
}
