import { apiJson, getUserFromRequest, requireRole, db } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }
  if (!requireRole(user, ['admin', 'moderator', 'owner'])) {
    return apiJson({ error: 'Нет доступа' }, 403);
  }

  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const active = db
    .prepare(
      "SELECT COUNT(*) AS c FROM users WHERE subscription_expires_at IS NOT NULL AND datetime(subscription_expires_at) > datetime('now')"
    )
    .get().c;
  const keys = db.prepare('SELECT COUNT(*) AS c FROM license_keys WHERE used_by IS NULL').get().c;
  const promos = db.prepare('SELECT COUNT(*) AS c FROM promo_codes WHERE active = 1').get().c;
  return apiJson({ users, activeSubscriptions: active, unusedKeys: keys, activePromos: promos });
}
