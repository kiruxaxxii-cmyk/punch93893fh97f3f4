import { formatDateTime } from "../../lib/format.js";

export const MINECRAFT_VERSIONS = ["1.12.2", "1.16.5", "1.21.1", "1.21.4", "1.21.8", "1.21.11"];
export const LOADER_TYPES = ["Fabric", "MCP"];
export const STAFF_ROLES = ["Owner", "Admin"];
export const ASSIGNABLE_EXTRA_ROLES = ["Beta", "Premium", "Youtube"];

export const PAGE_SIZES = {
  users: 50,
  online: 50,
  keys: 50,
  promos: 50,
  sales: 50,
  launcher: 50,
  updates: 20,
  logs: 50,
  plans: 50
};

export const INITIAL_PAGES = {
  users: 1,
  online: 1,
  keys: 1,
  promos: 1,
  sales: 1,
  launcher: 1,
  updates: 1,
  logs: 1,
  plans: 1
};

export const EMPTY_DASHBOARD = {
  users: [],
  onlineConnections: [],
  licenseKeys: [],
  promoCodes: [],
  sales: [],
  salesSummary: {
    revenueTotal: 0,
    completedCount: 0,
    pendingCount: 0,
    unpaidCount: 0,
    completedToday: 0,
    completedThisWeek: 0
  },
  launcherVersions: [],
  updateArtifacts: [],
  logs: []
};

export function normalizeSection(r1) {
  switch ((r1 ?? "").trim().toLowerCase()) {
    case "":
    case "user":
    case "users":
      return "users";
    case "online":
      return "online";
    case "key":
    case "keys":
      return "keys";
    case "promo":
    case "promos":
      return "promos";
    case "sale":
    case "sales":
      return "sales";
    case "launcher":
    case "loader":
    case "loader-panel":
    case "loaderpanel":
      return "launcher";
    case "update":
    case "updates":
      return "updates";
    case "log":
    case "logs":
      return "logs";
    case "plan":
    case "plans":
      return "plans";
    case "ebd":
      return "ebd";
    default:
      return "users";
  }
}

export function sectionPath(r5) {
  if (r5 === "users") {
    return "/admin";
  } else {
    return "/admin/" + r5;
  }
}

const COUNTS_EN = {
  users: (r1) => r1 + " users",
  online: (r1) => r1 + " online",
  keys: (r1) => r1 + " keys",
  promos: (r1) => r1 + " promos",
  sales: (r1) => r1 + " sales",
  launcher: (r1) => r1 + " versions",
  updates: (r1) => r1 + " artifacts",
  logs: (r1) => r1 + " events",
  plans: (r1) => r1 + " plans"
};

const PAGINATION_EN = {
  previous: "Previous",
  next: "Next",
  page: (r1, r5) => r1 + "/" + r5
};

const STATUS_EN = {
  active: "active",
  paused: "paused",
  assigned: "assigned",
  unused: "unused",
  revoked: "revoked",
  productDurationRequired: "Product and duration are required.",
  keyDeleted: (r1) => "Key " + r1 + " deleted.",
  keyCreated: (r1) => "Key " + r1 + " created.",
  keyUpdated: (r1) => "Key " + r1 + " updated.",
  keyRestored: (r1) => "Key " + r1 + " restored.",
  keyRevoked: (r1) => "Key " + r1 + " revoked.",
  invalidAssignedEmail: "Enter a valid assignee email or leave the field empty.",
  invalidDuration: "Duration must be lifetime or a positive number with a unit.",
  invalidDiscount: "Discount must be between 1 and 100.",
  invalidMaxUses: "Max uses must be at least 1.",
  invalidUses: "Uses must be between 0 and max uses.",
  promoCreated: (r1) => "Promocode " + r1 + " created.",
  promoDeleted: (r1) => "Promocode " + r1 + " deleted.",
  promoUpdated: (r1) => "Promocode " + r1 + " updated.",
  promoPaused: (r1) => "Promocode " + r1 + " paused.",
  promoActivated: (r1) => "Promocode " + r1 + " activated.",
  promoUsageIncremented: (r1) => "Promocode " + r1 + " usage incremented.",
  promoUsageReset: (r1) => "Promocode " + r1 + " usage reset.",
  hardwareIdReset: (r1, r5) => "HWID reset for user #" + r1 + " (" + r5 + ").",
  launcherCreated: (r1, r5) => "Launcher version " + r1 + " · " + r5 + " created.",
  launcherUpdated: (r1, r5) => "Launcher version " + r1 + " · " + r5 + " updated.",
  launcherDeleted: (r1, r5) => "Launcher version " + r1 + " · " + r5 + " deleted.",
  onlineKicked: (r1) => "Online session for " + r1 + " was kicked.",
  userSessionsRevoked: (r1) => "All sessions for " + r1 + " were revoked.",
  userUpdated: (r1, r5, r6, r7, r8, r9, rN) =>
    "Updated user #" + r1 + " (" + r5 + (r6 ? " @ " + r6 : "") + ") · role=" + r7 + " · sub=" + r8 + " · " + (r9 ? "banned" : "active") + " · " + (rN ? "2FA:on" : "2FA:off")
};

