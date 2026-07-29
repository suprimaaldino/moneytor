import { randomInt } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from './firestore.js';

const links = db.collection('link_codes');
const accounts = db.collection('account_links');
const LINK_TTL_MS = 10 * 60 * 1000;

export async function createTelegramLinkCode(telegramUserId: string): Promise<string> {
  let code: string;
  for (;;) {
    code = String(randomInt(100000, 1000000));
    const existing = await links.doc(code).get();
    if (!existing.exists) break;
  }

  await links.doc(code).set({
    telegramUserId,
    expiresAt: Timestamp.fromMillis(Date.now() + LINK_TTL_MS),
    used: false,
  });
  return code;
}

export async function consumeTelegramLinkCode(code: string, firebaseUid: string, email: string): Promise<string> {
  const codeRef = links.doc(code);
  const accountRef = accounts.doc(firebaseUid);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(codeRef);
    if (!snapshot.exists) throw new Error('Invalid link code');
    const data = snapshot.data() as { telegramUserId: string; expiresAt: Timestamp; used: boolean };
    if (data.used || data.expiresAt.toMillis() <= Date.now()) throw new Error('Expired link code');

    transaction.update(codeRef, { used: true });
    transaction.set(accountRef, {
      firebaseUid,
      email,
      telegramUserId: data.telegramUserId,
      linkedAt: Timestamp.now(),
    });
    return data.telegramUserId;
  });
}
