import { getUserFromRequest, requireRole, DB_PATH, logAction, db } from '@/lib/core';
import fs from 'node:fs';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    return Response.json({ error: 'Требуется авторизация' }, { status: 401 });
  }
  if (!requireRole(user, ['admin', 'owner'])) {
    return Response.json({ error: 'Нет доступа' }, { status: 403 });
  }

  if (!fs.existsSync(DB_PATH)) {
    return Response.json({ error: 'База не найдена' }, { status: 404 });
  }
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  db.prepare('INSERT INTO sessions_log (user_id, hwid, ip, action) VALUES (?, ?, ?, ?)').run(
    user.id,
    null,
    ip,
    'ebd_backup'
  );
  const buf = fs.readFileSync(DB_PATH);
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="punch-ebd.db"',
      'Content-Length': String(buf.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