const COPY_EN = {
  badge: "Admin",
  title: "Admin workspace",
  description: "Users, keys, and promocodes",
  session: "Session",
  backToProfile: "Back to profile",
  workspaceActive: "Admin workspace is active.",
  tabsAria: "Admin tabs",
  tabs: {
    users: "Users",
    online: "Online",
    keys: "Keys",
    promos: "Promocodes",
    sales: "Sales",
    launcher: "Loader Panel",
    updates: "Updates",
    logs: "Logs",
    plans: "Plans",
    ebd: "EBD"
  },
  loaderPanel: {
    lead: "Remote control for every online Punch Loader. Commands are delivered via short poll.",
    version: "Loader version",
    commandId: "Command id",
    lastCommand: "Last command",
    updatedAt: "Updated",
    exe: "Binary",
    ready: "ready",
    missing: "missing — upload punch-loader.exe",
    none: "none",
    forceUpdate: "Force update (Windows message)",
    silentUpdate: "Silent self-update",
    refresh: "Refresh",
    forceHint: "Force update kills Minecraft + loader and shows: Punch has been updated. Please restart loader.",
    silentHint: "Silent update closes loaders and replaces punch-loader.exe with no UI text.",
    uploadTitle: "Publish new punch-loader.exe",
    uploadOnly: "Upload only",
    uploadAndSilent: "Upload + silent update now"
  },
  ebd: {
    lead: "Unified database (EBD) — accounts, keys and launcher chat in one server file.",
    loginHint: "Sign in with a Punch admin/owner account to manage EBD.",
    username: "Username",
    password: "Password",
    connect: "Connect EBD",
    disconnect: "Disconnect",
    file: "File",
    dataDir: "Data folder",
    size: "Size",
    status: "Status",
    users: "Users",
    ok: "OK",
    dupes: "Has duplicates",
    refresh: "Refresh",
    backup: "Download backup (.db)",
    dedupe: "Remove duplicates",
    backupDone: "Backup downloaded",
    dedupeDone: "Deduped",
    removed: (n) => "Removed: " + n,
    dupEmails: "Duplicate emails",
    dupUsers: "Duplicate usernames",
    none: "None"
  },
  counts: COUNTS_EN,
  pagination: PAGINATION_EN,
  search: {
    users: "Search users (name, email, role, ID)",
    online: "Search online sessions (user, role, session, Discord)",
    keys: "Search keys (code, product, status, assignee)",
    promos: "Search promos (code, status, discount, usage)",
    sales: "Search sales (status, plan, buyer, amount)",
    launcher: "Search launcher versions (version, loader, roles)",
    updates: "Search runtime updates (name, hash, file)",
    logs: "Search logs (actor, category, action, details)",
    plans: "Search plans (name, tier, id)"
  },
  newKey: "New key",
  newPromo: "New promo",
  newLauncher: "New version",
  table: {
    uid: "UID",
    login: "Login",
    email: "Email",
    subscription: "Subscription",
    role: "Role",
    ban: "Ban",
    session: "Session",
    hwid: "Discord",
    connected: "Connected",
    connections: "Sessions",
    twoFactor: "2FA",
    actions: "Actions",
    code: "Code",
    product: "Product",
    duration: "Duration",
    status: "Status",
    assigned: "Assigned",
    discount: "Discount",
    uses: "Uses",
    expires: "Expires",
    version: "Version",
    loader: "Loader",
    roles: "Roles",
    created: "Created",
    hash: "SHA256",
    file: "File",
    updated: "Updated",
    amount: "Amount",
    plan: "Plan",
    buyer: "Buyer"
  },
  pills: {
    root: "root",
    banned: "banned",
    ok: "ok",
    on: "on",
    off: "off",
    none: "none",
    lifetime: "lifetime"
  },
  empty: {
    users: "No users match the current search.",
    online: "No online sessions match the current search.",
    keys: "No keys match the current search.",
    promos: "No promos match the current search.",
    sales: "No sales match the current search.",
    launcher: "No launcher versions match the current search.",
    updates: "No update artifacts match the current search.",
    logs: "No log entries match the current search.",
    plans: "No plans yet."
  },
  modal: {
    editUser: "Edit user",
    kickOnline: "Kick online session",
    editKey: "Edit key",
    editPromo: "Edit promo",
    editLauncher: "Edit launcher version",
    createKey: "Create key",
    createPromo: "Create promo",
    createLauncher: "Create launcher version",
    close: "Close",
    noEmail: "no email",
    expires: "expires"
  },
  fields: {
    displayName: "Display name",
    email: "Email",
    role: "Role",
    subscription: "Subscription",
    subscriptionPlaceholder: "Lifetime or dd.mm.yyyy HH:MM",
    hardwareId: "Hardware ID",
    twoFactorEnabled: "Two-factor enabled",
    accountBanned: "Account banned",
    product: "Product",
    banReason: "Ban reason",
    bannedUntil: "Banned until",
    kickReason: "Kick reason",
    subscriptionTier: "Subscription tier",
    duration: "Duration",
    durationHint: "Use hours, days, weeks, months, or choose lifetime.",
    assignedToEmail: "Assigned to (email)",
    note: "Note",
    code: "Code",
    discountPercent: "Discount %",
    maxUses: "Max uses",
    expiresAt: "Expires at",
    expiresPlaceholder: "dd.mm.yyyy or empty",
    expiresHint: "Uses Moscow time. Leave empty if the promo should not expire.",
    assignToOptional: "Assign to (optional)",
    noteOptional: "Note (optional)",
    codeOptional: "Code (optional)",
    codePlaceholder: "Leave empty to autogenerate",
    expiresOptional: "Expires at (optional)",
    minecraftVersion: "Minecraft version",
    loaderType: "Loader type",
    allowedRoles: "Allowed roles"
  },
  buttons: {
    cancel: "Cancel",
    saveChanges: "Save changes",
    resetHardwareId: "Reset HWID",
    delete: "Delete",
    restore: "Restore",
    revoke: "Revoke",
    pause: "Pause",
    activate: "Activate",
    usePlusOne: "Use +1",
    reset: "Reset",
    createKey: "Create key",
    createPromo: "Create promo",
    createLauncher: "Create version",
    kick: "Kick",
    lifetime: "Lifetime",
    edit: "Edit",
    copy: "Copy"
  },
  status: STATUS_EN
};

