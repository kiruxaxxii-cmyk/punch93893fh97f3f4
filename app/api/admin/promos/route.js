import { apiJson, getUserFromRequest, requireRole, db, logAction } from '@/lib/core';

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

  const { code, discountPercent, maxUses, expiresAt } = body;
  if (!code?.trim() || discountPercent == null) {
    return apiJson({ error: 'Заполните код и скидку' }, 400);
  }
  try {
    const result = db
      .prepare(
        'INSERT INTO promo_codes (code, discount_percent, max_uses, expires_at, created_by, active) VALUES (?, ?, ?, ?, ?, 1)'
      )
      .run(
        code.trim().toUpperCase(),
        Math.min(100, Math.max(1, Number(discountPercent))),
        Number(maxUses) || 0,
        expiresAt || null,
        user.id
      );
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
    db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
      user.id,
      null,
      ip,
      `admin_promo:${code}`
    );
    return apiJson({ id: result.lastInsertRowid, code: code.trim().toUpperCase() });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      return apiJson({ error: 'Промокод уже существует' }, 409);
    }
    return apiJson({ error: 'Ошибка создания' }, 500);
  }
}
