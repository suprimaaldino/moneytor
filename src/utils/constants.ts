export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
export const AI_PROVIDER = process.env.AI_PROVIDER ?? 'openrouter';
export const OPENROUTER_API_KEYS = process.env.OPENROUTER_API_KEYS ?? '';
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'inclusionai/ling-3.0-flash:free';
export const AI_API_KEYS = (process.env.OPENROUTER_API_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean);

export const AI_MAX_DAILY_REQUESTS = 5000;
export const AI_RETRY_COUNT = 3;
export const AI_RETRY_DELAY_MS = 2000;

export const MERCHANT_CACHE_MIN_HITS = 3;
export const CONFIDENCE_LOW_THRESHOLD = 0.5;
export const CONFIDENCE_HIGH_THRESHOLD = 0.8;

export const LINK_CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_BACKUPS = 8;