const COUNTS_RU = {
  users: (r1) => r1 + " пользователей",
  online: (r1) => r1 + " онлайн",
  keys: (r1) => r1 + " ключей",
  promos: (r1) => r1 + " промокодов",
  sales: (r1) => r1 + " продаж",
  launcher: (r1) => r1 + " версий",
  updates: (r1) => r1 + " артефактов",
  logs: (r1) => r1 + " событий",
  plans: (r1) => r1 + " планов"
};

const PAGINATION_RU = {
  previous: "Назад",
  next: "Дальше",
  page: (r1, r5) => r1 + "/" + r5
};

const STATUS_RU = {
  active: "active",
  paused: "paused",
  assigned: "assigned",
  unused: "unused",
  revoked: "revoked",
  productDurationRequired: "Продукт и срок обязательны.",
  keyDeleted: (r1) => "Ключ " + r1 + " удалён.",
  keyCreated: (r1) => "Ключ " + r1 + " создан.",
  keyUpdated: (r1) => "Ключ " + r1 + " обновлён.",
  keyRestored: (r1) => "Ключ " + r1 + " восстановлен.",
  keyRevoked: (r1) => "Ключ " + r1 + " отозван.",
  invalidAssignedEmail: "Введите корректную почту получателя или оставьте поле пустым.",
  invalidDuration: "Срок должен быть lifetime или положительным числом с единицей времени.",
  invalidDiscount: "Скидка должна быть в диапазоне от 1 до 100.",
  invalidMaxUses: "Макс. использований должно быть не меньше 1.",
  invalidUses: "Использования должны быть в диапазоне от 0 до максимума.",
  promoCreated: (r1) => "Промокод " + r1 + " создан.",
  promoDeleted: (r1) => "Промокод " + r1 + " удалён.",
  promoUpdated: (r1) => "Промокод " + r1 + " обновлён.",
  promoPaused: (r1) => "Промокод " + r1 + " поставлен на паузу.",
  promoActivated: (r1) => "Промокод " + r1 + " активирован.",
  promoUsageIncremented: (r1) => "Использование промокода " + r1 + " увеличено.",
  promoUsageReset: (r1) => "Использование промокода " + r1 + " сброшено.",
  hardwareIdReset: (r1, r5) => "HWID для пользователя #" + r1 + " (" + r5 + ") сброшен.",
  launcherCreated: (r1, r5) => "Launcher-версия " + r1 + " · " + r5 + " создана.",
  launcherUpdated: (r1, r5) => "Launcher-версия " + r1 + " · " + r5 + " обновлена.",
  launcherDeleted: (r1, r5) => "Launcher-версия " + r1 + " · " + r5 + " удалена.",
  onlineKicked: (r1) => "Online-сессия пользователя " + r1 + " кикнута.",
  userSessionsRevoked: (r1) => "Все сессии пользователя " + r1 + " отозваны.",
  userUpdated: (r1, r5, r6, r7, r8, r9, rN) =>
    "Пользователь #" + r1 + " обновлён (" + r5 + (r6 ? " @ " + r6 : "") + ") · role=" + r7 + " · sub=" + r8 + " · " + (r9 ? "banned" : "active") + " · " + (rN ? "2FA:on" : "2FA:off")
};

