import { apiJson, apiLimiter, db } from '@/lib/core';

export const runtime = 'nodejs';

export async function POST(req) {
  if (!(await apiLimiter(req))) {
    return apiJson({ error: 'Слишком много запросов' }, 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return apiJson({ error: 'Некорректный запрос' }, 400);
  }

  const code = String(body.code || '').trim().toUpperCase();
  if (!code) return apiJson({ error: 'Введите промокод' }, 400);

  const promo = db.prepare('SELECT * FROM promo_codes WHERE UPPER(code) = ?').get(code);
  if (!promo || !promo.active) {
    return apiJson({ error: 'Промокод не найден' }, 404);
  }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return apiJson({ error: 'Промокод истёк' }, 410);
  }
  if (promo.max_uses > 0 && promo.used_count >= promo.max_uses) {
    return apiJson({ error: 'Промокод исчерпан' }, 410);
  }
  return apiJson({ valid: true, discountPercent: promo.discount_percent, code: promo.code });
}
