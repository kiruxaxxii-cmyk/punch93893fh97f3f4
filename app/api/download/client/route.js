import { apiJson, getUserFromRequest, getUserRecord, isSubscriptionActive, logAction, CLIENT_JAR_PATH, CLIENT_JAR_URL } from '@/lib/core';
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

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  logAction(record.id, record.hwid, ip, 'client_download');

  if (fs.existsSync(CLIENT_JAR_PATH)) {
    const buf = fs.readFileSync(CLIENT_JAR_PATH);
    return new Response(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/java-archive',
        'Content-Disposition': 'attachment; filename="punch-client.jar"',
        'Content-Length': String(buf.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  if (CLIENT_JAR_URL) {
    try {
      const upstream = await fetch(CLIENT_JAR_URL);
      if (!upstream.ok) {
        return apiJson({ error: 'Error loading client for site, try again' }, 503);
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      return new Response(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/java-archive',
          'Content-Disposition': 'attachment; filename="punch-client.jar"',
          'Content-Length': String(buf.length),
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    } catch {
      return apiJson({ error: 'Error loading client for site, try again' }, 503);
    }
  }

  return apiJson({ error: 'Error loading client for site, try again' }, 503);
}