const COPY_RU = {
  badge: "Админ",
  title: "Админ-панель",
  description: "Пользователи, ключи и промокоды",
  session: "Сессия",
  backToProfile: "Назад в профиль",
  workspaceActive: "Админ-панель активна.",
  tabsAria: "Вкладки админ-панели",
  tabs: {
    users: "Пользователи",
    online: "Онлайн",
    keys: "Ключи",
    promos: "Промокоды",
    sales: "Продажи",
    launcher: "Loader Panel",
    updates: "Обновления",
    logs: "Логи",
    plans: "Планы",
    ebd: "EBD"
  },
  loaderPanel: {
    lead: "Удалённое управление всеми онлайн Punch Loader. Команды уходят коротким poll.",
    version: "Версия лоудера",
    commandId: "ID команды",
    lastCommand: "Последняя команда",
    updatedAt: "Обновлено",
    exe: "Бинарник",
    ready: "готов",
    missing: "нет файла — залей punch-loader.exe",
    none: "нет",
    forceUpdate: "Force update (сообщение Windows)",
    silentUpdate: "Тихое самообновление",
    refresh: "Обновить",
    forceHint: "Force update убивает Minecraft + лоудер и показывает: Punch has been updated. Please restart loader.",
    silentHint: "Silent update закрывает лоудеры и подменяет punch-loader.exe без текста.",
    uploadTitle: "Залить новый punch-loader.exe",
    uploadOnly: "Только залить",
    uploadAndSilent: "Залить + тихое обновление"
  },
  ebd: {
    lead: "Единая база данных (EBD) — аккаунты, ключи и чат лаунчера в одном файле на сервере.",
    loginHint: "Войдите аккаунтом Punch admin/owner, чтобы управлять EBD.",
    username: "Логин",
    password: "Пароль",
    connect: "Подключить EBD",
    disconnect: "Отключить",
    file: "Файл",
    dataDir: "Папка data",
    size: "Размер",
    status: "Статус",
    users: "Пользователи",
    ok: "OK",
    dupes: "Есть дубликаты",
    refresh: "Обновить",
    backup: "Скачать backup (.db)",
    dedupe: "Удалить дубликаты",
    backupDone: "Backup скачан",
    dedupeDone: "Дубликаты удалены",
    removed: (n) => "Удалено: " + n,
    dupEmails: "Дубликаты email",
    dupUsers: "Дубликаты логинов",
    none: "Нет"
  },
  counts: COUNTS_RU,
  pagination: PAGINATION_RU,
  search: {
    users: "Поиск пользователей (имя, почта, роль, ID)",
    online: "Поиск online-сессий (пользователь, роль, сессия, Discord)",
    keys: "Поиск ключей (код, продукт, статус, владелец)",
    promos: "Поиск промокодов (код, статус, скидка, использование)",
    sales: "Поиск продаж (статус, план, покупатель, сумма)",
    launcher: "Поиск launcher-версий (версия, загрузчик, роли)",
    updates: "Поиск обновлений runtime (имя, хеш, файл)",
    logs: "Поиск по логам (актор, категория, действие, детали)",
    plans: "Поиск планов (название, тир, id)"
  },
  newKey: "Новый ключ",
  newPromo: "Новый промокод",
  newLauncher: "Новая версия",
  table: {
    uid: "UID",
    login: "Логин",
    email: "Почта",
    subscription: "Подписка",
    role: "Роль",
    ban: "Бан",
    session: "Сессия",
    hwid: "Discord",
    connected: "Подключён",
    connections: "Сессии",
    twoFactor: "2FA",
    actions: "Действия",
    code: "Код",
    product: "Продукт",
    duration: "Срок",
    status: "Статус",
    assigned: "Назначен",
    discount: "Скидка",
    uses: "Использования",
    expires: "Истекает",
    version: "Версия",
    loader: "Загрузчик",
    roles: "Роли",
    created: "Создано",
    hash: "SHA256",
    file: "Файл",
    updated: "Обновлено",
    amount: "Сумма",
    plan: "План",
    buyer: "Покупатель"
  },
  pills: {
    root: "root",
    banned: "бан",
    ok: "ok",
    on: "on",
    off: "off",
    none: "нет",
    lifetime: "навсегда"
  },
  empty: {
    users: "По текущему поиску пользователи не найдены.",
    online: "По текущему поиску online-сессии не найдены.",
    keys: "По текущему поиску ключи не найдены.",
    promos: "По текущему поиску промокоды не найдены.",
    sales: "По текущему поиску продажи не найдены.",
    launcher: "По текущему поиску launcher-версии не найдены.",
    updates: "По текущему поиску артефакты обновлений не найдены.",
    logs: "По текущему поиску логов не найдено.",
    plans: "Планы отсутствуют."
  },
  modal: {
    editUser: "Редактирование пользователя",
    kickOnline: "Кик online-сессии",
    editKey: "Редактирование ключа",
    editPromo: "Редактирование промокода",
    editLauncher: "Редактирование launcher-версии",
    createKey: "Создание ключа",
    createPromo: "Создание промокода",
    createLauncher: "Создание launcher-версии",
    close: "Закрыть",
    noEmail: "без почты",
    expires: "истекает"
  },
  fields: {
    displayName: "Имя пользователя",
    email: "Почта",
    role: "Роль",
    subscription: "Подписка",
    subscriptionPlaceholder: "Lifetime или dd.mm.yyyy HH:MM",
    hardwareId: "HWID",
    twoFactorEnabled: "Двухфакторная защита включена",
    accountBanned: "Аккаунт заблокирован",
    product: "Продукт",
    banReason: "Причина бана",
    bannedUntil: "Бан до",
    kickReason: "Причина кика",
    subscriptionTier: "Тир подписки",
    duration: "Срок",
    durationHint: "Выберите часы, дни, недели, месяцы или lifetime.",
    assignedToEmail: "Назначен на (почта)",
    note: "Заметка",
    code: "Код",
    discountPercent: "Скидка %",
    maxUses: "Макс. использований",
    expiresAt: "Истекает",
    expiresPlaceholder: "dd.mm.yyyy или пусто",
    expiresHint: "Используется московское время. Оставьте пустым, если срок не нужен.",
    assignToOptional: "Назначить на (необязательно)",
    noteOptional: "Заметка (необязательно)",
    codeOptional: "Код (необязательно)",
    codePlaceholder: "Оставьте пустым для автогенерации",
    expiresOptional: "Истекает (необязательно)",
    minecraftVersion: "Версия Minecraft",
    loaderType: "Тип загрузчика",
    allowedRoles: "Разрешённые роли"
  },
  buttons: {
    cancel: "Отмена",
    saveChanges: "Сохранить",
    resetHardwareId: "Сбросить HWID",
    delete: "Удалить",
    restore: "Восстановить",
    revoke: "Отозвать",
    pause: "Пауза",
    activate: "Активировать",
    usePlusOne: "Исп. +1",
    reset: "Сбросить",
    createKey: "Создать ключ",
    createPromo: "Создать промокод",
    createLauncher: "Создать версию",
    kick: "Кикнуть",
    lifetime: "Lifetime",
    edit: "Изменить",
    copy: "Копировать"
  },
  status: STATUS_RU
};

