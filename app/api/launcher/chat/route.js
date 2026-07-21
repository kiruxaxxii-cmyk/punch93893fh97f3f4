import { apiJson, apiLimiter, getUserFromRequest, getUserRecord, db } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }
  if (!(await apiLimiter(req))) {
    return apiJson({ error: 'Слишком много запросов' }, 429);
  }

  const since = Number(req.nextUrl.searchParams.get('since')) || 0;
  const messages = db
    .prepare(
      `SELECT id, user_id, username, message, created_at
       FROM launcher_chat WHERE id > ? ORDER BY id ASC LIMIT 120`
    )
    .all(since);
  return apiJson({ messages });
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }
  if (!(await apiLimiter(req))) {
    return apiJson({ error: 'Слишком много запросов' }, 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return apiJson({ error: 'Некорректный запрос' }, 400);
  }

  const text = String(body.message || '').trim();
  if (!text) return apiJson({ error: 'Пустое сообщение' }, 400);
  if (text.length > 500) return apiJson({ error: 'Слишком длинное сообщение' }, 400);

  const record = getUserRecord(user.id);
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  const result = db
    .prepare('INSERT INTO launcher_chat (user_id, username, message) VALUES (?, ?, ?)')
    .run(record.id, record.username, text);

  db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
    record.id,
    record.hwid,
    ip,
    'launcher_chat'
  );
  return apiJson({
    id: result.lastInsertRowid,
    user_id: record.id,
    username: record.username,
    message: text,
    created_at: new Date().toISOString(),
  });
}
