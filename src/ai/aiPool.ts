import {
  getKeyState,
  incrementKeyUsage,
  resetKeyIfNewDay,
} from '../db/keyPoolState.js';
import {
  AI_PROVIDER,
  OPENROUTER_MODEL,
  AI_MAX_DAILY_REQUESTS,
  AI_RETRY_COUNT,
  AI_RETRY_DELAY_MS,
} from '../utils/constants.js';

export class AllKeysExhaustedError extends Error {
  constructor() {
    super('All API keys are exhausted for today');
    this.name = 'AllKeysExhaustedError';
  }
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class AIProviderPool {
  private readonly keys: string[];
  private activeIndex = 0;

  constructor(keys: string[]) {
    this.keys = keys.map((k) => k.trim()).filter(Boolean);
    if (this.keys.length === 0) this.keys.push('__empty__');
  }

  async callWithFailover(prompt: string): Promise<string> {
    for (let attempts = 0; attempts < this.keys.length; attempts += 1) {
      const keyLabel = `key-${this.activeIndex}`;
      await resetKeyIfNewDay(keyLabel);
      const state = await getKeyState(keyLabel);

      if (state.requestCount >= AI_MAX_DAILY_REQUESTS) {
        this.moveToNextKey();
        continue;
      }

      for (let retry = 0; retry < AI_RETRY_COUNT; retry += 1) {
        try {
          const content = await this.callProvider(this.keys[this.activeIndex], prompt);
          await incrementKeyUsage(keyLabel);
          return content;
        } catch (error) {
          const delay = (retry + 1) * AI_RETRY_DELAY_MS;
          console.warn(`AI request failed (attempt ${retry + 1}/${AI_RETRY_COUNT}), retrying in ${delay}ms...`);
          if (error instanceof Error) console.error(error.message);
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      this.moveToNextKey();
    }

    throw new AllKeysExhaustedError();
  }

  private async callProvider(apiKey: string, prompt: string): Promise<string> {
    if (AI_PROVIDER === 'openrouter') {
      return this.callOpenRouter(apiKey, prompt);
    }
    throw new Error(`Unknown AI_PROVIDER: ${AI_PROVIDER}`);
  }

  private async callOpenRouter(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://moneytor.app',
        'X-Title': 'Moneytor Bot',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AIProviderError(
        `OpenRouter API error ${response.status}: ${body}`,
        response.status,
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content ?? '';
  }

  private moveToNextKey(): void {
    this.activeIndex = (this.activeIndex + 1) % this.keys.length;
  }
}
