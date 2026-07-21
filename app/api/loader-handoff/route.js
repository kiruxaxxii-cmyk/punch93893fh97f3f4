import { apiJson, getUserFromRequest, loaderSessions, purgeLoaderSessions } from '@/lib/core';

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

  const { sessionId } = body;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8) {
    return apiJson({ error: 'Некорректная сессия' }, 400);
  }
  purgeLoaderSessions();
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  loaderSessions.set(sessionId, {
    token,
    username: user.username,
    expires: Date.now() + 5 * 60 * 1000,
  });
  return apiJson({ ok: true });
}
