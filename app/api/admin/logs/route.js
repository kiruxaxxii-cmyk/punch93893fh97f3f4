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

  const logs = db
    .prepare(
      `SELECT s.*, u.username FROM sessions_log s
       LEFT JOIN users u ON u.id = s.user_id
       ORDER BY s.id DESC LIMIT 100`
    )
    .all();
  return apiJson({ logs });
}
