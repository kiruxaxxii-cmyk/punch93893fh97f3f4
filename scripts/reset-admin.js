const { db } = require('../db');
const bcrypt = require('bcryptjs');

const hash = bcrypt.hashSync('punchadmin', 10);
const u = db.prepare('SELECT id FROM users WHERE username = ?').get('punchadmin');
if (u) {
  db.prepare('UPDATE users SET password_hash = ?, role = ?, email = ? WHERE id = ?').run(
    hash,
    'owner',
    'admin@punch.local',
    u.id
  );
  console.log('updated punchadmin / punchadmin (owner)');
} else {
  db.prepare(
    `INSERT INTO users (username, email, password_hash, role, plan, subscription_expires_at)
     VALUES (?, ?, ?, 'owner', 'lifetime', datetime('now', '+100 years'))`
  ).run('punchadmin', 'admin@punch.local', hash);
  console.log('created punchadmin / punchadmin (owner)');
}
