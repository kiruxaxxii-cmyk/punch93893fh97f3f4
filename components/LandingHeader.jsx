'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useScroll, useTransform, motion } from 'framer-motion';

export default function LandingHeader() {
  const { token } = useAuth();
  const { scrollY } = useScroll();
  const textOpacity = useTransform(scrollY, [0, 120], [1, 0]);
  const textBlur = useTransform(scrollY, [0, 120], [0, 12]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-gradient-to-b from-black/20 to-transparent">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <motion.span
            style={{ opacity: textOpacity, filter: useTransform(textBlur, (v) => `blur(${v}px)`) }}
            className="text-punch-title"
          >
            Punch
          </motion.span>
        </Link>
        <div className="hidden items-center gap-6 text-sm text-punch-dim md:flex">
          <a href="/#hero" className="transition-colors hover:text-punch-title">Главная</a>
          <a href="/#video" className="transition-colors hover:text-punch-title">Видео</a>
          <a href="/#advantages" className="transition-colors hover:text-punch-title">Преимущества</a>
          <a href="/#pricing" className="transition-colors hover:text-punch-title">Цены</a>
          <a href="/#download" className="transition-colors hover:text-punch-title">Скачать</a>
          <a
            href="https://funpay.com/users/15366808/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-punch-title"
          >
            FunPay
          </a>
        </div>
        <div className="flex items-center gap-3">
          {token ? (
            <Link href="/cabinet" className="btn-purple">Кабинет</Link>
          ) : (
            <>
              <Link href="/login" className="btn-blur">Вход</Link>
              <Link href="/register" className="btn-purple">Регистрация</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
