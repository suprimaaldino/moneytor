import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from './lib/firebase';
import { getTransactions } from './lib/transactions';
import { calculateSummary } from './lib/summary';
import { linkAccount } from './lib/linkAccount';
import type { DashboardTransaction } from './types';
import './styles.css';

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍚', transport: '🚗', bills: '💡', shopping: '🛒',
  health: '💊', entertainment: '🎬', other: '📦', unclear: '❓',
  gaji: '💰', freelance: '💻', bonus: '🎁', transfer: '📤', lainnya: '📋',
  Rumah: '🏠', Indodana: '🏦', Makmur: '📈', Rara: '👤', Mega: '🏛️',
  Gadai: '💎', 'Shopee Bela': '🛍️', Indra: '👤', 'Ibu Linggau': '👩',
  'Jatah Ibu': '👩', Seli: '👤', Shopee: '🛍️', BNI: '🏛️',
  Honest: '🤝', King: '👑', Tyok: '👤', Masdus: '👤', 'Bang Ger': '👤',
};

function icon(cat: string): string {
  return CATEGORY_ICONS[cat] ?? CATEGORY_ICONS[cat.toLowerCase()] ?? '📄';
}

function wibDate(d?: Date): string {
  return new Date((d ?? new Date()).getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function monthStart(d?: Date): string {
  return `${wibDate(d).slice(0, 7)}-01`;
}

function shiftMonths(n: number): { start: string; end: string } {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  d.setMonth(d.getMonth() + n);
  return { start: monthStart(d), end: wibDate(d) };
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

function percent(a: number, b: number): string {
  if (!b) return '';
  const p = ((a - b) / b) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}

type SortKey = 'date' | 'label' | 'category' | 'amount';

function Login(): ReactElement {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function login(): Promise<void> {
    setBusy(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      setBusy(false);
      if (fbErr?.code === 'auth/popup-blocked') {
        setError('Popup terblock. Izinkan popup untuk situs ini di browser, lalu coba lagi.');
      } else {
        setError(err instanceof Error ? err.message : 'Login gagal.');
      }
    }
  }
  return <main className="center-page"><section className="login-card"><div className="brand-mark"><img src="/applogo.png" alt="Moneytor" className="logo-icon" /></div><h1>Moneytor</h1><p>Monitor pemasukan dan pengeluaran Anda.</p>{error && <p className="error-text">{error}</p>}<button className="primary-button" disabled={busy} onClick={login}>{busy ? 'Membuka...' : 'Masuk dengan Google'}</button></section></main>;
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
  return <main className="center-page"><section className="login-card"><div className="brand-mark"><img src="/applogo.png" alt="Moneytor" className="logo-icon" /></div><h1>Hubungkan Moneytor</h1><p>Login sebagai <strong>{user.email}</strong>. Kirim <code>/link</code> ke bot Telegram untuk mendapatkan kode 6 angka.</p><form onSubmit={submit}><label htmlFor="link-code">Kode dari Telegram</label><input id="link-code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="123456" /><button className="primary-button" disabled={busy || code.length !== 6}>{busy ? 'Menghubungkan...' : 'Hubungkan akun'}</button></form>{error && <p className="error-text">{error}</p>}</section></main>;
}

function Skeleton(): ReactElement {
  return <main className="app-shell"><header className="topbar"><div><span className="eyebrow">PERSONAL FINANCE</span><h1>Moneytor Dashboard</h1></div></header><section className="metrics">{[1,2,3,4].map(i => <article key={i} className="skeleton-card"><div className="skeleton-line w-24" /><div className="skeleton-line w-32 h-7 mt-2" /></article>)}</section><section className="content-grid"><article className="panel"><div className="skeleton-line w-40 h-5 mb-6" /><div className="bars">{[1,2,3,4].map(i => <div key={i} className="bar-row"><div className="skeleton-line w-full h-9" /></div>)}</div></article><article className="panel"><div className="skeleton-line w-36 h-5 mb-6" />{[1,2,3,4].map(i => <div key={i} className="skeleton-line w-full h-10 mb-2" />)}</article></section></main>;
}

function Dashboard({ user }: { user: User }): ReactElement {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(wibDate());
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<DashboardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      setLoading(true); setError('');
      try {
        const token = await user.getIdTokenResult();
        const telegramUserId = token.claims.telegramUserId;
        if (typeof telegramUserId !== 'string') throw new Error('Akun belum terhubung ke Telegram.');
        const days = Math.round((new Date(`${endDate}T23:59:59+07:00`).getTime() - new Date(`${startDate}T00:00:00+07:00`).getTime()) / 86400000) + 1;
        const prevEnd = new Date(new Date(`${startDate}T00:00:00+07:00`).getTime() - 86400000);
        const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        const [curr, prev] = await Promise.all([
          getTransactions(telegramUserId, startDate, endDate),
          getTransactions(telegramUserId, fmt(prevStart), fmt(prevEnd)),
        ]);
        if (active) { setTransactions(curr); setPrevTransactions(prev); }
      } catch (caught) { if (active) setError(caught instanceof Error ? caught.message : 'Data gagal dimuat.'); } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [user, startDate, endDate]);

  const summary = useMemo(() => calculateSummary(transactions), [transactions]);
  const prevSummary = useMemo(() => calculateSummary(prevTransactions), [prevTransactions]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortDesc(prev => sortKey === key ? !prev : true);
    setSortKey(key);
  }, [sortKey]);

  const sorted = useMemo(() => {
    const list = [...transactions];
    const dir = sortDesc ? -1 : 1;
    list.sort((a, b) => {
      switch (sortKey) {
        case 'date': return dir * (a.createdAt.toMillis() - b.createdAt.toMillis());
        case 'label': return dir * a.label.localeCompare(b.label);
        case 'category': return dir * a.category.localeCompare(b.category);
        case 'amount': return dir * (a.amount - b.amount);
        default: return 0;
      }
    });
    return list;
  }, [transactions, sortKey, sortDesc]);

  const sortArrow = (key: SortKey): string => sortKey === key ? (sortDesc ? ' ▾' : ' ▴') : '';

  function setPreset(start: string, end: string): void { setStartDate(start); setEndDate(end); }

  return <main className="app-shell"><header className="topbar"><div><span className="eyebrow">PERSONAL FINANCE</span><h1>Moneytor Dashboard</h1></div><div className="user-menu"><span>{user.email}</span><button className="link-button" onClick={() => signOut(auth)}>Keluar</button></div></header><section className="toolbar"><div className="presets"><button className="preset-btn" onClick={() => setPreset(wibDate(new Date(Date.now() - 6 * 86400000)), wibDate())}>7 Hari</button><button className="preset-btn" onClick={() => setPreset(wibDate(new Date(Date.now() - 29 * 86400000)), wibDate())}>30 Hari</button><button className="preset-btn" onClick={() => setPreset(monthStart(), wibDate())}>Bulan Ini</button><button className="preset-btn" onClick={() => { const p = shiftMonths(-1); setPreset(p.start, p.end); }}>Bulan Lalu</button></div><div className="date-range"><label>Dari <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Sampai <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div></section>{error && <div className="alert">{error}</div>}{loading ? <Skeleton /> : <><section className="metrics"><article><span>Pemasukan</span><strong className="income">{formatRupiah(summary.totalIncome)}</strong><small className="change">{percent(summary.totalIncome, prevSummary.totalIncome)}</small></article><article><span>Pengeluaran</span><strong className="expense">{formatRupiah(summary.totalExpense)}</strong><small className="change">{percent(summary.totalExpense, prevSummary.totalExpense)}</small></article><article><span>Net</span><strong className={summary.net >= 0 ? 'income' : 'expense'}>{formatRupiah(summary.net)}</strong><small className="change">{percent(summary.net, prevSummary.net)}</small></article><article><span>Transaksi</span><strong>{transactions.length}</strong><small className="change">{prevTransactions.length ? `vs ${prevTransactions.length}` : ''}</small></article></section><section className="content-grid"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">BREAKDOWN</span><h2>Pengeluaran per kategori</h2></div></div>{Object.keys(summary.byCategory).length === 0 ? <p className="muted">Belum ada pengeluaran pada periode ini.</p> : <div className="bars">{Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]).map(([category, total]) => { const max = Math.max(...Object.values(summary.byCategory)); return <div className="bar-row" key={category}><div className="bar-label"><span><span className="cat-icon">{icon(category)}</span>{category}</span><span>{formatRupiah(total)}</span></div><div className="bar-track"><div className="bar-fill bar-fill--cat" style={{ width: `${(total / max) * 100}%` }} /></div></div>; })}</div>}</article><article className="panel"><div className="panel-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Transaksi</h2></div><span className="tx-count">{transactions.length} transaksi</span></div>{sorted.length === 0 ? <p className="muted">Belum ada transaksi.</p> : <div className="table-wrap"><table><thead><tr><th className="sortable" onClick={() => toggleSort('date')}>Tanggal{sortArrow('date')}</th><th className="sortable" onClick={() => toggleSort('label')}>Keterangan{sortArrow('label')}</th><th className="sortable" onClick={() => toggleSort('category')}>Kategori{sortArrow('category')}</th><th className="sortable amount-column" onClick={() => toggleSort('amount')}>Nominal{sortArrow('amount')}</th></tr></thead><tbody>{sorted.map((item) => <tr key={`${item.type}-${item.id}`}><td>{item.createdAt.toDate().toLocaleDateString('id-ID')}</td><td><strong>{item.label}</strong><small>{item.note}</small></td><td><span className={`tag ${item.type}`}>{icon(item.category)}{item.category}</span></td><td className={`amount-column ${item.type}`}>{item.type === 'income' ? '+' : '-'}{formatRupiah(item.amount)}</td></tr>)}</tbody></table></div>}</article></section></>}</main>;
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
