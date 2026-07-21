'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import FallingText from '@/components/FallingText';
import { register, setToken } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.target);
    try {
      const data = await register({
        username: fd.get('username'),
        email: fd.get('email'),
        password: fd.get('password'),
      });
      setToken(data.token);
      authLogin(data.token, { username: data.username });
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
            <Link href="/login" className="btn-blur">Вход</Link>
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
            <div className="pill">PUNCH // лаунчер 1.21.4</div>
            <h1 className="mt-6 text-5xl font-bold text-punch-title">
              <FallingText text="Создай аккаунт Punch" as="span" />
            </h1>
            <p className="mt-4 text-punch-dim">Один email — один аккаунт. Повторная регистрация на занятую почту невозможна.</p>
            <ul className="mt-6 space-y-2 text-punch-dim">
              <li>· Лаунчер Punch 1.21.4</li>
              <li>· Кабинет и активация ключей</li>
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
                <input name="username" type="text" placeholder="min 3 символа" required minLength={3} autoComplete="username" className="field mt-1" />
              </label>
              <label className="block">
                <span className="text-sm text-punch-dim">Email</span>
                <input name="email" type="email" placeholder="you@mail.ru" required autoComplete="email" className="field mt-1" />
              </label>
              <label className="block">
                <span className="text-sm text-punch-dim">Пароль</span>
                <input name="password" type="password" placeholder="min 6 символов" required minLength={6} autoComplete="new-password" className="field mt-1" />
              </label>
              {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
              <button type="submit" disabled={loading} className="btn-purple w-full">
                {loading ? 'Создаём…' : 'Создать аккаунт'}
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-punch-dim">
              Уже есть аккаунт? <Link href="/login" className="text-punch-accentSoft underline">Войти</Link>
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
