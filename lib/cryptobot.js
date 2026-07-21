const crypto = require('crypto');

const API_BASE = process.env.CRYPTO_PAY_API_URL || 'https://pay.crypt.bot/api';

function getToken() {
  return (process.env.CRYPTO_PAY_API_TOKEN || '').trim();
}

function apiErrorMessage(data) {
  const err = data?.error;
  if (!err) return 'Ошибка Crypto Pay';
  if (typeof err === 'string') return err;
  return err.name || err.code || err.message || JSON.stringify(err);
}

async function cryptoPayRequest(method, params = {}) {
  const token = getToken();
  if (!token) {
    const err = new Error('Не задан CRYPTO_PAY_API_TOKEN');
    err.code = 'cryptobot_not_configured';
    throw err;
  }

  const res = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: {
      'Crypto-Pay-API-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const err = new Error(apiErrorMessage(data));
    err.code = 'cryptobot_api_error';
    err.details = data;
    throw err;
  }
  return data.result;
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const token = getToken();
  if (!token || !signatureHeader) return false;
  const secret = crypto.createHash('sha256').update(token).digest();
  const check = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return check === signatureHeader;
}

function manualPayUrl() {
  const start = process.env.CRYPTO_PAY_START || 'IVmm6S9JZYCJ';
  return `https://t.me/send?start=${encodeURIComponent(start)}`;
}

function safePaidBtnUrl(origin) {
  let base = (process.env.SITE_URL || origin || '').replace(/\/$/, '');
  if (!base.startsWith('http')) {
    base = 'https://punchdlc.up.railway.app';
  }
  return `${base}/cabinet.html`;
}

function invoicePayUrl(invoice) {
  return (
    invoice?.bot_invoice_url ||
    invoice?.mini_app_invoice_url ||
    invoice?.web_app_invoice_url ||
    invoice?.pay_url ||
    manualPayUrl()
  );
}

async function createRubInvoice({ amountRub, description, payload, paidBtnUrl }) {
  const amount = Number(amountRub);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Некорректная сумма');
  }

  return cryptoPayRequest('createInvoice', {
    currency_type: 'fiat',
    fiat: 'RUB',
    amount: amount.toFixed(2),
    description: String(description || 'Punch').slice(0, 1024),
    payload: String(payload || '').slice(0, 4096),
    paid_btn_name: 'openBot',
    paid_btn_url: paidBtnUrl,
    allow_comments: true,
    allow_anonymous: true,
    expires_in: 3600,
  });
}

async function createUsdtInvoice({ amountRub, description, payload, paidBtnUrl }) {
  const usdt = Math.max(1, amountRub / 90).toFixed(2);
  return cryptoPayRequest('createInvoice', {
    asset: 'USDT',
    amount: usdt,
    description: `${description} (~${amountRub}₽)`.slice(0, 1024),
    payload: String(payload || '').slice(0, 4096),
    paid_btn_name: 'openBot',
    paid_btn_url: paidBtnUrl,
    allow_comments: true,
    allow_anonymous: true,
    expires_in: 3600,
  });
}

async function createInvoiceSmart(opts) {
  try {
    const invoice = await createRubInvoice(opts);
    return { invoice, mode: 'fiat' };
  } catch (fiatErr) {
    try {
      const invoice = await createUsdtInvoice(opts);
      return { invoice, mode: 'usdt' };
    } catch {
      throw fiatErr;
    }
  }
}

async function getInvoice(invoiceId) {
  const result = await cryptoPayRequest('getInvoices', {
    invoice_ids: String(invoiceId),
  });
  if (Array.isArray(result)) return result[0] || null;
  if (result?.items && Array.isArray(result.items)) return result.items[0] || null;
  return null;
}

module.exports = {
  createRubInvoice,
  createUsdtInvoice,
  createInvoiceSmart,
  getInvoice,
  verifyWebhookSignature,
  manualPayUrl,
  invoicePayUrl,
  safePaidBtnUrl,
  getToken,
};
