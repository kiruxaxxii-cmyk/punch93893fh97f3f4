const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db, generateKey, DB_PATH, normalizeEmail, normalizeUsername, isValidEmail, findRegistrationConflict, getEbdInfo, dedupeEbd, ensureAdminAccount } = require('./db');
const cryptobot = require('./lib/cryptobot');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'punch-dev-secret-change-in-production';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'punch-admin-dev';
const LOADER_DIR = path.join(__dirname, 'public', 'downloads');
const LOADER_PATH = path.join(LOADER_DIR, 'punch-loader.exe');
const LOADER_ZIP = path.join(LOADER_DIR, 'punch-loader.zip');
const CLIENT_JAR_PATH = process.env.CLIENT_JAR_PATH || path.join(LOADER_DIR, 'punch-client.jar');
const CLIENT_JAR_URL =
  process.env.CLIENT_JAR_URL ||
  'https://www.dropbox.com/scl/fi/3l9bh8nkzjiffglq6s523/punch-2.1-2.jar?rlkey=gf59lncpnmp1hbxucewzh264z&st=0ynw37qd&dl=1';
const FABRIC_API_PATH =
  process.env.FABRIC_API_PATH || path.join(LOADER_DIR, 'fabric-api-0.119.4-1.21.4.jar');
const FABRIC_API_URL =
  process.env.FABRIC_API_URL ||
  'https://www.dropbox.com/scl/fi/zg3vdz6ho6vq4joz1eakc/fabric-api-0.119.4-1.21.4.jar?rlkey=bvwgby3hjwe6e9h08yflb3ycy&st=g9n1cbfj&dl=1';

const SHOP_PLANS = {
  '7 дней': { plan: 'trial', days: 7, price: 49 },
  '1 месяц': { plan: 'month', days: 30, price: 99 },
  '3 месяца': { plan: 'quarter', days: 90, price: 149 },
  'Навсегда': { plan: 'lifetime', days: 36500, price: 219 },
  'Сброс HWID': { plan: 'hwid_reset', days: 0, price: 100 },
};

const loaderSessions = new Map();
const VALID_ROLES = ['user', 'media', 'moderator', 'admin', 'owner'];

// Yacaptcha — Turnstile-like captcha bound to Punch hosts only
const YACAPTCHA_ALLOWED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
  'punchdlc.up.railway.app',
  'punchdlc.fun',
  'www.punchdlc.fun',
]);
const yacaptchaChallenges = new Map();
const yacaptchaTokens = new Map();
const YACAPTCHA_TTL_MS = 5 * 60 * 1000;

function purgeYacaptcha() {
  const now = Date.now();
  for (const [id, row] of yacaptchaChallenges) {
    if (row.expires < now) yacaptchaChallenges.delete(id);
  }
  for (const [tok, row] of yacaptchaTokens) {
    if (row.expires < now || row.consumed) yacaptchaTokens.delete(tok);
  }
}

function isYacaptchaHostAllowed(hostname) {
  const host = String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
  if (!host) return false;
  if (YACAPTCHA_ALLOWED_HOSTS.has(host)) return true;
  if (host.endsWith('.up.railway.app')) return true;
  if (host === 'punchdlc.fun' || host.endsWith('.punchdlc.fun')) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

function requestHost(req) {
  const origin = String(req.headers.origin || '').trim();
  if (origin) {
    try {
      return new URL(origin).hostname.toLowerCase();
    } catch {
      /* ignore */
    }
  }
  const bodyHost = String(req.body?.host || '').trim().toLowerCase().replace(/:\d+$/, '');
  if (bodyHost) return bodyHost;
  const xfHost = String(req.headers['x-forwarded-host'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
  if (xfHost) return xfHost;
  const hostHeader = String(req.headers.host || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
  return hostHeader;
}

function assertYacaptchaHost(req, res) {
  const host = requestHost(req);
  if (!isYacaptchaHostAllowed(host)) {
    res.status(403).json({ error: 'Eyeglass error', code: 'eyeglass' });
    return null;
  }
  return host;
}

function consumeYacaptchaToken(token, host) {
  purgeYacaptcha();
  const row = yacaptchaTokens.get(String(token || ''));
  if (!row || row.expires < Date.now() || row.consumed) return false;
  if (row.host !== host) return false;
  row.consumed = true;
  yacaptchaTokens.delete(String(token));
  return true;
}

function purgeLoaderSessions() {
  const now = Date.now();
  for (const [id, data] of loaderSessions) {
    if (data.expires < now) loaderSessions.delete(id);
  }
}

app.use(cors());

app.post(
  '/api/payments/cryptobot/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.headers['crypto-pay-api-signature'];
    const raw = req.body;
    if (!Buffer.isBuffer(raw) || !cryptobot.verifyWebhookSignature(raw, sig)) {
      return res.status(403).json({ error: 'Неверная подпись' });
    }

    let update;
    try {
      update = JSON.parse(raw.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Некорректный JSON' });
    }

    if (update.update_type === 'invoice_paid' && update.payload?.invoice_id) {
      const payment = db
        .prepare('SELECT * FROM payments WHERE cryptobot_invoice_id = ?')
        .get(String(update.payload.invoice_id));
      if (payment) fulfillPayment(payment);
    }

    res.json({ ok: true });
  }
);

app.use(express.json());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

// Legacy HTML entrypoints → SPA (must be before express.static)
app.get(['/login.html', '/login'], (req, res) => {
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(302, '/sign-in' + q);
});
app.get(['/register.html', '/register'], (req, res) => {
  const q = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(302, '/sign-up' + q);
});
app.get(['/cabinet.html', '/cabinet'], (_req, res) => {
  res.redirect(302, '/profile');
});
app.get(['/admin.html'], (_req, res) => {
  res.redirect(302, '/admin');
});

app.use(express.static(path.join(__dirname, 'public')));

const PLAN_DAYS = { trial: 7, month: 30, quarter: 90, lifetime: 36500 };

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
const yacaptchaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Eyeglass error', code: 'eyeglass' },
});

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Сессия истекла' });
  }
}

