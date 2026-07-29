# Moneytor Dashboard — Implementation Handoff

## Status

Dashboard monitoring sudah diimplementasikan secara lokal di folder `dashboard/`.

Fitur yang sudah tersedia:

- React + Vite dashboard.
- Google Login melalui Firebase Authentication.
- Linking akun Google ke Telegram memakai kode 6 angka.
- Command bot `/link` untuk membuat kode linking.
- Kode linking berlaku 10 menit dan hanya dapat dipakai sekali.
- Firebase Custom Claim `telegramUserId` setelah linking berhasil.
- Firestore Rules read-only untuk expense dan income milik user terkait.
- Ringkasan pemasukan, pengeluaran, net, dan jumlah transaksi.
- Filter tanggal.
- Breakdown pengeluaran per kategori.
- Tabel transaksi gabungan expense/income.
- Responsive layout desktop dan mobile.
- Unit test utility summary.
- CI/CD Vercel dashboard terpisah.

## Struktur Utama

```text
dashboard/
├── api/link.ts                 # Endpoint linking Google user dengan kode Telegram
├── src/
│   ├── App.tsx                 # Login, linking, dashboard, filter, table
│   ├── main.tsx
│   ├── styles.css
│   ├── types.ts
│   ├── vite-env.d.ts
│   └── lib/
│       ├── firebase.ts         # Firebase Web SDK
│       ├── linkAccount.ts      # Request linking ke API
│       ├── summary.ts          # Kalkulasi summary yang dapat dites
│       ├── summary.test.ts
│       └── transactions.ts     # Query expense dan income
├── .env.example
├── package.json
├── package-lock.json
└── vite.config.ts

src/db/accountLinks.ts          # Generator kode linking untuk bot
src/bot/commands/link.ts        # Command Telegram /link
firestore.rules                 # Security Rules dashboard
firebase.json                   # Konfigurasi Firebase Rules
.firebaserc                     # Project Firebase moneytor-c13dc
```

## Arsitektur Linking

1. User mengirim `/link` ke bot Telegram.
2. Bot membuat dokumen `link_codes/{code}`:

```text
{
  telegramUserId: string,
  expiresAt: Timestamp,
  used: boolean
}
```

3. User login ke dashboard dengan Google.
4. User memasukkan kode 6 angka.
5. `dashboard/api/link.ts` memverifikasi Firebase ID token.
6. Endpoint memakai Firebase Admin untuk:
   - memastikan kode valid dan belum expired;
   - menandai kode sebagai `used`;
   - membuat `account_links/{firebaseUid}`;
   - menambahkan custom claim `telegramUserId` ke Firebase user.
7. Dashboard refreshes ID token lalu membaca transaksi milik Telegram user tersebut.

## Firestore Collections

Collection yang sudah digunakan bot:

- `expenses`
- `income`
- `merchant_cache`
- `key_pool_state`

Collection dashboard:

- `link_codes`
- `account_links`

Transaksi dashboard bersifat read-only. Write tetap dilakukan oleh bot atau backend Admin SDK.

## Environment Variables Dashboard

Isi di Vercel project dashboard berdasarkan `dashboard/.env.example`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=moneytor-c13dc
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=moneytor-c13dc
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

`VITE_*` adalah konfigurasi Firebase Web dan boleh tersedia di browser. `FIREBASE_PRIVATE_KEY` hanya boleh berada di server/Vercel Environment Variables dan tidak boleh masuk bundle frontend.

Pastikan private key yang digunakan adalah key baru yang sudah di-rotate, bukan key yang pernah dikirim ke chat.

## Firebase Configuration

1. Firebase Console → Authentication → Sign-in method.
2. Aktifkan provider **Google**.
3. Tambahkan domain dashboard Vercel ke Authentication → Settings → Authorized domains.
4. Deploy Firestore Rules:

```bash
firebase deploy --only firestore:rules
```

Rules saat ini:

- User unauthenticated tidak dapat membaca transaksi.
- User hanya dapat membaca dokumen dengan `telegramUserId` sesuai custom claim.
- Client tidak dapat menulis `expenses` atau `income`.
- `link_codes` tidak dapat dibaca client.
- `merchant_cache` dan `key_pool_state` tidak dapat dibaca client.

## Vercel Dashboard Project

Buat project Vercel kedua untuk dashboard dengan:

- Repository yang sama.
- Root Directory: `dashboard`.
- Framework Preset: Vite atau Other dengan auto-detection.
- Build Command: `npm run build`.
- Output Directory: `dist`.
- Install Command: `npm ci`.

Dashboard project membutuhkan environment variables dashboard di atas.

## GitHub Actions Secrets

Workflow `.github/workflows/deploy.yml` sekarang memiliki dua job:

- Bot project:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
- Dashboard project:
  - `DASHBOARD_VERCEL_TOKEN`
  - `DASHBOARD_VERCEL_ORG_ID`
  - `DASHBOARD_VERCEL_PROJECT_ID`

