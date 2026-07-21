'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  getProfile,
  activateKey,
  changeEmail,
  bindHwid,
  downloadLauncher,
} from '@/lib/api';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

function CabinetInner() {
  const router = useRouter();
  const { token, user, refresh, logout } = useAuth();
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(true);
  const [keyMsg, setKeyMsg] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [hwidMsg, setHwidMsg] = useState('');
  const [hwid, setHwid] = useState('');
  const [dlNote, setDlNote] = useState('Active subscription required');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const p = await getProfile();
      setProfile(p);
    } catch {
      logout();
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }, [token, router, logout]);

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    load();
    const t = setInterval(() => {
      if (!document.hidden) load();
    }, 5000);
    return () => clearInterval(t);
  }, [token, router, load]);

  if (!token || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-punch-dim">
        Загрузка…
      </div>
    );
  }

  const canDownload = profile?.canDownloadLauncher || profile?.subscriptionActive;

  const onActivateKey = async (e) => {
    e.preventDefault();
    setKeyMsg('');
    const fd = new FormData(e.target);
    try {
      await activateKey({ key: fd.get('key') });
      setKeyMsg('Ключ активирован');
      e.target.reset();
      await load();
    } catch (err) {
      setKeyMsg(err.message);
    }
  };

  const onChangeEmail = async (e) => {
    e.preventDefault();
    setEmailMsg('');
    const fd = new FormData(e.target);
    try {
      const data = await changeEmail({ email: fd.get('email'), password: fd.get('password') });
      setEmailMsg('Email обновлён');
      if (data.email) setProfile((p) => ({ ...p, email: data.email }));
      e.target.reset();
    } catch (err) {
      setEmailMsg(err.message);
    }
  };

  const onBindHwid = async () => {
    setHwidMsg('');
    const value = hwid.trim();
    if (!value) {
      setHwidMsg('Введите device ID');
      return;
    }
    try {
      await bindHwid({ hwid: value });
      setHwidMsg('Устройство привязано');
      setHwid('');
      await load();
    } catch (err) {
      setHwidMsg(err.message);
    }
  };

  const onDownload = async () => {
    if (!canDownload) {
      setDlNote('Нужна активная подписка');
      return;
    }
    try {
      const blob = await downloadLauncher();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'punch-loader.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDlNote(err.message);
    }
  };

  return (
    <div className="relative min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-1 text-xl font-semibold text-punch-title">
            <span className="text-punch-accent">P</span><span>unch</span>
          </Link>
          <div className="flex items-center gap-3">
            {(profile?.role === 'admin' || profile?.role === 'moderator' || profile?.role === 'owner') && (
              <Link href="/admin" className="btn-blur">Админ</Link>
            )}
            <button onClick={logout} className="btn-blur">Выйти</button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="card mb-6"
        >
          <p className="flex items-center gap-2 text-sm uppercase tracking-wider text-punch-dim">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            User cabinet
            {profile?.role && <span className="rounded bg-punch-accent/20 px-2 py-0.5 text-punch-accentSoft">{profile.role}</span>}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-punch-title">
            Welcome back, <span>{profile?.username || '—'}</span>
          </h1>
          <p className="text-punch-dim">All your data, settings, and features in one place!</p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Profile */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-punch-accent/20 text-2xl text-punch-title">
                {profile?.username?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div>
                <p className="text-sm text-punch-dim">Subscription Till:</p>
                <p className="font-semibold text-punch-title">
                  {profile?.subscriptionActive ? formatDate(profile.subscriptionExpiresAt) : 'Нет подписки'}
                </p>
                <p className="text-sm text-punch-dim">
                  <strong className="text-punch-title">{profile?.username}</strong> [{profile?.id}]
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href="/#pricing" className="btn-ghost flex-1 text-sm">Pricing</Link>
            </div>
          </motion.section>

          {/* Info */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card space-y-3">
            <div><span className="text-sm text-punch-dim">Email</span><strong className="block text-punch-title">{profile?.email}</strong></div>
            <div><span className="text-sm text-punch-dim">Registration Date</span><strong className="block text-punch-title">{formatDate(profile?.createdAt)}</strong></div>
            <div><span className="text-sm text-punch-dim">HWID</span><strong className="block text-punch-title">{profile?.hwid || 'Not Linked'}</strong></div>
          </motion.section>

          {/* Activate key */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-punch-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg> Activate License Key
            </h3>
            <form onSubmit={onActivateKey} className="space-y-3">
              <input name="key" placeholder="Your super license key" className="field" />
              <button type="submit" className="btn-purple w-full">Activate</button>
            </form>
            {keyMsg && <p className="mt-2 text-sm text-punch-accentSoft">{keyMsg}</p>}
          </motion.section>

          {/* Change email */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
            <h3 className="mb-3 font-semibold text-punch-title">Change Email</h3>
            <form onSubmit={onChangeEmail} className="space-y-3">
              <input name="email" type="email" placeholder="New email" required className="field" />
              <input name="password" type="password" placeholder="Current password" required className="field" />
              <button type="submit" className="btn-purple w-full">Change</button>
            </form>
            {emailMsg && <p className="mt-2 text-sm text-punch-accentSoft">{emailMsg}</p>}
          </motion.section>

          {/* HWID */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card">
            <h3 className="mb-3 font-semibold text-punch-title">Device Binding</h3>
            <input
              value={hwid}
              onChange={(e) => setHwid(e.target.value)}
              placeholder="Device ID"
              className="field"
            />
            <button onClick={onBindHwid} className="btn-purple mt-3 w-full">Bind Device</button>
            {hwidMsg && <p className="mt-2 text-sm text-punch-accentSoft">{hwidMsg}</p>}
          </motion.section>

          {/* Launcher */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-punch-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
              </svg> Launcher
            </h3>
            <div className="mb-3 space-y-1 text-sm text-punch-dim">
              <div className="flex justify-between"><span>System</span><strong className="text-punch-title">Windows 10+ (x64)</strong></div>
              <div className="flex justify-between"><span>Processor</span><strong className="text-punch-title">Intel / AMD</strong></div>
              <div className="flex justify-between"><span>Memory</span><strong className="text-punch-title">4GB</strong></div>
            </div>
            <button onClick={onDownload} disabled={!canDownload} className={`w-full ${canDownload ? 'btn-purple' : 'btn-ghost opacity-60'}`}>
              Download Launcher
            </button>
            <p className="mt-2 text-sm text-punch-dim">{canDownload ? 'Ready to download' : dlNote}</p>
          </motion.section>
        </div>
      </main>
    </div>
  );
}

export default function CabinetPage() {
  return (
    <Suspense fallback={null}>
      <CabinetInner />
    </Suspense>
  );
}
