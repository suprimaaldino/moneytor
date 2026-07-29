import 'dotenv/config';
import { Bot, session, type Context, type SessionFlavor } from 'grammy';
import { GeminiKeyPool } from '../ai/geminiPool.js';
import { createMessageHandler, type ConversationSession } from './messageHandler.js';
import { startCommand } from './commands/start.js';
import { todayCommand } from './commands/today.js';
import { monthCommand } from './commands/month.js';
import { undoCommand } from './commands/undo.js';
import { editCommand } from './commands/edit.js';
import { incomeCommand } from './commands/income.js';
import { linkCommand } from './commands/link.js';

if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

type BotContext = Context & SessionFlavor<ConversationSession>;
export const bot = new Bot<BotContext>(process.env.TELEGRAM_BOT_TOKEN);
const keys = (process.env.GEMINI_API_KEYS ?? '').split(',');
export const geminiPool = new GeminiKeyPool(keys);

bot.use(session({ initial: (): ConversationSession => ({}) }));
bot.command('start', startCommand);
bot.command('today', todayCommand);
bot.command('month', monthCommand);
bot.command('undo', undoCommand);
bot.command('edit', editCommand);
bot.command('income', incomeCommand);
bot.command('link', linkCommand);
bot.on('message:text', createMessageHandler(geminiPool));

if (process.env.NODE_ENV !== 'production') {
  console.log('Bot Moneytor is starting in polling mode...');
  bot.start()
    .then(() => console.log('Bot stopped polling.'))
    .catch((error) => console.error('Bot polling failed:', error));
} else {
  console.log('Bot is in production mode (webhook). Polling skipped.');
}

