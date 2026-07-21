'use client';

const API_BASE = '/api';
const TOKEN_KEY = 'punch-token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  setToken(null);
}

async function parseBody(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export async function apiFetch(path, { method = 'GET', body, auth = false, raw = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = raw ? await res.blob() : await parseBody(res);

  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

async function apiFetchRaw(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || data.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res;
}

// ---- Auth ----
export async function login({ login, password }) {
  return apiFetch('/login', { method: 'POST', body: { login, password } });
}

export async function register({ username, email, password }) {
  return apiFetch('/register', { method: 'POST', body: { username, email, password } });
}

export async function getProfile() {
  return apiFetch('/profile', { auth: true });
}

export async function changeEmail({ email, password }) {
  return apiFetch('/change-email', { method: 'POST', auth: true, body: { email, password } });
}

export async function activateKey({ key }) {
  return apiFetch('/activate-key', { method: 'POST', auth: true, body: { key } });
}

export async function bindHwid({ hwid }) {
  return apiFetch('/bind-hwid', { method: 'POST', auth: true, body: { hwid } });
}

export async function validatePromo({ code }) {
  return apiFetch('/promo/validate', { method: 'POST', body: { code } });
}

export async function createPayment({ plan, price, method, promoCode }) {
  return apiFetch('/payments/create', {
    method: 'POST',
    auth: true,
    body: { plan, price, method, ...(promoCode ? { promoCode } : {}) },
  });
}

export async function getPayment(id) {
  return apiFetch(`/payments/${id}`, { auth: true });
}

export async function downloadLauncher() {
  const res = await apiFetchRaw('/download/launcher', { auth: true });
  return res.blob();
}

// ---- Admin ----
export async function getStats() {
  return apiFetch('/admin/stats', { auth: true });
}

export async function listUsers(search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch(`/admin/users${q}`, { auth: true });
}

export async function patchUser(id, body) {
  return apiFetch(`/admin/users/${id}`, { method: 'PATCH', auth: true, body });
}

export async function listKeys() {
  return apiFetch('/admin/keys', { auth: true });
}

export async function createKeys({ plan, durationDays, count }) {
  return apiFetch('/admin/keys', {
    method: 'POST',
    auth: true,
    body: { plan, durationDays, count },
  });
}

export async function listPromos() {
  return apiFetch('/admin/promos', { auth: true });
}

export async function createPromo({ code, discountPercent, maxUses, expiresAt }) {
  return apiFetch('/admin/promos', {
    method: 'POST',
    auth: true,
    body: { code, discountPercent, maxUses, ...(expiresAt ? { expiresAt } : {}) },
  });
}

export async function patchPromo(id, body) {
  return apiFetch(`/admin/promos/${id}`, { method: 'PATCH', auth: true, body });
}

export async function getLogs() {
  return apiFetch('/admin/logs', { auth: true });
}

export async function getEbd() {
  return apiFetch('/admin/ebd', { auth: true });
}

export async function dedupeEbd() {
  return apiFetch('/admin/ebd/dedupe', { method: 'POST', auth: true });
}

export async function backupEbd() {
  const res = await apiFetchRaw('/admin/ebd/backup', { auth: true });
  return res.blob();
}
