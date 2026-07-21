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

function logout() {
  token = null;
  localStorage.removeItem('punch-token');
  localStorage.removeItem('punch-username');
  window.location.href = '/';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

function formatDateTimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function planLabel(plan) {
  const map = { trial: '7 days', month: '1 month', quarter: '3 months', lifetime: 'Lifetime', none: 'None' };
  return map[plan] || plan;
}

async function loadProfile() {
  const p = await api('/profile');

  $('#welcomeName').textContent = p.username;
  $('#profileUsername').textContent = p.username;
  setRoleBadge($('#cabinetRole'), p.role, p.roleLabel);
  $('#profileUid').textContent = `[${p.id}]`;
  $('#profileSubDate').textContent = p.subscriptionActive
    ? formatDate(p.subscriptionExpiresAt)
    : 'Нет подписки';
  $('#profileAvatar').textContent = p.username.charAt(0).toUpperCase();
  $('#infoEmail').textContent = p.email;
  $('#infoRegDate').textContent = formatDate(p.createdAt);
  $('#infoHwid').textContent = p.hwid || 'Not Linked';

  const adminBtn = $('#btnAdmin');
  if (adminBtn && (p.role === 'admin' || p.role === 'moderator' || p.role === 'owner')) {
    adminBtn.hidden = false;
  }

  const dlBtn = $('#btnDownloadLauncher');
  const note = $('#launcherNote');
  if (p.canDownloadLauncher) {
    dlBtn.disabled = false;
    note.textContent = 'Ready to download';
    note.classList.add('success');
  } else {
    dlBtn.disabled = true;
    note.textContent = 'Active subscription required';
    note.classList.remove('success');
  }

  return p;
}

$('#btnLogout')?.addEventListener('click', logout);
$('#btnLogoutCard')?.addEventListener('click', logout);

$('#keyForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#keyMsg');
  msg.className = 'form-msg';
  try {
    const fd = new FormData(e.target);
    await api('/activate-key', { method: 'POST', body: JSON.stringify({ key: fd.get('key') }) });
    msg.textContent = 'Key activated successfully';
    msg.classList.add('success');
    await loadProfile();
    e.target.reset();
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

$('#emailForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('#emailMsg');
  msg.className = 'form-msg';
  try {
    const fd = new FormData(e.target);
    const data = await api('/change-email', {
      method: 'POST',
      body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }),
    });
    msg.textContent = 'Email updated';
    msg.classList.add('success');
    $('#infoEmail').textContent = data.email;
    e.target.reset();
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

$('#btnBindHwid')?.addEventListener('click', async () => {
  const msg = $('#hwidMsg');
  const hwid = $('#hwidInput')?.value.trim();
  if (!hwid) {
    msg.textContent = 'Enter device ID';
    msg.className = 'form-msg error';
    return;
  }
  msg.className = 'form-msg';
  try {
    await api('/bind-hwid', { method: 'POST', body: JSON.stringify({ hwid }) });
    msg.textContent = 'Device bound';
    msg.classList.add('success');
    await loadProfile();
    $('#hwidInput').value = '';
  } catch (error) {
    msg.textContent = error.message;
    msg.classList.add('error');
  }
});

$('#btnDownloadLauncher')?.addEventListener('click', async () => {
  const btn = $('#btnDownloadLauncher');
  btn.disabled = true;
  btn.textContent = 'Downloading...';
  try {
    const res = await fetch('/api/download/launcher', { headers: headers() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Download failed');
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
  } finally {
    btn.textContent = 'Download Launcher';
    loadProfile().catch(() => {});
  }
});

if (window.location.pathname.includes('cabinet.html')) {
  if (!token) {
    window.location.href = '/login.html';
  } else {
    loadProfile().catch(() => {
      localStorage.removeItem('punch-token');
      window.location.href = '/login.html';
    });
    setInterval(() => {
      if (document.hidden || !token) return;
      loadProfile().catch(() => {});
    }, 5000);
  }
}
