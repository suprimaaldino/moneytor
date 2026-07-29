# IMPLEMENTATION.md — Moneytor

> Instruksi ini ditulis untuk dieksekusi oleh AI coding agent (Claude Code, Cursor, dll)
> di dalam VS Code. Ikuti task secara berurutan. Jangan lompat task kecuali diminta.
> Setelah menyelesaikan tiap task, verifikasi Definition of Done sebelum lanjut ke task berikutnya.
> Jangan tampilkan/print API key atau secret apa pun ke console log atau commit ke git.

---

## 0. Project Overview

**Nama:** Moneytor
**Fungsi:** Bot Telegram pencatat keuangan personal. User ketik pengeluaran/pemasukan
dalam bahasa natural (Indonesia/Inggris), AI (Gemini) mengekstrak jadi data terstruktur,
disimpan ke Firestore. Ada command untuk rekap harian/bulanan.

**Stack final (tidak dapat diubah tanpa instruksi eksplisit):**
- Runtime: Node.js + TypeScript
- Bot framework: `grammy`
- AI: Google Gemini API (`@google/generative-ai`), dengan key pool rotation (5 API key)
- Database: Firestore (`firebase-admin`)
- Hosting: Vercel (webhook mode, serverless function) + Firebase (Firestore only, bukan Functions)
- Package manager: npm

**Yang TIDAK dibangun di iterasi ini** (jangan tambahkan kecuali diminta):
- Tidak ada OCR/vision/foto processing
- Tidak ada dashboard web (Next.js) — itu iterasi terpisah nanti
- Tidak ada budget alert, export, atau search command
- Tidak ada testing E2E (Playwright) — cukup unit test untuk fungsi parsing

---

## 1. Struktur Folder Target

```
moneytor/
├── api/
│   └── webhook.ts              # Vercel serverless function — entry point Telegram webhook
├── src/
│   ├── bot/
│   │   ├── index.ts             # Setup grammy bot instance + command handlers
│   │   ├── commands/
│   │   │   ├── start.ts
│   │   │   ├── today.ts
│   │   │   ├── month.ts
│   │   │   ├── undo.ts
│   │   │   ├── edit.ts
│   │   │   └── income.ts
│   │   └── messageHandler.ts    # Handler untuk free-text message (bukan command)
│   ├── ai/
│   │   ├── geminiPool.ts        # Key pool + failover logic
│   │   ├── parseTransaction.ts  # Panggil Gemini, parse response jadi TypeScript object
│   │   └── prompts.ts           # System prompt sebagai constant string
│   ├── db/
│   │   ├── firestore.ts         # Init firebase-admin
│   │   ├── expenses.ts          # CRUD functions untuk collection `expenses`
│   │   ├── income.ts            # CRUD functions untuk collection `income`
│   │   ├── merchantCache.ts     # CRUD functions untuk collection `merchant_cache`
│   │   └── keyPoolState.ts      # Baca/tulis state rotasi API key ke Firestore
│   ├── types/
│   │   └── index.ts             # Semua TypeScript interface/type di sini
│   └── utils/
│       ├── dateHelpers.ts       # Helper timezone WIB vs Pacific (untuk reset kuota)
│       └── validation.ts        # Validasi hasil parsing AI (amount masuk akal, dll)
├── tests/
│   └── parseTransaction.test.ts
├── .env.example
├── .env                          # JANGAN commit, sudah di .gitignore
├── .gitignore
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

---

## 2. Environment Variables

Buat `.env.example` (template, aman di-commit) dan `.env` (isi asli, JANGAN commit):

```
# Telegram
TELEGRAM_BOT_TOKEN=

# Gemini API keys — 5 akun berbeda, dipisah koma, TANPA spasi
GEMINI_API_KEYS=key1,key2,key3,key4,key5

# Firebase Admin SDK (dari service account JSON)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Webhook secret (untuk verifikasi request dari Telegram ke Vercel)
TELEGRAM_WEBHOOK_SECRET=
```

Pastikan `.gitignore` berisi minimal:
```
node_modules/
.env
.vercel
*.log
```

---

## Task 1 — Project Scaffolding

**Instruksi:**
1. Inisialisasi project npm dengan TypeScript.
2. Install dependencies:
   ```
   npm install grammy firebase-admin @google/generative-ai dotenv
   npm install -D typescript @types/node tsx vitest
   ```
3. Buat `tsconfig.json` dengan target ES2022, module NodeNext, strict mode aktif.
4. Buat seluruh struktur folder kosong sesuai section 1 di atas.
5. Buat `.env.example` dan `.gitignore` sesuai section 2.
6. Buat `package.json` scripts:
   ```json
   {
     "scripts": {
       "dev": "tsx watch src/bot/index.ts",
       "build": "tsc",
       "test": "vitest run"
     }
   }
   ```

**Definition of Done:**
- [ ] `npm install` berjalan tanpa error
- [ ] Struktur folder sesuai section 1
- [ ] `.env` ada di `.gitignore`, `.env.example` ter-commit dengan key kosong

---

## Task 2 — Types & Constants

**Instruksi:**
Buat `src/types/index.ts` berisi interface berikut (jangan ubah nama field, dipakai konsisten di semua file lain):

```typescript
export type TransactionType = 'expense' | 'income';

