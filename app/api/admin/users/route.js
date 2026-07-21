import { apiJson, getUserFromRequest, requireRole, db, formatRole } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }
  if (!requireRole(user, ['admin', 'moderator', 'owner'])) {
    return apiJson({ error: 'Нет доступа' }, 403);
  }

  const search = String(req.nextUrl.searchParams.get('search') || '').trim();
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
  return apiJson({
    users: rows.map((u) => ({
      ...u,
      roleLabel: formatRole(u.role),
      subscriptionActive: u.subscription_expires_at
        ? new Date(u.subscription_expires_at) > new Date()
        : false,
    })),
  });
}