function getUserRecord(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function roleMiddleware(...roles) {
  return (req, res, next) => {
    const user = getUserRecord(req.user.id);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ error: 'Нет доступа' });
    }
    req.userRecord = user;
    next();
  };
}

function logAction(userId, hwid, ip, action) {
  db.prepare(
    'INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)'
  ).run(userId, hwid || null, ip || null, action);
}

function parseDbDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSubscriptionActive(user) {
  const expires = parseDbDate(user.subscription_expires_at);
  if (!expires) return false;
  return expires > new Date();
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function normalizeKeyCode(key) {
  return String(key || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function formatRole(role) {
  const map = {
    user: 'User',
    media: 'Media',
    moderator: 'Moderator',
    admin: 'Admin',
    owner: 'Owner',
  };
  return map[role] || 'User';
}

function profilePayload(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    hwid: user.hwid,
    plan: user.plan,
    role: user.role,
    roleLabel: formatRole(user.role),
    subscriptionActive: isSubscriptionActive(user),
    subscriptionExpiresAt: user.subscription_expires_at,
    createdAt: user.created_at,
    hwidResetAvailable:
      !user.hwid_reset_at ||
      new Date(user.hwid_reset_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    canDownloadLauncher: isSubscriptionActive(user),
  };
}

function siteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

function getPaymentRecord(id) {
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
}

function resolvePromoPrice(code, basePriceRub) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) {
    return { finalPrice: basePriceRub, promoCode: null, discountPercent: 0 };
  }

  const promo = db.prepare('SELECT * FROM promo_codes WHERE UPPER(code) = ?').get(normalized);
  if (!promo || !promo.active) {
    const err = new Error('Промокод не найден');
    err.code = 'promo_not_found';
    throw err;
  }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    const err = new Error('Промокод истёк');
    err.code = 'promo_expired';
    throw err;
  }
  if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) {
    const err = new Error('Промокод исчерпан');
    err.code = 'promo_exhausted';
    throw err;
  }

  const discount = Math.min(100, Math.max(0, Number(promo.discount_percent) || 0));
  const finalPrice = Math.max(1, Math.round(basePriceRub * (1 - discount / 100)));
  return { finalPrice, promoCode: promo.code, discountPercent: discount };
}

function fulfillPayment(payment) {
  if (!payment || payment.status === 'paid') return;

  const user = getUserRecord(payment.user_id);
  if (!user) return;

  if (payment.plan_key === 'hwid_reset') {
    db.prepare("UPDATE users SET hwid = NULL, hwid_reset_at = datetime('now') WHERE id = ?").run(user.id);
    db.prepare("UPDATE payments SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(payment.id);
    if (payment.promo_code) {
      db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE UPPER(code) = ?').run(
        String(payment.promo_code).toUpperCase()
      );
    }
    logAction(user.id, user.hwid, null, `payment_hwid_reset:${payment.id}`);
    return;
  }

  const shop = Object.values(SHOP_PLANS).find((p) => p.plan === payment.plan_key);
  const days = shop?.days || PLAN_DAYS[payment.plan_key] || 30;
  let base = new Date();
  if (isSubscriptionActive(user)) {
    base = new Date(user.subscription_expires_at);
  }
  const expires = addDays(base, days);

  db.prepare('UPDATE users SET plan = ?, subscription_expires_at = ? WHERE id = ?').run(
    payment.plan_key,
    expires,
    user.id
  );
  db.prepare("UPDATE payments SET status = 'paid', paid_at = datetime('now') WHERE id = ?").run(payment.id);

  if (payment.promo_code) {
    db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE UPPER(code) = ?').run(
      String(payment.promo_code).toUpperCase()
    );
  }

  logAction(user.id, user.hwid, null, `payment_paid:${payment.plan_label}:${payment.id}`);
}

// ── Yacaptcha ──

app.post('/api/yacaptcha/challenge', yacaptchaLimiter, (req, res) => {
  const host = assertYacaptchaHost(req, res);
  if (!host) return;
  purgeYacaptcha();
  const challengeId = crypto.randomBytes(24).toString('hex');
  yacaptchaChallenges.set(challengeId, {
    host,
    expires: Date.now() + YACAPTCHA_TTL_MS,
    solved: false,
  });
  res.json({ challengeId, brand: 'Yacaptcha', ttlMs: YACAPTCHA_TTL_MS });
});

app.post('/api/yacaptcha/solve', yacaptchaLimiter, (req, res) => {
  const host = assertYacaptchaHost(req, res);
  if (!host) return;
  purgeYacaptcha();
  const challengeId = String(req.body?.challengeId || '');
  const row = yacaptchaChallenges.get(challengeId);
  if (!row || row.expires < Date.now() || row.solved || row.host !== host) {
    return res.status(403).json({ error: 'Eyeglass error', code: 'eyeglass' });
  }
  row.solved = true;
  yacaptchaChallenges.delete(challengeId);
  const token = `ya_${crypto.randomBytes(32).toString('hex')}`;
  yacaptchaTokens.set(token, {
    host,
    expires: Date.now() + YACAPTCHA_TTL_MS,
    consumed: false,
  });
  res.json({ token, brand: 'Yacaptcha' });
});

// ── Auth ──

