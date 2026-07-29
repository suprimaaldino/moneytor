# Panduan Penggunaan Bot Moneytor

Moneytor adalah bot Telegram untuk mencatat pemasukan dan pengeluaran secara otomatis.

## Memulai

1. Buka bot Moneytor di Telegram.
2. Kirim `/start`.
3. Kirim transaksi dalam Bahasa Indonesia atau Inggris.

Contoh:

```text
Makan ayam geprek 35000
Naik grab 25000
Bayar listrik 300000
Terima gaji 5000000
```

Bot akan membaca nominal, kategori, dan keterangan lalu mengirim konfirmasi.

## Mencatat pengeluaran

Kirim pesan biasa dengan nominal:

```text
Makan siang 45000
Beli obat 75000
Belanja bulanan 850000
Nonton bioskop 100000
```

Kategori pengeluaran yang digunakan:

- `food`
- `transport`
- `bills`
- `shopping`
- `health`
- `entertainment`
- `other`

## Mencatat pemasukan

Gunakan format:

```text
/income NOMINAL KATEGORI KETERANGAN
```

Contoh:

```text
/income 5000000 gaji gaji bulan Juli
/income 1500000 freelance proyek website
/income 500000 bonus tahunan
/income 250000 transfer dari teman
```

Kategori pemasukan:

- `gaji`
- `freelance`
- `bonus`
- `transfer`
- `lainnya`

## Melihat laporan

### Laporan hari ini

```text
/today
```

Menampilkan semua pengeluaran hari ini dan totalnya.

### Laporan bulan ini

```text
/month
```

Menampilkan:

- Total pemasukan
- Total pengeluaran
- Net bulan berjalan
- Pengeluaran berdasarkan kategori

## Mengubah atau menghapus transaksi

### Membatalkan transaksi terakhir

```text
/undo
```

Perintah ini menghapus pengeluaran terakhir yang tercatat. Saat ini `/undo` hanya berlaku untuk pengeluaran.

### Mengubah transaksi terakhir

Ubah nominal:

```text
/edit amount 40000
```

Ubah kategori:

```text
/edit category transport
```

## Jika nominal atau kategori tidak jelas

Jika mengirim pesan tanpa nominal, bot akan bertanya ulang.

```text
abis makan tadi
```

Balas dengan nominal, misalnya:

```text
35000
```

Jika kategori tidak jelas, bot akan meminta kategori yang valid.

## Tips penggunaan

- Selalu sertakan nominal dalam pesan transaksi.
- Gunakan angka tanpa simbol mata uang, misalnya `35000`.
- Gunakan `/today` dan `/month` secara berkala untuk memantau keuangan.
- Hindari mengirim data rahasia seperti password, API key, atau private key ke bot.
