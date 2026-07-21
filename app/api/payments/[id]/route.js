import { apiJson, apiLimiter, getUserFromRequest, getPaymentRecord, fulfillPayment, db } from '@/lib/core';
import * as cryptobot from '@/lib/cryptobot';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const user = getUserFromRequest(req);
  if (!user) {
    return apiJson({ error: 'Требуется авторизация' }, 401);
  }
  if (!(await apiLimiter(req))) {
    return apiJson({ error: 'Слишком много запросов' }, 429);
  }

  const { id } = await params;
  const numId = Number(id);
  let payment = getPaymentRecord(numId);
  if (!payment || payment.user_id !== user.id) {
    return apiJson({ error: 'Заказ не найден' }, 404);
  }

  if (payment.status === 'pending' && payment.cryptobot_invoice_id && cryptobot.getToken()) {
    try {
      const invoice = await cryptobot.getInvoice(payment.cryptobot_invoice_id);
      if (invoice?.status === 'paid') {
        fulfillPayment(payment);
        payment = getPaymentRecord(numId);
      }
    } catch {
      /* polling fallback */
    }
  }

  return apiJson({
    id: payment.id,
    status: payment.status,
    plan: payment.plan_label,
    amountRub: payment.amount_rub,
    payUrl: payment.pay_url,
    paidAt: payment.paid_at,
  });
}
