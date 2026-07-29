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
Output: {"type":"expense","amount":35000,"category":"food","merchant":"ayam geprek","note":"makan siang","confidence":0.95}

Input: "Terima gaji 5000000"
Output: {"type":"income","amount":5000000,"category":"gaji","merchant":"","note":"gaji bulanan","confidence":0.95}

Teks user: `;

export const BATCH_TRANSACTION_PARSE_PROMPT = `Kamu adalah parser keuangan personal. Ekstrak SEMUA item transaksi dari teks pengguna (Bahasa Indonesia atau Inggris) menjadi JSON Array. Balas HANYA JSON Array murni, tanpa teks salam, tanpa penjelasan, tanpa markdown code block.

Aturan parsing:
1. Abaikan baris judul/kalimat pembuka (seperti "Catat pengeluaran berikut:", "Daftar belanja:", dll).
2. Tentukan "type": "expense" untuk pengeluaran atau "income" untuk pemasukan.
3. Kategori expense valid HANYA salah satu dari: ["food", "transport", "bills", "shopping", "health", "entertainment", "other"]
4. Kategori income valid HANYA salah satu dari: ["gaji", "freelance", "bonus", "transfer", "lainnya"]
5. Sebutkan "merchant" atau nama deskripsi transaksi dengan jelas (contoh: "Bayar cicilan rumah", "Bayar Indodana", "Utang Makmur").
6. Tentukan "amount" sebagai number murni dalam Rupiah (contoh: 5900000). Set "confidence": 0.95.

Contoh:
Input:
Catat pengeluaran berikut:
Bayar cicilan rumah 5900000
Bayar Indodana 2500000

Output:
[
  {"type":"expense","amount":5900000,"category":"bills","merchant":"Bayar cicilan rumah","note":"Bayar cicilan rumah 5900000","confidence":0.95},
  {"type":"expense","amount":2500000,"category":"bills","merchant":"Bayar Indodana","note":"Bayar Indodana 2500000","confidence":0.95}
]

Teks user: `;


export const ANALYZE_LIST_PROMPT = `Analisis daftar keuangan ini. Hitung total pemasukan, total pengeluaran, selisih. Deteksi pola (cicilan, belanja, dll). Beri insight & rekomendasi singkat.

Gunakan bahasa Indonesia santai. Output SINGKAT, maksimal 5 baris (tanpa emoji, tanpa garis, tanpa section berulang). Contoh:

Total: RpX.XXX.XXX (pemasukan) | RpX.XXX.XXX (pengeluaran) | RpX.XXX.XXX (selisih)
Top: nama RpX, nama RpX, nama RpX
Insight: ...
Saran: ...

JANGAN minta input tambahan. JANGAN tanya nominal/kategori.

Data:
`;
