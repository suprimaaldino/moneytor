import 'dotenv/config';

const [webhookUrl] = process.argv.slice(2);
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!webhookUrl || !token || !secret) {
  throw new Error('Usage: npx tsx scripts/setWebhook.ts https://your-deployment.vercel.app/api/webhook');
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ url: webhookUrl, secret_token: secret }),
});

if (!response.ok) throw new Error(`Telegram setWebhook failed with status ${response.status}`);
console.log('Telegram webhook configured.');