Setiap push ke `main` menjalankan lint, test, build, dan deploy untuk bot serta dashboard.

## Verifikasi Lokal

Backend:

```bash
npm install
npm run lint
npm test
npm run build
```

Dashboard:

```bash
cd dashboard
npm install
npm run lint
npm test
npm run build
```

## Manual Acceptance Test

1. Deploy Firestore Rules.
2. Jalankan bot dengan credential baru.
3. Kirim `/link` ke bot.
4. Buka dashboard dan login dengan Google.
5. Masukkan kode 6 angka dari bot.
6. Pastikan dashboard menampilkan transaksi milik Telegram user tersebut.
7. Coba login dengan akun Google lain; akun tersebut tidak boleh melihat transaksi.
8. Kirim transaksi baru melalui Telegram.
9. Refresh atau ubah filter tanggal; transaksi baru harus muncul.
10. Coba kode yang sama untuk kedua kalinya; harus ditolak.
11. Tunggu lebih dari 10 menit atau gunakan kode lama; harus ditolak.
12. Pastikan mobile viewport tidak menghasilkan horizontal scroll.

## Pekerjaan Berikutnya

Bagian ini adalah checklist yang belum selesai dan harus dilanjutkan oleh AI agent berikutnya.

### Konfigurasi Firebase manual

- [ ] Pastikan Firebase Web App sudah dibuat di project `moneytor-c13dc`.
- [ ] Pastikan 6 variable `VITE_*` sudah diisi di Vercel project `moneytor-dashboard` untuk environment Production.
- [ ] Aktifkan Firebase Authentication → Sign-in method → Google.
- [ ] Tambahkan domain Vercel dashboard ke Firebase Authentication → Settings → Authorized domains.
- [ ] Pastikan `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, dan `FIREBASE_PRIVATE_KEY` sudah diisi di Vercel project dashboard.
- [ ] Pastikan private key yang digunakan adalah key baru yang sudah di-rotate.
- [ ] Jalankan `firebase deploy --only firestore:rules` dari root repository.

### Konfigurasi Vercel dan GitHub

- [ ] Buat atau pastikan project Vercel kedua bernama `moneytor-dashboard` memakai repository yang sama.
- [ ] Set Root Directory project dashboard ke `dashboard`.
- [ ] Tambahkan GitHub Secrets berikut:
  - [ ] `DASHBOARD_VERCEL_TOKEN`
  - [ ] `DASHBOARD_VERCEL_ORG_ID`
  - [ ] `DASHBOARD_VERCEL_PROJECT_ID`
- [ ] Pastikan secrets bot tetap tersedia:
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`
- [ ] Push perubahan ke branch `main`.
- [ ] Pastikan kedua job di GitHub Actions berhasil:
  - [ ] `verify-and-deploy`
  - [ ] `verify-and-deploy-dashboard`

### Verifikasi end-to-end

- [ ] Buka URL production dashboard.
- [ ] Login menggunakan Google.
- [ ] Kirim `/link` ke bot Telegram.
- [ ] Masukkan kode 6 angka ke dashboard.
- [ ] Pastikan linking berhasil dan dashboard menampilkan transaksi Telegram user tersebut.
- [ ] Kirim transaksi baru lewat Telegram dan pastikan muncul setelah refresh/filter.
- [ ] Pastikan akun Google yang belum linking tidak dapat membaca transaksi.
- [ ] Pastikan kode linking yang sama ditolak pada penggunaan kedua.
- [ ] Pastikan kode expired ditolak.
- [ ] Uji dashboard pada mobile viewport.

### Verifikasi teknis yang masih perlu dilakukan

- [ ] Jalankan ulang perintah berikut dari root:

```bash
npm run lint
npm test
npm run build
```

- [ ] Jalankan ulang perintah berikut dari `dashboard/`:

```bash
npm run lint
npm test
npm run build
```

- [ ] Jika Firestore meminta composite index, buat index untuk query transaksi berdasarkan `telegramUserId` dan `createdAt`.
- [ ] Uji endpoint `dashboard/api/link.ts` pada deployment Vercel.
- [ ] Periksa log Vercel untuk error Firebase Admin atau custom claims.

### Pengembangan lanjutan, bukan blocker v1

- [ ] Tambahkan edit/delete transaksi dari dashboard.
- [ ] Tambahkan export CSV atau Google Sheets.
- [ ] Tambahkan perbandingan otomatis dengan periode sebelumnya.
- [ ] Tambahkan budget dan alert.
- [ ] Tambahkan onboarding multi-user umum.

## Batasan v1

Belum termasuk:

- Edit/delete transaksi dari dashboard.
- Export Google Sheets/CSV.
- Budget dan alert.
- OCR/foto.
- Multi-user onboarding umum selain mekanisme linking.
- Perbandingan otomatis dengan periode sebelumnya.
