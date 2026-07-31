import { useState, type FormEvent, type ReactElement } from 'react';
import type { User } from 'firebase/auth';
import { linkAccount } from './lib/linkAccount';

export default function LinkAccount({ user, onLinked }: { user: User; onLinked: () => void }): ReactElement {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await linkAccount(code);
      setSuccess(true);
      window.setTimeout(onLinked, 1200);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Linking gagal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center-page">
      <section className="login-card">
        <div className="brand-mark"><img src="/applogo.png" alt="Moneytor" className="logo-icon" /></div>
        <h1>Hubungkan Moneytor</h1>
        <p>Login sebagai <strong>{user.email}</strong>. Kirim <code>/link</code> ke bot Telegram untuk mendapatkan kode 6 angka.</p>
        {success && <p className="success-text" role="status">Akun berhasil dihubungkan! Mengalihkan...</p>}
        {error && <p className="error-text" role="alert">{error}</p>}
        <form onSubmit={submit}>
          <label htmlFor="link-code">Kode dari Telegram</label>
          <input id="link-code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="123456" />
          <button className="primary-button" disabled={busy || code.length !== 6} aria-label="Hubungkan akun Telegram dengan dashboard">
            {busy ? 'Menghubungkan...' : 'Hubungkan akun'}
          </button>
        </form>
      </section>
    </main>
  );
}
