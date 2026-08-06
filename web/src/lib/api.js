/**
 * Punch live API client — talks to Express server.js (/api/*).
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function errorMessage(err, fallback) {
  if (err instanceof ApiError || (err instanceof Error && err.message.trim())) {
    return err.message;
  }
  return fallback;
}

const TOKEN_KEY = "punch-auth-token";

export function getToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  if (!token) window.localStorage.removeItem(TOKEN_KEY);
  else window.localStorage.setItem(TOKEN_KEY, token);
}

export const apiConfig = {
  baseUrl: "/api",
  mode: "live"
};

async function punch(path, options = {}) {
  const { body, headers, raw, ...rest } = options;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const h = { ...(headers || {}) };
  if (body !== undefined && !isForm && !h["Content-Type"]) h["Content-Type"] = "application/json";
  const token = getToken();
  if (token) h.Authorization = "Bearer " + token;

  const res = await fetch(apiConfig.baseUrl + path, {
    ...rest,
    headers: h,
    body: body === undefined ? undefined : isForm ? body : typeof body === "string" ? body : JSON.stringify(body)
  });

  if (raw) return res;

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(json?.error || "Request failed with status " + res.status, res.status);
  }
  return json;
}

function mapRole(role) {
  const r = String(role || "user").toLowerCase();
  if (r === "owner") return "Owner";
  if (r === "admin") return "Admin";
  if (r === "moderator" || r === "helper") return "Helper";
  if (r === "media") return "Youtube";
  return "User";
}

export function mapPunchUser(u) {
  if (!u) return null;
  const role = mapRole(u.role);
  const plan = String(u.plan || "").toLowerCase();
  const isBanned = !!u.isBanned;
  const active =
    !isBanned &&
    (!!u.subscriptionActive || !!u.canDownloadLauncher || plan === "lifetime" || role === "Owner" || role === "Admin");
  const expires = u.subscriptionExpiresAt || u.subscription_expires_at || null;
  return {
    uid: Number(u.id) || 0,
    id: String(u.id),
    displayName: u.username || u.displayName || "User",
    avatarUrl: null,
    email: u.email || null,
    role,
    subscriptionTier: u.plan && u.plan !== "none" ? String(u.plan) : role === "Owner" ? "Premium" : "User",
    playtimeSeconds: 0,
    createdAt: u.createdAt || u.created_at || null,
    hardwareId: u.hwid || u.hardwareId || null,
    promoCode: null,
    subscriptionTill: active && (plan === "lifetime" || role === "Owner") ? "Lifetime" : expires,
    twoFactorEnabled: false,
    isBanned,
    banReason: u.banReason || u.ban_reason || null,
    bannedUntil: u.bannedUntil || u.banned_until || null,
    banPermanent: !!u.banPermanent,
    isSystemOwner: String(u.role || "").toLowerCase() === "owner" || role === "Owner",
    lastSeen: null,
    canDownloadLauncher: active
  };
}

function mapKey(k) {
  return {
    id: String(k.id),
    code: k.key_code || k.code,
    product: k.plan || k.product || "punch",
    subscriptionTier: "Premium",
    duration: (k.duration_days != null ? k.duration_days + "d" : k.duration) || "—",
    status: k.used_by ? "assigned" : "unused",
    assignedTo: k.used_by_name || null,
    createdAt: k.created_at || null,
    note: null
  };
}

function mapPromo(p) {
  return {
    id: String(p.id),
    code: p.code,
    discountPercent: p.discount_percent ?? p.discountPercent ?? 0,
    maxUses: p.max_uses ?? p.maxUses ?? 0,
    uses: p.used_count ?? p.uses ?? 0,
    status: p.active ? "active" : "paused",
    expiresAt: p.expires_at || p.expiresAt || null
  };
}

function mapLog(l) {
  return {
    id: String(l.id),
    actorLabel: l.username || String(l.user_id || "—"),
    category: "system",
    action: l.action || "—",
    message: l.action || "",
    details: l.hwid || null,
    entityLabel: l.ip || null,
    createdAt: l.created_at || null
  };
}

export async function preloadRoute() {
  await Promise.resolve();
}

export async function apiSignIn(body) {
  const login = (body.identifier || body.login || body.username || "").trim();
  const password = (body.password || "").trim();
  const captchaToken = (body.captchaToken || body.yacaptchaToken || "").trim();
  const json = await punch("/login", {
    method: "POST",
    body: { login, password, captchaToken, host: typeof window !== "undefined" ? window.location.hostname : "" }
  });
  if (!json?.token) throw new ApiError("No token", 500);
  setToken(json.token);
  const me = await apiMe();
  return me;
}

export async function apiSignUp(body) {
  const username = (body.displayName || body.username || "").trim();
  const email = (body.email || "").trim();
  const password = (body.password || "").trim();
  const captchaToken = (body.captchaToken || body.yacaptchaToken || "").trim();
  const json = await punch("/register", {
    method: "POST",
    body: {
      username,
      displayName: username,
      email,
      password,
      captchaToken,
      host: typeof window !== "undefined" ? window.location.hostname : ""
    }
  });
  if (json?.token) setToken(json.token);
  if (json?.token) return mapPunchUser(json.user || (await apiMe()));
  return null;
}

export async function apiLoaderHandoff(sessionId) {
  return punch("/loader-handoff", { method: "POST", body: { sessionId } });
}

export async function apiDownloadLauncher() {
  const res = await punch("/download/launcher", { raw: true });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new ApiError(json?.error || "Loader download failed", res.status);
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const match = cd.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] || "punch-loader.exe";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return filename;
}

export async function apiMe() {
  const profile = await punch("/profile");
  return mapPunchUser(profile);
}

export async function apiRefresh() {
  return apiMe();
}

export async function apiSignOut() {
  setToken("");
}

export async function apiActivateKey(body) {
  return punch("/activate-key", { method: "POST", body: { key: body.key || body.code } });
}

export async function apiChangePassword() {
  throw new ApiError("Смена пароля пока недоступна в веб-кабинете.", 501);
}

export async function apiTwoFactorSetup() {
  throw new ApiError("2FA недоступна", 501);
}
export async function apiTwoFactorConfirm() {
  throw new ApiError("2FA недоступна", 501);
}
export async function apiTwoFactorDisable() {
  throw new ApiError("2FA недоступна", 501);
}

export async function apiSessions() {
  return [];
}
export async function apiRevokeSession() {}
export async function apiRevokeAllSessions() {}
export async function apiUploadAvatar() {
  throw new ApiError("Аватары пока недоступны", 501);
}

export async function apiSiteStats() {
  try {
    const s = await punch("/admin/stats");
    return {
      users: s.users ?? 0,
      launches: s.activeSubscriptions ?? 0,
      online: 0
    };
  } catch {
    return { users: 0, launches: 0, online: 0 };
  }
}

export async function apiPaymentPlans() {
  return [
    { id: "7 дней", name: "7 дней", price: 49 },
    { id: "1 месяц", name: "1 месяц", price: 99 },
    { id: "3 месяца", name: "3 месяца", price: 149 },
    { id: "Навсегда", name: "Навсегда", price: 219 }
  ];
}

export async function apiValidatePromo(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) throw new ApiError("Введите промокод", 400);
  return punch("/promo/validate", { method: "POST", body: { code: normalized } });
}

export async function apiCreatePayment(planId, promoCode) {
  const plans = {
    "7 дней": 49,
    "1 месяц": 99,
    "3 месяца": 149,
    Навсегда: 219
  };
  const price = plans[planId];
  if (price == null) throw new ApiError("Unknown plan", 400);
  const json = await punch("/payments/create", {
    method: "POST",
    body: { plan: planId, price, promoCode, method: "cryptobot" }
  });
  return json.payUrl || json.url || json.botUrl;
}

export async function apiTickets() {
  return [];
}
export async function apiTicket() {
  return null;
}
export async function apiCreateTicket() {
  throw new ApiError("Тикеты пока недоступны", 501);
}
export async function apiTicketReply() {
  throw new ApiError("Тикеты пока недоступны", 501);
}
export async function apiTicketTake() {}
export async function apiTicketClose() {}
export async function apiTicketDelete() {}
export async function apiTicketMarkRead() {}

export function normalizeAdminDashboard(raw) {
  return {
    users: Array.isArray(raw?.users) ? raw.users : [],
    onlineConnections: Array.isArray(raw?.onlineConnections) ? raw.onlineConnections : [],
    licenseKeys: Array.isArray(raw?.licenseKeys) ? raw.licenseKeys : [],
    promoCodes: Array.isArray(raw?.promoCodes) ? raw.promoCodes : [],
    launcherVersions: Array.isArray(raw?.launcherVersions) ? raw.launcherVersions : [],
    updateArtifacts: Array.isArray(raw?.updateArtifacts) ? raw.updateArtifacts : [],
    logs: Array.isArray(raw?.logs) ? raw.logs : [],
    sales: Array.isArray(raw?.sales) ? raw.sales : [],
    salesSummary: {
      revenueTotal: Number(raw?.salesSummary?.revenueTotal ?? 0),
      completedCount: Number(raw?.salesSummary?.completedCount ?? 0),
      pendingCount: Number(raw?.salesSummary?.pendingCount ?? 0),
      unpaidCount: Number(raw?.salesSummary?.unpaidCount ?? 0),
      completedToday: Number(raw?.salesSummary?.completedToday ?? 0),
      completedThisWeek: Number(raw?.salesSummary?.completedThisWeek ?? 0)
    }
  };
}

export async function apiAdminDashboard() {
  const json = await punch("/admin/dashboard");
  return normalizeAdminDashboard(json.data || json);
}

export async function apiAdminUpdateUser(id, body) {
  const roleMap = {
    Owner: "owner",
    Admin: "admin",
    Helper: "moderator",
    Youtube: "media",
    Premium: "user",
    Beta: "user",
    User: "user"
  };
  const payload = {};
  if (body.role) payload.role = roleMap[body.role] || String(body.role).toLowerCase();
  if (body.subscriptionTill === "Lifetime") {
    payload.plan = "lifetime";
    payload.subscriptionExpiresAt = new Date(Date.now() + 100 * 365 * 86400000).toISOString();
  } else if (body.subscriptionTill) {
    payload.subscriptionExpiresAt = body.subscriptionTill;
  }
  if (body.subscriptionTier && body.subscriptionTier !== "User") {
    payload.plan = String(body.subscriptionTier).toLowerCase();
  }
  if (Object.prototype.hasOwnProperty.call(body, "isBanned")) {
    payload.isBanned = !!body.isBanned;
  }
  if (Object.prototype.hasOwnProperty.call(body, "banReason")) {
    payload.banReason = body.banReason ? String(body.banReason).trim() : null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "banPermanent")) {
    payload.banPermanent = !!body.banPermanent;
  }
  if (Object.prototype.hasOwnProperty.call(body, "bannedUntil")) {
    payload.bannedUntil = body.bannedUntil || null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "banDays") && body.banDays != null) {
    payload.banDays = Number(body.banDays);
  }
  const res = await punch("/admin/users/" + id, { method: "PATCH", body: payload });
  return mapPunchUser(res.user || res);
}

export async function apiAdminKickSession() {}
export async function apiAdminRevokeUserSessions() {}

export async function apiAdminCreateKey(body) {
  const rawDuration = String(body.duration || "30");
  const lifetime = /lifetime|навсегда/i.test(rawDuration);
  const daysMatch = rawDuration.match(/(\d+)/);
  const days = lifetime ? 36500 : Number(daysMatch?.[1]) || 30;
  const plan = lifetime ? "lifetime" : days <= 7 ? "trial" : days <= 31 ? "month" : days <= 100 ? "quarter" : "lifetime";
  const res = await punch("/admin/keys", {
    method: "POST",
    body: { plan, durationDays: days, count: 1 }
  });
  const code = res.keys?.[0] || res.key;
  return mapKey({ id: Date.now(), key_code: code, plan, duration_days: days, used_by: null });
}

export async function apiAdminUpdateKey(id, body) {
  const rawDuration = String(body.duration || "30");
  const lifetime = /lifetime|навсегда/i.test(rawDuration);
  const daysMatch = rawDuration.match(/(\d+)/);
  const days = lifetime ? 36500 : Number(daysMatch?.[1]) || 30;
  const plan = body.product || (lifetime ? "lifetime" : "month");
  const res = await punch("/admin/keys/" + id, {
    method: "PATCH",
    body: {
      plan,
      durationDays: days,
      note: body.note || null
    }
  });
  return mapKey(res.key || res);
}

export async function apiAdminDeleteKey(id) {
  await punch("/admin/keys/" + id, { method: "DELETE" });
  return { success: true };
}

export async function apiAdminCreatePromo(body) {
  const res = await punch("/admin/promos", {
    method: "POST",
    body: {
      code: body.code,
      discountPercent: body.discountPercent,
      maxUses: body.maxUses,
      expiresAt: body.expiresAt || null
    }
  });
  return mapPromo(res.promo || res);
}

export async function apiAdminUpdatePromo(id, body) {
  const res = await punch("/admin/promos/" + id, {
    method: "PATCH",
    body: {
      discountPercent: body.discountPercent,
      maxUses: body.maxUses,
      usedCount: body.uses,
      active: body.status !== "paused",
      expiresAt: body.expiresAt || null
    }
  });
  return mapPromo(res.promo || res);
}

export async function apiAdminDeletePromo(id) {
  await punch("/admin/promos/" + id, { method: "DELETE" });
  return { success: true };
}

export async function apiAdminCreateLauncherVersion() {
  throw new ApiError("Launcher versions: используйте /downloads", 501);
}
export async function apiAdminUpdateLauncherVersion() {
  throw new ApiError("Launcher versions: используйте /downloads", 501);
}
export async function apiAdminDeleteLauncherVersion() {
  throw new ApiError("Launcher versions: используйте /downloads", 501);
}
export async function apiAdminUploadArtifact() {
  throw new ApiError("Uploads: используйте public/downloads", 501);
}

export async function apiAdminLoaderControl() {
  return punch("/admin/loader/control");
}

export async function apiAdminLoaderCommand(body) {
  return punch("/admin/loader/command", { method: "POST", body });
}

export async function apiAdminLoaderPublish(file, { silent = false, version = "" } = {}) {
  const q = new URLSearchParams();
  if (silent) q.set("silent", "1");
  if (version) q.set("version", version);
  const token = getToken();
  const res = await fetch(apiConfig.baseUrl + "/admin/loader/publish?" + q.toString(), {
    method: "POST",
    headers: {
      Authorization: token ? "Bearer " + token : "",
      "Content-Type": "application/octet-stream"
    },
    body: file
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(json?.error || "Upload failed", res.status);
  return json;
}

export async function apiLoaderControl() {
  return punch("/loader/control");
}

export async function apiAdminPaymentPlans() {
  return apiPaymentPlans();
}
export async function apiAdminCreatePlan() {
  throw new ApiError("Планы заданы на сервере (SHOP_PLANS)", 501);
}
export async function apiAdminUpdatePlan() {
  throw new ApiError("Планы заданы на сервере (SHOP_PLANS)", 501);
}
export async function apiAdminDeletePlan() {
  throw new ApiError("Планы заданы на сервере (SHOP_PLANS)", 501);
}

// used by EbdSection via separate module; keep helpers exported
export { mapKey, mapPromo, mapLog, punch as punchRequest };
