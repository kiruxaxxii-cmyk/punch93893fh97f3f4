import { db, DB_PATH, generateKey, normalizeEmail, normalizeUsername, isValidEmail, findRegistrationConflict, getEbdInfo, dedupeEbd } from './db';
import * as cryptobot from './cryptobot';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'node:path';

export { db, DB_PATH, generateKey, normalizeEmail, normalizeUsername, isValidEmail, findRegistrationConflict, getEbdInfo, dedupeEbd };

export const JWT_SECRET = process.env.JWT_SECRET || 'punch-dev-secret-change-in-production';
export const ADMIN_SECRET = process.env.ADMIN_SECRET || 'punch-admin-dev';

export const LOADER_DIR = path.join(process.cwd(), 'public', 'downloads');
export const LOADER_PATH = path.join(LOADER_DIR, 'punch-loader.exe');
export const LOADER_ZIP = path.join(LOADER_DIR, 'punch-loader.zip');
export const CLIENT_JAR_PATH = process.env.CLIENT_JAR_PATH || path.join(LOADER_DIR, 'punch-1.2 (2)-obf.jar');
export const CLIENT_JAR_URL = process.env.CLIENT_JAR_URL || 'https://raw.githubusercontent.com/kiruxaxxii-cmyk/fg7fd6gdfhg8d483g5835g/main/punch-client.jar';

export const SHOP_PLANS = {
  '7 дней': { plan: 'trial', days: 7, price: 49 },
  '1 месяц': { plan: 'month', days: 30, price: 99 },
  '3 месяца': { plan: 'quarter', days: 90, price: 149 },
  'Навсегда': { plan: 'lifetime', days: 36500, price: 219 },
  'Сброс HWID': { plan: 'hwid_reset', days: 0, price: 100 },
};

export const PLAN_DAYS = { trial: 7, month: 30, quarter: 90, lifetime: 36500 };

export const VALID_ROLES = ['user', 'media', 'moderator', 'admin', 'owner'];

// Регионы, которым запрещён вход (только Болгария). Все остальные разрешены, включая РФ.
export const BLOCKED_COUNTRIES = new Set(['BG', 'BGR']);

export function getCountryFromRequest(req) {
  const candidates = [
    req.headers.get('cf-ipcountry'),
    req.headers.get('x-vercel-ip-country'),
    req.headers.get('x-country'),
    req.headers.get('x-geo-country'),
  ];
  for (const c of candidates) {
    if (c && c.trim() && c.trim().toUpperCase() !== 'XX' && c.trim().toUpperCase() !== 'UNKNOWN') {
      return c.trim().toUpperCase();
    }
  }
  return null;
}

export function isCountryBlocked(req) {
  const country = getCountryFromRequest(req);
  if (!country) return false;
  return BLOCKED_COUNTRIES.has(country);
}

export const loaderSessions = new Map();

export function purgeLoaderSessions() {
  const now = Date.now();
  for (const [id, data] of loaderSessions) {
    if (data.expires < now) loaderSessions.delete(id);
  }
}

export function getUserRecord(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getUserByCredentials(login, password) {
  if (!login || !password) return null;
  const loginTrim = String(login).trim();
  const loginLower = loginTrim.toLowerCase();
  const emailNorm = normalizeEmail(loginTrim);

  const user = db
    .prepare(
      `SELECT * FROM users
       WHERE LOWER(TRIM(username)) = ? OR LOWER(TRIM(email)) = ?`
    )
    .get(loginLower, emailNorm);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  return user;
}

export function parseDbDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isSubscriptionActive(user) {
  const expires = parseDbDate(user.subscription_expires_at);
  if (!expires) return false;
  return expires > new Date();
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function formatRole(role) {
  const map = {
    user: 'User',
    media: 'Media',
    moderator: 'Moderator',
    admin: 'Admin',
    owner: 'Owner',
  };
  return map[role] || 'User';
}

export function profilePayload(user) {
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

export function siteOrigin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') || req.headers.get('x-forwarded-protocol') || 'http';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  return `${proto}://${host}`;
}

export function getPaymentRecord(id) {
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
}

export function resolvePromoPrice(code, basePriceRub) {
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

export function fulfillPayment(payment) {
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

export function logAction(userId, hwid, ip, action) {
  db.prepare(
    'INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)'
  ).run(userId, hwid || null, ip || null, action);
}

export function normalizeKeyCode(key) {
  return String(key || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

// ── Auth helpers ──

export function getUserFromRequest(req) {
  const header = req.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    const user = getUserRecord(decoded.id);
    return user || null;
  } catch {
    return null;
  }
}

export function requireRole(user, roles) {
  if (!user) return false;
  return roles.includes(user.role);
}

// ── Rate limiter ──

export function makeLimiter(windowMs, max) {
  const hits = new Map();
  return async function limiter(req) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
    const now = Date.now();
    const entry = hits.get(ip) || { count: 0, start: now };
    if (now - entry.start > windowMs) {
      entry.count = 0;
      entry.start = now;
    }
    entry.count += 1;
    hits.set(ip, entry);
    return entry.count <= max;
  };
}

export const authLimiter = makeLimiter(15 * 60 * 1000, 30);
export const apiLimiter = makeLimiter(60 * 1000, 60);

// ── JSON response helper with cache headers ──

export function apiJson(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
