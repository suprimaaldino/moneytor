import { useState, type ReactElement } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './lib/firebase';

export default function Login(): ReactElement {
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

  return (
    <main className="center-page">
      <section className="login-card">
        <div className="brand-mark"><img src="/applogo.png" alt="Moneytor" className="logo-icon" /></div>
        <h1>Moneytor</h1>
        <p>Monitor pemasukan dan pengeluaran Anda.</p>
        {error && <p className="error-text" role="alert">{error}</p>}
        <button className="primary-button" disabled={busy} onClick={login} aria-label="Masuk dengan akun Google">
          {busy ? 'Membuka...' : 'Masuk dengan Google'}
        </button>
      </section>
    </main>
  );
}