export type ExpenseCategory =
  | 'food' | 'transport' | 'bills' | 'shopping'
  | 'health' | 'entertainment' | 'other' | 'unclear';

export type IncomeCategory =
  | 'gaji' | 'freelance' | 'bonus' | 'transfer' | 'lainnya';

export interface ParsedTransaction {
  type: TransactionType;
  amount: number | null;
  category: string;
  merchant: string;
  note: string;
  confidence: number;
}

export interface ExpenseRecord {
  id?: string;
  amount: number;
  merchant: string;
  category: ExpenseCategory;
  note: string;
  createdAt: FirebaseFirestore.Timestamp;
  source: 'telegram_text';
  confidence: number;
  needsReview: boolean;
  telegramUserId: string;
}

export interface IncomeRecord {
  id?: string;
  amount: number;
  source: IncomeCategory;
  note: string;
  createdAt: FirebaseFirestore.Timestamp;
  month: string; // format "2026-07"
  telegramUserId: string;
}

export interface MerchantCacheRecord {
  merchant: string;
  defaultCategory: ExpenseCategory;
  hitCount: number;
}

export interface KeyPoolState {
  keyLabel: string;
  requestCount: number;
  lastReset: string; // format "2026-07-29", tanggal Pacific Time
}
```

**Definition of Done:**
- [ ] File `src/types/index.ts` ada dan sesuai di atas
- [ ] `npm run build` tidak error terkait types ini

---

## Task 3 — Gemini Prompt & Parsing Logic

**Instruksi:**

1. Buat `src/ai/prompts.ts`:
```typescript
export const TRANSACTION_PARSE_PROMPT = `Kamu adalah parser keuangan personal. Ekstrak informasi dari teks pesan pengguna (Bahasa Indonesia atau Inggris) menjadi JSON. Balas HANYA JSON, tanpa penjelasan tambahan, tanpa markdown code block.

Pertama tentukan "type": apakah ini PENGELUARAN ("expense") atau PEMASUKAN ("income")?
Kata kunci income: "terima", "gaji", "dapat transfer", "masuk", "bonus", "cair", "honor".
Kalau tidak jelas, asumsikan "expense".

Kategori expense yang valid HANYA salah satu dari:
["food", "transport", "bills", "shopping", "health", "entertainment", "other"]

Kategori income yang valid HANYA salah satu dari:
["gaji", "freelance", "bonus", "transfer", "lainnya"]

Format output (JSON only, no markdown):
{
  "type": "expense" | "income",
  "amount": number | null,
  "category": string,
  "merchant": string,
  "note": string,
  "confidence": number
}

Kalau amount tidak ditemukan, set amount: null dan confidence: 0.
Kalau teks tidak terlihat seperti catatan keuangan, set category: "unclear" dan confidence: 0.

Contoh:
Input: "Makan ayam geprek 35000"
Output: {"type": "expense", "amount": 35000, "category": "food", "merchant": "ayam geprek", "note": "makan siang", "confidence": 0.95}

Input: "Terima gaji 5000000"
Output: {"type": "income", "amount": 5000000, "category": "gaji", "merchant": "", "note": "gaji bulanan", "confidence": 0.95}

Teks user: `;
```

2. Buat `src/ai/geminiPool.ts` — implementasikan class `GeminiKeyPool` dengan:
   - Constructor menerima `string[]` dari `GEMINI_API_KEYS.split(',')`
   - Method `callWithFailover(prompt: string): Promise<string>` yang:
     - Cek state key aktif dari Firestore (`src/db/keyPoolState.ts`)
     - Reset counter kalau tanggal Pacific sudah berganti (pakai `src/utils/dateHelpers.ts`)
     - Kalau `requestCount >= 1400`, pindah ke key berikutnya (index + 1 mod length)
     - Panggil Gemini API (`gemini-flash-lite` model) dengan key aktif
     - Kalau dapat error rate limit (HTTP 429), tandai key itu sebagai exhausted untuk hari ini, pindah ke key berikutnya, retry
     - Kalau semua key exhausted, throw error khusus `AllKeysExhaustedError`
     - Increment `requestCount` di Firestore setelah call sukses

3. Buat `src/ai/parseTransaction.ts`:
   - Fungsi `parseTransaction(text: string, pool: GeminiKeyPool): Promise<ParsedTransaction>`
   - Gabungkan `TRANSACTION_PARSE_PROMPT + text`, panggil `pool.callWithFailover(...)`
   - Parse response sebagai JSON (strip markdown code fence kalau ada, Gemini kadang membungkus dengan ```json)
   - Validasi hasil pakai `src/utils/validation.ts` (amount harus number positif atau null, category harus salah satu dari enum yang valid, confidence 0-1)
   - Kalau parsing/validasi gagal total → return object dengan `confidence: 0, category: 'unclear'` (jangan throw, biar bot tetap bisa tanya balik ke user)

