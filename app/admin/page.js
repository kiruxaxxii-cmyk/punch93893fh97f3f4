'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  getStats,
  listUsers,
  patchUser,
  listKeys,
  createKeys,
  listPromos,
  createPromo,
  patchPromo,
  getLogs,
  getEbd,
  dedupeEbd,
  backupEbd,
} from '@/lib/api';

const PLAN_OPTIONS = [
  { value: 'trial', label: 'Trial (7d)' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'lifetime', label: 'Lifetime' },
];

const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'media', label: 'Media' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
];

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

function AdminInner() {
  const router = useRouter();
  const { token, user, loading, logout } = useAuth();
  const [tab, setTab] = useState('users');
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const hasAccess = useCallback(() => {
    if (!token) return false;
    if (user && user.role !== 'admin' && user.role !== 'moderator' && user.role !== 'owner') return false;
    return true;
  }, [token, user]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getStats());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!hasAccess()) {
      router.replace(token ? '/cabinet' : '/login');
    }
  }, [loading, hasAccess, token, router]);

  useEffect(() => {
    if (loading || !hasAccess()) return;
    loadStats();
    const t = setInterval(() => {
      if (!document.hidden) loadStats();
    }, 5000);
    return () => clearInterval(t);
  }, [loading, hasAccess, loadStats]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-punch-dim">Проверка доступа…</div>;
  }

  if (!hasAccess()) {
    return <div className="flex min-h-screen items-center justify-center text-punch-dim">Проверка доступа…</div>;
  }

  return (
    <div className="relative min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/cabinet" className="text-sm text-punch-dim">Кабинет</Link>
          <Link href="/" className="flex items-center gap-1 text-xl font-semibold text-punch-title">
            <span className="text-punch-accent">P</span><span>unch</span>
          </Link>
          <button onClick={logout} className="btn-blur">Выйти</button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16 pt-28">
        <h1 className="text-4xl font-bold text-punch-title">Admin Panel</h1>
        <p className="text-punch-dim">Управление пользователями, ключами и промокодами</p>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-3 rounded-xl border px-4 py-2 text-sm ${
                toast.type === 'error'
                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                  : toast.type === 'warn'
                  ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                  : 'border-green-500/40 bg-green-500/10 text-green-300'
              }`}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="card"><span className="text-sm text-punch-dim">Users</span><strong className="block text-2xl text-punch-title">{stats?.users ?? '—'}</strong></div>
          <div className="card"><span className="text-sm text-punch-dim">Active subs</span><strong className="block text-2xl text-punch-title">{stats?.activeSubscriptions ?? '—'}</strong></div>
          <div className="card"><span className="text-sm text-punch-dim">Unused keys</span><strong className="block text-2xl text-punch-title">{stats?.unusedKeys ?? '—'}</strong></div>
          <div className="card"><span className="text-sm text-punch-dim">Promos</span><strong className="block text-2xl text-punch-title">{stats?.activePromos ?? '—'}</strong></div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex flex-wrap gap-2">
          {[
            ['users', 'Пользователи'],
            ['keys', 'Ключи'],
            ['promos', 'Промокоды'],
            ['logs', 'Логи'],
            ['ebd', 'EBD'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-4 py-2 text-sm transition ${tab === id ? 'bg-punch-accent text-white' : 'bg-white/5 text-punch-dim hover:bg-white/10'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'users' && <UsersTab onToast={showToast} />}
          {tab === 'keys' && <KeysTab onToast={showToast} />}
          {tab === 'promos' && <PromosTab onToast={showToast} />}
          {tab === 'logs' && <LogsTab />}
          {tab === 'ebd' && <EbdTab onToast={showToast} />}
        </div>
      </main>
    </div>
  );
}

function UsersTab({ onToast }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async (q = '') => {
    try {
      const data = await listUsers(q);
      setUsers(data.users || []);
    } catch (e) {
      onToast(e.message, 'error');
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (u) => setEdit({ id: u.id, username: u.username, role: u.role, plan: u.plan, sub: formatDateTimeLocal(u.subscription_expires_at) });

  const saveEdit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const sub = fd.get('subscriptionExpiresAt');
    const password = fd.get('password');
    const body = {
      role: fd.get('role'),
      plan: fd.get('plan'),
      subscriptionExpiresAt: sub ? new Date(sub).toISOString() : null,
    };
    if (password) body.password = password;
    try {
      await patchUser(edit.id, body);
      onToast('Пользователь обновлён', 'success');
      setEdit(null);
      load(search);
    } catch (e) {
      onToast(e.message, 'error');
    }
  };

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(search)}
          placeholder="Поиск по нику, email, UID..."
          className="field flex-1"
        />
        <button onClick={() => load(search)} className="btn-blur">Найти</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-punch-dim">
              <th className="p-2">UID</th><th>User</th><th>Email</th><th>Role</th><th>Plan</th><th>Sub</th><th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="p-2">{u.id}</td>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.plan}</td>
                <td>{u.subscriptionActive ? '✓' : '—'}</td>
                <td><button onClick={() => openEdit(u)} className="btn-blur text-xs">Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {edit && (
          <motion.div className="fixed inset-0 z-[70] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEdit(null)} />
            <motion.form onSubmit={saveEdit} initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="glass relative z-10 w-full max-w-md space-y-3 p-6">
              <h3 className="text-lg font-semibold text-punch-title">Edit user {edit.username}</h3>
              <input type="hidden" name="id" value={edit.id} />
              <label className="block text-sm text-punch-dim">Role
                <select name="role" defaultValue={edit.role} className="field mt-1">{ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value} className="bg-punch-bg">{r.label}</option>)}</select>
              </label>
              <label className="block text-sm text-punch-dim">Plan
                <select name="plan" defaultValue={edit.plan} className="field mt-1">{['none', ...PLAN_OPTIONS.map((p) => p.value)].map((p) => <option key={p} value={p} className="bg-punch-bg">{p}</option>)}</select>
              </label>
              <label className="block text-sm text-punch-dim">Subscription expires
                <input type="datetime-local" name="subscriptionExpiresAt" defaultValue={edit.sub} className="field mt-1" />
              </label>
              <label className="block text-sm text-punch-dim">New password
                <input type="text" name="password" placeholder="Оставьте пустым чтобы не менять" className="field mt-1" autoComplete="off" />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEdit(null)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" className="btn-purple flex-1">Save</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function KeysTab({ onToast }) {
  const [keys, setKeys] = useState([]);
  const [output, setOutput] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await listKeys();
      setKeys(data.keys || []);
    } catch (e) {
      onToast(e.message, 'error');
    }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await createKeys({
        plan: fd.get('plan'),
        durationDays: Number(fd.get('durationDays')),
        count: Number(fd.get('count')),
      });
      setOutput((data.keys || []).join('\n'));
      onToast(`Создано ключей: ${data.keys?.length || 0}`, 'success');
      load();
    } catch (e) {
      onToast(e.message, 'error');
    }
  };

  const copy = async (code) => {
    await navigator.clipboard.writeText(code);
    onToast('Ключ скопирован', 'success');
  };

  return (
    <div>
      <form onSubmit={submit} className="card mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm text-punch-dim">Plan
          <select name="plan" defaultValue="month" className="field mt-1">{PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value} className="bg-punch-bg">{p.label}</option>)}</select>
        </label>
        <label className="text-sm text-punch-dim">Days
          <input name="durationDays" type="number" defaultValue="30" min="1" className="field mt-1 w-24" />
        </label>
        <label className="text-sm text-punch-dim">Count
          <input name="count" type="number" defaultValue="1" min="1" max="50" className="field mt-1 w-24" />
        </label>
        <button type="submit" className="btn-purple">Создать ключи</button>
      </form>
      {output && <pre className="card mb-6 overflow-x-auto whitespace-pre-wrap text-xs text-punch-dim">{output}</pre>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-punch-dim"><th className="p-2">Key</th><th>Plan</th><th>Days</th><th>Used</th></tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.key_code} className="border-t border-white/10">
                <td className="p-2"><code>{k.key_code}</code> <button onClick={() => copy(k.key_code)} className="btn-blur text-xs">Copy</button></td>
                <td>{k.plan}</td>
                <td>{k.duration_days}</td>
                <td>{k.used_by_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PromosTab({ onToast }) {
  const [promos, setPromos] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await listPromos();
      setPromos(data.promos || []);
    } catch (e) {
      onToast(e.message, 'error');
    }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await createPromo({
        code: fd.get('code'),
        discountPercent: Number(fd.get('discountPercent')),
        maxUses: Number(fd.get('maxUses')),
      });
      e.target.reset();
      onToast('Промокод создан', 'success');
      load();
    } catch (e) {
      onToast(e.message, 'error');
    }
  };

  const toggle = async (id) => {
    try {
      await patchPromo(id, { active: false });
      onToast('Промокод отключён', 'success');
      load();
    } catch (e) {
      onToast(e.message, 'error');
    }
  };

  return (
    <div>
      <form onSubmit={submit} className="card mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm text-punch-dim">Code
          <input name="code" required placeholder="PROMO CODE" className="field mt-1" />
        </label>
        <label className="text-sm text-punch-dim">Discount %
          <input name="discountPercent" type="number" min="1" max="100" required className="field mt-1 w-24" />
        </label>
        <label className="text-sm text-punch-dim">Max uses (0=∞)
          <input name="maxUses" type="number" defaultValue="0" min="0" className="field mt-1 w-24" />
        </label>
        <button type="submit" className="btn-purple">Создать промокод</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-punch-dim"><th className="p-2">Code</th><th>Discount</th><th>Uses</th><th>Active</th><th></th></tr>
          </thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id} className="border-t border-white/10">
                <td className="p-2"><strong>{p.code}</strong></td>
                <td>{p.discount_percent}%</td>
                <td>{p.used_count}{p.max_uses ? ` / ${p.max_uses}` : ''}</td>
                <td>{p.active ? 'Yes' : 'No'}</td>
                <td>{p.active && <button onClick={() => toggle(p.id)} className="btn-blur text-xs">Disable</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    listLogs().catch(() => {});
    async function listLogs() {
      const data = await getLogs();
      setLogs(data.logs || []);
    }
  }, []);
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-punch-dim"><th className="p-2">Time</th><th>User</th><th>Action</th><th>IP</th></tr>
        </thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={i} className="border-t border-white/10">
              <td className="p-2">{formatDate(l.created_at)}</td>
              <td>{l.username || l.user_id || '—'}</td>
              <td>{l.action}</td>
              <td>{l.ip || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EbdTab({ onToast }) {
  const [ebd, setEbd] = useState(null);

  const load = useCallback(async () => {
    try {
      setEbd(await getEbd());
    } catch (e) {
      onToast(e.message, 'error');
    }
  }, [onToast]);

  useEffect(() => { load(); }, [load]);

  const downloadBackup = async () => {
    try {
      const blob = await backupEbd();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'punch-ebd.db';
      a.click();
      URL.revokeObjectURL(url);
      onToast('Backup скачан', 'success');
    } catch (e) {
      onToast(e.message, 'error');
    }
  };

  const dedupe = async () => {
    try {
      const data = await dedupeEbd();
      onToast(`Удалено дубликатов: ${data.removed}`, 'success');
      load();
    } catch (e) {
      onToast(e.message, 'error');
    }
  };

  return (
    <div className="card space-y-4">
      <p className="text-punch-dim">Единая база данных (EBD) — все аккаунты, ключи и чат лаунчера в одном файле.</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div><span className="text-sm text-punch-dim">Файл</span><strong className="block text-punch-title">{ebd?.path ?? '—'}</strong></div>
        <div><span className="text-sm text-punch-dim">Папка data</span><strong className="block text-punch-title">{ebd?.dataDir ?? '—'}</strong></div>
        <div><span className="text-sm text-punch-dim">Размер</span><strong className="block text-punch-title">{ebd ? formatBytes(ebd.sizeBytes) : '—'}</strong></div>
        <div><span className="text-sm text-punch-dim">Статус</span><strong className="block text-punch-title">{ebd?.healthy ? 'OK' : 'Есть дубликаты'}</strong></div>
        <div><span className="text-sm text-punch-dim">Пользователи</span><strong className="block text-punch-title">{ebd?.tables?.users ?? '—'}</strong></div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={load} className="btn-blur">Обновить</button>
        <button onClick={downloadBackup} className="btn-purple">Скачать backup (.db)</button>
        <button onClick={dedupe} className="btn-ghost">Удалить дубликаты</button>
      </div>
      <div>
        <h3 className="mt-4 font-semibold text-punch-title">Дубликаты email</h3>
        <pre className="card mt-2 whitespace-pre-wrap text-xs text-punch-dim">{ebd?.duplicateEmails?.length ? ebd.duplicateEmails.map((d) => `${d.email} (${d.count}): ${d.accounts}`).join('\n') : 'Нет'}</pre>
      </div>
      <div>
        <h3 className="mt-4 font-semibold text-punch-title">Дубликаты логинов</h3>
        <pre className="card mt-2 whitespace-pre-wrap text-xs text-punch-dim">{ebd?.duplicateUsernames?.length ? ebd.duplicateUsernames.map((d) => `${d.username} (${d.count}): ${d.accounts}`).join('\n') : 'Нет'}</pre>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminInner />
    </Suspense>
  );
}