app.post('/api/register', authLimiter, (req, res) => {
  const username = normalizeUsername(req.body.username || req.body.displayName);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const captchaToken = String(req.body.captchaToken || req.body.yacaptchaToken || '');

  // Browser SPA must pass Yacaptcha; native loader / API clients without Origin skip it
  if (req.headers.origin) {
    const host = assertYacaptchaHost(req, res);
    if (!host) return;
    if (!consumeYacaptchaToken(captchaToken, host)) {
      return res.status(403).json({ error: 'Captcha verification failed', code: 'yacaptcha' });
    }
  }

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Заполните все поля', code: 'missing_fields' });
  }
  if (username.length < 3 || password.length < 6) {
    return res.status(400).json({ error: 'Логин от 3 символов, пароль от 6', code: 'validation' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Некорректный email', code: 'invalid_email' });
  }

  const conflict = findRegistrationConflict(username, email);
  if (conflict) {
    return res.status(409).json({ error: conflict.message, code: conflict.code });
  }

  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db
      .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
      .run(username, email, hash);
    const token = jwt.sign(
      { id: result.lastInsertRowid, username, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    logAction(result.lastInsertRowid, null, req.ip, 'register');
    const user = getUserRecord(result.lastInsertRowid);
    res.json({
      token,
      username,
      role: 'user',
      user: profilePayload(user),
    });
  } catch (e) {
    if (e.message && (e.message.includes('UNIQUE') || e.message.includes('idx_users_'))) {
      return res.status(409).json({ error: 'Логин или email уже заняты', code: 'taken' });
    }
    res.status(500).json({ error: 'Ошибка регистрации', code: 'server_error' });
  }
});

app.post('/api/login', authLimiter, (req, res) => {
  const { login, password, username, captchaToken, yacaptchaToken } = req.body;
  const loginRaw = login || username;
  if (!loginRaw || !password) {
    return res.status(400).json({ error: 'Введите логин и пароль' });
  }

  // Browser SPA / loader UI require Yacaptcha; VirtuGuard console gate has no Origin and skips it
  const fromLoaderUi = String(req.headers['x-punch-client'] || '').toLowerCase() === 'loader-ui';
  if (req.headers.origin || fromLoaderUi) {
    const host = assertYacaptchaHost(req, res);
    if (!host) return;
    const captcha = String(captchaToken || yacaptchaToken || '');
    if (!consumeYacaptchaToken(captcha, host)) {
      return res.status(403).json({ error: 'Captcha verification failed', code: 'yacaptcha' });
    }
  }

  const loginTrim = String(loginRaw).trim();
  const loginLower = loginTrim.toLowerCase();
  const emailNorm = normalizeEmail(loginTrim);

  const user = db
    .prepare(
      `SELECT * FROM users
       WHERE LOWER(TRIM(username)) = ? OR LOWER(TRIM(email)) = ?`
    )
    .get(loginLower, emailNorm);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '7d',
  });
  logAction(user.id, user.hwid, req.ip, 'login');
  res.json({
    token,
    username: user.username,
    role: user.role,
    user: profilePayload(user),
  });
});

// ── Loader handoff ──

app.post('/api/loader-handoff', authMiddleware, (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8) {
    return res.status(400).json({ error: 'Некорректная сессия' });
  }
  purgeLoaderSessions();
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  loaderSessions.set(sessionId, {
    token,
    username: req.user.username,
    expires: Date.now() + 5 * 60 * 1000,
  });
  res.json({ ok: true });
});

app.get('/api/loader-handoff/:sessionId', apiLimiter, (req, res) => {
  purgeLoaderSessions();
  const data = loaderSessions.get(req.params.sessionId);
  if (!data || data.expires < Date.now()) {
    loaderSessions.delete(req.params.sessionId);
    return res.status(404).json({ error: 'Ожидание входа' });
  }
  loaderSessions.delete(req.params.sessionId);
  res.json({ token: data.token, username: data.username });
});

// ── Loader remote control (poll channel) ──

const LOADER_CONTROL_PATH = path.join(__dirname, 'data', 'loader-control.json');

function defaultLoaderControl() {
  return {
    version: '0.1.0',
    commandId: 0,
    command: null,
    updatedAt: null,
  };
}

function readLoaderControl() {
  try {
    if (!fs.existsSync(LOADER_CONTROL_PATH)) return defaultLoaderControl();
    const raw = JSON.parse(fs.readFileSync(LOADER_CONTROL_PATH, 'utf8'));
    const state = { ...defaultLoaderControl(), ...raw };
    // Drop stale remote commands so old force_update cannot revive forever
    if (state.command?.createdAt) {
      const age = Date.now() - Date.parse(state.command.createdAt);
      if (!Number.isFinite(age) || age > 15 * 60 * 1000) {
        state.command = null;
        try {
          writeLoaderControl(state);
        } catch {
          /* ignore */
        }
      }
    }
    return state;
  } catch {
    return defaultLoaderControl();
  }
}

function writeLoaderControl(state) {
  fs.mkdirSync(path.dirname(LOADER_CONTROL_PATH), { recursive: true });
  fs.writeFileSync(LOADER_CONTROL_PATH, JSON.stringify(state, null, 2));
}

function issueLoaderCommand(type, message) {
  const state = readLoaderControl();
  state.commandId = Number(state.commandId || 0) + 1;
  state.command = {
    id: state.commandId,
    type,
    message: message || null,
    createdAt: new Date().toISOString(),
  };
  state.updatedAt = state.command.createdAt;
  writeLoaderControl(state);
  return state;
}

app.get('/api/loader/control', authMiddleware, (req, res) => {
  const state = readLoaderControl();
  res.json({
    version: state.version,
    commandId: state.commandId,
    command: state.command,
    updatedAt: state.updatedAt,
    downloadPath: '/api/loader/binary',
  });
});

app.get('/api/loader/binary', authMiddleware, (req, res) => {
  const user = getUserRecord(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (!isSubscriptionActive(user) && user.role !== 'owner' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Нужна активная подписка на клиент' });
  }
  if (!fs.existsSync(LOADER_PATH)) {
    return res.status(503).json({ error: 'Файл лаунчера временно недоступен' });
  }
  return res.download(LOADER_PATH, 'punch-loader.exe');
});

app.get('/api/admin/loader/control', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  const state = readLoaderControl();
  const exeExists = fs.existsSync(LOADER_PATH);
  const zipExists = fs.existsSync(LOADER_ZIP);
  let exeSize = 0;
  try {
    if (exeExists) exeSize = fs.statSync(LOADER_PATH).size;
  } catch {
    /* ignore */
  }
  res.json({
    ...state,
    exeExists,
    zipExists,
    exeSize,
    exeName: 'punch-loader.exe',
  });
});

