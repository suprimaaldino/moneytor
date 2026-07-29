import { webhookCallback } from 'grammy';
import { bot } from '../src/bot/index.js';

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
  const received = req.headers['x-telegram-bot-api-secret-token'];
  if (!expected || received !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  await handler(req as never, res as never);
}
