const API = '/api';
let token = localStorage.getItem('punch-token');

const $ = (sel) => document.querySelector(sel);

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, { ...opts, headers: { ...headers(), ...opts.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

function planLabel(plan) {
  const map = { trial: '7 дней', month: '1 месяц', quarter: '3 месяца', lifetime: 'Навсегда', none: 'Нет' };
  return map[plan] || plan;
}

async function loadProfile() {
  const p = await api('/profile');
  if ($('#dashUsername')) $('#dashUsername').textContent = p.username;
  if ($('#dashPlan')) $('#dashPlan').textContent = planLabel(p.plan);
  if ($('#dashExpires')) {
    $('#dashExpires').textContent = p.subscriptionExpiresAt
      ? new Date(p.subscriptionExpiresAt).toLocaleDateString('ru-RU')
      : '—';
  }
  if ($('#dashHwid')) $('#dashHwid').textContent = p.hwid || 'Не привязано';
  return p;
}

function redirectCabinet() {
  const params = new URLSearchParams(window.location.search);
  const loaderSession = params.get('loader');
  if (loaderSession) {
    window.location.href = `/loader-auth.html?session=${encodeURIComponent(loaderSession)}`;
    return;
  }
  const next = params.get('next');
  if (next && next.startsWith('/')) {
    window.location.href = next;
    return;
  }
  window.location.href = '/cabinet.html';
}

$('#loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const err = $('#authError');
  try {
    const data = await api('/login', {
      method: 'POST',
      body: JSON.stringify({ login: fd.get('login'), password: fd.get('password') }),
    });
    token = data.token;
    localStorage.setItem('punch-token', data.token);
    localStorage.setItem('punch-username', data.username);
    redirectCabinet();
  } catch (error) {
    if (err) err.textContent = error.message;
  }
});

$('#btnLogout')?.addEventListener('click', () => {
  token = null;
  localStorage.removeItem('punch-token');
  localStorage.removeItem('punch-username');
  window.location.href = '/';
});

// cabinet logic moved to cabinet.js

$('#btnDownload')?.addEventListener('click', async () => {
  if (!localStorage.getItem('punch-token')) {
    window.location.href = '/login.html';
    return;
  }
  try {
    const p = await api('/profile');
    if (!p.canDownloadLauncher) {
      alert('Скачивание доступно только с активной подпиской. Активируйте ключ в кабинете.');
      window.location.href = '/cabinet.html';
      return;
    }
    const res = await fetch('/api/download/launcher', { headers: headers() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Ошибка скачивания');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'punch-loader.zip';
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
});
