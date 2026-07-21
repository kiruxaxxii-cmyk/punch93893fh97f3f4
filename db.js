const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const isBuild = process.argv.includes('build') || process.env.NEXT_PHASE === 'phase-production-build';

const dataDir = process.env.PUNCH_DATA_DIR
  ? path.resolve(process.env.PUNCH_DATA_DIR)
  : path.join(__dirname, 'data');

const DB_PATH = process.env.PUNCH_DB_PATH
  ? path.resolve(process.env.PUNCH_DB_PATH)
  : path.join(dataDir, 'punch-ebd.db');

const BUNDLED_DB_PATH = path.join(__dirname, 'data', 'punch-ebd.db');

let raw = null;
let dbInitialized = false;

function ensureDb() {
  if (dbInitialized) return;
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  if (fs.existsSync(BUNDLED_DB_PATH)) {
    const force = process.env.PUNCH_SEED_DB === '1';
    const sameFile = path.resolve(BUNDLED_DB_PATH) === path.resolve(DB_PATH);
    if (!sameFile || force) {
      const runtimeExists = fs.existsSync(DB_PATH);
      const bundledNewer =
        runtimeExists &&
        fs.statSync(BUNDLED_DB_PATH).mtimeMs > fs.statSync(DB_PATH).mtimeMs;
      if (force || !runtimeExists || bundledNewer) {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        fs.copyFileSync(BUNDLED_DB_PATH, DB_PATH);
        console.log(`[Punch EBD] Seeded database at ${DB_PATH}`);
      }
    }
  }

  raw = new DatabaseSync(DB_PATH);
  raw.exec('PRAGMA journal_mode = WAL');
  raw.exec('PRAGMA busy_timeout = 5000');
  dbInitialized = true;

  raw.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      hwid TEXT,
      hwid_reset_at TEXT,
      subscription_expires_at TEXT,
      plan TEXT DEFAULT 'none',
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS license_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_code TEXT UNIQUE NOT NULL,
      plan TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      used_by INTEGER,
      used_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (used_by) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      discount_percent INTEGER NOT NULL,
      max_uses INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      expires_at TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      hwid TEXT,
      ip TEXT,
      action TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS launcher_chat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_label TEXT NOT NULL,
      plan_key TEXT NOT NULL,
      amount_rub INTEGER NOT NULL,
      pay_method TEXT,
      status TEXT DEFAULT 'pending',
      cryptobot_invoice_id TEXT,
      pay_url TEXT,
      payload TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      paid_at TEXT,
      promo_code TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  migrate();
  seedKeys();
  seedPromos();
  resetAndSeedAdmin();
  ensureConfiguredAdminRole();

  console.log(`[Punch EBD] Database: ${DB_PATH}`);
}

function prepare(sql) {
  ensureDb();
  const stmt = raw.prepare(sql);
  return {
    run(...args) {
      stmt.run(...args);
      const result = { changes: stmt.changes ?? 0 };
      if (/^\s*INSERT/i.test(sql)) {
        result.lastInsertRowid = raw.prepare('SELECT last_insert_rowid() AS id').get().id;
      }
      return result;
    },
    get(...args) {
      return stmt.get(...args);
    },
    all(...args) {
      return stmt.all(...args);
    },
  };
}