**Definition of Done:**
- [ ] Test manual: panggil `parseTransaction("Makan ayam geprek 35000", pool)` menghasilkan object dengan `type: 'expense', amount: 35000, category: 'food'`
- [ ] Test manual: panggil `parseTransaction("Terima gaji 5000000", pool)` menghasilkan `type: 'income'`
- [ ] Simulasi key habis (set `requestCount` manual ke 1400+ di Firestore) → pool otomatis pindah key tanpa error ke user

---

## Task 4 — Firestore Layer

**Instruksi:**

1. `src/db/firestore.ts` — init `firebase-admin` pakai env vars, export `db` instance (Firestore).

2. `src/db/expenses.ts`:
   - `createExpense(data: Omit<ExpenseRecord, 'id'>): Promise<string>` — return document ID
   - `getExpensesToday(telegramUserId: string): Promise<ExpenseRecord[]>`
   - `getExpensesThisMonth(telegramUserId: string): Promise<ExpenseRecord[]>`
   - `deleteLastExpense(telegramUserId: string): Promise<boolean>` — untuk `/undo`
   - `updateLastExpense(telegramUserId: string, updates: Partial<ExpenseRecord>): Promise<boolean>` — untuk `/edit`

3. `src/db/income.ts` — pola sama seperti expenses.ts tapi untuk collection `income`:
   - `createIncome(data: Omit<IncomeRecord, 'id'>): Promise<string>`
   - `getIncomeThisMonth(telegramUserId: string): Promise<IncomeRecord[]>`

4. `src/db/merchantCache.ts`:
   - `getCachedCategory(merchant: string): Promise<ExpenseCategory | null>`
   - `upsertMerchantCache(merchant: string, category: ExpenseCategory): Promise<void>` — increment `hitCount` kalau sudah ada, buat baru kalau belum

5. `src/db/keyPoolState.ts`:
   - `getKeyState(keyLabel: string): Promise<KeyPoolState>`
   - `incrementKeyUsage(keyLabel: string): Promise<void>`
   - `resetKeyIfNewDay(keyLabel: string): Promise<void>`

**Definition of Done:**
- [ ] Semua fungsi di atas ada dan ter-export
- [ ] Manual test: `createExpense` menyimpan dokumen ke Firestore console, bisa dilihat di Firebase Console
- [ ] `getExpensesToday` hanya mengembalikan data hari ini (filter by `createdAt`, bukan semua data)

---

## Task 5 — Bot Commands

**Instruksi:** buat tiap file command di `src/bot/commands/`:

- **`start.ts`**: balas pesan onboarding singkat, jelaskan cara pakai (contoh: "Makan ayam 35000" atau "/income 5000000 gaji")
- **`today.ts`**: panggil `getExpensesToday`, hitung total, kirim rekap format:
  ```
  📊 Pengeluaran Hari Ini
  Total: Rp{total}

  - {merchant}: Rp{amount} ({category})
  - ...
  ```
- **`month.ts`**: panggil `getExpensesThisMonth` + `getIncomeThisMonth`, kelompokkan expense per kategori, hitung net (income - expense), format:
  ```
  📅 Rekap Bulan Ini

  Pemasukan: Rp{totalIncome}
  Pengeluaran: Rp{totalExpense}
  Net: Rp{net} {emoji surplus/defisit}

  Per kategori:
  - food: Rp{x}
  - transport: Rp{x}
  ...
  ```
- **`undo.ts`**: panggil `deleteLastExpense`, balas konfirmasi atau pesan kalau tidak ada yang bisa di-undo
- **`edit.ts`**: minta user kirim field yang mau diubah (format sederhana dulu: `/edit amount 40000` atau `/edit category transport`), panggil `updateLastExpense`
- **`income.ts`**: parse argument command (`/income 5000000 gaji bulanan`), kalau format tidak sesuai, minta user ulang dengan contoh format yang benar

**Definition of Done:**
- [ ] Semua command terdaftar di `src/bot/index.ts`
- [ ] Test manual tiap command di Telegram (setelah Task 7 selesai / bot bisa jalan lokal)

---

## Task 6 — Message Handler (Free Text, Non-Command)

