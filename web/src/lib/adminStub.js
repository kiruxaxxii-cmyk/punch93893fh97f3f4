import { ADMIN_STUB_KEY, OWNER_EMAIL, normalizeRole } from "./theme.js";
import {
  cleanEmail,
  cleanString,
  formatDate,
  generateKeyCode,
  hashId,
  hashIdNumber,
  isSystemOwner,
  normalizeDate,
  uidSuffix
} from "./format.js";

export function normalizeUser(input) {
  const displayName = input.displayName.trim();
  const email = cleanEmail(input.email);
  const owner = input.isSystemOwner === true;
  const base = {
    uid: input.uid ?? hashIdNumber(email ?? displayName),
    id: hashId(email ?? displayName),
    displayName,
    avatarUrl: cleanString(input.avatarUrl),
    email,
    role: normalizeRole(input.role),
    subscriptionTier: normalizeRole(input.subscriptionTier ?? input.role),
    createdAt: input.createdAt?.trim() || formatDate(),
    hardwareId: cleanString(input.hardwareId),
    promoCode: cleanString(input.promoCode),
    subscriptionTill: normalizeDate(input.subscriptionTill),
    twoFactorEnabled: input.twoFactorEnabled ?? false,
    isBanned: input.isBanned ?? false,
    banReason: cleanString(input.banReason),
    isSystemOwner: owner,
    lastSeen: input.lastSeen?.trim() || formatDate()
  };
  if (owner) {
    return {
      ...base,
      displayName: "owner",
      email: OWNER_EMAIL,
      role: "Admin",
      subscriptionTier: "Premium",
      isBanned: false,
      banReason: null,
      twoFactorEnabled: true,
      isSystemOwner: true,
      subscriptionTill: "Lifetime"
    };
  }
  return base;
}

export function normalizeUserOrNull(input) {
  const displayName = input?.displayName?.trim();
  if (!displayName) return null;
  return normalizeUser(input);
}

export function normalizeLicenseKey(input) {
  const product = input?.product?.trim();
  const duration = input?.duration?.trim();
  if (!product || !duration) return null;
  const assignedTo = cleanString(input?.assignedTo);
  const status = input?.status === "revoked" ? "revoked" : assignedTo ? "assigned" : "unused";
  return {
    id: input?.id?.trim() || uidSuffix("key"),
    code: input?.code?.trim().toUpperCase() || generateKeyCode(),
    product,
    subscriptionTier: input?.subscriptionTier === "Beta" ? "Beta" : "Premium",
    duration,
    status,
    assignedTo,
    createdAt: input?.createdAt?.trim() || formatDate(),
    note: cleanString(input?.note)
  };
}

export function normalizePromoCode(input) {
  const code = input?.code?.trim().toUpperCase();
  if (!code) return null;
  const maxUses = Number.isFinite(input?.maxUses) ? Math.max(1, Math.round(input?.maxUses ?? 1)) : 1;
  const uses = Number.isFinite(input?.uses) ? Math.max(0, Math.min(maxUses, Math.round(input?.uses ?? 0))) : 0;
  return {
    id: input?.id?.trim() || uidSuffix("promo"),
    code,
    discountPercent: Number.isFinite(input?.discountPercent)
      ? Math.max(1, Math.min(100, Math.round(input?.discountPercent ?? 10)))
      : 10,
    maxUses,
    uses,
    status: input?.status === "paused" ? "paused" : "active",
    expiresAt: normalizeDate(input?.expiresAt),
    createdAt: input?.createdAt?.trim() || formatDate()
  };
}

