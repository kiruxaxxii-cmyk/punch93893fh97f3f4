import { apiJson, getUserFromRequest, requireRole, db, VALID_ROLES, profilePayload, logAction } from '@/lib/core';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function PATCH(req, { params }) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }
  if (!requireRole(user, ['admin', 'owner'])) {
    return apiJson({ error: 'Нет доступа' }, 403);
  }

  const { id } = await params;
  const numId = Number(id);
  let body;
  try {
    body = await req.json();
  } catch {
    return apiJson({ error: 'Некорректный запрос' }, 400);
  }

  const { role, plan, subscriptionExpiresAt, password } = body;
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(numId);
  if (!target) return apiJson({ error: 'Пользователь не найден' }, 404);

  if (role && VALID_ROLES.includes(role)) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, numId);
  }
  if (plan) {
    db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, numId);
  }
  if (subscriptionExpiresAt !== undefined) {
    if (!subscriptionExpiresAt) {
      db.prepare("UPDATE users SET subscription_expires_at = NULL, plan = 'none' WHERE id = ?").run(numId);
    } else {
      const d = new Date(subscriptionExpiresAt);
      d.setDate(d.getDate() + 0);
      db.prepare('UPDATE users SET subscription_expires_at = ? WHERE id = ?').run(d.toISOString(), numId);
    }
  }
  if (password && password.length >= 4) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, numId);
  }
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
    user.id,
    null,
    ip,
    `admin_update_user:${numId}`
  );
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(numId);
  return apiJson({ success: true, user: profilePayload(updated) });
}
