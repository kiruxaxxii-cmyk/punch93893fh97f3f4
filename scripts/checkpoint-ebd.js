const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const src = path.join(root, 'data', 'punch-ebd.db');
const seedDir = path.join(root, 'seed');
const outSeed = path.join(seedDir, 'punch-ebd.db');

fs.mkdirSync(seedDir, { recursive: true });
for (const p of [outSeed]) {
  try { fs.unlinkSync(p); } catch {}
}

const db = new DatabaseSync(src);
try {
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
} catch (e) {
  console.log('checkpoint warn:', e.message);
}
const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
console.log('open users before vacuum:', users);

// VACUUM INTO needs forward slashes on Windows for SQLite
const vacuumTarget = outSeed.replace(/\\/g, '/');
db.exec(`VACUUM INTO '${vacuumTarget}'`);
db.close();

for (const s of ['-wal', '-shm']) {
  try { fs.unlinkSync(src + s); } catch {}
}
fs.copyFileSync(outSeed, src);

function sha(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

const db2 = new DatabaseSync(src);
console.log('final users', db2.prepare('SELECT COUNT(*) AS c FROM users').get().c);
console.log(
  'last',
  db2.prepare('SELECT id, username FROM users ORDER BY id DESC LIMIT 5').all()
);
db2.close();
console.log('sha', sha(outSeed));
console.log('size', fs.statSync(src).size);
console.log('seed path', outSeed);
