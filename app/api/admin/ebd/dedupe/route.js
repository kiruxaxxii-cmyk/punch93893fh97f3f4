import { apiJson, getUserFromRequest, requireRole, getEbdInfo, dedupeEbd, logAction } from '@/lib/core';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }
  if (!requireRole(user, ['admin', 'owner'])) {
    return apiJson({ error: 'Нет доступа' }, 403);
  }

  const removed = dedupeEbd();
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
    user.id,
    null,
    ip,
    `ebd_dedupe:${removed}`
  );
  return apiJson({ removed, ebd: getEbdInfo() });
}
