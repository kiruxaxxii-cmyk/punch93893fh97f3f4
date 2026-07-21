import { db, fulfillPayment } from '@/lib/core';
import * as cryptobot from '@/lib/cryptobot';

export const runtime = 'nodejs';

export async function POST(req) {
  const raw = await req.text();
  const sig = req.headers.get('crypto-pay-api-signature');

  if (!cryptobot.verifyWebhookSignature(Buffer.from(raw, 'utf8'), sig)) {
    return Response.json({ error: 'Неверная подпись' }, { status: 403 });
  }

  let update;
  try {
    update = JSON.parse(raw.toString('utf8'));
  } catch {
    return Response.json({ error: 'Некорректный JSON' }, { status: 400 });
  }

  if (update.update_type === 'invoice_paid' && update.payload?.invoice_id) {
    const payment = db
      .prepare('SELECT * FROM payments WHERE cryptobot_invoice_id = ?')
      .get(String(update.payload.invoice_id));
    if (payment) fulfillPayment(payment);
  }

  return Response.json({ ok: true });
}