export function seedStore() {
  return {
    users: [
      normalizeUser({
        displayName: "owner",
        email: OWNER_EMAIL,
        role: "Admin",
        isSystemOwner: true,
        createdAt: "01.04.2026",
        hardwareId: "ROOT-HWID-77A1",
        promoCode: "ROOT30",
        subscriptionTill: "Lifetime",
        twoFactorEnabled: true,
        lastSeen: formatDate()
      }),
      normalizeUser({
        displayName: "Aster",
        email: "aster@eclipse.dev",
        role: "User",
        createdAt: "03.04.2026",
        hardwareId: "ASTR-1144-X9",
        promoCode: "SPRING15",
        subscriptionTill: "18.05.2026",
        lastSeen: "12.04.2026"
      }),
      normalizeUser({
        displayName: "Miko",
        email: "miko@eclipse.dev",
        role: "Helper",
        createdAt: "05.04.2026",
        hardwareId: "M1KO-8831-F2",
        subscriptionTill: "25.04.2026",
        twoFactorEnabled: true,
        lastSeen: "11.04.2026"
      }),
      normalizeUser({
        displayName: "admin",
        email: "admin@eclipse.dev",
        role: "Admin",
        createdAt: "01.04.2026",
        hardwareId: "ADMN-0001-X1",
        subscriptionTill: "Lifetime",
        lastSeen: formatDate()
      })
    ],
    licenseKeys: [
      {
        id: "key-seed-owner",
        code: "KEY-OWNE-R777-ALFA",
        product: "Lite",
        subscriptionTier: "Premium",
        duration: "Lifetime",
        status: "assigned",
        assignedTo: OWNER_EMAIL,
        createdAt: "01.04.2026",
        note: "Root license"
      },
      {
        id: "key-seed-stock",
        code: "KEY-STCK-52Q8-DEL7",
        product: "Lite",
        subscriptionTier: "Premium",
        duration: "30 days",
        status: "unused",
        assignedTo: null,
        createdAt: "09.04.2026",
        note: "Discord giveaway batch"
      },
      {
        id: "key-seed-revoked",
        code: "KEY-RVOK-19Q2-TEMP",
        product: "Lite",
        subscriptionTier: "Beta",
        duration: "7 days",
        status: "revoked",
        assignedTo: "aster@eclipse.dev",
        createdAt: "10.04.2026",
        note: "Chargeback case"
      }
    ],
    promoCodes: [
      {
        id: "promo-root",
        code: "ROOT30",
        discountPercent: 30,
        maxUses: 10,
        uses: 2,
        status: "active",
        expiresAt: "30.04.2026",
        createdAt: "01.04.2026"
      },
      {
        id: "promo-spring",
        code: "SPRING15",
        discountPercent: 15,
        maxUses: 50,
        uses: 11,
        status: "active",
        expiresAt: "20.04.2026",
        createdAt: "06.04.2026"
      },
      {
        id: "promo-archive",
        code: "ARCHIVE5",
        discountPercent: 5,
        maxUses: 100,
        uses: 100,
        status: "paused",
        expiresAt: null,
        createdAt: "28.03.2026"
      }
    ]
  };
}

export function normalizeStore(raw) {
  const users = (raw?.users ?? []).map(normalizeUserOrNull).filter(Boolean);
  const licenseKeys = (raw?.licenseKeys ?? []).map(normalizeLicenseKey).filter(Boolean);
  const promoCodes = (raw?.promoCodes ?? []).map(normalizePromoCode).filter(Boolean);
  const list = users.filter((u) => u.isSystemOwner || u.email?.toLowerCase() !== OWNER_EMAIL);
  if (!list.some(isSystemOwner)) {
    list.unshift(
      normalizeUser({
        displayName: "owner",
        email: OWNER_EMAIL,
        role: "Admin",
        isSystemOwner: true,
        twoFactorEnabled: true,
        subscriptionTill: "Lifetime"
      })
    );
  }
  return { users: list, licenseKeys, promoCodes };
}

export function loadStore() {
  const seed = seedStore();
  if (typeof window === "undefined") return seed;
  const raw = window.localStorage.getItem(ADMIN_STUB_KEY);
  if (!raw) {
    window.localStorage.setItem(ADMIN_STUB_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    const normalized = normalizeStore(JSON.parse(raw));
    window.localStorage.setItem(ADMIN_STUB_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    window.localStorage.setItem(ADMIN_STUB_KEY, JSON.stringify(seed));
    return seed;
  }
}

export function saveStore(store) {
  const normalized = normalizeStore(store);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ADMIN_STUB_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function findUser(identifier) {
  const key = identifier.trim().toLowerCase();
  if (!key) return null;
  return (
    loadStore().users.find(
      (u) =>
        u.id.toLowerCase() === key ||
        u.displayName.toLowerCase() === key ||
        u.email?.toLowerCase() === key
    ) ?? null
  );
}

export function findUserById(id) {
  const key = id.trim();
  if (!key) return null;
  return loadStore().users.find((u) => u.id === key) ?? null;
}

export function upsertUser(user) {
  const store = loadStore();
  const email = user.email?.toLowerCase();
  if (!user.isSystemOwner && email === OWNER_EMAIL) return store;
  const index = store.users.findIndex(
    (u) => u.id === user.id || (email ? u.email?.toLowerCase() === email && u.isSystemOwner === user.isSystemOwner : false)
  );
  const users = [...store.users];
  if (index >= 0) {
    if (store.users[index].isSystemOwner && !user.isSystemOwner) return store;
    users[index] = user;
  } else {
    users.unshift(user);
  }
  return saveStore({ ...store, users });
}
