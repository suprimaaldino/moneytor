import 'dotenv/config';
import { writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { db } from '../src/db/firestore.js';

const BACKUP_DIR = join(import.meta.dirname, '..', 'backups');
const MAX_BACKUPS = 8;

const collections = ['expenses', 'income', 'key_pool_state', 'merchant_cache', 'account_links', 'link_codes'];

async function backup() {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backup: Record<string, unknown[]> = {};

  for (const name of collections) {
    const snapshot = await db.collection(name).get();
    backup[name] = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    console.log(`  ${name}: ${snapshot.size} document(s)`);
  }

  const filePath = join(BACKUP_DIR, `backup-${timestamp}.json`);
  writeFileSync(filePath, JSON.stringify(backup, null, 2));
  console.log(`\nSaved: ${filePath}`);

  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup-'))
    .sort()
    .reverse();

  if (files.length > MAX_BACKUPS) {
    for (const old of files.slice(MAX_BACKUPS)) {
      rmSync(join(BACKUP_DIR, old));
      console.log(`Deleted old: ${old}`);
    }
  }
}

backup()
  .then(() => { console.log('Backup complete.'); process.exit(0); })
  .catch((e) => { console.error('Backup failed:', e); process.exit(1); });
