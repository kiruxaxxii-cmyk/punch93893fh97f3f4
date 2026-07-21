import { apiJson, apiLimiter, loaderSessions, purgeLoaderSessions } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  if (!(await apiLimiter(req))) {
    return apiJson({ error: 'Слишком много запросов' }, 429);
  }

  const { sessionId } = await params;
  purgeLoaderSessions();
  const data = loaderSessions.get(sessionId);
  if (!data || data.expires < Date.now()) {
    loaderSessions.delete(sessionId);
    return apiJson({ error: 'Ожидание входа' }, 404);
  }
  loaderSessions.delete(sessionId);
  return apiJson({ token: data.token, username: data.username });
}
