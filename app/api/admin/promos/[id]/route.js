import { apiJson, getUserFromRequest, requireRole, db } from '@/lib/core';

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

  const { active } = body;
  db.prepare('UPDATE promo_codes SET active = ? WHERE id = ?').run(active ? 1 : 0, numId);
  return apiJson({ success: true });
}
