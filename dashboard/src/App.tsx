import { useEffect, useState, type ReactElement } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './lib/firebase';
import Login from './Login';
import LinkAccount from './LinkAccount';
import Dashboard from './Dashboard';
import './styles.css';

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