export const ADMIN_COPY = {
  en: COPY_EN,
  ru: COPY_RU
};

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseMskInputDate(r1) {
  let r6 = r1.trim();
  let r7 = r6.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[\sT](\d{2}):(\d{2}))?$/);
  if (r7) {
    let [, rp, rj, rM, rW = "00", rA = "00"] = r7;
    let rg = Number(rp);
    let rx = Number(rj);
    let rQ = Number(rM);
    let rS = Number(rW);
    let rH = Number(rA);
    if (!Number.isFinite(rg) || !Number.isFinite(rx) || !Number.isFinite(rQ) || !Number.isFinite(rS) || !Number.isFinite(rH)) {
      return null;
    }
    let rE = new Date(Date.UTC(rQ, rx - 1, rg, rS - 3, rH));
    let rF = new Date(rE.getTime() + 10800000);
    if (rF.getUTCFullYear() !== rQ || rF.getUTCMonth() !== rx - 1 || rF.getUTCDate() !== rg || rF.getUTCHours() !== rS || rF.getUTCMinutes() !== rH) {
      return null;
    } else {
      return rE;
    }
  }
  let r8 = r6.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!r8) {
    return null;
  }
  let [, r9, rN, rB, rX = "00", rU = "00"] = r8;
  let rk = Number(rB);
  let rV = Number(rN);
  let rI = Number(r9);
  let rL = Number(rX);
  let rz = Number(rU);
  if (!Number.isFinite(rk) || !Number.isFinite(rV) || !Number.isFinite(rI) || !Number.isFinite(rL) || !Number.isFinite(rz)) {
    return null;
  }
  let rC = new Date(Date.UTC(rI, rV - 1, rk, rL - 3, rz));
  let rP = new Date(rC.getTime() + 10800000);
  if (rP.getUTCFullYear() !== rI || rP.getUTCMonth() !== rV - 1 || rP.getUTCDate() !== rk || rP.getUTCHours() !== rL || rP.getUTCMinutes() !== rz) {
    return null;
  } else {
    return rC;
  }
}

