# Dashboard UI Improvements — v1 Plan

## Goal

Improve dashboard UX dengan prioritas tinggi-effort rendah. Fokus pada perubahan frontend-only tanpa perlu backend/data baru.

---

## Task List

### 1. Greeting & User Info
- [ ] Tampilkan "Selamat Pagi/Siang/Sore/Malam" berdasarkan waktu
- [ ] Tampilkan display name (ambil dari `user.displayName`) bukan email
- [ ] Tampilkan email sebagai secondary text kecil
- [ ] Tampilkan avatar (dari `user.photoURL`)

### 2. Quick Action Buttons
- [ ] Tambah tombol aksi di bawah header:
  - Tambah Pemasukan
  - Tambah Pengeluaran
  - Ekspor CSV
  - Sync Telegram
- [ ] Tombol hanya UI (belum ada logic add/edit) — placeholder alert

### 3. Summary Cards Icons & Animation
- [ ] Tambah icon di tiap card (Pemasukan, Pengeluaran, Net, Transaksi)
- [ ] Animasi counter (number count-up)
- [ ] Persentase perubahan dengan panah ▲/▼ (sudah ada, refine UI)

### 4. Recent Transactions — Relative Time
- [ ] Ganti format tanggal jadi relative: "Hari ini", "Kemarin", "2 hari lalu", dll.

### 5. Search Transaksi
- [ ] Input search di atas tabel
- [ ] Filter real-time by: deskripsi, kategori, nominal, catatan

### 6. Dark Mode
- [ ] Toggle dark/light di header
- [ ] Semua warna pake CSS custom properties
- [ ] Simpan preferensi di localStorage

### 7. Empty States
- [ ] Ganti "Belum ada transaksi" dengan ilustrasi + tombol aksi
- [ ] Ganti "Belum ada pengeluaran" di breakdown dengan versi lebih menarik

### 8. Animasi & Polish
- [ ] Fade-in saat data loading selesai
- [ ] Hover effect di card
- [ ] Transisi smooth di filter/switch

---

## Non-goals (v2)

- Charts (income vs expense, cash flow, donut)
- AI Insight
- Budget & goals
- Financial health score
- Upcoming bills
- Heatmap
- FAB
- Full accessibility audit

---

## Teknis

Semua perubahan cukup di file:

- `dashboard/src/App.tsx`
- `dashboard/src/styles.css`

Tidak perlu ubah:

- Backend / API
- Firestore
- Firebase config
- Bot Telegram

Estimasi: **4-6 jam kerja** untuk semua 8 task.
