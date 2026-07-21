'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPayment, validatePromo } from '@/lib/api';
import { useRouter } from 'next/navigation';

const METHODS = [
  { value: 'sbp', label: 'Система Быстрых Платежей' },
  { value: 'cards', label: 'Карты' },
  { value: 'usdt', label: 'Криптовалюта (USDT/TRC20)' },
  { value: 'ton', label: 'Криптовалюта (TON)' },
  { value: 'ltc', label: 'Криптовалюта (LTC)' },
  { value: 'eth', label: 'Криптовалюта (ETH)' },
];

export default function CheckoutModal({ open, plan, price, onClose }) {
  const router = useRouter();
  const [method, setMethod] = useState('sbp');
  const [promo, setPromo] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [promoType, setPromoType] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paying, setPaying] = useState(false);
  const [funpay, setFunpay] = useState(false);

  const basePrice = Number(price) || 0;
  const currentPrice = discount > 0 ? Math.max(1, Math.round(basePrice * (1 - discount / 100))) : basePrice;

  const close = () => {
    if (paying) return;
    onClose();
  };

  const applyPromo = async () => {
    const code = promo.trim();
    if (!code) {
      setDiscount(0);
      setPromoMsg('');
      return false;
    }
    try {
      const data = await validatePromo({ code });
      setDiscount(data.discountPercent || 0);
      setPromoMsg(`Скидка ${data.discountPercent}% применена`);
      setPromoType('text-green-400');
      return true;
    } catch (e) {
      setDiscount(0);
      setPromoMsg(e.message || 'Промокод не найден');
      setPromoType('text-red-400');
      return false;
    }
  };

  const startPayment = async (payMethod, isFunpay = false) => {
    if (paying) return;
    if (promo.trim()) {
      const ok = await applyPromo();
      if (!ok) return;
    }
    setPaying(true);
    setFunpay(isFunpay);
    try {
      const data = await createPayment({
        plan,
        price: currentPrice,
        method: isFunpay ? 'funpay' : payMethod,
        ...(discount > 0 && promo.trim() ? { promoCode: promo.trim() } : {}),
      });
      const q = new URLSearchParams({
        order: String(data.orderId),
        url: data.payUrl,
        plan,
        price: String(currentPrice),
      });
      if (data.manual) q.set('manual', '1');
      router.push(`/payment?${q.toString()}`);
    } catch (e) {
      alert(e.message);
      setPaying(false);
      setFunpay(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            className="glass relative z-10 w-full max-w-md p-6"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Закрыть"
              className="absolute right-4 top-4 text-2xl leading-none text-punch-dim hover:text-punch-title"
            >
              ×
            </button>
            <p className="text-sm text-punch-dim">Product: <span className="text-punch-title">{plan}</span></p>
            <label className="mt-4 block text-sm text-punch-dim">Способ оплаты</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="field mt-2"
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value} className="bg-punch-bg">
                  {m.label}
                </option>
              ))}
            </select>

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="Промокод"
                className="field flex-1"
              />
              <button type="button" onClick={applyPromo} className="btn-blur">
                Применить
              </button>
            </div>
            <p className={`mt-2 text-sm ${promoType || 'opacity-0'}`}>{promoMsg}</p>

            {discount > 0 && (
              <div className="mt-3 flex items-center gap-3 text-sm">
                <span className="text-punch-dim line-through">{basePrice} ₽</span>
                <span className="text-punch-accentSoft font-semibold">{currentPrice} ₽</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => startPayment(method)}
              disabled={paying}
              className="btn-purple mt-5 w-full"
            >
              {paying && !funpay ? 'Создаём счёт…' : `Оплатить ${currentPrice} ₽`}
            </button>
            <div className="my-3 text-center text-xs text-punch-dim">OR</div>
            <button
              type="button"
              onClick={() => window.open('https://funpay.com/users/15366808/', '_blank', 'noopener')}
              className="btn-ghost w-full"
            >
              Pay with Funpay
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