const db = {
  exec(sql) {
    ensureDb();
    raw.exec(sql);
  },
  prepare,
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function migrate() {
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (!cols.includes('role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
  }
  const payCols = db.prepare('PRAGMA table_info(payments)').all().map((c) => c.name);
  if (!payCols.includes('promo_code')) {
    db.exec('ALTER TABLE payments ADD COLUMN promo_code TEXT');
  }
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(TRIM(email)));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(TRIM(username)));
    CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(cryptobot_invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
  `);
}

function dedupeEbd() {
  ensureDb();
  let removed = 0;
  const emailGroups = db
    .prepare(
      `SELECT LOWER(TRIM(email)) AS key, GROUP_CONCAT(id) AS ids
       FROM users GROUP BY LOWER(TRIM(email)) HAVING COUNT(*) > 1`
    )
    .all();
  for (const g of emailGroups) {
    const ids = String(g.ids).split(',').map(Number).sort((a, b) => a - b);
    ids.shift();
    for (const id of ids) {
      db.prepare('DELETE FROM launcher_chat WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM sessions_log WHERE user_id = ?').run(id);
      db.prepare('UPDATE license_keys SET used_by = NULL, used_at = NULL WHERE used_by = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      removed += 1;
    }
  }
  const userGroups = db
    .prepare(
      `SELECT LOWER(TRIM(username)) AS key, GROUP_CONCAT(id) AS ids
       FROM users GROUP BY LOWER(TRIM(username)) HAVING COUNT(*) > 1`
    )
    .all();
  for (const g of userGroups) {
    const ids = String(g.ids).split(',').map(Number).sort((a, b) => a - b);
    ids.shift();
    for (const id of ids) {
      db.prepare('DELETE FROM launcher_chat WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM sessions_log WHERE user_id = ?').run(id);
      db.prepare('UPDATE license_keys SET used_by = NULL, used_at = NULL WHERE used_by = ?').run(id);
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      removed += 1;
    }
  }
  return removed;
}

function findRegistrationConflict(username, email) {
  ensureDb();
  const u = normalizeUsername(username);
  const e = normalizeEmail(email);
  if (!u || !e) return { code: 'missing_fields', message: 'Заполните все поля' };
  if (!isValidEmail(e)) return { code: 'invalid_email', message: 'Некорректный email' };
  const uLower = u.toLowerCase();
  const eLower = e.toLowerCase();
  const byEmail = db
    .prepare('SELECT id, username, email FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1')
    .get(eLower);
  if (byEmail) return { code: 'email_taken', message: 'Этот email уже зарегистрирован', user: byEmail };
  const byUsername = db
    .prepare('SELECT id, username, email FROM users WHERE LOWER(TRIM(username)) = ? LIMIT 1')
    .get(uLower);
  if (byUsername) return { code: 'username_taken', message: 'Этот логин уже занят', user: byUsername };
  const cross = db
    .prepare(
      `SELECT id, username, email FROM users
       WHERE LOWER(TRIM(username)) = ? OR LOWER(TRIM(email)) = ?
       LIMIT 1`
    )
    .get(eLower, uLower);
  if (!cross) return null;
  if (normalizeEmail(cross.email) === eLower || cross.username.toLowerCase() === eLower)
    return { code: 'email_taken', message: 'Этот email уже зарегистрирован', user: cross };
  if (cross.username.toLowerCase() === uLower || normalizeEmail(cross.email) === uLower)
    return { code: 'username_taken', message: 'Этот логин уже занят', user: cross };
  return { code: 'taken', message: 'Логин или email уже заняты', user: cross };
}

function getEbdInfo() {
  ensureDb();
  const stat = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : null;
  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const keys = db.prepare('SELECT COUNT(*) AS c FROM license_keys').get().c;
  const promos = db.prepare('SELECT COUNT(*) AS c FROM promo_codes').get().c;
  const chat = db.prepare('SELECT COUNT(*) AS c FROM launcher_chat').get().c;
  const logs = db.prepare('SELECT COUNT(*) AS c FROM sessions_log').get().c;
  const duplicateEmails = db
    .prepare(
      `SELECT LOWER(TRIM(email)) AS email, COUNT(*) AS count,
              GROUP_CONCAT(username || ' #' || id) AS accounts
       FROM users GROUP BY LOWER(TRIM(email)) HAVING count > 1`
    )
    .all();
  const duplicateUsernames = db
    .prepare(
      `SELECT LOWER(TRIM(username)) AS username, COUNT(*) AS count,
              GROUP_CONCAT(email || ' #' || id) AS accounts
       FROM users GROUP BY LOWER(TRIM(username)) HAVING count > 1`
    )
    .all();
  return {
    name: 'EBD — Единая база данных Punch',
    path: DB_PATH, dataDir,
    sizeBytes: stat?.size ?? 0,
    updatedAt: stat?.mtime?.toISOString() ?? null,
    tables: { users, keys, promos, chat, logs },
    duplicateEmails, duplicateUsernames,
    healthy: duplicateEmails.length === 0 && duplicateUsernames.length === 0,
  };
}

function wipeUsers() {
  ensureDb();
  db.exec('DELETE FROM launcher_chat');
  db.exec('DELETE FROM sessions_log');
  db.prepare('UPDATE license_keys SET used_by = NULL, used_at = NULL').run();
  db.exec('DELETE FROM users');
}

function createAdminUser() {
  ensureDb();
  const username = process.env.ADMIN_USERNAME || 'punchadmin';
  const email = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@punch.local');
  const password = process.env.ADMIN_PASSWORD;
  if (!password) { console.warn('[Punch] ADMIN_PASSWORD not set'); return null; }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (username, email, password_hash, role, plan, subscription_expires_at)
     VALUES (?, ?, ?, 'owner', 'lifetime', datetime('now', '+100 years'))`
  ).run(username, email, hash);
  return { username, email };
}

function resetAndSeedAdmin() {
  ensureDb();
  if (process.env.RESET_AND_SEED_ADMIN !== '1') return null;
  wipeUsers();
  const admin = createAdminUser();
  if (admin) console.log(`[Punch] DB reset: single admin "${admin.username}" created`);
  return admin;
}

function ensureConfiguredAdminRole() {
  ensureDb();
  const username = process.env.ADMIN_USERNAME || 'punchadmin';
  const user = db.prepare('SELECT id, role FROM users WHERE username = ?').get(username);
  if (user && user.role !== 'owner') {
    db.prepare("UPDATE users SET role = 'owner' WHERE id = ?").run(user.id);
    console.log(`[Punch] Role upgraded to owner: ${username}`);
  }
}

function generateKey() {
  const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `PUNCH-${seg()}-${seg()}-${seg()}-${seg()}`;
}

function seedKeys() {
  ensureDb();
  const count = db.prepare('SELECT COUNT(*) AS c FROM license_keys').get().c;
  if (count > 0) return;
  const insert = db.prepare('INSERT INTO license_keys (key_code, plan, duration_days) VALUES (?, ?, ?)');
  for (const p of [
    { plan: 'trial', days: 7, qty: 5 },
    { plan: 'month', days: 30, qty: 5 },
    { plan: 'quarter', days: 90, qty: 3 },
    { plan: 'lifetime', days: 36500, qty: 2 },
  ]) {
    for (let i = 0; i < p.qty; i++) insert.run(generateKey(), p.plan, p.days);
  }
}

function seedPromos() {
  ensureDb();
  const count = db.prepare('SELECT COUNT(*) AS c FROM promo_codes').get().c;
  if (count > 0) return;
  db.prepare('INSERT INTO promo_codes (code, discount_percent, max_uses, active) VALUES (?, ?, ?, 1)').run('67', 67, 0);
}

module.exports = {
  db,
  DB_PATH,
  dataDir,
  generateKey,
  wipeUsers,
  createAdminUser,
  resetAndSeedAdmin,
  ensureConfiguredAdminRole,
  normalizeEmail,
  normalizeUsername,
  isValidEmail,
  findRegistrationConflict,
  getEbdInfo,
  dedupeEbd,
  ensureDb,
};
