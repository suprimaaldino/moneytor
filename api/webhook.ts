import { createHash, timingSafeEqual } from 'node:crypto';
import { webhookCallback } from 'grammy';
import { bot } from '../src/bot/index.js';

function safeSecretMatch(expected: string, received: string): boolean {
  const a = createHash('sha256').update(expected).digest();
  const b = createHash('sha256').update(received).digest();
  return timingSafeEqual(a, b);
}

type VercelRequest = {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  end: () => void;
};

const handler = webhookCallback(bot, 'http');

export default async function webhook(req: VercelRequest, res: VercelResponse): Promise<void> {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const header = req.headers['x-telegram-bot-api-secret-token'];
  const received = Array.isArray(header) ? header[0] : header;
  if (!expected || !received || !safeSecretMatch(expected, received)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  await handler(req as never, res as never);
}
