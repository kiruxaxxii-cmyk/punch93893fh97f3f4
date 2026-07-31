export const PRODUCTS_COPY = {
  en: {
    badge: "Products",
    title: "All Products - Choose Your Way to Dominate",
    description: "Here you'll find all our Minecraft solutions. Optimization, stability, and functionality - choose and get the best quality.",
    signedInAs: (r1) => "Signed in as " + r1,
    defaultUser: "User",
    empty: "No plans available right now.",
    unavailableTitle: "Plans unavailable",
    unavailableFallback: "Unable to load plans right now.",
    popular: "Popular",
    continue: "Continue to purchase",
    hwidReset: "HWID Reset",
    year: "yr",
    month: "mo",
    week: "wk",
    day: "d"
  },
  ru: {
    badge: "Товары",
    title: "Все товары - выберите свой способ доминировать",
    description: "Здесь собраны все наши решения для Minecraft. Оптимизация, стабильность и функциональность - выбирайте и получайте лучшее качество.",
    signedInAs: (r1) => "Вы вошли как " + r1,
    defaultUser: "Пользователь",
    empty: "Сейчас нет доступных планов.",
    unavailableTitle: "Планы недоступны",
    unavailableFallback: "Не удалось загрузить планы прямо сейчас.",
    popular: "Популярно",
    continue: "Перейти к покупке",
    hwidReset: "Сброс HWID",
    year: "г",
    month: "мес",
    week: "нед",
    day: "д"
  }
};

export const PURCHASE_COPY = {
  en: {
    unavailableTitle: "Plan unavailable",
    unavailableFallback: "Unable to load this plan.",
    paymentErrorTitle: "Payment error",
    paymentErrorFallback: "Unable to create payment.",
    paymentDetails: "Payment details",
    promoTitle: "Promo code (optional)",
    promoPlaceholder: "Enter promo code",
    planId: "Plan ID",
    redirecting: "Redirecting...",
    buy: "Buy via YooMoney",
    back: "Back to products",
    hwidReset: "HWID reset",
    year: (r1) => r1 + " year",
    month: (r1) => r1 + " month",
    days: (r1) => r1 + " days"
  },
  ru: {
    unavailableTitle: "План недоступен",
    unavailableFallback: "Не удалось загрузить этот план.",
    paymentErrorTitle: "Ошибка оплаты",
    paymentErrorFallback: "Не удалось создать платёж.",
    paymentDetails: "Детали оплаты",
    promoTitle: "Промокод (необязательно)",
    promoPlaceholder: "Введите промокод",
    planId: "ID плана",
    redirecting: "Перенаправление...",
    buy: "Оплатить через YooMoney",
    back: "Назад к товарам",
    hwidReset: "Сброс HWID",
    year: (r1) => r1 + " год",
    month: (r1) => r1 + " месяц",
    days: (r1) => r1 + " дней"
  }
};

const SLUG_ALIASES = {
  three_month: "premium_90d",
  beta: "beta_30d",
  one_month: "premium_30d",
  hwid: "hwid_reset"
};

export function slugify(r1) {
  return r1
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function findPlanBySlug(r1, r5) {
  let r6 = slugify(r5);
  let r7 = r1.find((r9) => slugify(r9.id) === r6);
  if (r7) {
    return r7;
  }
  let r8 = SLUG_ALIASES[r6];
  if (r8) {
    let r9 = r1.find((rN) => rN.id === r8);
    if (r9) {
      return r9;
    }
  }
  return r1.find((rN) => slugify(rN.name) === r6) ?? null;
}

export function planTierColor(r5) {
  if (r5.subscriptionTier === "Beta") {
    return "#7c3aed";
  }
  if (r5.subscriptionTier === "Premium") {
    return "#d97706";
  }
  return "#2563eb";
}

export function formatPurchaseDuration(r5, r6) {
  if (r5 < 0) {
    return r6.hwidReset;
  }
  if (r5 % 365 === 0) {
    return r6.year(r5 / 365);
  }
  if (r5 % 30 === 0) {
    return r6.month(r5 / 30);
  }
  return r6.days(r5);
}

export function formatPlanDuration(r5, r6) {
  if (r5 < 0) {
    return r6.hwidReset;
  }
  if (r5 % 365 === 0) {
    return r5 / 365 + " " + r6.year;
  }
  if (r5 % 30 === 0) {
    return r5 / 30 + " " + r6.month;
  }
  if (r5 % 7 === 0) {
    return r5 / 7 + " " + r6.week;
  }
  return "" + r5 + r6.day;
}
