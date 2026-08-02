const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'punch-ebd.db'), { readOnly: true });
console.log('tables', db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all());
console.log('promos', db.prepare('SELECT id, code, discount_percent, max_uses, used_count, active, expires_at FROM promo_codes').all());
console.log('keys', db.prepare('SELECT id, key_code, plan, duration_days, used_by FROM license_keys ORDER BY id DESC LIMIT 15').all());
try {
  console.log(
    'users',
    db.prepare('SELECT id, username, email, role, plan, subscription_expires_at FROM users ORDER BY id LIMIT 15').all()
  );
} catch (e) {
  console.log('users err', e.message);
}
db.close();