app.post('/api/admin/loader/command', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  const type = String(req.body?.type || '').trim();
  if (type !== 'force_update' && type !== 'silent_update') {
    return res.status(400).json({ error: 'type must be force_update or silent_update' });
  }
  const message =
    type === 'force_update'
      ? String(req.body?.message || 'Punch has been updated. Please restart loader.').slice(0, 240)
      : null;
  if (type === 'silent_update' && !fs.existsSync(LOADER_PATH) && !fs.existsSync(LOADER_ZIP)) {
    return res.status(503).json({ error: 'Нет файла punch-loader.exe для раздачи' });
  }
  const state = issueLoaderCommand(type, message);
  logAction(req.user.id, null, req.ip, `loader_cmd:${type}:${state.commandId}`);
  res.json({ ok: true, ...state });
});

app.post(
  '/api/admin/loader/publish',
  authMiddleware,
  roleMiddleware('admin', 'owner'),
  express.raw({ type: 'application/octet-stream', limit: '120mb' }),
  (req, res) => {
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    if (buf.length < 64 * 1024) {
      return res.status(400).json({ error: 'Файл слишком маленький (ожидается punch-loader.exe)' });
    }
    fs.mkdirSync(LOADER_DIR, { recursive: true });
    fs.writeFileSync(LOADER_PATH, buf);
    const state = readLoaderControl();
    const nextVersion = String(req.query.version || '').trim() || bumpLoaderVersion(state.version);
    state.version = nextVersion;
    state.updatedAt = new Date().toISOString();
    writeLoaderControl(state);

    let commandState = state;
    if (String(req.query.silent || '') === '1') {
      commandState = issueLoaderCommand('silent_update', null);
      commandState.version = nextVersion;
      writeLoaderControl(commandState);
    }

    logAction(req.user.id, null, req.ip, `loader_publish:${nextVersion}:${buf.length}`);
    res.json({
      ok: true,
      version: commandState.version,
      size: buf.length,
      commandId: commandState.commandId,
      command: commandState.command,
    });
  }
);

function bumpLoaderVersion(v) {
  const parts = String(v || '0.1.0')
    .split('.')
    .map((n) => parseInt(n, 10));
  const major = Number.isFinite(parts[0]) ? parts[0] : 0;
  const minor = Number.isFinite(parts[1]) ? parts[1] : 1;
  const patch = Number.isFinite(parts[2]) ? parts[2] + 1 : 1;
  return `${major}.${minor}.${patch}`;
}

// ── Profile ──

app.get('/api/profile', authMiddleware, (req, res) => {
  const user = getUserRecord(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(profilePayload(user));
});

app.post('/api/change-email', authMiddleware, (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Введите email и пароль' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Некорректный email' });
  }

  const user = getUserRecord(req.user.id);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }

  const taken = db
    .prepare('SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND id != ?')
    .get(email, user.id);
  if (taken) {
    return res.status(409).json({ error: 'Этот email уже зарегистрирован', code: 'email_taken' });
  }

  try {
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, user.id);
    logAction(user.id, user.hwid, req.ip, 'email_change');
    res.json({ success: true, email });
  } catch (e) {
    if (e.message.includes('UNIQUE') || e.message.includes('idx_users_')) {
      return res.status(409).json({ error: 'Этот email уже занят' });
    }
    res.status(500).json({ error: 'Ошибка смены email' });
  }
});

// ── Payments (CryptoBot) ──

