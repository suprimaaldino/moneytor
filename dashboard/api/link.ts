import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

type Request = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type Response = { status: (code: number) => Response; json: (body: unknown) => void };

function adminApp() {
  if (getApps().length) return getApps()[0];
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n').replace(/^"/, '').replace(/"$/, '');
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) throw new Error('Firebase server environment is incomplete');
  return initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey }) });
}

export default async function link(request: Request, response: Response): Promise<void> {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const header = request.headers.authorization;
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new Error('Authentication required');
    const app = adminApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const user = await auth.verifyIdToken(token);
    const body = typeof request.body === 'object' && request.body !== null ? request.body as { code?: unknown } : {};
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!/^\d{6}$/.test(code)) throw new Error('Kode harus terdiri dari 6 angka');

    const codeRef = firestore.collection('link_codes').doc(code);
    const accountRef = firestore.collection('account_links').doc(user.uid);
    const telegramUserId = await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(codeRef);
      if (!snapshot.exists) throw new Error('Kode tidak ditemukan');
      const data = snapshot.data() as { telegramUserId?: string; expiresAt?: Timestamp; used?: boolean };
      if (!data.telegramUserId || data.used || !data.expiresAt || data.expiresAt.toMillis() <= Date.now()) throw new Error('Kode sudah tidak berlaku');
      transaction.update(codeRef, { used: true });
      transaction.set(accountRef, { firebaseUid: user.uid, email: user.email ?? '', telegramUserId: data.telegramUserId, linkedAt: Timestamp.now() });
      return data.telegramUserId;
    });

    const currentUser = await auth.getUser(user.uid);
    await auth.setCustomUserClaims(user.uid, { ...(currentUser.customClaims ?? {}), telegramUserId });
    response.status(200).json({ ok: true });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Linking gagal' });
  }
}
