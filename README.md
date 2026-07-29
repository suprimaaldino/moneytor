# Moneytor

Bot Telegram pencatat keuangan personal dengan Gemini dan Firestore.

## Setup

1. Install Node.js 20+ dan jalankan `npm install`.
2. Salin `.env.example` menjadi `.env`.
3. Isi nilai berikut:
   - `TELEGRAM_BOT_TOKEN`: buat bot melalui [@BotFather](https://t.me/BotFather).
   - `GEMINI_API_KEYS`: 6 API key dari [Google AI Studio](https://aistudio.google.com/apikey), dipisahkan koma tanpa spasi.
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: buat service account dari Firebase Console → Project settings → Service accounts.
   - `TELEGRAM_WEBHOOK_SECRET`: token acak untuk verifikasi webhook.
4. Jangan commit `.env` atau private key.

## Run lokal

```bash
npm run dev
```

Mode lokal memakai polling Telegram. Pastikan `NODE_ENV` tidak diset ke `production`.

## Test dan build

```bash
npm test
npm run build
```

## Deploy ke Vercel

```bash
vercel --prod
```

Tambahkan semua environment variable dari `.env` di Vercel Dashboard untuk environment Production. Setelah deploy:

```bash
npm run set-webhook -- https://NAMA-PROYEK.vercel.app/api/webhook
```

Perintah tersebut mengatur URL webhook dan secret token Telegram.

## CI/CD GitHub Actions

Workflow `.github/workflows/deploy.yml` otomatis berjalan setiap push ke branch `main`. Workflow akan menjalankan lint, test, build, lalu deploy ke Vercel production.

Tambahkan secrets berikut di GitHub Repository → Settings → Secrets and variables → Actions:

- `VERCEL_TOKEN`: token dari Vercel Account → Tokens
- `VERCEL_ORG_ID`: organization/team ID dari project Vercel
- `VERCEL_PROJECT_ID`: project ID dari Vercel

Environment variables aplikasi seperti Telegram, Gemini, Firebase, dan webhook secret tetap disimpan di Vercel Project Settings, bukan di GitHub.

## Command bot

- `/start` — onboarding
- `/today` — rekap pengeluaran hari ini
- `/month` — rekap pemasukan, pengeluaran, dan net bulan ini
- `/income 5000000 gaji bulanan` — catat pemasukan
- `/undo` — hapus pengeluaran terakhir
- `/edit amount 40000` atau `/edit category transport` — ubah pengeluaran terakhir

Pesan teks biasa juga diproses, misalnya `Makan ayam geprek 35000`.