app.post('/api/payments/create', authMiddleware, apiLimiter, async (req, res) => {
  const planLabel = String(req.body.plan || '').trim();
  const shop = SHOP_PLANS[planLabel];
  if (!shop) {
    return res.status(400).json({ error: 'Неизвестный тариф' });
  }

  let finalPrice = shop.price;
  let promoCode = null;
  try {
    const resolved = resolvePromoPrice(req.body.promoCode, shop.price);
    finalPrice = resolved.finalPrice;
    promoCode = resolved.promoCode;
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Промокод недействителен' });
  }

  if (Number(req.body.price) !== finalPrice) {
    return res.status(400).json({ error: 'Неверная цена тарифа' });
  }

  const user = getUserRecord(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const payMethod = String(req.body.method || 'cryptobot').toLowerCase();
  const origin = siteOrigin(req);

  const created = db
    .prepare(
      `INSERT INTO payments (user_id, plan_label, plan_key, amount_rub, pay_method, status, promo_code)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(user.id, planLabel, shop.plan, finalPrice, payMethod, promoCode);

  const orderId = created.lastInsertRowid;
  const payload = JSON.stringify({ orderId, userId: user.id, plan: shop.plan });
  const paidBtnUrl = cryptobot.safePaidBtnUrl(origin);

  if (!cryptobot.getToken()) {
    const payUrl = cryptobot.manualPayUrl();
    db.prepare(`UPDATE payments SET pay_url = ?, payload = ? WHERE id = ?`).run(payUrl, payload, orderId);
    logAction(user.id, user.hwid, req.ip, `payment_manual:${orderId}`);
    return res.json({
      orderId,
      payUrl,
      manual: true,
      plan: planLabel,
      amountRub: finalPrice,
      hint: 'Добавь CRYPTO_PAY_API_TOKEN для автоматических счетов',
    });
  }

  try {
    const { invoice, mode } = await cryptobot.createInvoiceSmart({
      amountRub: finalPrice,
      description: `Punch — ${planLabel}`,
      payload,
      paidBtnUrl,
    });

    const payUrl = cryptobot.invoicePayUrl(invoice);

    db.prepare(
      `UPDATE payments
       SET cryptobot_invoice_id = ?, pay_url = ?, payload = ?, pay_method = ?
       WHERE id = ?`
    ).run(String(invoice.invoice_id), payUrl, payload, `${payMethod}:${mode}`, orderId);

    logAction(user.id, user.hwid, req.ip, `payment_create:${orderId}`);

    res.json({
      orderId,
      payUrl,
      invoiceId: invoice.invoice_id,
      mode,
    });
  } catch (e) {
    const payUrl = cryptobot.manualPayUrl();
    db.prepare(`UPDATE payments SET pay_url = ?, payload = ?, status = 'pending' WHERE id = ?`).run(
      payUrl,
      payload,
      orderId
    );
    logAction(user.id, user.hwid, req.ip, `payment_fallback:${orderId}`);
    res.json({
      orderId,
      payUrl,
      manual: true,
      plan: planLabel,
      amountRub: finalPrice,
      warning: e.message,
    });
  }
});

app.get('/api/payments/:id', authMiddleware, apiLimiter, async (req, res) => {
  const id = Number(req.params.id);
  let payment = getPaymentRecord(id);
  if (!payment || payment.user_id !== req.user.id) {
    return res.status(404).json({ error: 'Заказ не найден' });
  }

  if (payment.status === 'pending' && payment.cryptobot_invoice_id && cryptobot.getToken()) {
    try {
      const invoice = await cryptobot.getInvoice(payment.cryptobot_invoice_id);
      if (invoice?.status === 'paid') {
        fulfillPayment(payment);
        payment = getPaymentRecord(id);
      }
    } catch {
      /* polling fallback */
    }
  }

  res.json({
    id: payment.id,
    status: payment.status,
    plan: payment.plan_label,
    amountRub: payment.amount_rub,
    payUrl: payment.pay_url,
    paidAt: payment.paid_at,
  });
});

// ── Promo validate ──

app.post('/api/promo/validate', apiLimiter, (req, res) => {
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ error: 'Введите промокод' });

  const promo = db.prepare('SELECT * FROM promo_codes WHERE UPPER(code) = ?').get(code);
  if (!promo || !promo.active) {
    return res.status(404).json({ error: 'Промокод не найден' });
  }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Промокод истёк' });
  }
  if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) {
    return res.status(410).json({ error: 'Промокод исчерпан' });
  }
  res.json({ valid: true, discountPercent: promo.discount_percent, code: promo.code });
});

// ── Launcher chat ──

app.get('/api/launcher/chat', authMiddleware, apiLimiter, (req, res) => {
  const since = Number(req.query.since) || 0;
  const messages = db
    .prepare(
      `SELECT id, user_id, username, message, created_at
       FROM launcher_chat WHERE id > ? ORDER BY id ASC LIMIT 120`
    )
    .all(since);
  res.json({ messages });
});

app.post('/api/launcher/chat', authMiddleware, apiLimiter, (req, res) => {
  const text = String(req.body.message || '').trim();
  if (!text) return res.status(400).json({ error: 'Пустое сообщение' });
  if (text.length > 500) return res.status(400).json({ error: 'Слишком длинное сообщение' });

  const user = getUserRecord(req.user.id);
  const result = db
    .prepare('INSERT INTO launcher_chat (user_id, username, message) VALUES (?, ?, ?)')
    .run(user.id, user.username, text);

  logAction(user.id, user.hwid, req.ip, 'launcher_chat');
  res.json({
    id: result.lastInsertRowid,
    user_id: user.id,
    username: user.username,
    message: text,
    created_at: new Date().toISOString(),
  });
});

// ── Download launcher ──

function sendLauncherDownload(req, res) {
  const user = getUserRecord(req.user.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  if (!isSubscriptionActive(user) && user.role !== 'owner' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Нужна активная подписка на клиент' });
  }
  if (!fs.existsSync(LOADER_PATH)) {
    return res.status(503).json({ error: 'Файл лаунчера временно недоступен' });
  }
  logAction(user.id, user.hwid, req.ip, 'launcher_download');
  return res.download(LOADER_PATH, 'punch-loader.exe');
}

app.get('/api/download/launcher', authMiddleware, sendLauncherDownload);
app.get('/api/profile/loader/download', authMiddleware, sendLauncherDownload);

// ── Download client JAR (auth + subscription) ──

app.get('/api/download/client', authMiddleware, async (req, res) => {
  const user = getUserRecord(req.user.id);
  if (!isSubscriptionActive(user) && user.role !== 'owner' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Нужна активная подписка на клиент' });
  }

  logAction(user.id, user.hwid, req.ip, 'client_download');

  if (fs.existsSync(CLIENT_JAR_PATH)) {
    return res.download(CLIENT_JAR_PATH, 'punch-client.jar');
  }

  if (CLIENT_JAR_URL) {
    try {
      const upstream = await fetch(CLIENT_JAR_URL);
      if (!upstream.ok) {
        return res.status(503).json({ error: 'Клиент временно недоступен' });
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', 'application/java-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="punch-client.jar"');
      res.setHeader('Content-Length', buf.length);
      return res.send(buf);
    } catch {
      return res.status(503).json({ error: 'Клиент временно недоступен' });
    }
  }

  return res.status(503).json({ error: 'Клиент временно недоступен' });
});

// ── Download Fabric API (auth + subscription) ──

app.get('/api/download/fabric-api', authMiddleware, async (req, res) => {
  const user = getUserRecord(req.user.id);
  if (!isSubscriptionActive(user)) {
    return res.status(403).json({ error: 'Нужна активная подписка на клиент' });
  }

  logAction(user.id, user.hwid, req.ip, 'fabric_api_download');

  if (fs.existsSync(FABRIC_API_PATH)) {
    return res.download(FABRIC_API_PATH, 'fabric-api-0.119.4-1.21.4.jar');
  }

  if (FABRIC_API_URL) {
    try {
      const upstream = await fetch(FABRIC_API_URL);
      if (!upstream.ok) {
        return res.status(503).json({ error: 'Fabric API временно недоступен' });
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', 'application/java-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="fabric-api-0.119.4-1.21.4.jar"');
      res.setHeader('Content-Length', buf.length);
      return res.send(buf);
    } catch {
      return res.status(503).json({ error: 'Fabric API временно недоступен' });
    }
  }

  return res.status(503).json({ error: 'Fabric API временно недоступен' });
});

// ── Key activation ──

app.post('/api/activate-key', authMiddleware, (req, res) => {
  const { key } = req.body;
  if (!key?.trim()) return res.status(400).json({ error: 'Введите ключ' });

  const keyCode = normalizeKeyCode(key);
  if (!keyCode) return res.status(400).json({ error: 'Введите ключ' });

  const license = db
    .prepare('SELECT * FROM license_keys WHERE UPPER(key_code) = ?')
    .get(keyCode);

  if (!license) return res.status(404).json({ error: 'Ключ не найден' });
  if (license.used_by) return res.status(409).json({ error: 'Ключ уже использован' });

  const user = getUserRecord(req.user.id);
  const now = new Date();
  let base = now;
  if (isSubscriptionActive(user)) {
    base = new Date(user.subscription_expires_at);
  }
  const expires = addDays(base, license.duration_days);

  db.prepare('UPDATE license_keys SET used_by = ?, used_at = datetime(\'now\') WHERE id = ?')
    .run(user.id, license.id);
  db.prepare('UPDATE users SET plan = ?, subscription_expires_at = ? WHERE id = ?').run(
    license.plan,
    expires,
    user.id
  );

  logAction(user.id, user.hwid, req.ip, `activate:${license.plan}`);
  res.json({
    success: true,
    plan: license.plan,
    subscriptionExpiresAt: expires,
  });
});

// ── HWID ──

app.post('/api/bind-hwid', authMiddleware, (req, res) => {
  const { hwid } = req.body;
  if (!hwid?.trim()) return res.status(400).json({ error: 'HWID не указан' });

  const user = getUserRecord(req.user.id);
  if (!isSubscriptionActive(user)) {
    return res.status(403).json({ error: 'Нет активной подписки' });
  }

  if (user.hwid && user.hwid !== hwid.trim()) {
    const canReset =
      !user.hwid_reset_at ||
      new Date(user.hwid_reset_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (!canReset) {
      return res.status(403).json({
        error: 'HWID уже привязан. Сброс доступен раз в 30 дней',
      });
    }
    db.prepare('UPDATE users SET hwid = ?, hwid_reset_at = datetime(\'now\') WHERE id = ?')
      .run(hwid.trim(), user.id);
    logAction(user.id, hwid, req.ip, 'hwid_reset');
    return res.json({ success: true, hwid: hwid.trim(), reset: true });
  }

  if (!user.hwid) {
    db.prepare('UPDATE users SET hwid = ? WHERE id = ?').run(hwid.trim(), user.id);
    logAction(user.id, hwid, req.ip, 'hwid_bind');
  }

  res.json({ success: true, hwid: hwid.trim() });
});

// ── Client verification ──

app.post('/api/verify', apiLimiter, (req, res) => {
  const { username, hwid } = req.body;
  if (!username || !hwid) {
    return res.status(400).json({ valid: false, error: 'missing_params' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) return res.json({ valid: false, error: 'user_not_found' });
  if (!isSubscriptionActive(user)) return res.json({ valid: false, error: 'no_subscription' });
  if (!user.hwid) return res.json({ valid: false, error: 'hwid_not_bound' });
  if (user.hwid !== hwid.trim()) return res.json({ valid: false, error: 'hwid_mismatch' });

  logAction(user.id, hwid, req.ip, 'client_verify');
  res.json({
    valid: true,
    plan: user.plan,
    expires: user.subscription_expires_at,
  });
});

// ── Admin API ──

app.get('/api/admin/dashboard', authMiddleware, roleMiddleware('admin', 'moderator', 'owner'), (req, res) => {
  const users = db
    .prepare(
      `SELECT id, username, email, plan, role, hwid, subscription_expires_at, created_at
       FROM users ORDER BY id DESC LIMIT 500`
    )
    .all()
    .map((u) => ({
      uid: u.id,
      id: String(u.id),
      displayName: u.username,
      email: u.email,
      role: u.role === 'owner' ? 'Owner' : u.role === 'admin' ? 'Admin' : u.role === 'moderator' ? 'Helper' : u.role === 'media' ? 'Youtube' : 'User',
      subscriptionTier: u.plan && u.plan !== 'none' ? u.plan : 'User',
      createdAt: u.created_at,
      hardwareId: u.hwid,
      subscriptionTill: u.subscription_expires_at,
      twoFactorEnabled: false,
      isBanned: false,
      banReason: null,
      isSystemOwner: u.role === 'owner',
      lastSeen: null,
    }));

  const licenseKeys = db
    .prepare(
      `SELECT k.*, u.username AS used_by_name
       FROM license_keys k LEFT JOIN users u ON u.id = k.used_by
       ORDER BY k.id DESC LIMIT 500`
    )
    .all()
    .map((k) => ({
      id: String(k.id),
      code: k.key_code,
      product: k.plan,
      subscriptionTier: 'Premium',
      duration: `${k.duration_days}d`,
      status: k.used_by ? 'assigned' : 'unused',
      assignedTo: k.used_by_name || null,
      createdAt: k.created_at,
      note: null,
    }));

  const promoCodes = db
    .prepare('SELECT * FROM promo_codes ORDER BY id DESC LIMIT 200')
    .all()
    .map((p) => ({
      id: String(p.id),
      code: p.code,
      discountPercent: p.discount_percent,
      maxUses: p.max_uses,
      uses: p.used_count,
      status: p.active ? 'active' : 'paused',
      expiresAt: p.expires_at,
    }));

  const logs = db
    .prepare(
      `SELECT l.*, u.username
       FROM sessions_log l LEFT JOIN users u ON u.id = l.user_id
       ORDER BY l.id DESC LIMIT 200`
    )
    .all()
    .map((l) => ({
      id: String(l.id),
      actorLabel: l.username || String(l.user_id || '—'),
      category: 'system',
      action: l.action,
      message: l.action,
      details: l.hwid,
      entityLabel: l.ip,
      createdAt: l.created_at,
    }));

  res.json({
    data: {
      users,
      onlineConnections: [],
      licenseKeys,
      promoCodes,
      launcherVersions: [],
      updateArtifacts: [],
      logs,
      sales: [],
      salesSummary: {
        revenueTotal: 0,
        completedCount: 0,
        pendingCount: 0,
        unpaidCount: 0,
        completedToday: 0,
        completedThisWeek: 0,
      },
    },
  });
});

app.get('/api/admin/stats', authMiddleware, roleMiddleware('admin', 'moderator', 'owner'), (req, res) => {
  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const active = db
    .prepare(
      "SELECT COUNT(*) AS c FROM users WHERE subscription_expires_at IS NOT NULL AND datetime(subscription_expires_at) > datetime('now')"
    )
    .get().c;
  const keys = db.prepare('SELECT COUNT(*) AS c FROM license_keys WHERE used_by IS NULL').get().c;
  const promos = db.prepare('SELECT COUNT(*) AS c FROM promo_codes WHERE active = 1').get().c;
  res.json({ users, activeSubscriptions: active, unusedKeys: keys, activePromos: promos });
});

app.get('/api/admin/users', authMiddleware, roleMiddleware('admin', 'moderator', 'owner'), (req, res) => {
  const search = String(req.query.search || '').trim();
  let rows;
  if (search) {
    const q = `%${search}%`;
    rows = db
      .prepare(
        `SELECT id, username, email, plan, role, hwid, subscription_expires_at, created_at
         FROM users WHERE username LIKE ? OR email LIKE ? OR CAST(id AS TEXT) = ?
         ORDER BY id DESC LIMIT 100`
      )
      .all(q, q, search);
  } else {
    rows = db
      .prepare(
        `SELECT id, username, email, plan, role, hwid, subscription_expires_at, created_at
         FROM users ORDER BY id DESC LIMIT 100`
      )
      .all();
  }
  res.json({
    users: rows.map((u) => ({
      ...u,
      roleLabel: formatRole(u.role),
      subscriptionActive: u.subscription_expires_at
        ? new Date(u.subscription_expires_at) > new Date()
        : false,
    })),
  });
});

app.patch('/api/admin/users/:id', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  const id = Number(req.params.id);
  const { role, plan, subscriptionExpiresAt } = req.body;
  const user = getUserRecord(id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  if (role && VALID_ROLES.includes(role)) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }
  if (plan) {
    db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, id);
  }
  if (subscriptionExpiresAt !== undefined) {
    if (!subscriptionExpiresAt) {
      db.prepare("UPDATE users SET subscription_expires_at = NULL, plan = 'none' WHERE id = ?").run(id);
    } else {
      const iso = addDays(subscriptionExpiresAt, 0);
      db.prepare('UPDATE users SET subscription_expires_at = ? WHERE id = ?').run(iso, id);
    }
  }
  logAction(req.user.id, null, req.ip, `admin_update_user:${id}`);
  res.json({ success: true, user: profilePayload(getUserRecord(id)) });
});

app.get('/api/admin/keys', authMiddleware, roleMiddleware('admin', 'moderator', 'owner'), (req, res) => {
  const keys = db
    .prepare(
      `SELECT k.*, u.username AS used_by_name
       FROM license_keys k LEFT JOIN users u ON u.id = k.used_by
       ORDER BY k.id DESC LIMIT 200`
    )
    .all();
  res.json({ keys });
});

app.post('/api/admin/keys', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  const { plan, durationDays, count } = req.body;
  const validPlans = ['trial', 'month', 'quarter', 'lifetime'];
  if (!validPlans.includes(plan)) return res.status(400).json({ error: 'Неверный план' });

  const days = Number(durationDays) || PLAN_DAYS[plan] || 30;
  const keys = [];
  const insert = db.prepare(
    'INSERT INTO license_keys (key_code, plan, duration_days) VALUES (?, ?, ?)'
  );
  const n = Math.min(Math.max(Number(count) || 1, 1), 50);
  for (let i = 0; i < n; i++) {
    const k = generateKey();
    insert.run(k, plan, days);
    keys.push(k);
  }
  logAction(req.user.id, null, req.ip, `admin_gen_keys:${n}`);
  res.json({ keys });
});

app.get('/api/admin/promos', authMiddleware, roleMiddleware('admin', 'moderator', 'owner'), (req, res) => {
  const promos = db.prepare('SELECT * FROM promo_codes ORDER BY id DESC').all();
  res.json({ promos });
});

app.post('/api/admin/promos', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  const { code, discountPercent, maxUses, expiresAt } = req.body;
  if (!code?.trim() || discountPercent == null) {
    return res.status(400).json({ error: 'Заполните код и скидку' });
  }
  try {
    const normalized = code.trim().toUpperCase();
    const discount = Math.min(100, Math.max(1, Number(discountPercent)));
    const usesCap = Math.max(1, Number(maxUses) || 1);
    const result = db
      .prepare(
        'INSERT INTO promo_codes (code, discount_percent, max_uses, expires_at, created_by, active) VALUES (?, ?, ?, ?, ?, 1)'
      )
      .run(normalized, discount, usesCap, expiresAt || null, req.user.id);
    logAction(req.user.id, null, req.ip, `admin_promo:${normalized}`);
    const promo = db.prepare('SELECT * FROM promo_codes WHERE id = ?').get(result.lastInsertRowid);
    res.json({
      id: result.lastInsertRowid,
      code: normalized,
      promo: {
        id: String(promo.id),
        code: promo.code,
        discountPercent: promo.discount_percent,
        maxUses: promo.max_uses,
        uses: promo.used_count,
        status: promo.active ? 'active' : 'paused',
        expiresAt: promo.expires_at,
      },
    });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Промокод уже существует' });
    }
    res.status(500).json({ error: 'Ошибка создания' });
  }
});

app.patch('/api/admin/promos/:id', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM promo_codes WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Промокод не найден' });

  const discount =
    req.body.discountPercent != null
      ? Math.min(100, Math.max(1, Number(req.body.discountPercent)))
      : existing.discount_percent;
  const maxUses =
    req.body.maxUses != null ? Math.max(1, Number(req.body.maxUses) || 1) : existing.max_uses;
  const usedCount =
    req.body.usedCount != null
      ? Math.max(0, Number(req.body.usedCount) || 0)
      : existing.used_count;
  const active =
    req.body.active != null ? (req.body.active ? 1 : 0) : existing.active;
  const expiresAt =
    Object.prototype.hasOwnProperty.call(req.body, 'expiresAt')
      ? req.body.expiresAt || null
      : existing.expires_at;

  db.prepare(
    `UPDATE promo_codes
     SET discount_percent = ?, max_uses = ?, used_count = ?, active = ?, expires_at = ?
     WHERE id = ?`
  ).run(discount, maxUses, usedCount, active, expiresAt, id);

  const promo = db.prepare('SELECT * FROM promo_codes WHERE id = ?').get(id);
  logAction(req.user.id, null, req.ip, `admin_promo_edit:${promo.code}`);
  res.json({
    success: true,
    promo: {
      id: String(promo.id),
      code: promo.code,
      discountPercent: promo.discount_percent,
      maxUses: promo.max_uses,
      uses: promo.used_count,
      status: promo.active ? 'active' : 'paused',
      expiresAt: promo.expires_at,
    },
  });
});

app.delete('/api/admin/promos/:id', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM promo_codes WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Промокод не найден' });
  db.prepare('DELETE FROM promo_codes WHERE id = ?').run(id);
  logAction(req.user.id, null, req.ip, `admin_promo_del:${existing.code}`);
  res.json({ success: true });
});

app.patch('/api/admin/keys/:id', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM license_keys WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Ключ не найден' });

  const validPlans = ['trial', 'month', 'quarter', 'lifetime'];
  const plan = validPlans.includes(req.body.plan) ? req.body.plan : existing.plan;
  const durationDays =
    req.body.durationDays != null
      ? Math.max(1, Number(req.body.durationDays) || existing.duration_days)
      : existing.duration_days;

  db.prepare('UPDATE license_keys SET plan = ?, duration_days = ? WHERE id = ?').run(
    plan,
    durationDays,
    id
  );
  const key = db
    .prepare(
      `SELECT k.*, u.username AS used_by_name
       FROM license_keys k LEFT JOIN users u ON u.id = k.used_by
       WHERE k.id = ?`
    )
    .get(id);
  logAction(req.user.id, null, req.ip, `admin_key_edit:${key.key_code}`);
  res.json({
    success: true,
    key: {
      id: String(key.id),
      code: key.key_code,
      product: key.plan,
      subscriptionTier: 'Premium',
      duration: `${key.duration_days}d`,
      status: key.used_by ? 'assigned' : 'unused',
      assignedTo: key.used_by_name || null,
      createdAt: key.created_at,
      note: null,
    },
  });
});

app.delete('/api/admin/keys/:id', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM license_keys WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Ключ не найден' });
  db.prepare('DELETE FROM license_keys WHERE id = ?').run(id);
  logAction(req.user.id, null, req.ip, `admin_key_del:${existing.key_code}`);
  res.json({ success: true });
});

app.get('/api/admin/logs', authMiddleware, roleMiddleware('admin', 'moderator', 'owner'), (req, res) => {
  const logs = db
    .prepare(
      `SELECT s.*, u.username FROM sessions_log s
       LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.id DESC LIMIT 100`
    )
    .all();
  res.json({ logs });
});

app.get('/api/admin/ebd', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  res.json(getEbdInfo());
});

app.post('/api/admin/ebd/dedupe', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  const removed = dedupeEbd();
  logAction(req.user.id, null, req.ip, `ebd_dedupe:${removed}`);
  res.json({ removed, ebd: getEbdInfo() });
});

app.get('/api/admin/ebd/backup', authMiddleware, roleMiddleware('admin', 'owner'), (req, res) => {
  if (!fs.existsSync(DB_PATH)) {
    return res.status(404).json({ error: 'База не найдена' });
  }
  logAction(req.user.id, null, req.ip, 'ebd_backup');
  res.download(DB_PATH, 'punch-ebd.db');
});

// Legacy admin endpoint
app.post('/api/admin/generate-keys', (req, res) => {
  const { secret, plan, durationDays, count } = req.body;
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: 'Forbidden' });

  const validPlans = ['trial', 'month', 'quarter', 'lifetime'];
  if (!validPlans.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });

  const keys = [];
  const insert = db.prepare(
    'INSERT INTO license_keys (key_code, plan, duration_days) VALUES (?, ?, ?)'
  );
  for (let i = 0; i < (count || 1); i++) {
    const k = generateKey();
    insert.run(k, plan, durationDays || 30);
    keys.push(k);
  }
  res.json({ keys });
});

// SPA fallback for Vite frontend (after API routes; keep /downloads and real files)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.path.startsWith('/downloads')) return next();
  const spaIndex = path.join(__dirname, 'public', 'index.html');
  if (!fs.existsSync(spaIndex)) return next();
  const filePath = path.join(__dirname, 'public', req.path);
  if (req.path !== '/' && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return res.sendFile(filePath);
  }
  res.sendFile(spaIndex);
});

app.listen(PORT, () => {
  const admin = ensureAdminAccount();
  console.log(`Punch site → http://localhost:${PORT}`);
  console.log(`Punch EBD  → ${DB_PATH}`);
  if (admin?.created) {
    console.log(`Punch admin → ${admin.username} / ${admin.password}`);
  } else {
    console.log(`Punch admin → ${admin.username} (already exists)`);
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nПорт ${PORT} уже занят. Закрой другой сервер или выполни:`);
    console.error(`  netstat -ano | findstr :${PORT}`);
    console.error(`  taskkill /PID <номер> /F\n`);
    process.exit(1);
  }
  throw err;
});
