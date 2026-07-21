const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const dbPath = process.argv[2] || path.join(__dirname, '..', 'data', 'punch-ebd.db');
const d = new DatabaseSync(dbPath);
console.log('payments cols:', d.prepare('PRAGMA table_info(payments)').all());
console.log('promos:', d.prepare('SELECT * FROM promo_codes').all());
console.log('users:', d.prepare('SELECT id, username, email, role FROM users').all());