export function normalizeDurationUnit(r1) {
  switch (("" + (r1 ?? "")).trim().toLowerCase()) {
    case "hour":
    case "hours":
      return "hours";
    case "week":
    case "weeks":
      return "weeks";
    case "month":
    case "months":
      return "months";
    default:
      return "days";
  }
}

export function parseDurationString(r8) {
  let rB = ("" + (r8 ?? "")).trim().toLowerCase();
  if (!rB) {
    return {
      amount: "30",
      unit: "days",
      isLifetime: false
    };
  }
  if (rB === "lifetime") {
    return {
      amount: "",
      unit: "days",
      isLifetime: true
    };
  }
  let rk = rB.match(/^(\d+)\s+([a-z]+)$/);
  if (rk) {
    return {
      amount: rk[1],
      unit: normalizeDurationUnit(rk[2]),
      isLifetime: false
    };
  } else {
    return {
      amount: "",
      unit: "days",
      isLifetime: false
    };
  }
}

export function buildDuration(r1, r5, r6) {
  if (r6) {
    return "lifetime";
  }
  let r7 = r1.replace(/\D/g, "");
  if (r7) {
    return r7 + " " + r5;
  } else {
    return "";
  }
}

export function normalizeTier(r5) {
  let r8 = ("" + (r5 ?? "")).trim().toLowerCase();
  if (r8 === "beta") {
    return "Beta";
  } else if (r8 === "premium") {
    return "Premium";
  } else {
    return "User";
  }
}

export function validateKeyForm(r1, r5) {
  if (!r5.product.trim() || !r5.duration.trim()) {
    return r1.status.productDurationRequired;
  }
  let r7 = parseDurationString(r5.duration);
  if (!r7.isLifetime) {
    let r8 = Number(r7.amount);
    if (!Number.isInteger(r8) || r8 < 1 || !r5.duration.trim()) {
      return r1.status.invalidDuration;
    }
  }
  if (r5.assignedToEmail && !EMAIL_RE.test(r5.assignedToEmail)) {
    return r1.status.invalidAssignedEmail;
  } else {
    return null;
  }
}

export function validatePromoForm(r5, r6) {
  const discount = Number(r6.discountPercent);
  const maxUses = Number(r6.maxUses);
  const uses = Number(r6.uses ?? 0);
  if (!Number.isInteger(discount) || discount < 1 || discount > 100) {
    return r5.status.invalidDiscount;
  }
  if (!Number.isInteger(maxUses) || maxUses < 1) {
    return r5.status.invalidMaxUses;
  }
  if (!Number.isInteger(uses) || uses < 0 || uses > maxUses) {
    return r5.status.invalidUses;
  }
  return null;
}

export function sanitizeAllowedRoles(r1) {
  let r5 = r1.filter((r6) => ASSIGNABLE_EXTRA_ROLES.includes(r6));
  return [...new Set([...STAFF_ROLES, ...r5])];
}

export function paginate(r5, r6, r7) {
  let rN = Math.max(1, Math.ceil(r5.length / r7));
  let rB = Math.min(Math.max(r6, 1), rN);
  let rX = (rB - 1) * r7;
  return {
    items: r5.slice(rX, rX + r7),
    currentPage: rB,
    totalPages: rN
  };
}

export function sanitizeLauncherForm(r1) {
  return {
    minecraftVersion: MINECRAFT_VERSIONS.includes(r1?.minecraftVersion ?? "") ? r1?.minecraftVersion : MINECRAFT_VERSIONS[0],
    loaderType: LOADER_TYPES.includes(r1?.loaderType ?? "") ? r1?.loaderType : "Fabric",
    allowedRoles: sanitizeAllowedRoles(r1?.allowedRoles ?? [])
  };
}

