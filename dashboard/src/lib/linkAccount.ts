import { getIdToken } from 'firebase/auth';
import { auth } from './firebase';

export async function linkAccount(code: string): Promise<void> {
  if (!auth.currentUser) throw new Error('Silakan login terlebih dahulu.');
  const token = await getIdToken(auth.currentUser, true);
  const response = await fetch('/api/link', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code: code.trim() }),
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error ?? 'Linking gagal.');
  await getIdToken(auth.currentUser, true);
}
