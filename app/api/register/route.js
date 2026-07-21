import { authLimiter, apiJson, normalizeUsername, normalizeEmail, isValidEmail, findRegistrationConflict, db, JWT_SECRET, isCountryBlocked } from '@/lib/core';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

  const username = normalizeUsername(body.username);
  const email = normalizeEmail(body.email);
  const password = body.password;

  if (!username || !email || !password) {
    return apiJson({ error: 'Заполните все поля', code: 'missing_fields' }, 400);
  }
  if (username.length < 3 || password.length < 6) {
    return apiJson({ error: 'Логин от 3 символов, пароль от 6', code: 'validation' }, 400);
  }
  if (!isValidEmail(email)) {
    return apiJson({ error: 'Некорректный email', code: 'invalid_email' }, 400);
  }

  const conflict = findRegistrationConflict(username, email);
  if (conflict) {
    return apiJson({ error: conflict.message, code: conflict.code }, 409);
  }

  const dupEmail = db.prepare('SELECT id FROM users WHERE LOWER(TRIM(email)) = ?').get(email);
  if (dupEmail) {
    return apiJson({ error: 'Этот email уже зарегистрирован', code: 'email_taken' }, 409);
  }
  const dupUser = db
    .prepare('SELECT id FROM users WHERE LOWER(TRIM(username)) = ?')
    .get(username.toLowerCase());
  if (dupUser) {
    return apiJson({ error: 'Этот логин уже занят', code: 'username_taken' }, 409);
  }

  const hash = bcrypt.hashSync(password, 10);
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  try {
    const result = db
      .prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
      .run(username, email, hash);

    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, {
      expiresIn: '7d',
    });
    db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
      result.lastInsertRowid,
      null,
      ip,
      'register'
    );
    return apiJson({ token, username });
  } catch (e) {
    if (e.message && (e.message.includes('UNIQUE') || e.message.includes('idx_users_'))) {
      return apiJson({ error: 'Логин или email уже заняты', code: 'taken' }, 409);
    }
    return apiJson({ error: 'Ошибка регистрации', code: 'server_error' }, 500);
  }
}
