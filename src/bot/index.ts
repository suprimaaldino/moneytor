import 'dotenv/config';
import { Bot, session, type Context, type SessionFlavor } from 'grammy';
import { FirestoreSessionStore } from '../db/sessionStore.js';
import { AIProviderPool } from '../ai/aiPool.js';
import { createMessageHandler, type ConversationSession } from './messageHandler.js';
import { startCommand } from './commands/start.js';
import { todayCommand } from './commands/today.js';
import { monthCommand } from './commands/month.js';
import { undoCommand } from './commands/undo.js';
import { editCommand } from './commands/edit.js';
import { incomeCommand } from './commands/income.js';
import { linkCommand } from './commands/link.js';
import { cancelCommand } from './commands/cancel.js';

import {
  TELEGRAM_BOT_TOKEN,
  AI_API_KEYS,
} from '../utils/constants.js';

if (!TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');

type BotContext = Context & SessionFlavor<ConversationSession>;
export const bot = new Bot<BotContext>(TELEGRAM_BOT_TOKEN);
export const geminiPool = new AIProviderPool(AI_API_KEYS);

bot.use(session({
  initial: (): ConversationSession => ({}),
  storage: new FirestoreSessionStore<ConversationSession>(),
}));
bot.command('start', startCommand);
bot.command('today', todayCommand);
bot.command('month', monthCommand);
bot.command('undo', undoCommand);
bot.command('edit', editCommand);
bot.command('income', incomeCommand);
bot.command('link', linkCommand);
bot.command('cancel', cancelCommand);
bot.on('message:text', createMessageHandler(geminiPool));

if (process.env.NODE_ENV !== 'production') {
  console.log('Bot Moneytor is starting in polling mode...');
  bot.start()
    .then(() => console.log('Bot stopped polling.'))
    .catch((error) => console.error('Bot polling failed:', error));
} else {
  console.log('Bot is in production mode (webhook). Polling skipped.');
}

