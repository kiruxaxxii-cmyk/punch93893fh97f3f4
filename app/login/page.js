'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import FallingText from '@/components/FallingText';
import { login, setToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { login: authLogin } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.target);
    try {
      const data = await login({
        login: fd.get('login'),
        password: fd.get('password'),
      });
      setToken(data.token);
      authLogin(data.token, { username: data.username, role: data.role });

      const loader = params.get('loader');
      if (loader) {
        router.push(`/loader-auth?session=${encodeURIComponent(loader)}`);
        return;
      }
      const next = params.get('next');
      if (next && next.startsWith('/')) {
        router.push(next);
        return;
      }
      router.push('/cabinet');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-1 text-xl font-semibold text-punch-title">
            <span className="text-punch-accent">P</span>
            <span>unch</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/register" className="btn-purple">Регистрация</Link>
          </div>
        </nav>
      </header>

      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="pill">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
              </svg>
              PUNCH // лаунчер 1.21.4
            </div>
            <h1 className="mt-6 text-5xl font-bold text-punch-title">
              <FallingText text="Войди в Punch" as="span" />
            </h1>
            <p className="mt-4 text-punch-dim">Логин или email и пароль — доступ к кабинету и лаунчеру.</p>
            <ul className="mt-6 space-y-2 text-punch-dim">
              <li>· Скачивание с активной подпиской</li>
              <li>· Активация ключей в кабинете</li>
              <li>· Чат лаунчера после входа</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="card"
          >
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <label className="block">
                <span className="text-sm text-punch-dim">Логин</span>
                <input name="login" type="text" placeholder="Логин или email" required autoComplete="username" className="field mt-1" />
              </label>
              <label className="block">
                <span className="text-sm text-punch-dim">Пароль</span>
                <input name="password" type="password" placeholder="Пароль" required autoComplete="current-password" className="field mt-1" />
              </label>
              {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
              <button type="submit" disabled={loading} className="btn-purple w-full">
                {loading ? 'Входим…' : 'Войти'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-punch-dim">
              Нет аккаунта? <Link href="/register" className="text-punch-accentSoft underline">Регистрация</Link>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
