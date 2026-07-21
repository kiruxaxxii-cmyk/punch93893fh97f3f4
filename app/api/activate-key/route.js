import { apiJson, getUserFromRequest, getUserRecord, normalizeKeyCode, isSubscriptionActive, addDays, db } from '@/lib/core';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return apiJson({ error: 'Некорректный запрос' }, 400);
  }

  const { key } = body;
  if (!key?.trim()) return apiJson({ error: 'Введите ключ' }, 400);

  const keyCode = normalizeKeyCode(key);
  if (!keyCode) return apiJson({ error: 'Введите ключ' }, 400);

  const license = db
    .prepare('SELECT * FROM license_keys WHERE UPPER(key_code) = ?')
    .get(keyCode);

  if (!license) return apiJson({ error: 'Ключ не найден' }, 404);
  if (license.used_by) return apiJson({ error: 'Ключ уже использован' }, 409);

  const record = getUserRecord(user.id);
  const now = new Date();
  let base = now;
  if (isSubscriptionActive(record)) {
    base = new Date(record.subscription_expires_at);
  }
  const expires = addDays(base, license.duration_days);

  db.prepare("UPDATE license_keys SET used_by = ?, used_at = datetime('now') WHERE id = ?")
    .run(record.id, license.id);
  db.prepare('UPDATE users SET plan = ?, subscription_expires_at = ? WHERE id = ?').run(
    license.plan,
    expires,
    record.id
  );

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
    record.id,
    record.hwid,
    ip,
    `activate:${license.plan}`
  );
  return apiJson({
    success: true,
    plan: license.plan,
    subscriptionExpiresAt: expires,
  });
}
