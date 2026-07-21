'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getPayment } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function PaymentInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { token } = useAuth();
  const orderId = params.get('order');
  const plan = params.get('plan') || '';
  const price = params.get('price') || '';
  const manual = params.get('manual') === '1';

  const [info, setInfo] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [payUrl, setPayUrl] = useState(params.get('url') || '#');
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [token, router]);

  useEffect(() => {
    if (!orderId || !token) return;
    let timer;
    async function poll() {
      try {
        const data = await getPayment(orderId);
        setInfo(`${data.plan} · ${data.amountRub} ₽ · статус: ${data.status}`);
        if (data.payUrl) setPayUrl(data.payUrl);
        if (data.status === 'paid') {
          clearInterval(timer);
          setPaid(true);
          setInfo('Оплата получена! Подписка активирована.');
          setTimeout(() => router.push('/cabinet'), 1500);
        }
      } catch (e) {
        setError(e.message);
      }
    }
    setInfo(`${plan || 'Заказ #' + orderId}${price ? ' · ' + price + ' ₽' : ''}`);
    if (manual) setHint(`Заказ #${orderId}. Оплати и укажи номер заказа в комментарии.`);
    poll();
    timer = setInterval(poll, 4000);
    return () => clearInterval(timer);
  }, [orderId, token, plan, price, manual]);

  return (
    <div className="relative min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-1 text-xl font-semibold text-punch-title">
            <span className="text-punch-accent">P</span><span>unch</span>
          </Link>
        </nav>
      </header>

      <main className="flex min-h-screen items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="card w-full max-w-md text-center"
        >
          <h1 className="text-3xl font-semibold text-punch-title">
            {paid ? 'Готово' : 'Оплата CryptoBot'}
          </h1>
          <p className="mt-4 text-punch-dim">{info}</p>
          {hint && <p className="mt-2 text-sm text-punch-dim/70">{hint}</p>}
          {error && <p className="mt-3 text-sm text-red-400" role="alert">{error}</p>}
          {!paid && (
            <a
              href={payUrl}
              target="_blank"
              rel="noopener"
              className="btn-purple mt-6 w-full"
            >
              Открыть CryptoBot
            </a>
          )}
          <p className="mt-4 text-sm text-punch-dim">
            <Link href="/cabinet" className="text-punch-accentSoft underline">Кабинет</Link> ·{' '}
            <Link href="/#pricing" className="text-punch-accentSoft underline">Тарифы</Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentInner />
    </Suspense>
  );
}
