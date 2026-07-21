(function () {
  const modal = document.getElementById('buyModal');
  if (!modal) return;

  const planEl = document.getElementById('buyModalPlan');
  const promoInput = document.getElementById('buyPromoInput');
  const promoMsg = document.getElementById('buyPromoMsg');
  const applyBtn = document.getElementById('buyApplyPromo');
  const confirmBtn = document.getElementById('buyConfirmBtn');
  const funpayBtn = document.getElementById('buyFunpayBtn');
  const payMethod = document.getElementById('buyPayMethod');
  const priceHint = document.getElementById('buyPriceHint');
  const priceOldEl = document.getElementById('buyPriceOld');
  const priceCurrentEl = document.getElementById('buyPriceCurrent');

  let basePrice = 0;
  let currentPrice = 0;
  let planName = '';
  let promoApplied = false;
  let paying = false;

  function formatPrice(value) {
    return `${value} ₽`;
  }

  function setPromoMessage(text, type) {
    if (!promoMsg) return;
    promoMsg.textContent = text;
    promoMsg.className = 'buy-promo-msg' + (type ? ` ${type}` : '');
  }

  function updatePayButton() {
    confirmBtn.textContent = `Оплатить ${formatPrice(currentPrice)}`;
  }

  function renderPromoPrice() {
    if (priceHint && priceOldEl && priceCurrentEl && promoApplied && currentPrice < basePrice) {
      priceHint.hidden = false;
      priceOldEl.textContent = formatPrice(basePrice);
      priceCurrentEl.textContent = formatPrice(currentPrice);
    } else if (priceHint) {
      priceHint.hidden = true;
    }
    updatePayButton();
  }

  function resetModal() {
    paying = false;
    promoApplied = false;
    currentPrice = basePrice;
    if (promoInput) promoInput.value = '';
    payMethod.selectedIndex = 0;
    setPromoMessage('');
    confirmBtn.disabled = false;
    funpayBtn.disabled = false;
    if (applyBtn) applyBtn.disabled = false;
    renderPromoPrice();
  }

  function openModal(plan, price) {
    planName = plan;
    basePrice = price;
    currentPrice = price;
    planEl.textContent = plan;
    resetModal();
    modal.hidden = false;
    document.body.classList.add('modal-open');
    (promoInput || payMethod).focus();
  }

  function closeModal() {
    if (paying) return;
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    resetModal();
  }

  async function applyPromo() {
    const code = promoInput?.value.trim() || '';
    if (!code) {
      promoApplied = false;
      currentPrice = basePrice;
      setPromoMessage('');
      renderPromoPrice();
      return false;
    }

    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Промокод не найден');

      promoApplied = true;
      currentPrice = Math.max(1, Math.round(basePrice * (1 - data.discountPercent / 100)));
      setPromoMessage(`Скидка ${data.discountPercent}% применена`, 'success');
      renderPromoPrice();
      return true;
    } catch (error) {
      promoApplied = false;
      currentPrice = basePrice;
      setPromoMessage(error.message || 'Промокод не найден', 'error');
      renderPromoPrice();
      return false;
    }
  }

  async function startPayment(method, btn) {
    const token = localStorage.getItem('punch-token');
    if (!token) {
      const next = encodeURIComponent(window.location.pathname + window.location.hash);
      window.location.href = `/login.html?next=${next}`;
      return;
    }

    if (paying) return;

    if (promoInput?.value.trim()) {
      const ok = await applyPromo();
      if (!ok) return;
    }

    paying = true;
    confirmBtn.disabled = true;
    funpayBtn.disabled = true;
    if (applyBtn) applyBtn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = 'Создаём счёт CryptoBot…';

    try {
      const body = {
        plan: planName,
        price: currentPrice,
        method: method || payMethod.value,
      };
      if (promoApplied && promoInput?.value.trim()) {
        body.promoCode = promoInput.value.trim();
      }

      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось создать счёт');
      }

      const q = new URLSearchParams({
        order: String(data.orderId),
        url: data.payUrl,
        plan: planName,
        price: String(currentPrice),
      });
      if (data.manual) q.set('manual', '1');
      window.location.href = `/payment.html?${q}`;
    } catch (error) {
      alert(error.message);
      paying = false;
      confirmBtn.disabled = false;
      funpayBtn.disabled = false;
      if (applyBtn) applyBtn.disabled = false;
      btn.textContent = prev;
      updatePayButton();
    }
  }

  document.querySelectorAll('.btn-buy').forEach((btn) => {
    btn.addEventListener('click', () => {
      openModal(btn.dataset.plan, Number(btn.dataset.price));
    });
  });

  applyBtn?.addEventListener('click', applyPromo);

  promoInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyPromo();
    }
  });

  confirmBtn.addEventListener('click', () => {
    startPayment(payMethod.value, confirmBtn);
  });

  funpayBtn.addEventListener('click', () => {
    startPayment('funpay', funpayBtn);
  });

  modal.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden && !paying) closeModal();
  });
})();