export function subscriptionPill(r7, r8) {
  const pills =
    (typeof r8 === "string" ? ADMIN_COPY[r8]?.pills : r8?.pills) || ADMIN_COPY.en.pills;
  let rB = ("" + (r7 ?? "")).trim();
  var rX = {
    state: "none",
    label: pills.none
  };
  if (!rB) {
    return rX;
  }
  var rU = {
    state: "lifetime",
    label: pills.lifetime
  };
  if (rB.toLowerCase() === "lifetime") {
    return rU;
  }
  let rk = parseMskInputDate(rB);
  if (rk) {
    return {
      state: rk.getTime() < Date.now() ? "expired" : "active",
      label: rB
    };
  } else {
    return {
      state: "active",
      label: rB
    };
  }
}

export function toDatetimeLocalValue(r5) {
  let r8 = r5?.trim();
  if (!r8 || r8.toLowerCase() === "lifetime") {
    return "";
  }
  let r9 = r8.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[\sT](\d{2}):(\d{2}))?$/);
  if (r9) {
    return r9[3] + "-" + r9[2] + "-" + r9[1] + "T" + (r9[4] ?? "00") + ":" + (r9[5] ?? "00");
  }
  let rN = r8.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (rN) {
    return rN[1] + "-" + rN[2] + "-" + rN[3] + "T" + (rN[4] ?? "00") + ":" + (rN[5] ?? "00");
  } else {
    return "";
  }
}

export function displaySubscription(r5, r6) {
  let r9 = ("" + (r5 ?? "")).trim();
  const lifetimeLabel =
    (typeof r6 === "string" ? ADMIN_COPY[r6]?.buttons?.lifetime : r6?.buttons?.lifetime) ||
    ADMIN_COPY.en.buttons.lifetime;
  if (r9) {
    if (r9.toLowerCase() === "lifetime") {
      return lifetimeLabel;
    } else {
      return r9;
    }
  } else {
    return "";
  }
}

export function formatSubscriptionLabel(r1, r5) {
  let r7 = ("" + (r1 ?? "")).trim();
  const pills = (typeof r5 === "string" ? ADMIN_COPY[r5]?.pills : r5?.pills) || ADMIN_COPY.en.pills;
  if (r7) {
    if (r7.toLowerCase() === "lifetime") {
      return pills.lifetime;
    } else {
      return "" + formatDateTime(r7);
    }
  } else {
    return pills.none;
  }
}

export function sortUsersByUidDesc(r1) {
  return [...r1].sort((r5, r6) => Number(r6.uid) - Number(r5.uid));
}

export function formatDateTimeOrDash(r1) {
  if (r1) {
    return formatDateTime(r1);
  } else {
    return "—";
  }
}

export function userSummaryLine(r1, r5) {
  const locale = typeof r5 === "string" ? r5 : "en";
  const pack = ADMIN_COPY[locale] || ADMIN_COPY.en;
  let r7 = subscriptionPill(r1.subscriptionTill, locale);
  return pack.status.userUpdated(
    "" + r1.uid,
    r1.displayName,
    r1.email,
    r1.role,
    r7.label,
    r1.isBanned,
    r1.twoFactorEnabled
  );
}

export const FOLDER_INPUT_ATTRS = {
  webkitdirectory: "",
  directory: ""
};

export function formatBytes(r5) {
  if (!Number.isFinite(r5) || r5 <= 0) {
    return "0 MB";
  } else if (r5 >= 1048576) {
    return (r5 / 1048576).toFixed(1) + " MB";
  } else {
    return Math.max(1, Math.round(r5 / 1024)) + " KB";
  }
}

export function formatUploadProgress(r1, r5) {
  let r7 = formatBytes(r1.loadedBytes);
  if (r1.totalBytes && r1.percent !== null) {
    return r1.percent + "% · " + r7 + " / " + formatBytes(r1.totalBytes);
  } else if (r5 === "ru") {
    return r7 + " отправлено";
  } else {
    return r7 + " uploaded";
  }
}

export function mcpBatchId(r1) {
  return "mcp-library-batch:" + r1;
}

export function normalizeMcpLibraryPath(r1, r5) {
  let r6 = ("" + r1).replace(/\\/g, "/").replace(/^\/+/, "").trim();
  let r7 = ("versions/" + r5 + " mcp/libraries/").toLowerCase();
  let r8 = r6.toLowerCase();
  if (r8.startsWith(r7)) {
    r6 = r6.slice(r7.length);
  } else if (r8.startsWith("libraries/")) {
    r6 = r6.slice(10);
  }
  r6 = r6.replace(/^\/+/, "").trim();
  if (!r6.toLowerCase().endsWith(".jar") || r6.includes("..")) {
    return null;
  } else {
    return r6;
  }
}

