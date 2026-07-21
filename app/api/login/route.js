import { authLimiter, apiJson, getUserByCredentials, logAction, JWT_SECRET, isCountryBlocked } from '@/lib/core';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

export async function POST(req) {
  if (isCountryBlocked(req)) {
    return apiJson({ error: 'ваш регион не поддерживается командой funckshield' }, 403);
  }

  if (!(await authLimiter(req))) {
    return apiJson({ error: 'Слишком много попыток, попробуйте позже' }, 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return apiJson({ error: 'Некорректный запрос' }, 400);
  }

  const { login, password } = body;
  if (!login || !password) {
    return apiJson({ error: 'Введите логин и пароль' }, 400);
  }

  const user = getUserByCredentials(login, password);
  if (!user) {
    return apiJson({ error: 'Неверный логин или пароль' }, 401);
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  logAction(user.id, user.hwid, ip, 'login');
  return apiJson({ token, username: user.username, role: user.role });
}
