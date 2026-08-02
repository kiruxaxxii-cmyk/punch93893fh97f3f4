import { useState, useMemo, useCallback, useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { isAdmin, assignableRoles, canManage } from "../lib/theme.js";
import { isSystemOwner } from "../lib/format.js";
import {
  errorMessage,
  apiAdminDashboard, apiAdminUpdateUser, apiAdminKickSession,
  apiAdminRevokeUserSessions, apiAdminCreateKey, apiAdminUpdateKey,
  apiAdminDeleteKey, apiAdminCreatePromo, apiAdminUpdatePromo,
  apiAdminDeletePromo, apiAdminCreateLauncherVersion,
  apiAdminUpdateLauncherVersion, apiAdminDeleteLauncherVersion
} from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { useLanguage } from "../lib/lang.jsx";
import { useNotice } from "../lib/notice.jsx";
import { ActionButton, Reveal, BlurPanel, Modal, Pagination, RouteIntro } from "../components/shared.jsx";
import {
  ADMIN_COPY, PAGE_SIZES, INITIAL_PAGES, EMPTY_DASHBOARD,
  normalizeSection, sectionPath, paginate, sortUsersByUidDesc,
  validateKeyForm, validatePromoForm, sanitizeLauncherForm,
  sanitizeAllowedRoles, toDatetimeLocalValue, displaySubscription,
  parseDurationString, buildDuration, normalizeTier,
  formatDateTimeOrDash, userSummaryLine, MINECRAFT_VERSIONS, LOADER_TYPES,
  STAFF_ROLES, ASSIGNABLE_EXTRA_ROLES
} from "./admin/copy.js";
import { AdminBadgeIcon, SearchIcon, ChevronLeftIcon, CloseIcon, TrashIcon } from "./admin/icons.jsx";
import {
  UsersTable, OnlineTable, KeysTable, PromosTable, SalesTable,
  LauncherTable, LogsTable, UpdatesSection, PlansSection,
  DURATION_UNITS, PROFILE_BLUR_STYLE
} from "./admin/tables.jsx";
import EbdSection from "./admin/EbdSection.jsx";
import LoaderPanel from "./admin/LoaderPanel.jsx";

export default function Admin() {
  const navigate = useNavigate();
  const { section } = useParams();
  const { user } = useAuth();
  const { locale } = useLanguage();
  const { pushNotice } = useNotice();
  const copy = ADMIN_COPY[locale];

  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [activeTab, setActiveTab] = useState(() => normalizeSection(section));
  const [searchInput, setSearchInput] = useState("");
  const [statusText, setStatusText] = useState(copy.workspaceActive);
  const [isBusy, setBusy] = useState(false);
  const [modal, setModal] = useState({ type: "closed" });
  const [pages, setPages] = useState(INITIAL_PAGES);

  const closeModal = useCallback(() => setModal({ type: "closed" }), []);

  const reloadDashboard = useCallback(async (silent = false) => {
    if (!silent) setBusy(true);
    try {
      setDashboard(await apiAdminDashboard());
      setStatusText(copy.workspaceActive);
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось загрузить админ-панель." : "Unable to load admin workspace.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Админ-панель недоступна" : "Admin workspace unavailable", message: msg });
    } finally {
      if (!silent) setBusy(false);
    }
  }, [copy.workspaceActive, locale, pushNotice]);

  useEffect(() => { reloadDashboard(); }, [reloadDashboard]);

  useEffect(() => {
    const next = normalizeSection(section);
    setActiveTab(prev => prev === next ? prev : next);
  }, [section]);

  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
    const path = sectionPath(tab);
    if (path !== ("/admin/" + (section ?? "")).replace(/\/$/, "")) {
      navigate(path);
    }
  }, [navigate, section]);

  useEffect(() => {
    if (activeTab === "online" || activeTab === "ebd" || activeTab === "plans" || activeTab === "launcher") return;
    reloadDashboard(true);
    const id = window.setInterval(() => { reloadDashboard(true); }, 15000);
    return () => { window.clearInterval(id); };
  }, [activeTab, reloadDashboard]);

  const query = searchInput.trim().toLowerCase();

  useEffect(() => {
    setPages(prev => prev[activeTab] === 1 ? prev : { ...prev, [activeTab]: 1 });
  }, [activeTab, query]);

  const filteredUsers = useMemo(() => sortUsersByUidDesc(query ? dashboard.users.filter(u => [u.displayName, u.email ?? "", u.role, u.id, "" + u.uid].join(" ").toLowerCase().includes(query)) : dashboard.users), [query, dashboard.users]);
  const filteredOnline = useMemo(() => query ? dashboard.onlineConnections.filter(u => [u.displayName, u.email ?? "", u.role, u.sessionId, u.discordUsername ?? "", "" + u.uid].join(" ").toLowerCase().includes(query)) : dashboard.onlineConnections, [query, dashboard.onlineConnections]);
  const filteredKeys = useMemo(() => query ? dashboard.licenseKeys.filter(u => [u.code, u.product, u.duration, u.status, u.assignedTo ?? ""].join(" ").toLowerCase().includes(query)) : dashboard.licenseKeys, [query, dashboard.licenseKeys]);
  const filteredPromos = useMemo(() => query ? dashboard.promoCodes.filter(u => [u.code, u.status, "" + u.discountPercent, "" + u.maxUses, "" + u.uses, u.expiresAt ?? ""].join(" ").toLowerCase().includes(query)) : dashboard.promoCodes, [query, dashboard.promoCodes]);
  const filteredSales = useMemo(() => query ? dashboard.sales.filter(u => [u.status, u.planName, u.planId, u.userEmail, "" + u.amount, u.createdAt].join(" ").toLowerCase().includes(query)) : dashboard.sales, [query, dashboard.sales]);
  const filteredLauncher = useMemo(() => {
    const list = [...(dashboard.launcherVersions ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (query) return list.filter(v => [v.minecraftVersion, v.loaderType, v.allowedRoles.join(" "), v.createdAt].join(" ").toLowerCase().includes(query));
    return list;
  }, [query, dashboard.launcherVersions]);
  const filteredUpdates = useMemo(() => {
    const list = [...(dashboard.updateArtifacts ?? [])].filter(a => a.kind === "client-dll" || a.kind === "jvm-dll" ? true : a.kind.startsWith("native-dll:") || a.kind.startsWith("client-jar:") || a.kind.startsWith("mcp-library:")).sort((a, b) => ("" + (b.updatedAt ?? "")).localeCompare("" + (a.updatedAt ?? "")));
    if (query) return list.filter(a => [a.kind, a.displayName, a.originalName ?? "", a.sha256 ?? "", a.updatedAt ?? ""].join(" ").toLowerCase().includes(query));
    return list;
  }, [query, dashboard.updateArtifacts]);
  const filteredLogs = useMemo(() => query ? dashboard.logs.filter(l => [l.actorLabel, l.category, l.action, l.message, l.details ?? "", l.entityLabel ?? ""].join(" ").toLowerCase().includes(query)) : dashboard.logs, [query, dashboard.logs]);

  const pagedUsers = useMemo(() => paginate(filteredUsers, pages.users, PAGE_SIZES.users), [filteredUsers, pages.users]);
  const pagedOnline = useMemo(() => paginate(filteredOnline, pages.online, PAGE_SIZES.online), [filteredOnline, pages.online]);
  const pagedKeys = useMemo(() => paginate(filteredKeys, pages.keys, PAGE_SIZES.keys), [filteredKeys, pages.keys]);
  const pagedPromos = useMemo(() => paginate(filteredPromos, pages.promos, PAGE_SIZES.promos), [filteredPromos, pages.promos]);
  const pagedSales = useMemo(() => paginate(filteredSales, pages.sales, PAGE_SIZES.sales), [filteredSales, pages.sales]);
  const pagedLauncher = useMemo(() => paginate(filteredLauncher, pages.launcher, PAGE_SIZES.launcher), [filteredLauncher, pages.launcher]);
  const pagedUpdates = useMemo(() => paginate(filteredUpdates, pages.updates, PAGE_SIZES.updates), [filteredUpdates, pages.updates]);
  const pagedLogs = useMemo(() => paginate(filteredLogs, pages.logs, PAGE_SIZES.logs), [filteredLogs, pages.logs]);

  const currentPageResult = activeTab === "users" ? pagedUsers : activeTab === "online" ? pagedOnline : activeTab === "keys" ? pagedKeys : activeTab === "promos" ? pagedPromos : activeTab === "sales" ? pagedSales : activeTab === "launcher" ? pagedLauncher : activeTab === "updates" ? pagedUpdates : pagedLogs;

  const roleOptions = useMemo(() => assignableRoles(user).slice().reverse(), [user]);
  const canManageConnectionUser = useCallback(userId => canManage(user, dashboard.users.find(u => u.id === userId)), [dashboard.users, user]);
  const setPage = useCallback(page => { setPages(prev => ({ ...prev, [activeTab]: page })); }, [activeTab]);

  const deleteKey = useCallback(async (id) => {
    const key = dashboard.licenseKeys.find(k => k.id === id);
    if (!key) return;
    setBusy(true);
    try {
      await apiAdminDeleteKey(id);
      await reloadDashboard(true);
      setStatusText(copy.status.keyDeleted(key.code));
      pushNotice({ tone: "success", title: locale === "ru" ? "Ключ удалён" : "Key deleted", message: key.code });
      closeModal();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось удалить ключ." : "Unable to delete the key.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка удаления ключа" : "Key deletion failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [closeModal, copy.status, reloadDashboard, locale, dashboard.licenseKeys, pushNotice]);

  const deletePromo = useCallback(async (id) => {
    const promo = dashboard.promoCodes.find(p => p.id === id);
    if (!promo) return;
    setBusy(true);
    try {
      await apiAdminDeletePromo(id);
      await reloadDashboard(true);
      setStatusText(copy.status.promoDeleted(promo.code));
      pushNotice({ tone: "success", title: locale === "ru" ? "Промокод удалён" : "Promocode deleted", message: promo.code });
      closeModal();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось удалить промокод." : "Unable to delete the promocode.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка удаления промокода" : "Promocode deletion failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [closeModal, copy.status, reloadDashboard, locale, dashboard.promoCodes, pushNotice]);

  const deleteLauncher = useCallback(async (id) => {
    const version = dashboard.launcherVersions.find(v => v.id === id);
    if (!version) return;
    setBusy(true);
    try {
      await apiAdminDeleteLauncherVersion(id);
      await reloadDashboard(true);
      setStatusText(copy.status.launcherDeleted(version.minecraftVersion, version.loaderType));
      pushNotice({ tone: "success", title: locale === "ru" ? "Launcher-версия удалена" : "Launcher version deleted", message: version.minecraftVersion + " · " + version.loaderType });
      closeModal();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось удалить launcher-версию." : "Unable to delete the launcher version.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка launcher-версии" : "Launcher version deletion failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [closeModal, copy.status, reloadDashboard, locale, dashboard.launcherVersions, pushNotice]);

  const openEditUser = useCallback(id => setModal({ type: "user", userId: id }), []);
  const openKickOnline = useCallback(sessionId => { setKickReason(""); setModal({ type: "kickOnline", sessionId }); }, []);
  const openEditKey = useCallback(id => setModal({ type: "key", keyId: id }), []);
  const openEditPromo = useCallback(id => setModal({ type: "promo", promoId: id }), []);
  const openEditLauncher = useCallback(id => setModal({ type: "launcher", versionId: id }), []);
  const openCreateKey = useCallback(() => { setModal({ type: "createKey" }); }, []);
  const openCreatePromo = useCallback(() => { setModal({ type: "createPromo" }); }, []);
  const openCreateLauncher = useCallback(() => { setModal({ type: "createLauncher" }); }, []);

  const editingUser = modal.type === "user" ? dashboard.users.find(u => u.id === modal.userId) ?? null : null;
  const kickingConnection = modal.type === "kickOnline" ? dashboard.onlineConnections.find(u => u.sessionId === modal.sessionId) ?? null : null;
  const editingKey = modal.type === "key" ? dashboard.licenseKeys.find(u => u.id === modal.keyId) ?? null : null;
  const editingPromo = modal.type === "promo" ? dashboard.promoCodes.find(u => u.id === modal.promoId) ?? null : null;
  const editingLauncher = modal.type === "launcher" ? dashboard.launcherVersions.find(u => u.id === modal.versionId) ?? null : null;
  const canManageEditingUser = canManage(user, editingUser);
  const canKick = kickingConnection ? canManageConnectionUser(kickingConnection.userId) : false;

  const [userDraft, setUserDraft] = useState(null);
  const [keyDraft, setKeyDraft] = useState(null);
  const [promoDraft, setPromoDraft] = useState(null);
  const [launcherDraft, setLauncherDraft] = useState(null);
  const [kickReason, setKickReason] = useState("");

  useEffect(() => {
    const defaultLauncher = { minecraftVersion: MINECRAFT_VERSIONS[0], loaderType: "Fabric", allowedRoles: [...STAFF_ROLES] };
    if (modal.type === "user" && editingUser) setUserDraft({ ...editingUser });
    if (modal.type === "key" && editingKey) setKeyDraft({ ...editingKey });
    if (modal.type === "promo" && editingPromo) setPromoDraft({ ...editingPromo });
    if (modal.type === "launcher" && editingLauncher) setLauncherDraft({ minecraftVersion: editingLauncher.minecraftVersion, loaderType: editingLauncher.loaderType, allowedRoles: [...editingLauncher.allowedRoles] });
    if (modal.type === "createKey") setKeyDraft({ product: "Lite", subscriptionTier: "Premium", duration: "30 days", assignedTo: "", note: "" });
    if (modal.type === "createPromo") setPromoDraft({ code: "", discountPercent: 15, maxUses: 50, expiresAt: "" });
    if (modal.type === "createLauncher") setLauncherDraft(defaultLauncher);
    if (modal.type === "closed") { setUserDraft(null); setKeyDraft(null); setPromoDraft(null); setLauncherDraft(null); setKickReason(""); }
  }, [editingKey, editingLauncher, editingPromo, editingUser, modal.type]);

  const defaultLauncherForm = { minecraftVersion: MINECRAFT_VERSIONS[0], loaderType: "Fabric", allowedRoles: [...STAFF_ROLES] };

  const setUserField = useCallback((field, value) => {
    setUserDraft(prev => ({ ...(prev ?? editingUser), [field]: value }));
  }, [editingUser]);

  const subscriptionDatetime = toDatetimeLocalValue(userDraft?.subscriptionTill ?? editingUser?.subscriptionTill);
  const subscriptionDisplay = displaySubscription(userDraft?.subscriptionTill ?? editingUser?.subscriptionTill, locale) || subscriptionDatetime;
  const promoExpiresDatetime = toDatetimeLocalValue(promoDraft?.expiresAt ?? editingPromo?.expiresAt);
  const parsedDuration = parseDurationString(keyDraft?.duration ?? editingKey?.duration ?? "30 days");
  const noopFocus = useCallback(() => {}, []);

  const userForm = userDraft ?? editingUser;
  const keyForm = keyDraft ?? editingKey;
  const promoForm = promoDraft ?? editingPromo;
  const launcherForm = launcherDraft ?? defaultLauncherForm;

  const setKeyField = useCallback((field, value) => {
    setKeyDraft(prev => ({ ...(prev ?? editingKey), [field]: value }));
  }, [editingKey]);

  const setKeyDuration = useCallback((patch) => {
    setKeyDraft(prev => {
      const parsed = parseDurationString("" + (prev?.duration ?? editingKey?.duration ?? "30 days"));
      const isLifetime = patch.isLifetime ?? parsed.isLifetime;
      const amount = (patch.amount ?? parsed.amount) || "30";
      const unit = patch.unit ?? parsed.unit;
      return { ...(prev ?? editingKey ?? {}), duration: buildDuration(amount, unit, isLifetime) };
    });
  }, [editingKey]);

  const setPromoField = useCallback((field, value) => {
    setPromoDraft(prev => ({ ...(prev ?? editingPromo), [field]: value }));
  }, [editingPromo]);

  const setLauncherField = useCallback((field, value) => {
    setLauncherDraft(prev => ({ ...(prev ?? sanitizeLauncherForm(null)), [field]: value }));
  }, []);

  const updateUser = useCallback(async (id, patch, statusMsg) => {
    const existing = dashboard.users.find(u => u.id === id);
    if (!existing) return;
    const hardwareId = Object.prototype.hasOwnProperty.call(patch, "hardwareId") ? ("" + (patch.hardwareId ?? "")).trim() || null : ("" + (existing.hardwareId ?? "")).trim() || null;
    const promoCode = Object.prototype.hasOwnProperty.call(patch, "promoCode") ? ("" + (patch.promoCode ?? "")).trim() || null : ("" + (existing.promoCode ?? "")).trim() || null;
    const subscriptionTill = Object.prototype.hasOwnProperty.call(patch, "subscriptionTill") ? ("" + (patch.subscriptionTill ?? "")).trim() || null : ("" + (existing.subscriptionTill ?? "")).trim() || null;
    const banReason = Object.prototype.hasOwnProperty.call(patch, "banReason") ? ("" + (patch.banReason ?? "")).trim() || null : ("" + (existing.banReason ?? "")).trim() || null;
    setBusy(true);
    try {
      await apiAdminUpdateUser(id, {
        displayName: ("" + (patch.displayName ?? existing.displayName)).trim(),
        email: ("" + (patch.email ?? existing.email ?? "")).trim(),
        role: ("" + (patch.role ?? existing.role)).trim(),
        subscriptionTier: ("" + (patch.subscriptionTier ?? existing.subscriptionTier)).trim(),
        hardwareId,
        promoCode,
        subscriptionTill,
        twoFactorEnabled: !!(patch.twoFactorEnabled ?? existing.twoFactorEnabled),
        isBanned: !!(patch.isBanned ?? existing.isBanned),
        banReason
      });
      await reloadDashboard(true);
      setStatusText(statusMsg);
      pushNotice({ tone: "success", title: locale === "ru" ? "Пользователь обновлён" : "User updated", message: statusMsg });
      closeModal();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось обновить пользователя." : "Unable to update the user.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка пользователя" : "User update failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [closeModal, reloadDashboard, locale, dashboard.users, pushNotice]);

  const kickOnline = useCallback(async (sessionId, displayName, reason) => {
    setBusy(true);
    try {
      await apiAdminKickSession(sessionId, { reason });
      await reloadDashboard(true);
      const msg = copy.status.onlineKicked(displayName);
      setStatusText(msg);
      pushNotice({ tone: "success", title: locale === "ru" ? "Сессия кикнута" : "Session kicked", message: msg });
      closeModal();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось кикнуть сессию." : "Unable to kick the session.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка online-сессии" : "Online session action failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [closeModal, copy.status, reloadDashboard, locale, pushNotice]);

  const revokeSessions = useCallback(async (userId) => {
    const target = dashboard.users.find(u => u.id === userId);
    if (!target) return;
    setBusy(true);
    try {
      await apiAdminRevokeUserSessions(userId);
      await reloadDashboard(true);
      const msg = copy.status.userSessionsRevoked(target.displayName);
      setStatusText(msg);
      pushNotice({ tone: "success", title: locale === "ru" ? "Сессии отозваны" : "Sessions revoked", message: msg });
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось отозвать сессии." : "Unable to revoke sessions.");
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка сессий" : "Session revoke failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [copy.status, reloadDashboard, locale, dashboard.users, pushNotice]);

  const updateKey = useCallback(async (id, patch, statusMsg) => {
    const existing = dashboard.licenseKeys.find(k => k.id === id);
    if (!existing) return;
    const body = {
      product: ("" + (patch.product ?? existing.product)).trim(),
      subscriptionTier: patch.subscriptionTier === "Beta" ? "Beta" : patch.subscriptionTier === "Premium" ? "Premium" : existing.subscriptionTier,
      duration: ("" + (patch.duration ?? existing.duration)).trim(),
      status: patch.status ?? existing.status,
      assignedToEmail: ("" + (patch.assignedTo ?? existing.assignedTo ?? "")).trim() || null,
      note: ("" + (patch.note ?? existing.note ?? "")).trim() || null
    };
    const validationError = validateKeyForm(copy, body);
    if (validationError) {
      setStatusText(validationError);
      pushNotice({ tone: "warning", title: locale === "ru" ? "Проверьте ключ" : "Check the key", message: validationError });
      return;
    }
    setBusy(true);
    try {
      await apiAdminUpdateKey(id, body);
      await reloadDashboard(true);
      setStatusText(statusMsg);
      pushNotice({ tone: "success", title: locale === "ru" ? "Ключ обновлён" : "Key updated", message: statusMsg });
      closeModal();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось обновить ключ." : "Unable to update the key.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка ключа" : "Key update failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [closeModal, copy, reloadDashboard, locale, dashboard.licenseKeys, pushNotice]);

  const updatePromo = useCallback(async (id, patch, statusMsg) => {
    const existing = dashboard.promoCodes.find(p => p.id === id);
    if (!existing) return;
    const body = {
      discountPercent: Number(patch.discountPercent ?? existing.discountPercent),
      maxUses: Number(patch.maxUses ?? existing.maxUses),
      uses: Number(patch.uses ?? existing.uses),
      status: patch.status ?? existing.status,
      expiresAt: ("" + (patch.expiresAt ?? existing.expiresAt ?? "")).trim() || null
    };
    const validationError = validatePromoForm(copy, body);
    if (validationError) {
      setStatusText(validationError);
      pushNotice({ tone: "warning", title: locale === "ru" ? "Проверьте промокод" : "Check the promocode", message: validationError });
      return;
    }
    setBusy(true);
    try {
      await apiAdminUpdatePromo(id, body);
      await reloadDashboard(true);
      setStatusText(statusMsg);
      pushNotice({ tone: "success", title: locale === "ru" ? "Промокод обновлён" : "Promocode updated", message: statusMsg });
      closeModal();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось обновить промокод." : "Unable to update the promocode.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка промокода" : "Promocode update failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [closeModal, copy, reloadDashboard, locale, dashboard.promoCodes, pushNotice]);

  const updateLauncher = useCallback(async (id, patch, statusMsg) => {
    setBusy(true);
    try {
      await apiAdminUpdateLauncherVersion(id, sanitizeLauncherForm(patch));
      await reloadDashboard(true);
      setStatusText(statusMsg);
      pushNotice({ tone: "success", title: locale === "ru" ? "Launcher-версия обновлена" : "Launcher version updated", message: statusMsg });
      closeModal();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось обновить launcher-версию." : "Unable to update the launcher version.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка launcher-версии" : "Launcher version update failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [closeModal, reloadDashboard, locale, pushNotice]);

  const createKey = useCallback(async () => {
    const product = ("" + (keyDraft?.product ?? "")).trim();
    const subscriptionTier = keyDraft?.subscriptionTier === "Beta" ? "Beta" : "Premium";
    const duration = ("" + (keyDraft?.duration ?? "")).trim();
    const assignedTo = ("" + (keyDraft?.assignedTo ?? "")).trim();
    const note = ("" + (keyDraft?.note ?? "")).trim();
    const body = { product, subscriptionTier, duration, assignedToEmail: assignedTo || null, note: note || null };
    const validationError = validateKeyForm(copy, body);
    if (validationError) {
      setStatusText(validationError);
      pushNotice({ tone: "warning", title: locale === "ru" ? "Проверьте ключ" : "Check the key", message: validationError });
      return;
    }
    setBusy(true);
    try {
      const created = await apiAdminCreateKey(body);
      await reloadDashboard(true);
      setStatusText(copy.status.keyCreated(created.code));
      pushNotice({ tone: "success", title: locale === "ru" ? "Ключ создан" : "Key created", message: created.code });
      closeModal();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось создать ключ." : "Unable to create the key.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка создания ключа" : "Key creation failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [closeModal, copy.status, keyDraft, reloadDashboard, locale, pushNotice]);

  const createPromo = useCallback(async () => {
    const code = ("" + (promoDraft?.code ?? "")).trim().toUpperCase();
    const discountPercent = Number(promoDraft?.discountPercent ?? 10);
    const maxUses = Number(promoDraft?.maxUses ?? 1);
    const expiresAt = ("" + (promoDraft?.expiresAt ?? "")).trim();
    const body = { code: code || undefined, discountPercent, maxUses, uses: 0, expiresAt: expiresAt || null };
    const validationError = validatePromoForm(copy, body);
    if (validationError) {
      setStatusText(validationError);
      pushNotice({ tone: "warning", title: locale === "ru" ? "Проверьте промокод" : "Check the promocode", message: validationError });
      return;
    }
    setBusy(true);
    try {
      const created = await apiAdminCreatePromo(body);
      await reloadDashboard(true);
      setStatusText(copy.status.promoCreated(created.code));
      pushNotice({ tone: "success", title: locale === "ru" ? "Промокод создан" : "Promocode created", message: created.code });
      closeModal();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось создать промокод." : "Unable to create the promocode.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка создания промокода" : "Promocode creation failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [closeModal, copy, promoDraft, reloadDashboard, locale, pushNotice]);

  const createLauncher = useCallback(async () => {
    const body = sanitizeLauncherForm(launcherDraft);
    setBusy(true);
    try {
      await apiAdminCreateLauncherVersion(body);
      await reloadDashboard(true);
      setStatusText(copy.status.launcherCreated(body.minecraftVersion, body.loaderType));
      pushNotice({ tone: "success", title: locale === "ru" ? "Launcher-версия создана" : "Launcher version created", message: body.minecraftVersion + " · " + body.loaderType });
      closeModal();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Не удалось создать launcher-версию." : "Unable to create the launcher version.");
      setStatusText(msg);
      pushNotice({ tone: "error", title: locale === "ru" ? "Ошибка launcher-версии" : "Launcher version creation failed", message: msg });
    } finally {
      setBusy(false);
    }
  }, [closeModal, copy.status, launcherDraft, reloadDashboard, locale, pushNotice]);

  if (!user || !isAdmin(user)) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <section className="route-page admin-page">
      <div className="route-page__stack">
        <Reveal as="section" className="admin-page__hero" delay={0}>
          <RouteIntro align="left" badgeLabel={copy.badge} badgeIcon={<AdminBadgeIcon />} title={copy.title} description={copy.description} />
          <div className="admin-page__hero-actions">
            <span className="glass-chip">{copy.session}: {user.displayName}</span>
            <ActionButton to="/profile" variant="secondary" className="admin-page__back-button"><ChevronLeftIcon /><span>{copy.backToProfile}</span></ActionButton>
          </div>
        </Reveal>
        <Reveal delay={50}><div className="route-rule" /></Reveal>
        <Reveal as="section" className="admin-page__workspace" delay={120}>
          <BlurPanel className="admin-page__workspace-panel">
            <div className="admin-page__tabs" role="tablist" aria-label={copy.tabsAria}>
              <button type="button" className={activeTab === "users" ? "admin-page__tab admin-page__tab--active" : "admin-page__tab"} onClick={() => switchTab("users")} role="tab" aria-selected={activeTab === "users"}>{copy.tabs.users}</button>
              <button type="button" className={activeTab === "online" ? "admin-page__tab admin-page__tab--active" : "admin-page__tab"} onClick={() => switchTab("online")} role="tab" aria-selected={activeTab === "online"}>{copy.tabs.online}</button>
              <button type="button" className={activeTab === "keys" ? "admin-page__tab admin-page__tab--active" : "admin-page__tab"} onClick={() => switchTab("keys")} role="tab" aria-selected={activeTab === "keys"}>{copy.tabs.keys}</button>
              <button type="button" className={activeTab === "promos" ? "admin-page__tab admin-page__tab--active" : "admin-page__tab"} onClick={() => switchTab("promos")} role="tab" aria-selected={activeTab === "promos"}>{copy.tabs.promos}</button>
              <button type="button" className={activeTab === "sales" ? "admin-page__tab admin-page__tab--active" : "admin-page__tab"} onClick={() => switchTab("sales")} role="tab" aria-selected={activeTab === "sales"}>{copy.tabs.sales}</button>
              <button type="button" className={activeTab === "launcher" ? "admin-page__tab admin-page__tab--active" : "admin-page__tab"} onClick={() => switchTab("launcher")} role="tab" aria-selected={activeTab === "launcher"}>{copy.tabs.launcher}</button>
              <button type="button" className={activeTab === "updates" ? "admin-page__tab admin-page__tab--active" : "admin-page__tab"} onClick={() => switchTab("updates")} role="tab" aria-selected={activeTab === "updates"}>{copy.tabs.updates}</button>
              <button type="button" className={activeTab === "logs" ? "admin-page__tab admin-page__tab--active" : "admin-page__tab"} onClick={() => switchTab("logs")} role="tab" aria-selected={activeTab === "logs"}>{copy.tabs.logs}</button>
              <button type="button" className={activeTab === "plans" ? "admin-page__tab admin-page__tab--active" : "admin-page__tab"} onClick={() => switchTab("plans")} role="tab" aria-selected={activeTab === "plans"}>{copy.tabs.plans}</button>
              <button type="button" className={activeTab === "ebd" ? "admin-page__tab admin-page__tab--active" : "admin-page__tab"} onClick={() => switchTab("ebd")} role="tab" aria-selected={activeTab === "ebd"}>{copy.tabs.ebd}</button>
            </div>
            <div className="admin-page__toolbar">
              <div className="admin-page__toolbar-left">
                <span className="glass-chip admin-page__count-chip">{activeTab === "users" ? copy.counts.users(filteredUsers.length) : activeTab === "online" ? copy.counts.online(filteredOnline.length) : activeTab === "keys" ? copy.counts.keys(filteredKeys.length) : activeTab === "promos" ? copy.counts.promos(filteredPromos.length) : activeTab === "sales" ? copy.counts.sales(filteredSales.length) : activeTab === "launcher" ? "Loader Panel" : activeTab === "updates" ? copy.counts.updates(filteredUpdates.length) : activeTab === "plans" ? copy.counts.plans(0) : copy.counts.logs(filteredLogs.length)}</span>
              </div>
              <label className="admin-page__search-shell">
                <span className="admin-page__search-icon" aria-hidden="true"><SearchIcon /></span>
                <input type="search" value={searchInput} onChange={e => setSearchInput(e.target.value)} className="glass-input admin-page__search-input" placeholder={activeTab === "users" ? copy.search.users : activeTab === "online" ? copy.search.online : activeTab === "keys" ? copy.search.keys : activeTab === "promos" ? copy.search.promos : activeTab === "sales" ? copy.search.sales : activeTab === "launcher" ? copy.search.launcher : activeTab === "updates" ? copy.search.updates : activeTab === "plans" ? copy.search.plans : copy.search.logs} />
              </label>
              {activeTab === "keys" ? <ActionButton type="button" variant="primary" className="admin-page__primary" onClick={openCreateKey}>{copy.newKey}</ActionButton> : null}
              {activeTab === "promos" ? <ActionButton type="button" variant="primary" className="admin-page__primary" onClick={openCreatePromo}>{copy.newPromo}</ActionButton> : null}
            </div>
            <p className="admin-page__status-note">{isBusy ? statusText + " ..." : statusText}</p>
            <div className="admin-page__tab-panel" key={activeTab}>
              {activeTab === "users" ? <UsersTable copy={copy} actor={user} users={pagedUsers.items} isEmpty={!filteredUsers.length} onEditUser={openEditUser} onRevokeSessions={revokeSessions} /> : null}
              {activeTab === "online" ? <OnlineTable copy={copy} connections={pagedOnline.items} isEmpty={!filteredOnline.length} canManageConnectionUser={canManageConnectionUser} onKick={openKickOnline} /> : null}
              {activeTab === "keys" ? <KeysTable copy={copy} keys={pagedKeys.items} isEmpty={!filteredKeys.length} onEdit={openEditKey} onDelete={id => void deleteKey(id)} /> : null}
              {activeTab === "promos" ? <PromosTable copy={copy} promos={pagedPromos.items} isEmpty={!filteredPromos.length} onEdit={openEditPromo} onDelete={id => void deletePromo(id)} /> : null}
              {activeTab === "sales" ? <SalesTable copy={copy} sales={pagedSales.items} summary={dashboard.salesSummary} isEmpty={!filteredSales.length} /> : null}
              {activeTab === "launcher" ? <LoaderPanel copy={copy} locale={locale} pushNotice={pushNotice} /> : null}
              {activeTab === "updates" ? <UpdatesSection copy={copy} locale={locale} launcherVersions={dashboard.launcherVersions} updateArtifacts={filteredUpdates} isBusy={isBusy} isSystemOwner={!!user.isSystemOwner} setBusy={setBusy} setStatusText={setStatusText} reloadDashboard={reloadDashboard} /> : null}
              {activeTab === "logs" ? <LogsTable copy={copy} logs={pagedLogs.items} isEmpty={!filteredLogs.length} /> : null}
              {activeTab === "plans" ? <PlansSection /> : null}
              {activeTab === "ebd" ? <EbdSection copy={copy} locale={locale} pushNotice={pushNotice} /> : null}
            </div>
            {activeTab === "plans" && <Pagination currentPage={currentPageResult.currentPage} totalPages={currentPageResult.totalPages} onPageChange={setPage} previousLabel={copy.pagination.previous} nextLabel={copy.pagination.next} pageLabel={copy.pagination.page(currentPageResult.currentPage, currentPageResult.totalPages)} />}
            {modal.type === "closed" ? null : (
              <Modal onClose={closeModal} ariaLabelledBy="admin-modal-title">
                <div className="admin-page__modal blur-panel" style={PROFILE_BLUR_STYLE}>
                  <div className="admin-page__modal-head">
                    <div>
                      <p id="admin-modal-title" className="admin-page__modal-title">{modal.type === "user" ? copy.modal.editUser : modal.type === "kickOnline" ? copy.modal.kickOnline : modal.type === "key" ? copy.modal.editKey : modal.type === "promo" ? copy.modal.editPromo : modal.type === "launcher" ? copy.modal.editLauncher : modal.type === "createKey" ? copy.modal.createKey : modal.type === "createPromo" ? copy.modal.createPromo : copy.modal.createLauncher}</p>
                      <p className="admin-page__modal-subtitle">
                        {modal.type === "user" && editingUser ? "#" + editingUser.uid + " · " + editingUser.displayName + " · " + (editingUser.email ?? copy.modal.noEmail) : null}
                        {modal.type === "kickOnline" && kickingConnection ? "#" + kickingConnection.uid + " · " + kickingConnection.displayName + " · " + (kickingConnection.email ?? copy.modal.noEmail) + " · " + kickingConnection.sessionId : null}
                        {modal.type === "key" && editingKey ? editingKey.code + " · " + editingKey.product + " · " + editingKey.duration : null}
                        {modal.type === "promo" && editingPromo ? editingPromo.code + " · " + copy.modal.expires + " " + formatDateTimeOrDash(editingPromo.expiresAt) : null}
                        {modal.type === "launcher" && editingLauncher ? editingLauncher.minecraftVersion + " · " + editingLauncher.loaderType + " · " + editingLauncher.allowedRoles.join(", ") : null}
                      </p>
                    </div>
                    <button type="button" className="admin-page__modal-close" onClick={closeModal} aria-label={copy.modal.close}><CloseIcon /></button>
                  </div>
                  <div className="admin-page__modal-body">
                    {modal.type === "user" && editingUser ? <>
                      <div className="admin-page__form-grid">
                        <label className="admin-page__field"><span>{copy.fields.displayName}</span><input className="glass-input" value={userForm.displayName ?? ""} onFocus={noopFocus} onChange={e => setUserField("displayName", e.target.value)} /></label>
                        <label className="admin-page__field"><span>{copy.fields.email}</span><input className="glass-input" value={userForm.email ?? ""} onFocus={noopFocus} onChange={e => setUserField("email", e.target.value)} /></label>
                        <label className="admin-page__field"><span>{copy.fields.role}</span><select className="glass-select" disabled={isSystemOwner(editingUser) || !canManageEditingUser} value={userForm.role ?? editingUser.role} onFocus={noopFocus} onChange={e => setUserField("role", e.target.value)}>{roleOptions.map(r => <option value={r} key={r}>{r}</option>)}</select></label>
                        <label className="admin-page__field"><span>{copy.fields.subscriptionTier}</span><select className="glass-select" value={normalizeTier(userForm.subscriptionTier ?? editingUser.subscriptionTier)} onFocus={noopFocus} onChange={e => setUserField("subscriptionTier", e.target.value)}><option value="User">User</option><option value="Premium">Premium</option><option value="Beta">Beta</option></select></label>
                        <label className="admin-page__field admin-page__field--stacked admin-page__field--wide">
                          <span>{copy.fields.subscription}</span>
                          <div className="admin-page__preset-row">
                            <input className="glass-input" value={subscriptionDisplay} onChange={e => setUserField("subscriptionTill", e.target.value)} placeholder={copy.fields.subscriptionPlaceholder} list="subscription-presets" onBlur={e => {
                              const val = e.target.value.trim();
                              if (!val) { setUserField("subscriptionTill", null); return; }
                              if (val.toLowerCase() === "lifetime") { setUserField("subscriptionTill", "Lifetime"); return; }
                              setUserField("subscriptionTill", val);
                            }} />
                            <ActionButton type="button" variant="secondary" className="admin-page__preset-button" onClick={() => setUserField("subscriptionTill", "Lifetime")}>{copy.buttons.lifetime}</ActionButton>
                          </div>
                          <input className="admin-page__datetime" type="datetime-local" value={subscriptionDatetime} onChange={e => setUserField("subscriptionTill", e.target.value ? e.target.value : null)} />
                          <datalist id="subscription-presets"><option value={copy.buttons.lifetime} /></datalist>
                        </label>
                        <label className="admin-page__field"><span>{copy.fields.hardwareId}</span><input className="glass-input" value={userForm.hardwareId ?? ""} onFocus={noopFocus} onChange={e => setUserField("hardwareId", e.target.value)} /></label>
                        <label className="admin-page__field admin-page__field--wide"><span>{copy.fields.banReason}</span><input className="glass-input" value={userForm.banReason ?? ""} onFocus={noopFocus} onChange={e => setUserField("banReason", e.target.value)} placeholder={copy.fields.banReason} /></label>
                      </div>
                      <div className="admin-page__toggles">
                        <label className="admin-page__toggle"><input type="checkbox" checked={!!(userDraft?.twoFactorEnabled ?? editingUser.twoFactorEnabled)} onFocus={noopFocus} onChange={() => setUserField("twoFactorEnabled", !(userDraft?.twoFactorEnabled ?? editingUser.twoFactorEnabled))} /><span>{copy.fields.twoFactorEnabled}</span></label>
                        <label className="admin-page__toggle"><input type="checkbox" disabled={isSystemOwner(editingUser)} checked={!!(userDraft?.isBanned ?? editingUser.isBanned)} onFocus={noopFocus} onChange={() => {
                          const next = !(userDraft?.isBanned ?? editingUser.isBanned);
                          setUserField("isBanned", next);
                          if (!next) setUserField("banReason", null);
                        }} /><span>{copy.fields.accountBanned}</span></label>
                      </div>
                      <div className="admin-page__modal-actions">
                        <ActionButton type="button" variant="secondary" onClick={closeModal}>{copy.buttons.cancel}</ActionButton>
                        <ActionButton type="button" variant="secondary" disabled={!canManageEditingUser} onClick={() => {
                          setUserField("hardwareId", null);
                          updateUser(editingUser.id, { hardwareId: null }, copy.status.hardwareIdReset("" + editingUser.uid, editingUser.displayName));
                        }}>{copy.buttons.resetHardwareId}</ActionButton>
                        <ActionButton type="button" variant="primary" disabled={!userDraft && !canManageEditingUser} onClick={() => {
                          if (!userDraft) return;
                          const patch = {
                            displayName: ("" + (userDraft.displayName ?? editingUser.displayName)).trim(),
                            email: ("" + (userDraft.email ?? editingUser.email ?? "")).trim() || undefined,
                            role: ("" + (userDraft.role ?? editingUser.role)).trim(),
                            subscriptionTier: normalizeTier(userDraft.subscriptionTier ?? editingUser.subscriptionTier),
                            subscriptionTill: ("" + ((Object.prototype.hasOwnProperty.call(userDraft, "subscriptionTill") ? userDraft.subscriptionTill : editingUser.subscriptionTill) ?? "")).trim() || null,
                            hardwareId: ("" + (userDraft.hardwareId ?? editingUser.hardwareId ?? "")).trim() || null,
                            twoFactorEnabled: !!(userDraft.twoFactorEnabled ?? editingUser.twoFactorEnabled),
                            isBanned: !!(userDraft.isBanned ?? editingUser.isBanned),
                            banReason: (userDraft.isBanned ?? editingUser.isBanned) && ("" + (userDraft.banReason ?? editingUser.banReason ?? "")).trim() || null
                          };
                          const merged = { ...editingUser, ...patch };
                          updateUser(editingUser.id, patch, userSummaryLine(merged, locale));
                        }}>{copy.buttons.saveChanges}</ActionButton>
                      </div>
                    </> : null}
                    {modal.type === "kickOnline" && kickingConnection ? <>
                      <label className="admin-page__field admin-page__field--wide"><span>{copy.fields.kickReason}</span><input className="glass-input" value={kickReason} onChange={e => setKickReason(e.target.value)} placeholder={copy.fields.kickReason} /></label>
                      <div className="admin-page__modal-actions">
                        <ActionButton type="button" variant="secondary" onClick={closeModal}>{copy.buttons.cancel}</ActionButton>
                        <ActionButton type="button" variant="primary" disabled={!canKick} onClick={() => void kickOnline(kickingConnection.sessionId, kickingConnection.displayName, kickReason.trim() || null)}>{copy.buttons.kick}</ActionButton>
                      </div>
                    </> : null}
                    {modal.type === "key" && editingKey ? <>
                      <div className="admin-page__form-grid">
                        <label className="admin-page__field"><span>{copy.fields.product}</span><input className="glass-input" value={keyForm.product ?? ""} onFocus={noopFocus} onChange={e => setKeyField("product", e.target.value)} /></label>
                        <label className="admin-page__field"><span>{copy.fields.subscriptionTier}</span><select className="glass-select" value={keyForm.subscriptionTier ?? "Premium"} onChange={e => setKeyField("subscriptionTier", e.target.value === "Beta" ? "Beta" : "Premium")}><option value="Premium">Premium</option><option value="Beta">Beta</option></select></label>
                        <label className="admin-page__field"><span>{copy.fields.duration}</span>
                          <div className="admin-page__duration-row">
                            <input type="number" min="1" step="1" className="glass-input" value={parsedDuration.isLifetime ? "" : parsedDuration.amount} onFocus={noopFocus} onChange={e => setKeyDuration({ amount: e.target.value, isLifetime: false })} disabled={parsedDuration.isLifetime} />
                            <select className="glass-select" value={parsedDuration.unit} onChange={e => setKeyDuration({ unit: e.target.value })} disabled={parsedDuration.isLifetime}>{DURATION_UNITS.map(u => <option value={u} key={u}>{u}</option>)}</select>
                            <ActionButton type="button" variant="secondary" className="admin-page__preset-button" onClick={() => setKeyDuration({ isLifetime: !parsedDuration.isLifetime, amount: parsedDuration.amount || "30" })}>{copy.buttons.lifetime}</ActionButton>
                          </div>
                          <p className="admin-page__field-hint">{copy.fields.durationHint}</p>
                        </label>
                        <label className="admin-page__field"><span>{copy.fields.assignedToEmail}</span><input className="glass-input" value={keyForm.assignedTo ?? ""} onFocus={noopFocus} onChange={e => setKeyField("assignedTo", e.target.value)} /></label>
                        <label className="admin-page__field"><span>{copy.fields.note}</span><input className="glass-input" value={keyForm.note ?? ""} onFocus={noopFocus} onChange={e => setKeyField("note", e.target.value)} /></label>
                      </div>
                      <div className="admin-page__modal-actions">
                        <ActionButton type="button" variant="secondary" onClick={closeModal}>{copy.buttons.cancel}</ActionButton>
                        <button type="button" className="admin-page__icon-action admin-page__icon-action--danger" onClick={() => void deleteKey(editingKey.id)} aria-label={copy.buttons.delete}><TrashIcon /></button>
                        <ActionButton type="button" variant="secondary" onClick={() => {
                          updateKey(editingKey.id, { status: editingKey.status === "revoked" ? editingKey.assignedTo ? "assigned" : "unused" : "revoked" }, editingKey.status === "revoked" ? copy.status.keyRestored(editingKey.code) : copy.status.keyRevoked(editingKey.code));
                        }}>{editingKey.status === "revoked" ? copy.buttons.restore : copy.buttons.revoke}</ActionButton>
                        <ActionButton type="button" variant="primary" disabled={!keyDraft} onClick={() => {
                          if (!keyDraft) return;
                          const assignedTo = ("" + (keyDraft.assignedTo ?? editingKey.assignedTo ?? "")).trim() || null;
                          const status = editingKey.status === "revoked" ? "revoked" : editingKey.status;
                          updateKey(editingKey.id, {
                            product: ("" + (keyDraft.product ?? editingKey.product)).trim(),
                            subscriptionTier: keyDraft.subscriptionTier === "Beta" ? "Beta" : "Premium",
                            duration: ("" + (keyDraft.duration ?? editingKey.duration)).trim(),
                            assignedTo,
                            note: ("" + (keyDraft.note ?? editingKey.note ?? "")).trim() || null,
                            status
                          }, copy.status.keyUpdated(editingKey.code));
                        }}>{copy.buttons.saveChanges}</ActionButton>
                      </div>
                    </> : null}
                    {modal.type === "promo" && editingPromo ? <>
                      <div className="admin-page__form-grid">
                        <label className="admin-page__field"><span>{copy.fields.code}</span><input className="glass-input" value={editingPromo.code} disabled={true} /></label>
                        <label className="admin-page__field"><span>{copy.fields.discountPercent}</span><input type="number" min="1" max="100" step="1" className="glass-input" value={promoForm.discountPercent ?? 10} onFocus={noopFocus} onChange={e => setPromoField("discountPercent", Number(e.target.value))} /></label>
                        <label className="admin-page__field"><span>{copy.fields.maxUses}</span><input type="number" min="1" step="1" className="glass-input" value={promoForm.maxUses ?? 1} onFocus={noopFocus} onChange={e => setPromoField("maxUses", Number(e.target.value))} /></label>
                        <label className="admin-page__field admin-page__field--wide"><span>{copy.fields.expiresAt}</span><input className="admin-page__datetime" type="datetime-local" value={promoExpiresDatetime} onFocus={noopFocus} onChange={e => setPromoField("expiresAt", e.target.value || null)} /><p className="admin-page__field-hint">{copy.fields.expiresHint}</p></label>
                      </div>
                      <div className="admin-page__modal-actions">
                        <button type="button" className="admin-page__icon-action admin-page__icon-action--danger" onClick={() => void deletePromo(editingPromo.id)} aria-label={copy.buttons.delete}><TrashIcon /></button>
                        <ActionButton type="button" variant="secondary" onClick={closeModal}>{copy.buttons.cancel}</ActionButton>
                        <ActionButton type="button" variant="secondary" onClick={() => {
                          updatePromo(editingPromo.id, { status: editingPromo.status === "active" ? "paused" : "active" }, editingPromo.status === "active" ? copy.status.promoPaused(editingPromo.code) : copy.status.promoActivated(editingPromo.code));
                        }}>{editingPromo.status === "active" ? copy.buttons.pause : copy.buttons.activate}</ActionButton>
                        <ActionButton type="button" variant="secondary" onClick={() => {
                          const uses = Math.min(editingPromo.maxUses, editingPromo.uses + 1);
                          updatePromo(editingPromo.id, { uses }, copy.status.promoUsageIncremented(editingPromo.code));
                        }}>{copy.buttons.usePlusOne}</ActionButton>
                        <ActionButton type="button" variant="secondary" onClick={() => {
                          updatePromo(editingPromo.id, { uses: 0, status: "active" }, copy.status.promoUsageReset(editingPromo.code));
                        }}>{copy.buttons.reset}</ActionButton>
                        <ActionButton type="button" variant="primary" disabled={!promoDraft} onClick={() => {
                          if (promoDraft) {
                            updatePromo(editingPromo.id, {
                              discountPercent: Number(promoDraft.discountPercent ?? editingPromo.discountPercent),
                              maxUses: Number(promoDraft.maxUses ?? editingPromo.maxUses),
                              expiresAt: ("" + (promoDraft.expiresAt ?? editingPromo.expiresAt ?? "")).trim() || null
                            }, copy.status.promoUpdated(editingPromo.code));
                          }
                        }}>{copy.buttons.saveChanges}</ActionButton>
                      </div>
                    </> : null}
                    {modal.type === "launcher" && editingLauncher ? <>
                      <div className="admin-page__form-grid">
                        <label className="admin-page__field"><span>{copy.fields.minecraftVersion}</span><select className="glass-select" value={launcherForm.minecraftVersion} onChange={e => setLauncherField("minecraftVersion", e.target.value)}>{MINECRAFT_VERSIONS.map(v => <option value={v} key={v}>{v}</option>)}</select></label>
                        <label className="admin-page__field"><span>{copy.fields.loaderType}</span><select className="glass-select" value={launcherForm.loaderType} onChange={e => setLauncherField("loaderType", e.target.value)}>{LOADER_TYPES.map(v => <option value={v} key={v}>{v}</option>)}</select></label>
                      </div>
                      <div className="admin-page__toggles">{[...STAFF_ROLES, ...ASSIGNABLE_EXTRA_ROLES].map(role => {
                        const isStaff = STAFF_ROLES.includes(role);
                        const isChecked = launcherForm.allowedRoles.includes(role);
                        return <label className="admin-page__toggle" key={role}><input type="checkbox" checked={isChecked} disabled={isStaff} onChange={() => {
                          if (!isStaff) setLauncherField("allowedRoles", sanitizeAllowedRoles(isChecked ? launcherForm.allowedRoles.filter(r => r !== role) : [...launcherForm.allowedRoles, role]));
                        }} /><span>{role}</span></label>;
                      })}</div>
                      <div className="admin-page__modal-actions">
                        <ActionButton type="button" variant="secondary" onClick={closeModal}>{copy.buttons.cancel}</ActionButton>
                        <button type="button" className="admin-page__icon-action admin-page__icon-action--danger" onClick={() => void deleteLauncher(editingLauncher.id)} aria-label={copy.buttons.delete}><TrashIcon /></button>
                        <ActionButton type="button" variant="primary" onClick={() => {
                          const body = sanitizeLauncherForm(launcherDraft);
                          updateLauncher(editingLauncher.id, body, copy.status.launcherUpdated(body.minecraftVersion, body.loaderType));
                        }}>{copy.buttons.saveChanges}</ActionButton>
                      </div>
                    </> : null}
                    {modal.type === "createKey" ? <>
                      <div className="admin-page__form-grid">
                        <label className="admin-page__field"><span>{copy.fields.product}</span><input className="glass-input" value={"" + (keyDraft?.product ?? "")} onChange={e => setKeyDraft(prev => ({ ...(prev ?? {}), product: e.target.value }))} /></label>
                        <label className="admin-page__field"><span>{copy.fields.subscriptionTier}</span><select className="glass-select" value={"" + (keyDraft?.subscriptionTier ?? "Premium")} onChange={e => setKeyDraft(prev => ({ ...(prev ?? {}), subscriptionTier: e.target.value === "Beta" ? "Beta" : "Premium" }))}><option value="Premium">Premium</option><option value="Beta">Beta</option></select></label>
                        <label className="admin-page__field"><span>{copy.fields.duration}</span>
                          <div className="admin-page__duration-row">
                            <input type="number" min="1" step="1" className="glass-input" value={parsedDuration.isLifetime ? "" : parsedDuration.amount} onChange={e => setKeyDuration({ amount: e.target.value, isLifetime: false })} disabled={parsedDuration.isLifetime} />
                            <select className="glass-select" value={parsedDuration.unit} onChange={e => setKeyDuration({ unit: e.target.value })} disabled={parsedDuration.isLifetime}>{DURATION_UNITS.map(u => <option value={u} key={u}>{u}</option>)}</select>
                            <ActionButton type="button" variant="secondary" className="admin-page__preset-button" onClick={() => setKeyDuration({ isLifetime: !parsedDuration.isLifetime, amount: parsedDuration.amount || "30" })}>{copy.buttons.lifetime}</ActionButton>
                          </div>
                          <p className="admin-page__field-hint">{copy.fields.durationHint}</p>
                        </label>
                        <label className="admin-page__field"><span>{copy.fields.assignToOptional}</span><input className="glass-input" value={"" + (keyDraft?.assignedTo ?? "")} onChange={e => setKeyDraft(prev => ({ ...(prev ?? {}), assignedTo: e.target.value }))} /></label>
                        <label className="admin-page__field"><span>{copy.fields.noteOptional}</span><input className="glass-input" value={"" + (keyDraft?.note ?? "")} onChange={e => setKeyDraft(prev => ({ ...(prev ?? {}), note: e.target.value }))} /></label>
                      </div>
                      <div className="admin-page__modal-actions">
                        <ActionButton type="button" variant="secondary" onClick={closeModal}>{copy.buttons.cancel}</ActionButton>
                        <ActionButton type="button" variant="primary" onClick={createKey}>{copy.buttons.createKey}</ActionButton>
                      </div>
                    </> : null}
                    {modal.type === "createPromo" ? <>
                      <div className="admin-page__form-grid">
                        <label className="admin-page__field"><span>{copy.fields.codeOptional}</span><input className="glass-input" value={"" + (promoDraft?.code ?? "")} onChange={e => setPromoDraft(prev => ({ ...(prev ?? {}), code: e.target.value.toUpperCase() }))} placeholder={copy.fields.codePlaceholder} /></label>
                        <label className="admin-page__field"><span>{copy.fields.discountPercent}</span><input type="number" min="1" max="100" step="1" className="glass-input" value={"" + (promoDraft?.discountPercent ?? 10)} onChange={e => setPromoDraft(prev => ({ ...(prev ?? {}), discountPercent: Number(e.target.value) }))} /></label>
                        <label className="admin-page__field"><span>{copy.fields.maxUses}</span><input type="number" min="1" step="1" className="glass-input" value={"" + (promoDraft?.maxUses ?? 1)} onChange={e => setPromoDraft(prev => ({ ...(prev ?? {}), maxUses: Number(e.target.value) }))} /></label>
                        <label className="admin-page__field admin-page__field--wide"><span>{copy.fields.expiresOptional}</span><input className="admin-page__datetime" type="datetime-local" value={promoExpiresDatetime} onChange={e => setPromoDraft(prev => ({ ...(prev ?? {}), expiresAt: e.target.value || null }))} /><p className="admin-page__field-hint">{copy.fields.expiresHint}</p></label>
                      </div>
                      <div className="admin-page__modal-actions">
                        <ActionButton type="button" variant="secondary" onClick={closeModal}>{copy.buttons.cancel}</ActionButton>
                        <ActionButton type="button" variant="primary" onClick={createPromo}>{copy.buttons.createPromo}</ActionButton>
                      </div>
                    </> : null}
                    {modal.type === "createLauncher" ? <>
                      <div className="admin-page__form-grid">
                        <label className="admin-page__field"><span>{copy.fields.minecraftVersion}</span><select className="glass-select" value={launcherForm.minecraftVersion} onChange={e => setLauncherField("minecraftVersion", e.target.value)}>{MINECRAFT_VERSIONS.map(v => <option value={v} key={v}>{v}</option>)}</select></label>
                        <label className="admin-page__field"><span>{copy.fields.loaderType}</span><select className="glass-select" value={launcherForm.loaderType} onChange={e => setLauncherField("loaderType", e.target.value)}>{LOADER_TYPES.map(v => <option value={v} key={v}>{v}</option>)}</select></label>
                      </div>
                      <div className="admin-page__toggles">{[...STAFF_ROLES, ...ASSIGNABLE_EXTRA_ROLES].map(role => {
                        const isStaff = STAFF_ROLES.includes(role);
                        const isChecked = launcherForm.allowedRoles.includes(role);
                        return <label className="admin-page__toggle" key={role}><input type="checkbox" checked={isChecked} disabled={isStaff} onChange={() => {
                          if (!isStaff) setLauncherField("allowedRoles", sanitizeAllowedRoles(isChecked ? launcherForm.allowedRoles.filter(r => r !== role) : [...launcherForm.allowedRoles, role]));
                        }} /><span>{role}</span></label>;
                      })}</div>
                      <div className="admin-page__modal-actions">
                        <ActionButton type="button" variant="secondary" onClick={closeModal}>{copy.buttons.cancel}</ActionButton>
                        <ActionButton type="button" variant="primary" onClick={() => void createLauncher()}>{copy.buttons.createLauncher}</ActionButton>
                      </div>
                    </> : null}
                  </div>
                </div>
              </Modal>
            )}
          </BlurPanel>
        </Reveal>
      </div>
    </section>
  );
}
