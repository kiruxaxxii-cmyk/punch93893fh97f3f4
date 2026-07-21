'use client';

import { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import FallingText from '@/components/FallingText';
import LandingHeader from '@/components/LandingHeader';
import CheckoutModal from '@/components/CheckoutModal';
import TiltCard from '@/components/TiltCard';
import SpotlightGrid from '@/components/SpotlightGrid';
import { useAuth } from '@/context/AuthContext';
import { downloadLauncher, getProfile } from '@/lib/api';

const PLAN_ICONS = [
  <svg key="7d" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/><circle cx="12" cy="12" r="4"/></svg>,
  <svg key="1m" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/><path d="M21 3v6h-6"/></svg>,
  <svg key="3m" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>,
  <svg key="forever" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>,
  <svg key="hwid" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/><path d="M12 6v6"/></svg>,
];

const PLANS = [
  { plan: '7 дней', price: 49, icon: 0 },
  { plan: '1 месяц', price: 99, featured: true, icon: 1 },
  { plan: '3 месяца', price: 149, icon: 2 },
  { plan: 'Навсегда', price: 219, icon: 3 },
  { plan: 'Сброс HWID', price: 100, icon: 4 },
];

const ADVANTAGES = [
  {
    title: 'Пиковая производительность',
    text: 'Оптимизированное ядро — нулевая задержка и стабильный FPS даже на слабых ПК.',
    tall: true,
  },
  {
    title: 'Интуитивный интерфейс',
    text: 'Минималистичное меню для быстрого доступа ко всем 50+ модулям.',
  },
  {
    title: 'Приоритетная поддержка',
    text: 'Прямой доступ к команде с быстрым ответом в Discord.',
  },
  {
    title: 'Продвинутая защита',
    text: 'Многоуровневое шифрование и HWID-привязка для защиты аккаунта и данных.',
    xtall: true,
  },
  {
    title: 'Элитные возможности',
    text: 'Набор инструментов для максимального преимущества в PvP и выживании.',
  },
  {
    title: 'Постоянные обновления',
    text: 'Фоновая доставка новых модулей и патчей стабильности под новые версии MC.',
  },
  {
    title: 'Fabric 1.20 — 1.21',
    text: 'Полная совместимость с актуальными версиями Minecraft и быстрый запуск через лаунчер.',
    tall: true,
  },
  {
    title: '50+ модулей',
    text: 'Combat, Movement, Render, Utility — всё настраивается под твой стиль игры.',
  },
];

function SectionHead({ pill, title, desc }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="mb-10 text-center"
    >
      <span className="pill">{pill}</span>
      <h2 className="mt-4 text-4xl font-semibold text-punch-title">{title}</h2>
      <p className="mt-2 text-punch-dim">{desc}</p>
    </motion.div>
  );
}

function HeroScroll({ openCheckout }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const textOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);
  const textBlur = useTransform(scrollYProgress, [0, 0.35], ['0px', '16px']);
  const textScale = useTransform(scrollYProgress, [0, 0.35], [1, 0.7]);
  const logoScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.6]);
  const logoY = useTransform(scrollYProgress, [0, 0.5], [0, -20]);

  return (
    <motion.div ref={ref} className="flex flex-col items-center gap-6" style={{ scale: logoScale, y: logoY }}>
      <motion.h1
        className="text-7xl font-bold tracking-tight text-punch-title md:text-9xl"
        style={{ opacity: textOpacity, filter: `blur(${textBlur}px)`, scale: textScale }}
      >
        Punch
      </motion.h1>

      <motion.p
        className="max-w-xl text-lg text-punch-muted"
        style={{ opacity: textOpacity, filter: `blur(${textBlur}px)` }}
      >
        <FallingText
          text="Хватит оглядываться на правила — используй игру по максимуму!"
          as="span"
          delay={0.5}
        />
      </motion.p>

      <motion.div
        className="mt-4 flex flex-wrap items-center justify-center gap-4"
        style={{ opacity: textOpacity }}
      >
        <button onClick={() => openCheckout('1 месяц', 99)} className="btn-purple">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            <path d="M21 3v6h-6" />
          </svg>
          Тарифы
        </button>
        <a href="#advantages" className="btn-ghost">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="6" />
            <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
          </svg>
          Преимущества
        </a>
      </motion.div>
    </motion.div>
  );
}

