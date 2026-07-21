import { apiJson, getUserFromRequest, requireRole, db, generateKey, PLAN_DAYS, logAction } from '@/lib/core';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }
  if (!requireRole(user, ['admin', 'owner'])) {
    return apiJson({ error: 'Нет доступа' }, 403);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return apiJson({ error: 'Некорректный запрос' }, 400);
  }

  const { plan, durationDays, count } = body;
  const validPlans = ['trial', 'month', 'quarter', 'lifetime'];
  if (!validPlans.includes(plan)) return apiJson({ error: 'Неверный план' }, 400);

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
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
    user.id,
    null,
    ip,
    `admin_gen_keys:${n}`
  );
  return apiJson({ keys });
}
