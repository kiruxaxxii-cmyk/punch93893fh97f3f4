import { apiJson, apiLimiter, getUserFromRequest, getUserRecord, SHOP_PLANS, resolvePromoPrice, db, siteOrigin, logAction } from '@/lib/core';
import * as cryptobot from '@/lib/cryptobot';

export const runtime = 'nodejs';

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }
  if (!(await apiLimiter(req))) {
    return apiJson({ error: 'Слишком много запросов' }, 429);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return apiJson({ error: 'Некорректный запрос' }, 400);
  }

  const planLabel = String(body.plan || '').trim();
  const shop = SHOP_PLANS[planLabel];
  if (!shop) {
    return apiJson({ error: 'Неизвестный тариф' }, 400);
  }

  let finalPrice = shop.price;
  let promoCode = null;
  try {
    const resolved = resolvePromoPrice(body.promoCode, shop.price);
    finalPrice = resolved.finalPrice;
    promoCode = resolved.promoCode;
  } catch (e) {
    return apiJson({ error: e.message || 'Промокод недействителен' }, 400);
  }

  if (Number(body.price) !== finalPrice) {
    return apiJson({ error: 'Неверная цена тарифа' }, 400);
  }

  const record = getUserRecord(user.id);
  if (!record) return apiJson({ error: 'Пользователь не найден' }, 404);

  const payMethod = String(body.method || 'cryptobot').toLowerCase();
  const origin = siteOrigin(req);

  const created = db
    .prepare(
      `INSERT INTO payments (user_id, plan_label, plan_key, amount_rub, pay_method, status, promo_code)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(record.id, planLabel, shop.plan, finalPrice, payMethod, promoCode);

  const orderId = created.lastInsertRowid;
  const payload = JSON.stringify({ orderId, userId: record.id, plan: shop.plan });
  const paidBtnUrl = cryptobot.safePaidBtnUrl(origin);

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';

  if (!cryptobot.getToken()) {
    const payUrl = cryptobot.manualPayUrl();
    db.prepare(`UPDATE payments SET pay_url = ?, payload = ? WHERE id = ?`).run(payUrl, payload, orderId);
    logAction(record.id, record.hwid, ip, `payment_manual:${orderId}`);
    return apiJson({
      orderId,
      payUrl,
      manual: true,
      plan: planLabel,
      amountRub: finalPrice,
      hint: 'Добавь CRYPTO_PAY_API_TOKEN для автоматических счетов',
    });
  }

  try {
    const { invoice, mode } = await cryptobot.createInvoiceSmart({
      amountRub: finalPrice,
      description: `Punch — ${planLabel}`,
      payload,
      paidBtnUrl,
    });

    const payUrl = cryptobot.invoicePayUrl(invoice);

    db.prepare(
      `UPDATE payments
       SET cryptobot_invoice_id = ?, pay_url = ?, payload = ?, pay_method = ?
       WHERE id = ?`
    ).run(String(invoice.invoice_id), payUrl, payload, `${payMethod}:${mode}`, orderId);

    logAction(record.id, record.hwid, ip, `payment_create:${orderId}`);

    return apiJson({
      orderId,
      payUrl,
      invoiceId: invoice.invoice_id,
      mode,
    });
  } catch (e) {
    const payUrl = cryptobot.manualPayUrl();
    db.prepare(`UPDATE payments SET pay_url = ?, payload = ?, status = 'pending' WHERE id = ?`).run(
      payUrl,
      payload,
      orderId
    );
    logAction(record.id, record.hwid, ip, `payment_fallback:${orderId}`);
    return apiJson({
      orderId,
      payUrl,
      manual: true,
      plan: planLabel,
      amountRub: finalPrice,
      warning: e.message,
    });
  }
}
