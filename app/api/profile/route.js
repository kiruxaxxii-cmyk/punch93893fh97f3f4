import { apiJson, getUserFromRequest, getUserRecord, profilePayload } from '@/lib/core';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }
  const record = getUserRecord(user.id);
  if (!record) return apiJson({ error: 'Пользователь не найден' }, 404);
  return apiJson(profilePayload(record));
}
