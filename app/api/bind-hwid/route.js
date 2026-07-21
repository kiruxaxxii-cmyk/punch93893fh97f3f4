import { apiJson, getUserFromRequest, getUserRecord, isSubscriptionActive, db } from '@/lib/core';

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

  const { hwid } = body;
  if (!hwid?.trim()) return apiJson({ error: 'HWID не указан' }, 400);

  const record = getUserRecord(user.id);
  if (!isSubscriptionActive(record)) {
    return apiJson({ error: 'Нет активной подписки' }, 403);
  }

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';

  if (record.hwid && record.hwid !== hwid.trim()) {
    const canReset =
      !record.hwid_reset_at ||
      new Date(record.hwid_reset_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (!canReset) {
      return apiJson({
        error: 'HWID уже привязан. Сброс доступен раз в 30 дней',
      }, 403);
    }
    db.prepare("UPDATE users SET hwid = ?, hwid_reset_at = datetime('now') WHERE id = ?")
      .run(hwid.trim(), record.id);
    db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
      record.id,
      hwid,
      ip,
      'hwid_reset'
    );
    return apiJson({ success: true, hwid: hwid.trim(), reset: true });
  }

  if (!record.hwid) {
    db.prepare('UPDATE users SET hwid = ? WHERE id = ?').run(hwid.trim(), record.id);
    db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
      record.id,
      hwid,
      ip,
      'hwid_bind'
    );
  }

  return apiJson({ success: true, hwid: hwid.trim() });
}