**Instruksi:**
Buat `src/bot/messageHandler.ts`:

1. Terima pesan teks biasa (bukan command).
2. Cek dulu apakah merchant (kata kunci utama dari teks) sudah ada di `merchant_cache` dengan `hitCount >= 3` → kalau ya, skip panggil AI, langsung buat expense record dengan kategori dari cache, `confidence: 1.0`.
3. Kalau tidak ada di cache atau `hitCount < 3` → panggil `parseTransaction`.
4. Logika keputusan setelah dapat hasil parsing:
   - `confidence >= 0.8` dan `amount !== null` → simpan ke `expenses` atau `income` collection sesuai `type`, balas konfirmasi:
     ```
     ✅ Dicatat: {merchant/source} - Rp{amount} ({category})
     ```
     Kalau `type === 'expense'`, panggil juga `upsertMerchantCache`.
   - `confidence < 0.8` atau `amount === null` → jangan simpan dulu, balas pertanyaan klarifikasi (contoh: "Berapa nominalnya, kak?" kalau amount null, atau "Kategorinya apa nih — food/transport/bills/shopping/health/entertainment/other?" kalau category unclear)
5. Simpan state percakapan sementara (misal pakai grammy session) untuk menangani jawaban lanjutan dari user atas pertanyaan klarifikasi.

**Definition of Done:**
- [ ] Kirim "Makan ayam geprek 35000" ke bot → tersimpan otomatis, dapat balasan konfirmasi
- [ ] Kirim "abis makan tadi" (tanpa angka) → bot tanya balik nominal, BUKAN langsung tersimpan
- [ ] Kirim merchant yang sama 3x berturut-turut → percobaan ke-4 tidak memanggil Gemini API (cek dari log/counter tidak bertambah)

---

## Task 7 — Vercel Webhook Entry Point

**Instruksi:**

1. Buat `api/webhook.ts` (Vercel serverless function convention):
   - Import bot instance dari `src/bot/index.ts`
   - Verifikasi request menggunakan `TELEGRAM_WEBHOOK_SECRET` (header `X-Telegram-Bot-Api-Secret-Token`)
   - Gunakan `grammy` webhook adapter untuk Vercel/Node (`grammy` punya built-in adapter, cek dokumentasi `grammy` untuk `https://grammy.dev/hosting/vercel`)
   - Return response 200 secepat mungkin setelah menerima update (Telegram butuh cepat, proses async di background kalau perlu)

2. Buat `vercel.json`:
   ```json
   {
     "functions": {
       "api/webhook.ts": {
         "maxDuration": 10
       }
     }
   }
   ```

3. Buat script untuk set webhook URL ke Telegram (jalankan sekali setelah deploy):
   ```typescript
   // scripts/setWebhook.ts
   // Panggil Telegram API setWebhook dengan URL Vercel deployment + secret token
   ```

**Definition of Done:**
- [ ] Deploy ke Vercel berhasil tanpa error build
- [ ] Environment variables sudah di-set di Vercel dashboard (bukan hanya `.env` lokal)
- [ ] Setelah `scripts/setWebhook.ts` dijalankan, kirim pesan ke bot Telegram dan dapat balasan (end-to-end test)

---

## Task 8 — Unit Tests (Minimal, Bukan E2E)

**Instruksi:**
Buat `tests/parseTransaction.test.ts` pakai `vitest`:
- Test validasi format response Gemini (mock response, bukan panggil API asli)
- Test bahwa `amount: null` menghasilkan `confidence: 0`
- Test bahwa category di luar enum yang valid di-reject oleh `validation.ts`
- Test bahwa key pool berpindah ke key berikutnya saat `requestCount >= 1400`

**Definition of Done:**
- [ ] `npm run test` semua pass
- [ ] Tidak ada test yang memanggil Gemini API asli (harus di-mock)

---

## Task 9 — README & Handoff

**Instruksi:**
Buat `README.md` berisi:
1. Cara setup `.env` (link ke mana dapat tiap value)
2. Cara run lokal (`npm run dev`)
3. Cara deploy ke Vercel (`vercel --prod`)
4. Cara set webhook setelah deploy
5. Daftar command yang tersedia di bot

**Definition of Done:**
- [ ] Orang lain (atau kamu sendiri 3 bulan lagi) bisa setup ulang dari nol hanya dengan baca README ini

---

## Urutan Eksekusi

Jalankan task 1 → 9 secara berurutan. Setiap selesai satu task, laporkan Definition of Done mana yang sudah terverifikasi sebelum lanjut ke task berikutnya. Jangan mulai Task 7 (deploy) sebelum Task 1-6 selesai dan sudah diuji jalan lokal dengan `npm run dev` + Telegram bot dalam mode polling sementara (boleh pakai polling untuk development, baru pindah ke webhook di Task 7 untuk production).
