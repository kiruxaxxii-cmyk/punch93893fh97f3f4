const API = '/api';
let token = localStorage.getItem('punch-token');
let refreshTimer = null;
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

function toast(msg, type = 'info') {
  const el = $('#adminToast');
  if (!el) return;
  el.textContent = msg;
  el.className = `admin-toast ${type}`;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 4000);
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU');
}

function formatDateTimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function activeTabName() {
  return document.querySelector('.admin-tab.active')?.dataset.tab || 'users';
}

async function ensureAdmin() {
  const p = await api('/profile');
  if (p.role !== 'admin' && p.role !== 'moderator' && p.role !== 'owner') {
    window.location.href = '/cabinet.html';
    throw new Error('no access');
  }
  if (p.role === 'moderator') {
    toast('Роль Moderator: только просмотр. Нужен Admin для изменений.', 'warn');
  }
  return p;
}

async function loadStats() {
  const s = await api('/admin/stats');
  $('#statUsers').textContent = s.users;
  $('#statActive').textContent = s.activeSubscriptions;
  $('#statKeys').textContent = s.unusedKeys;
  $('#statPromos').textContent = s.activePromos;
}

async function loadUsers(search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const { users } = await api(`/admin/users${q}`);
  const tbody = $('#usersTable');
  tbody.innerHTML = users
    .map(
      (u) => `<tr>
        <td>${u.id}</td>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${renderRoleBadge(u.role, u.roleLabel)}</td>
        <td>${u.plan}</td>
        <td>${u.subscriptionActive ? '✓' : '—'}</td>
        <td><button class="cabinet-btn btn-sm" data-edit="${u.id}">Edit</button></td>
      </tr>`
    )
    .join('');

  tbody.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEditUser(users.find((u) => u.id === Number(btn.dataset.edit))));
  });
}

function openEditUser(user) {
  $('#editUserId').value = user.id;
  $('#editUserName').textContent = user.username;
  $('#editUserRole').value = user.role;
  $('#editUserPlan').value = user.plan;
  $('#editUserSub').value = formatDateTimeLocal(user.subscription_expires_at);
  $('#editUserDialog').showModal();
}

async function loadKeys() {
  const { keys } = await api('/admin/keys');
  $('#keysTable').innerHTML = keys
    .map(
      (k) => `<tr>
        <td><code>${k.key_code}</code> <button type="button" class="cabinet-btn btn-sm" data-copy="${k.key_code}">Copy</button></td>
        <td>${k.plan}</td>
        <td>${k.duration_days}</td>
        <td>${k.used_by_name || '—'}</td>
      </tr>`
    )
    .join('');

  $('#keysTable').querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(btn.dataset.copy);
      toast('Ключ скопирован', 'success');
    });
  });
}

async function loadPromos() {
  const { promos } = await api('/admin/promos');
  $('#promosTable').innerHTML = promos
    .map(
      (p) => `<tr>
        <td><strong>${p.code}</strong></td>
        <td>${p.discount_percent}%</td>
        <td>${p.used_count}${p.max_uses ? ` / ${p.max_uses}` : ''}</td>
        <td>${p.active ? 'Yes' : 'No'}</td>
        <td>${p.active ? `<button class="cabinet-btn btn-sm" data-off="${p.id}">Disable</button>` : ''}</td>
      </tr>`
    )
    .join('');

  $('#promosTable').querySelectorAll('[data-off]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/admin/promos/${btn.dataset.off}`, {
          method: 'PATCH',
          body: JSON.stringify({ active: false }),
        });
        toast('Промокод отключён', 'success');
        await refreshAll();
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });
}

