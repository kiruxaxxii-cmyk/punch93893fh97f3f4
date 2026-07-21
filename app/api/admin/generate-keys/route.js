import { apiJson, ADMIN_SECRET, db, generateKey } from '@/lib/core';

export const runtime = 'nodejs';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return apiJson({ error: 'Некорректный запрос' }, 400);
  }

  const { secret, plan, durationDays, count } = body;
  if (secret !== ADMIN_SECRET) return apiJson({ error: 'Forbidden' }, 403);

  const validPlans = ['trial', 'month', 'quarter', 'lifetime'];
  if (!validPlans.includes(plan)) return apiJson({ error: 'Invalid plan' }, 400);

  const keys = [];
  const insert = db.prepare(
    'INSERT INTO license_keys (key_code, plan, duration_days) VALUES (?, ?, ?)'
  );
  for (let i = 0; i < (count || 1); i++) {
    const k = generateKey();
    insert.run(k, plan, durationDays || 30);
    keys.push(k);
  }
  return apiJson({ keys });
}
