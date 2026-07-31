export const THEME_STORAGE_KEY = "punch-site-theme";

export const THEME_PRESETS = [
  { id: "blue", labelRu: "Синий", labelEn: "Blue", accent: "#3d8bff" },
  { id: "grey", labelRu: "Серый", labelEn: "Grey", accent: "#afafaf" },
  { id: "red", labelRu: "Красный", labelEn: "Red", accent: "#ff2d55" },
  { id: "purple", labelRu: "Фиолетовый", labelEn: "Purple", accent: "#9b6bff" },
  { id: "white", labelRu: "Белый", labelEn: "White", accent: "#f0f0f0" }
];

export function buildTheme(accent) {
  const A = accent;
  return {
    raysColor: A,
    accent: A,
    appColorVars: {
      "--section-accent": A,
      "--section-text": `color-mix(in srgb, ${A} 8%, rgba(255, 255, 255, 0.96))`,
      "--section-subtext": `color-mix(in srgb, ${A} 14%, rgba(255, 255, 255, 0.78))`,
      "--section-rect-bg": `color-mix(in srgb, ${A} 1%, rgba(255, 255, 255, 0.015))`,
      "--section-rect-border": `color-mix(in srgb, ${A} 8%, rgba(19, 18, 18, 0.04))`,
      "--app-rect-accent": A,
      "--app-rect-bg": `color-mix(in srgb, ${A} 1%, rgba(255, 255, 255, 0.015))`,
      "--app-rect-border": `color-mix(in srgb, ${A} 8%, rgba(255, 255, 255, 0.04))`,
      "--app-rect-ring": `color-mix(in srgb, color-mix(in srgb, ${A} 8%, rgba(255, 255, 255, 0.04)) 50%, transparent)`,
      "--app-rect-text": `color-mix(in srgb, ${A} 8%, rgba(255, 255, 255, 0.96))`,
      "--app-rect-subtext": `color-mix(in srgb, ${A} 14%, rgba(255, 255, 255, 0.78))`,
      "--punch-accent": A
    },
    heroColorVars: {
      "--hero-accent": A,
      "--hero-title-color": "rgba(255, 255, 255, 0.965)",
      "--hero-badge-from": `color-mix(in srgb, ${A} 15%, transparent)`,
      "--hero-badge-to": `color-mix(in srgb, ${A} 40%, transparent)`,
      "--hero-badge-icon-from": `color-mix(in srgb, ${A} 30%, transparent)`,
      "--hero-badge-icon-to": `color-mix(in srgb, ${A} 50%, transparent)`,
      "--hero-text": `color-mix(in srgb, ${A} 8%, rgba(255, 255, 255, 0.96))`,
      "--hero-subtext": `color-mix(in srgb, ${A} 16%, rgba(255, 255, 255, 0.78))`,
      "--hero-rect-bg": `color-mix(in srgb, ${A} 1%, rgba(255, 255, 255, 0.015))`,
      "--hero-rect-border": `color-mix(in srgb, ${A} 8%, rgba(255, 255, 255, 0.04))`,
      "--hero-primary-from": `color-mix(in srgb, ${A} 24%, rgba(255, 255, 255, 0.03))`,
      "--hero-primary-to": `color-mix(in srgb, ${A} 46%, rgba(0, 0, 0, 0.15))`,
      "--hero-primary-border": `color-mix(in srgb, ${A} 14%, rgba(255, 255, 255, 0.075))`,
      "--hero-primary-outline": `color-mix(in srgb, ${A} 22%, rgba(255, 255, 255, 0.035))`,
      "--hero-primary-inset": `color-mix(in srgb, ${A} 16%, rgba(0, 0, 0, 0.2))`,
      "--hero-primary-glass-border": `linear-gradient(180deg, color-mix(in srgb, ${A} 18%, rgba(255, 255, 255, 0.1)), color-mix(in srgb, ${A} 8%, rgba(255, 255, 255, 0.02)))`
    },
    aboutColorVars: {
      "--about-accent": A,
      "--about-text": `color-mix(in srgb, ${A} 8%, rgba(255, 255, 255, 0.96))`,
      "--about-subtext": `color-mix(in srgb, ${A} 14%, rgba(255, 255, 255, 0.78))`,
      "--about-rect-bg": `color-mix(in srgb, ${A} 1%, rgba(255, 255, 255, 0.015))`,
      "--about-rect-border": `color-mix(in srgb, ${A} 8%, rgba(255, 255, 255, 0.04))`,
      "--about-badge-from": `color-mix(in srgb, ${A} 15%, transparent)`,
      "--about-badge-to": `color-mix(in srgb, ${A} 40%, transparent)`,
      "--about-badge-icon-from": `color-mix(in srgb, ${A} 30%, transparent)`,
      "--about-badge-icon-to": `color-mix(in srgb, ${A} 50%, transparent)`
    },
    sectionColorVars: {
      "--section-accent": A,
      "--section-text": `color-mix(in srgb, ${A} 8%, rgba(255, 255, 255, 0.96))`,
      "--section-subtext": `color-mix(in srgb, ${A} 14%, rgba(255, 255, 255, 0.78))`,
      "--section-rect-bg": `color-mix(in srgb, ${A} 1%, rgba(255, 255, 255, 0.015))`,
      "--section-rect-border": `color-mix(in srgb, ${A} 8%, rgba(255, 255, 255, 0.04))`,
      "--section-badge-from": `color-mix(in srgb, ${A} 15%, transparent)`,
      "--section-badge-to": `color-mix(in srgb, ${A} 40%, transparent)`,
      "--section-badge-icon-from": `color-mix(in srgb, ${A} 30%, transparent)`,
      "--section-badge-icon-to": `color-mix(in srgb, ${A} 50%, transparent)`
    }
  };
}

export const ACCENT = THEME_PRESETS[0].accent;
export const theme = buildTheme(ACCENT);

export function getPresetById(id) {
  return THEME_PRESETS.find((p) => p.id === id) || THEME_PRESETS[0];
}

export const ADMIN_STUB_KEY = "punch-admin-stub";
export const OWNER_EMAIL = "admin@punch.local";

export const ROLES = ["User", "Beta", "Premium", "Youtube", "Helper", "Admin", "Owner"];

export function normalizeRole(value) {
  const v = value?.trim();
  if (!v) return "User";
  const lower = v.toLowerCase();
  if (lower === "member" || lower === "user") return "User";
  if (lower === "beta") return "Beta";
  if (lower === "premium") return "Premium";
  if (lower === "youtube") return "Youtube";
  if (lower === "helper" || lower === "support") return "Helper";
  if (lower === "owner") return "Owner";
  if (lower === "admin") return "Admin";
  return "User";
}

export function roleIndex(value) {
  return ROLES.indexOf(normalizeRole(value));
}

export function hasRole(userRole, required) {
  if (required) return roleIndex(userRole) >= roleIndex(required);
  return true;
}

export function isAdmin(user) {
  const role = normalizeRole(user?.role);
  return !!user?.isSystemOwner || role === "Admin" || role === "Owner";
}

export function canManage(actor, target) {
  if (!actor || !target || actor.id === target.id) return false;
  if (actor.isSystemOwner) return !target.isSystemOwner;
  return roleIndex(actor.role) > roleIndex(target.role);
}

export function assignableRoles(user) {
  if (!user) return ["User"];
  if (user.isSystemOwner) return [...ROLES];
  const idx = roleIndex(user.role);
  return ROLES.filter((r) => roleIndex(r) < idx);
}