function formatBytes(n) {
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i ? 1 : 0)} ${u[i]}`;
}

async function loadEbd() {
  const ebd = await api('/admin/ebd');
  $('#ebdPath').textContent = ebd.path;
  $('#ebdDataDir').textContent = ebd.dataDir || '—';
  $('#ebdSize').textContent = formatBytes(ebd.sizeBytes);
  $('#ebdHealth').textContent = ebd.healthy ? 'OK' : 'Есть дубликаты';
  $('#ebdUsers').textContent = ebd.tables?.users ?? '—';
  $('#ebdDupEmails').textContent = ebd.duplicateEmails?.length
    ? ebd.duplicateEmails.map((d) => `${d.email} (${d.count}): ${d.accounts}`).join('\n')
    : 'Нет';
  $('#ebdDupUsers').textContent = ebd.duplicateUsernames?.length
    ? ebd.duplicateUsernames.map((d) => `${d.username} (${d.count}): ${d.accounts}`).join('\n')
    : 'Нет';
}

async function downloadEbdBackup() {
  const res = await fetch(`${API}/admin/ebd/backup`, { headers: headers() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Ошибка скачивания');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'punch-ebd.db';
  a.click();
  URL.revokeObjectURL(url);
}

async function loadLogs() {
  const { logs } = await api('/admin/logs');
  $('#logsTable').innerHTML = logs
    .map(
      (l) => `<tr>
        <td>${formatDate(l.created_at)}</td>
        <td>${l.username || l.user_id || '—'}</td>
        <td>${l.action}</td>
        <td>${l.ip || '—'}</td>
      </tr>`
    )
    .join('');
}

async function refreshActiveTab() {
  const tab = activeTabName();
  if (tab === 'users') await loadUsers($('#userSearch')?.value.trim() || '');
  if (tab === 'keys') await loadKeys();
  if (tab === 'promos') await loadPromos();
  if (tab === 'logs') await loadLogs();
  if (tab === 'ebd') await loadEbd();
}

async function refreshAll() {
  await loadStats();
  await refreshActiveTab();
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    if (document.hidden) return;
    refreshAll().catch(() => {});
  }, 5000);
}

document.querySelectorAll('.admin-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    refreshActiveTab().catch(() => {});
  });
});

$('#btnSearchUsers')?.addEventListener('click', () => loadUsers($('#userSearch').value.trim()));
$('#userSearch')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadUsers($('#userSearch').value.trim());
});

$('#genKeyForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const data = await api('/admin/keys', {
      method: 'POST',
      body: JSON.stringify({
        plan: fd.get('plan'),
        durationDays: Number(fd.get('durationDays')),
        count: Number(fd.get('count')),
      }),
    });
    $('#keysOutput').textContent = data.keys.join('\n');
    toast(`Создано ключей: ${data.keys.length}`, 'success');
    await refreshAll();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

$('#promoForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const fd = new FormData(e.target);
    await api('/admin/promos', {
      method: 'POST',
      body: JSON.stringify({
        code: fd.get('code'),
        discountPercent: Number(fd.get('discountPercent')),
        maxUses: Number(fd.get('maxUses')),
      }),
    });
    e.target.reset();
    toast('Промокод создан', 'success');
    await refreshAll();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

$('#editUserCancel')?.addEventListener('click', () => $('#editUserDialog').close());

$('#editUserClearSub')?.addEventListener('click', () => {
  $('#editUserSub').value = '';
  $('#editUserPlan').value = 'none';
});

$('#editUserForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#editUserId').value;
  const sub = $('#editUserSub').value;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await api(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        role: $('#editUserRole').value,
        plan: $('#editUserPlan').value,
        subscriptionExpiresAt: sub ? new Date(sub).toISOString() : null,
      }),
    });
    $('#editUserDialog').close();
    toast('Пользователь обновлён', 'success');
    await refreshAll();
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

$('#btnLogout')?.addEventListener('click', () => {
  localStorage.removeItem('punch-token');
  window.location.href = '/';
});

$('#btnEbdRefresh')?.addEventListener('click', () => loadEbd().catch((e) => toast(e.message, 'error')));
$('#btnEbdBackup')?.addEventListener('click', () =>
  downloadEbdBackup().then(() => toast('Backup скачан', 'success')).catch((e) => toast(e.message, 'error'))
);
$('#btnEbdDedupe')?.addEventListener('click', async () => {
  try {
    const data = await api('/admin/ebd/dedupe', { method: 'POST' });
    toast(`Удалено дубликатов: ${data.removed}`, 'success');
    await loadEbd();
    await loadStats();
    await loadUsers();
  } catch (error) {
    toast(error.message, 'error');
  }
});

if (window.location.pathname.includes('admin.html')) {
  if (!token) {
    window.location.href = '/login.html';
  } else {
    ensureAdmin()
      .then(() => refreshAll())
      .then(() => startAutoRefresh())
      .catch(() => {
        localStorage.removeItem('punch-token');
        window.location.href = '/login.html';
      });
  }
}
