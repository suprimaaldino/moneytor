import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY ?? '';
const privateKey = rawPrivateKey
  .trim()
  .replace(/^["']|["']$/g, '')
  .replace(/\\n/g, '\n');

if (!getApps().length) {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new Error('Firebase environment variables are not configured');
  }

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export const db = getFirestore();