export default function HomePage() {
  const { token, user } = useAuth();
  const [modal, setModal] = useState({ open: false, plan: '', price: 0 });
  const [dlMsg, setDlMsg] = useState('');

  const openCheckout = (plan, price) => {
    if (!token) {
      window.location.href = `/login?next=${encodeURIComponent('/#pricing')}`;
      return;
    }
    setModal({ open: true, plan, price });
  };

  const handleDownload = async () => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    try {
      const profile = user || (await getProfile());
      if (!profile.canDownloadLauncher && !profile.subscriptionActive) {
        setDlMsg('Нужна активная подписка.');
        return;
      }
      const blob = await downloadLauncher();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'punch-loader.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDlMsg(e.message);
    }
  };

  return (
    <div className="relative min-h-screen">
      <LandingHeader />

      {/* Hero */}
      <section id="hero" className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pt-24 text-center">
        <HeroScroll openCheckout={openCheckout} />
      </section>

      {/* Video */}
      <section id="video" className="mx-auto max-w-5xl px-6 py-24">
        <SectionHead pill="Видео" title="Посмотри Punch в деле" desc="Демонстрация клиента в действии" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-2xl glass"
        >
          <div className="relative aspect-video w-full bg-black/60 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-punch-accent/10 via-transparent to-punch-accent/5" />
            <div className="relative text-center">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 text-punch-accent/40">
                <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
                <rect x="2" y="6" width="14" height="12" rx="2" />
              </svg>
              <p className="text-4xl font-bold text-white/90 tracking-wide">Soon...</p>
              <p className="mt-2 text-sm text-white/40">Видео скоро будет доступно</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Advantages */}
      <section id="advantages" className="mx-auto max-w-6xl px-6 py-24">
        <SectionHead pill="Преимущества" title="Почему Punch?" desc="Всё, что отличает наш клиент от остальных" />
        <SpotlightGrid className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ADVANTAGES.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={`${a.tall ? 'lg:row-span-2' : ''} ${a.xtall ? 'lg:row-span-2' : ''}`}
            >
              <TiltCard className="card h-full">
                <h3 className="text-xl font-semibold text-punch-title">{a.title}</h3>
                <p className="mt-2 text-punch-dim">{a.text}</p>
              </TiltCard>
            </motion.div>
          ))}
        </SpotlightGrid>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <SectionHead
          pill="Тарифы"
          title="Выбери свой план"
          desc="Ключ приходит на email · активация в кабинете · промокоды в окне оплаты"
        />
        <SpotlightGrid className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.plan}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              <TiltCard
                className={`card flex flex-col h-full ${p.featured ? 'ring-2 ring-punch-accent/60 shadow-glow' : ''}`}
              >
                {p.featured && (
                  <span className="mb-3 self-start rounded-full bg-punch-accent/20 px-3 py-1 text-xs text-punch-accentSoft">
                    Популярный
                  </span>
                )}
                <div className="text-punch-accent mb-3">
                  {PLAN_ICONS[p.icon]}
                </div>
                <h3 className="text-lg font-semibold text-punch-title">{p.plan}</h3>
                <p className="mt-2 text-3xl font-bold text-punch-title">{p.price} ₽</p>
                <button
                  onClick={() => openCheckout(p.plan, p.price)}
                  className={`mt-5 w-full ${p.featured ? 'btn-purple' : 'btn-ghost'}`}
                >
                  Купить
                </button>
              </TiltCard>
            </motion.div>
          ))}
        </SpotlightGrid>
      </section>

      {/* Download */}
      <section id="download" className="mx-auto max-w-3xl px-6 py-24">
        <SectionHead pill="Скачать" title="Запусти Punch" desc="Скачивание доступно с активной подпиской" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="card text-center"
        >
          <h2 className="text-3xl font-semibold text-punch-title">Punch Launcher</h2>
          <p className="mt-2 text-punch-dim">v2.4.1 · Fabric 1.20.4 — 1.21.1</p>
          <button onClick={handleDownload} className="btn-purple mt-6 px-8 py-3">
            Скачать лаунчер
          </button>
          {dlMsg && <p className="mt-3 text-sm text-red-400">{dlMsg}</p>}
          <p className="mt-3 text-sm text-punch-dim">
            Нужна активная подписка · <Link href="/login" className="text-punch-accentSoft underline">Войти</Link>
          </p>
        </motion.div>
      </section>

      <footer className="relative border-t border-white/10 py-8 text-center text-sm text-punch-dim">
        <span>© 2026 Punch</span>
        <span className="absolute bottom-2 right-4 text-xs text-punch-dim/50">designed by <a href="https://t.me/funcknameshied" target="_blank" rel="noopener noreferrer" className="underline hover:text-punch-accentSoft transition-colors">funcknameshield</a></span>
      </footer>

      <CheckoutModal
        open={modal.open}
        plan={modal.plan}
        price={modal.price}
        onClose={() => setModal({ open: false, plan: '', price: 0 })}
      />
    </div>
  );
}
