import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from './lib/firebase';
import { getTransactions } from './lib/transactions';
import { calculateSummary } from './lib/summary';
import { linkAccount } from './lib/linkAccount';
import type { DashboardTransaction } from './types';
import './styles.css';

function wibDate(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function monthStart(): string {
  return `${wibDate().slice(0, 7)}-01`;
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function Login(): ReactElement {
  return <main className="center-page"><section className="login-card"><div className="brand-mark">M</div><h1>Moneytor</h1><p>Monitor pemasukan dan pengeluaran Anda.</p><button className="primary-button" onClick={() => signInWithPopup(auth, googleProvider)}>Masuk dengan Google</button></section></main>;
}

function LinkAccount({ user, onLinked }: { user: User; onLinked: () => void }): ReactElement {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError('');
    try { await linkAccount(code); onLinked(); } catch (caught) { setError(caught instanceof Error ? caught.message : 'Linking gagal.'); } finally { setBusy(false); }
  }
  return <main className="center-page"><section className="login-card"><div className="brand-mark">M</div><h1>Hubungkan Moneytor</h1><p>Login sebagai <strong>{user.email}</strong>. Kirim <code>/link</code> ke bot Telegram untuk mendapatkan kode 6 angka.</p><form onSubmit={submit}><label htmlFor="link-code">Kode dari Telegram</label><input id="link-code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="123456" /><button className="primary-button" disabled={busy || code.length !== 6}>{busy ? 'Menghubungkan...' : 'Hubungkan akun'}</button></form>{error && <p className="error-text">{error}</p>}</section></main>;
}

function Dashboard({ user }: { user: User }): ReactElement {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(wibDate());
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      setLoading(true); setError('');
      try {
        const token = await user.getIdTokenResult();
        const telegramUserId = token.claims.telegramUserId;
        if (typeof telegramUserId !== 'string') throw new Error('Akun belum terhubung ke Telegram.');
        const result = await getTransactions(telegramUserId, startDate, endDate);
        if (active) setTransactions(result);
      } catch (caught) { if (active) setError(caught instanceof Error ? caught.message : 'Data gagal dimuat.'); } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [user, startDate, endDate]);

  const summary = useMemo(() => calculateSummary(transactions), [transactions]);

  return <main className="app-shell"><header className="topbar"><div><span className="eyebrow">PERSONAL FINANCE</span><h1>Moneytor Dashboard</h1></div><div className="user-menu"><span>{user.email}</span><button className="link-button" onClick={() => signOut(auth)}>Keluar</button></div></header><section className="toolbar"><label>Dari <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Sampai <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></section>{error && <div className="alert">{error}</div>}{loading ? <div className="loading">Memuat data...</div> : <><section className="metrics"><article><span>Pemasukan</span><strong className="income">{formatRupiah(summary.totalIncome)}</strong></article><article><span>Pengeluaran</span><strong className="expense">{formatRupiah(summary.totalExpense)}</strong></article><article><span>Net</span><strong className={summary.net >= 0 ? 'income' : 'expense'}>{formatRupiah(summary.net)}</strong></article><article><span>Transaksi</span><strong>{transactions.length}</strong></article></section><section className="content-grid"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">BREAKDOWN</span><h2>Pengeluaran per kategori</h2></div></div>{Object.keys(summary.byCategory).length === 0 ? <p className="muted">Belum ada pengeluaran pada periode ini.</p> : <div className="bars">{Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]).map(([category, total]) => { const max = Math.max(...Object.values(summary.byCategory)); return <div className="bar-row" key={category}><div className="bar-label"><span>{category}</span><span>{formatRupiah(total)}</span></div><div className="bar-track"><div className="bar-fill" style={{ width: `${(total / max) * 100}%` }} /></div></div>; })}</div>}</article><article className="panel"><div className="panel-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Transaksi</h2></div></div>{transactions.length === 0 ? <p className="muted">Belum ada transaksi.</p> : <div className="table-wrap"><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th className="amount-column">Nominal</th></tr></thead><tbody>{transactions.map((item) => <tr key={`${item.type}-${item.id}`}><td>{item.createdAt.toDate().toLocaleDateString('id-ID')}</td><td><strong>{item.label}</strong><small>{item.note}</small></td><td><span className={`tag ${item.type}`}>{item.category}</span></td><td className={`amount-column ${item.type}`}>{item.type === 'income' ? '+' : '-'}{formatRupiah(item.amount)}</td></tr>)}</tbody></table></div>}</article></section></>}</main>;
}

export default function App(): ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [linked, setLinked] = useState<boolean | null>(null);
  useEffect(() => onAuthStateChanged(auth, async (nextUser) => {
    setUser(nextUser);
    if (!nextUser) { setLinked(null); return; }
    const token = await nextUser.getIdTokenResult();
    setLinked(typeof token.claims.telegramUserId === 'string');
  }), []);
  if (!user) return <Login />;
  if (linked === null) return <div className="loading">Memuat akun...</div>;
  if (!linked) return <LinkAccount user={user} onLinked={() => setLinked(true)} />;
  return <Dashboard user={user} />;
}