export function mcpLibraryPathFromFile(r1, r5) {
  let r6 = ("" + (r1.webkitRelativePath || r1.name)).replace(/\\/g, "/").replace(/^\/+/, "").trim();
  let r7 = r6.split("/").filter(Boolean);
  return normalizeMcpLibraryPath(r7.length > 1 ? r7.slice(1).join("/") : r6, r5);
}

export function parseClientJarKind(r5) {
  if (!r5.startsWith("client-jar:")) {
    return null;
  }
  let [r8, r9] = r5.slice(11).split(":");
  if (!r8 || !r9) {
    return null;
  } else {
    return {
      loaderType: r8,
      minecraftVersion: r9
    };
  }
}

export function parseNativeDllKind(r5) {
  if (!r5.startsWith("native-dll:")) {
    return null;
  }
  let [r8, r9] = r5.slice(11).split(":");
  if (!r8 || !r9) {
    return null;
  } else {
    return {
      loaderType: r8,
      minecraftVersion: r9
    };
  }
}

export function clientJarKind(r1, r5) {
  return "client-jar:" + r1.trim().toLowerCase() + ":" + r5.trim();
}

export function nativeDllKind(r1, r5) {
  return "native-dll:" + r1.trim().toLowerCase() + ":" + r5.trim();
}

export function displayLoaderType(r5) {
  let r8 = r5.trim().toLowerCase();
  if (r8 === "mcp") {
    return "MCP";
  } else if (r8 === "fabric") {
    return "Fabric";
  } else {
    return r8.charAt(0).toUpperCase() + r8.slice(1);
  }
}

export function parseFabricLibraryKind(r5) {
  if (!r5.startsWith("fabric-library:")) {
    return null;
  }
  let r8 = r5.indexOf(":", 15);
  if (r8 <= 0) {
    return null;
  }
  let r9 = r5.slice(15, r8);
  let rN = r5.slice(r8 + 1);
  if (!r9 || !rN) {
    return null;
  } else {
    return {
      minecraftVersion: r9,
      libraryPath: rN
    };
  }
}

export function parseMcpLibraryKind(r5) {
  if (!r5.startsWith("mcp-library:")) {
    return null;
  }
  let r8 = r5.indexOf(":", 12);
  if (r8 <= 0) {
    return null;
  }
  let r9 = r5.slice(12, r8);
  let rN = r5.slice(r8 + 1);
  if (!r9 || !rN) {
    return null;
  } else {
    return {
      minecraftVersion: r9,
      libraryPath: rN
    };
  }
}

export function artifactDisplayName(r1) {
  if (r1 === "client-dll") {
    return "client.dll";
  }
  if (r1 === "jvm-dll") {
    return "jvm.dll";
  }
  let r6 = parseNativeDllKind(r1);
  if (r6) {
    return displayLoaderType(r6.loaderType) + " " + r6.minecraftVersion + " native.dll";
  }
  let r7 = parseClientJarKind(r1);
  if (r7) {
    return displayLoaderType(r7.loaderType) + " " + r7.minecraftVersion + " client.jar";
  }
  let r8 = parseFabricLibraryKind(r1);
  if (r8) {
    return "Fabric " + r8.minecraftVersion + " " + r8.libraryPath;
  }
  let r9 = parseMcpLibraryKind(r1);
  if (r9) {
    return "MCP " + r9.minecraftVersion + " " + r9.libraryPath;
  } else {
    return r1;
  }
}

export function versionScopes(r1) {
  let r6 = new Set();
  for (let r7 of runtimeVersions(r1)) {
    r6.add(nativeDllKind(r7.loaderType, r7.minecraftVersion));
    r6.add(clientJarKind(r7.loaderType, r7.minecraftVersion));
  }
  return Array.from(r6);
}

export function runtimeVersions(r5) {
  let r8 = new Set();
  let r9 = [];
  for (let rN of r5) {
    let rB = rN.loaderType.trim().toLowerCase();
    if (rB !== "mcp" && rB !== "fabric") {
      continue;
    }
    let rX = rN.minecraftVersion.trim();
    if (!rX) {
      continue;
    }
    let rU = rB + ":" + rX;
    if (!r8.has(rU)) {
      r8.add(rU);
      r9.push({
        key: rU,
        loaderType: rB,
        minecraftVersion: rX
      });
    }
  }
  return r9.sort((rk, rV) => {
    let rz = rV.minecraftVersion.localeCompare(rk.minecraftVersion, undefined, {
      numeric: true
    });
    if (rz === 0) {
      return rk.loaderType.localeCompare(rV.loaderType);
    } else {
      return rz;
    }
  });
}
