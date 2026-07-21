import { apiJson, getUserFromRequest, getUserRecord, normalizeEmail, isValidEmail, db } from '@/lib/core';
import bcrypt from 'bcryptjs';

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

  const email = normalizeEmail(body.email);
  const { password } = body;
  if (!email || !password) {
    return apiJson({ error: 'Введите email и пароль' }, 400);
  }
  if (!isValidEmail(email)) {
    return apiJson({ error: 'Некорректный email' }, 400);
  }

  const record = getUserRecord(user.id);
  if (!record || !bcrypt.compareSync(password, record.password_hash)) {
    return apiJson({ error: 'Неверный пароль' }, 401);
  }

  const taken = db
    .prepare('SELECT id FROM users WHERE LOWER(TRIM(email)) = ? AND id != ?')
    .get(email, record.id);
  if (taken) {
    return apiJson({ error: 'Этот email уже зарегистрирован', code: 'email_taken' }, 409);
  }

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  try {
    db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, record.id);
    db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
      record.id,
      record.hwid,
      ip,
      'email_change'
    );
    return apiJson({ success: true, email });
  } catch (e) {
    if (e.message && (e.message.includes('UNIQUE') || e.message.includes('idx_users_'))) {
      return apiJson({ error: 'Этот email уже занят' }, 409);
    }
    return apiJson({ error: 'Ошибка смены email' }, 500);
  }
}
