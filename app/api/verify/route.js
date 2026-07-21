import { apiJson, apiLimiter, db, isSubscriptionActive } from '@/lib/core';

export const runtime = 'nodejs';

export async function POST(req) {
  if (!(await apiLimiter(req))) {
    return apiJson({ error: 'Слишком много запросов' }, 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return apiJson({ valid: false, error: 'missing_params' }, 400);
  }

  const { username, hwid } = body;
  if (!username || !hwid) {
    return apiJson({ valid: false, error: 'missing_params' }, 400);
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) return apiJson({ valid: false, error: 'user_not_found' });
  if (!isSubscriptionActive(user)) return apiJson({ valid: false, error: 'no_subscription' });
  if (!user.hwid) return apiJson({ valid: false, error: 'hwid_not_bound' });
  if (user.hwid !== hwid.trim()) return apiJson({ valid: false, error: 'hwid_mismatch' });

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
    user.id,
    hwid,
    ip,
    'client_verify'
  );
  return apiJson({
    valid: true,
    plan: user.plan,
    expires: user.subscription_expires_at,
  });
}
