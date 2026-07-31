import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { signOut, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { getTransactions } from './lib/transactions';
import { calculateSummary } from './lib/summary';
import type { DashboardTransaction } from './types';
import Skeleton from './Skeleton';

const PAGE_SIZE = 20;

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

function formatRange(start: string, end: string): string {
  const format = (d: string): string => new Date(`${d}T12:00:00+07:00`)
    .toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${format(start)} – ${format(end)}`;
}

type SortKey = 'date' | 'label' | 'category' | 'amount';

function Trend({ pct, invert }: { pct: string; invert: boolean }): ReactElement | null {
  if (!pct) return null;
  const value = parseFloat(pct);
  if (value === 0) return <span className="trend trend-flat">{pct}</span>;
  const up = value > 0;
  const good = invert ? !up : up;
  return <span className={`trend ${good ? 'trend-up' : 'trend-down'}`}>{up ? '▲' : '▼'} {pct}</span>;
}

export default function Dashboard({ user }: { user: User }): ReactElement {
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(wibDate());
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [prevTransactions, setPrevTransactions] = useState<DashboardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);

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
        if (active) { setTransactions(curr); setPrevTransactions(prev); setPage(1); }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Data gagal dimuat.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [user, startDate, endDate, reload]);

  const summary = useMemo(() => calculateSummary(transactions), [transactions]);
  const prevSummary = useMemo(() => calculateSummary(prevTransactions), [prevTransactions]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortDesc((prev) => sortKey === key ? !prev : true);
    setSortKey(key);
    setPage(1);
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

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const sortArrow = (key: SortKey): string => sortKey === key ? (sortDesc ? ' ▾' : ' ▴') : '';

  function setPreset(start: string, end: string): void { setStartDate(start); setEndDate(end); }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><span className="eyebrow">PERSONAL FINANCE</span><h1>Moneytor Dashboard</h1></div>
        <div className="user-menu">
          <span>{user.email}</span>
          <button className="link-button" aria-label="Keluar dari akun" onClick={() => signOut(auth)}>Keluar</button>
        </div>
      </header>
      <section className="toolbar">
        <div className="presets">
          <button className="preset-btn" aria-label="Tampilkan 7 hari terakhir" onClick={() => setPreset(wibDate(new Date(Date.now() - 6 * 86400000)), wibDate())}>7 Hari</button>
          <button className="preset-btn" aria-label="Tampilkan 30 hari terakhir" onClick={() => setPreset(wibDate(new Date(Date.now() - 29 * 86400000)), wibDate())}>30 Hari</button>
          <button className="preset-btn" aria-label="Tampilkan bulan ini" onClick={() => setPreset(monthStart(), wibDate())}>Bulan Ini</button>
          <button className="preset-btn" aria-label="Tampilkan bulan lalu" onClick={() => { const p = shiftMonths(-1); setPreset(p.start, p.end); }}>Bulan Lalu</button>
        </div>
        <div className="date-range">
          <span className="range-badge" aria-label="Periode aktif">{formatRange(startDate, endDate)}</span>
          <label>Dari <input type="date" aria-label="Tanggal mulai" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>Sampai <input type="date" aria-label="Tanggal akhir" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        </div>
      </section>
      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button className="retry-btn" aria-label="Coba muat ulang data" onClick={() => setReload((n) => n + 1)}>Coba lagi</button>
        </div>
      )}
      {loading && transactions.length === 0 ? <Skeleton /> : (
        <>
          {loading && <div className="loading-overlay" aria-label="Memuat data"><div className="spinner" /></div>}
          <section className="metrics">
            <article><span>Pemasukan</span><strong className="income">{formatRupiah(summary.totalIncome)}</strong><small className="change"><Trend pct={percent(summary.totalIncome, prevSummary.totalIncome)} invert={false} /></small></article>
            <article><span>Pengeluaran</span><strong className="expense">{formatRupiah(summary.totalExpense)}</strong><small className="change"><Trend pct={percent(summary.totalExpense, prevSummary.totalExpense)} invert={true} /></small></article>
            <article><span>Net</span><strong className={summary.net >= 0 ? 'income' : 'expense'}>{formatRupiah(summary.net)}</strong><small className="change"><Trend pct={percent(summary.net, prevSummary.net)} invert={false} /></small></article>
            <article><span>Transaksi</span><strong>{transactions.length}</strong><small className="change">{prevTransactions.length ? `vs ${prevTransactions.length}` : ''}</small></article>
          </section>
          <section className="content-grid">
            <article className="panel">
              <div className="panel-heading"><div><span className="eyebrow">BREAKDOWN</span><h2>Pengeluaran per kategori</h2></div></div>
              {Object.keys(summary.byCategory).length === 0 ? (
                <div className="empty-state"><span className="empty-icon">🗂️</span><p className="muted">Belum ada pengeluaran pada periode ini.</p></div>
              ) : (
                <div className="bars">
                  {Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]).map(([category, total]) => {
                    const max = Math.max(...Object.values(summary.byCategory));
                    return (
                      <div className="bar-row" key={category}>
                        <div className="bar-label"><span><span className="cat-icon">{icon(category)}</span>{category}</span><span>{formatRupiah(total)}</span></div>
                        <div className="bar-track"><div className="bar-fill bar-fill--cat" style={{ width: `${(total / max) * 100}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
            <article className="panel">
              <div className="panel-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Transaksi</h2></div><span className="tx-count">{transactions.length} transaksi</span></div>
              {sorted.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">📭</span><p className="muted">Belum ada transaksi pada periode ini.</p></div>
              ) : (
                <>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th className="sortable" aria-label="Urutkan berdasarkan tanggal" onClick={() => toggleSort('date')}>Tanggal{sortArrow('date')}</th>
                          <th className="sortable" aria-label="Urutkan berdasarkan keterangan" onClick={() => toggleSort('label')}>Keterangan{sortArrow('label')}</th>
                          <th className="sortable" aria-label="Urutkan berdasarkan kategori" onClick={() => toggleSort('category')}>Kategori{sortArrow('category')}</th>
                          <th className="sortable amount-column" aria-label="Urutkan berdasarkan nominal" onClick={() => toggleSort('amount')}>Nominal{sortArrow('amount')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((item) => (
                          <tr key={`${item.type}-${item.id}`}>
                            <td>{item.createdAt.toDate().toLocaleDateString('id-ID')}</td>
                            <td><strong>{item.label}</strong><small>{item.note}</small></td>
                            <td><span className={`tag ${item.type}`}>{icon(item.category)}{item.category}</span></td>
                            <td className={`amount-column ${item.type}`}>{item.type === 'income' ? '+' : '-'}{formatRupiah(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pagination">
                    <button className="page-btn" aria-label="Halaman sebelumnya" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>‹ Sebelumnya</button>
                    <span aria-live="polite">Halaman {currentPage} dari {pageCount}</span>
                    <button className="page-btn" aria-label="Halaman berikutnya" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>Berikutnya ›</button>
                  </div>
                </>
              )}
            </article>
          </section>
        </>
      )}
    </main>
  );
}
