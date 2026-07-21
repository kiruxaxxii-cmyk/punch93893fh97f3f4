import { apiJson, getUserFromRequest, getUserRecord, isSubscriptionActive, logAction, LOADER_PATH, LOADER_ZIP } from '@/lib/core';
import fs from 'node:fs';

export const runtime = 'nodejs';

export async function GET(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }

  const record = getUserRecord(user.id);
  if (!isSubscriptionActive(record)) {
    return apiJson({ error: 'Нужна активная подписка на клиент' }, 403);
  }
  if (!fs.existsSync(LOADER_PATH)) {
    return apiJson({ error: 'Файл лаунчера временно недоступен' }, 503);
  }
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  logAction(record.id, record.hwid, ip, 'launcher_download');

  if (fs.existsSync(LOADER_ZIP)) {
    const buf = fs.readFileSync(LOADER_ZIP);
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="punch-loader.zip"',
        'Content-Length': String(buf.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
  const buf = fs.readFileSync(LOADER_PATH);
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="punch-loader.exe"',
      'Content-Length': String(buf.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
