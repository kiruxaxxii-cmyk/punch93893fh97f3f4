import { useCallback, useEffect, useState } from "react";
import { hasRole, isAdmin } from "../lib/theme.js";
import {
  apiConfig,
  errorMessage,
  apiSessions,
  apiActivateKey,
  apiChangePassword,
  apiTwoFactorSetup,
  apiTwoFactorConfirm,
  apiTwoFactorDisable,
  apiRevokeSession,
  apiRevokeAllSessions,
  apiUploadAvatar,
  apiDownloadLauncher
} from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { useLanguage } from "../lib/lang.jsx";
import { useNotice } from "../lib/notice.jsx";
import { ActionButton, BlurPanel, Modal, Reveal } from "../components/shared.jsx";
import { PROFILE_COPY, MODAL_BLUR_STYLE, hasActiveSubscription, formatSubscription, formatPlaytime } from "./profile/copy.js";
import {
  KeyIcon,
  LockIcon,
  TwoFactorIcon,
  MailIcon,
  IdIcon,
  HardwareIcon,
  RoleIcon,
  PromoIcon,
  CalendarIcon,
  SupportIcon,
  BanIcon,
  CopyIcon,
  AdminIcon,
  CloseIcon,
  QrIcon
} from "./profile/icons.jsx";

export default function ProfilePage() {
  const { user, signOut, refreshSession } = useAuth();
  const { locale } = useLanguage();
  const { pushNotice } = useNotice();

  const [modal, setModal] = useState("closed");
  const [busy, setBusy] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const copy = PROFILE_COPY[locale];
  const closeModal = useCallback(() => {
    setModal("closed");
  }, []);
  const [keyValue, setKeyValue] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(null);
  const [loaderBusy, setLoaderBusy] = useState(false);

  const loadSessions = useCallback(async () => {
    if (apiConfig.mode !== "live") {
      setSessions([]);
      setSessionsError(null);
      setSessionsLoading(false);
      return;
    }
    setSessionsLoading(true);
    setSessionsError(null);
    try {
      setSessions(await apiSessions());
    } catch (err) {
      setSessionsError(errorMessage(err, copy.status.sessionsLoadFailed));
    } finally {
      setSessionsLoading(false);
    }
  }, [copy.status]);

  useEffect(() => {
    if (modal === "avatar") {
      setAvatarUrl((user?.avatarUrl ?? "").trim());
    }
  }, [modal, user?.avatarUrl]);

  useEffect(() => {
    if (modal === "closed") {
      setTwoFactorCode("");
      setDisableCode("");
      setBackupCodes([]);
      setTwoFactorSetup(null);
    }
  }, [modal]);

  useEffect(() => {
    if (modal !== "twoFactor" || user?.twoFactorEnabled) {
      return;
    }
    let cancelled = false;
    setBusy(true);
    setBackupCodes([]);
    setTwoFactorCode("");
    apiTwoFactorSetup()
      .then((setup) => {
        if (!cancelled) {
          setTwoFactorSetup(setup);
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        pushNotice({
          tone: "error",
          title: locale === "ru" ? "Ошибка 2FA" : "2FA error",
          message: errorMessage(err, locale === "ru" ? "Не удалось подготовить 2FA." : "Unable to prepare 2FA.")
        });
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [locale, modal, pushNotice, user?.twoFactorEnabled]);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [loadSessions, user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const timer = window.setInterval(() => {
      refreshSession();
    }, 60000);
    return () => {
      window.clearInterval(timer);
    };
  }, [refreshSession, user]);

  const handleActivateKey = useCallback(async () => {
    const code = keyValue.trim();
    if (!code) {
      pushNotice({
        tone: "warning",
        title: locale === "ru" ? "Введите ключ" : "Enter a key",
        message: copy.status.enterKey
      });
      return;
    }
    setBusy(true);
    try {
      await apiActivateKey({ code });
      await refreshSession();
      setKeyValue("");
      pushNotice({
        tone: "success",
        title: locale === "ru" ? "Ключ активирован" : "Key activated",
        message: copy.status.keySubmitted(code)
      });
      await signOut();
    } catch (err) {
      pushNotice({
        tone: "error",
        title: locale === "ru" ? "Ошибка активации" : "Activation failed",
        message: errorMessage(err, locale === "ru" ? "Не удалось активировать ключ." : "Unable to activate the key.")
      });
    } finally {
      setBusy(false);
    }
  }, [copy.status, keyValue, locale, pushNotice, refreshSession, signOut]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      pushNotice({
        tone: "warning",
        title: locale === "ru" ? "Заполните поля" : "Fill all fields",
        message: copy.status.requiredFields
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      pushNotice({
        tone: "warning",
        title: locale === "ru" ? "Пароли не совпадают" : "Passwords do not match",
        message: copy.status.passwordMismatch
      });
      return;
    }
    if (newPassword.length < 8) {
      pushNotice({
        tone: "warning",
        title: locale === "ru" ? "Слабый пароль" : "Weak password",
        message: copy.status.passwordTooShort
      });
      return;
    }
    setBusy(true);
    try {
      await apiChangePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      pushNotice({
        tone: "success",
        title: locale === "ru" ? "Пароль обновлён" : "Password changed",
        message: copy.status.passwordChanged
      });
      window.setTimeout(closeModal, 900);
    } catch (err) {
      pushNotice({
        tone: "error",
        title: locale === "ru" ? "Ошибка смены пароля" : "Password change failed",
        message: errorMessage(err, locale === "ru" ? "Не удалось сменить пароль." : "Unable to change the password.")
      });
    } finally {
      setBusy(false);
    }
  }, [closeModal, confirmPassword, copy.status, currentPassword, locale, newPassword, pushNotice]);

  const handleConfirmTwoFactor = useCallback(async () => {
    if (!twoFactorCode.trim()) {
      pushNotice({
        tone: "warning",
        title: locale === "ru" ? "Нужен код" : "Code required",
        message: copy.status.enterAuthenticatorCode
      });
      return;
    }
    setBusy(true);
    try {
      const result = await apiTwoFactorConfirm({ code: twoFactorCode.trim() });
      await refreshSession();
      setTwoFactorCode("");
      setTwoFactorSetup(null);
      setBackupCodes(Array.isArray(result.backupCodes) ? result.backupCodes : []);
      pushNotice({
        tone: "success",
        title: locale === "ru" ? "2FA включена" : "2FA enabled",
        message: copy.status.twoFactorEnabled
      });
      if (!result.backupCodes?.length) {
        window.setTimeout(closeModal, 900);
      }
    } catch (err) {
      pushNotice({
        tone: "error",
        title: locale === "ru" ? "Ошибка 2FA" : "2FA confirmation failed",
        message: errorMessage(err, locale === "ru" ? "Не удалось подтвердить 2FA." : "Unable to confirm 2FA.")
      });
    } finally {
      setBusy(false);
    }
  }, [closeModal, copy.status, locale, pushNotice, refreshSession, twoFactorCode]);

  const handleDisableTwoFactor = useCallback(async () => {
    if (!disableCode.trim()) {
      pushNotice({
        tone: "warning",
        title: locale === "ru" ? "Нужен код" : "Code required",
        message: copy.status.enterDisableCode
      });
      return;
    }
    setBusy(true);
    try {
      await apiTwoFactorDisable({ code: disableCode.trim() });
      await refreshSession();
      setDisableCode("");
      pushNotice({
        tone: "success",
        title: locale === "ru" ? "2FA отключена" : "2FA disabled",
        message: copy.status.twoFactorDisabled
      });
      window.setTimeout(closeModal, 700);
    } catch (err) {
      pushNotice({
        tone: "error",
        title: locale === "ru" ? "Ошибка 2FA" : "2FA disable failed",
        message: errorMessage(err, locale === "ru" ? "Не удалось отключить 2FA." : "Unable to disable 2FA.")
      });
    } finally {
      setBusy(false);
    }
  }, [closeModal, copy.status, disableCode, locale, pushNotice, refreshSession]);

  const handleRevokeSession = useCallback(
    async (id) => {
      setBusy(true);
      try {
        await apiRevokeSession(id);
        await loadSessions();
        pushNotice({
          tone: "success",
          title: locale === "ru" ? "Сессия отозвана" : "Session revoked",
          message: copy.status.sessionRevoked
        });
      } catch (err) {
        pushNotice({
          tone: "error",
          title: locale === "ru" ? "Ошибка сессии" : "Session action failed",
          message: errorMessage(err, locale === "ru" ? "Не удалось отозвать сессию." : "Unable to revoke the session.")
        });
      } finally {
        setBusy(false);
      }
    },
    [copy.status, loadSessions, locale, pushNotice]
  );

  const handleRevokeOthers = useCallback(async () => {
    setBusy(true);
    try {
      await apiRevokeAllSessions();
      await loadSessions();
      pushNotice({
        tone: "success",
        title: locale === "ru" ? "Сессии отозваны" : "Sessions revoked",
        message: copy.status.otherSessionsRevoked
      });
    } catch (err) {
      pushNotice({
        tone: "error",
        title: locale === "ru" ? "Ошибка сессий" : "Session action failed",
        message: errorMessage(err, locale === "ru" ? "Не удалось отозвать сессии." : "Unable to revoke sessions.")
      });
    } finally {
      setBusy(false);
    }
  }, [copy.status, loadSessions, locale, pushNotice]);

  const handleSaveAvatar = useCallback(async () => {
    setBusy(true);
    try {
      await apiUploadAvatar({ avatarUrl: avatarUrl.trim() });
      await refreshSession();
      pushNotice({
        tone: "success",
        title: locale === "ru" ? "Аватар обновлён" : "Avatar updated",
        message: locale === "ru" ? "Изображение профиля сохранено." : "Profile image was saved."
      });
      window.setTimeout(closeModal, 900);
    } catch (err) {
      pushNotice({
        tone: "error",
        title: locale === "ru" ? "Ошибка аватара" : "Avatar update failed",
        message: errorMessage(err, locale === "ru" ? "Не удалось обновить аватар." : "Unable to update avatar.")
      });
    } finally {
      setBusy(false);
    }
  }, [avatarUrl, closeModal, locale, pushNotice, refreshSession]);

  const handleCopy = useCallback(
    async (label, value) => {
      try {
        await navigator.clipboard.writeText(value);
        pushNotice({
          tone: "info",
          title: locale === "ru" ? "Скопировано" : "Copied",
          message: label + ": " + value
        });
      } catch {
        pushNotice({
          tone: "warning",
          title: locale === "ru" ? "Не удалось скопировать" : "Copy failed",
          message: value
        });
      }
    },
    [locale, pushNotice]
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    pushNotice({
      tone: "info",
      title: locale === "ru" ? "Выход выполнен" : "Signed out",
      message: locale === "ru" ? "Сессия завершена." : "Your session has been closed."
    });
  }, [locale, pushNotice, signOut]);

  if (!user) {
    return null;
  }

  const subscriptionLabel = formatSubscription(user.subscriptionTill, copy);
  const subscriptionActive = !user.isBanned && (!!user.canDownloadLauncher || hasActiveSubscription(user.subscriptionTill));
  const canSeeSupport = !!user.isSystemOwner || !!hasRole(user.role, "Helper");
  const avatarSrc = (user.avatarUrl ?? "").trim();
  const initial = user.displayName.charAt(0).toUpperCase() || "N";
  const hasOtherSessions = sessions.some((session) => !session.current);

  const banValue = user.isBanned
    ? user.banPermanent
      ? `${copy.states.bannedLabel} · ${copy.states.bannedForever}`
      : user.bannedUntil
        ? `${copy.states.bannedLabel} · ${copy.states.bannedUntil} ${new Date(user.bannedUntil).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}`
        : copy.states.bannedLabel
    : copy.states.dash;

  const rows = [
    { label: copy.rows.email, value: user.email ?? copy.states.dash, Icon: MailIcon, copyable: !!user.email },
    { label: copy.rows.identifier, value: "#" + user.uid, Icon: IdIcon, copyable: true },
    { label: copy.rows.hardwareId, value: user.hardwareId ?? copy.states.dash, Icon: HardwareIcon },
    { label: copy.rows.role, value: user.role, Icon: RoleIcon },
    { label: copy.rows.playtime, value: formatPlaytime(user.playtimeSeconds, locale), Icon: CalendarIcon },
    { label: copy.rows.promoCode, value: user.promoCode ?? copy.states.dash, Icon: PromoIcon },
    { label: copy.rows.subscriptionTill, value: subscriptionLabel, Icon: CalendarIcon },
    { label: copy.rows.twoFactor, value: user.twoFactorEnabled ? copy.states.enabled : copy.states.disabled, Icon: TwoFactorIcon },
    { label: copy.rows.ban, value: banValue, Icon: BanIcon },
    { label: copy.rows.registerDate, value: user.createdAt ? new Date(user.createdAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-US") : copy.states.dash, Icon: CalendarIcon }
  ];

  const handleDownloadLoader = async () => {
    if (!subscriptionActive) {
      pushNotice({
        tone: "warning",
        title: locale === "ru" ? "Лоудер недоступен" : "Loader unavailable",
        message: copy.status.loaderUnavailable
      });
      return;
    }
    setLoaderBusy(true);
    try {
      await apiDownloadLauncher();
      pushNotice({
        tone: "success",
        title: locale === "ru" ? "Загрузка началась" : "Download started",
        message: copy.status.loaderStarted
      });
    } catch (err) {
      pushNotice({
        tone: "error",
        title: locale === "ru" ? "Ошибка загрузки" : "Download failed",
        message: errorMessage(err, copy.status.loaderUnavailable)
      });
    } finally {
      setLoaderBusy(false);
    }
  };

  const modalCopy =
    modal === "activateKey"
      ? copy.modal.activateKey
      : modal === "changePassword"
        ? copy.modal.changePassword
        : modal === "avatar"
          ? copy.modal.avatar
          : modal === "disableTwoFactor"
            ? copy.modal.disableTwoFactor
            : copy.modal.twoFactor;

  return (
    <section className="route-page profile-page">
      <div className="profile-page__stack">
        <Reveal as="section" className="profile-page__hero" delay={0}>
          <BlurPanel className="profile-page__hero-panel">
            <div className="profile-page__media-row">
              <button type="button" className="profile-page__avatar profile-page__avatar-button" onClick={() => setModal("avatar")}>
                {avatarSrc ? <img src={avatarSrc} alt={user.displayName} className="profile-page__avatar-image" /> : <span>{initial}</span>}
              </button>
              <div className="profile-page__banner" aria-hidden="true">
                <div className="profile-page__banner-glow" />
              </div>
            </div>
            <div className="profile-page__hero-meta">
              <p className="profile-page__name">
                {user.displayName} <span>[#{user.uid}]</span>
                {user.isBanned ? (
                  <span className="profile-page__ban-badge" title={user.banReason || undefined}>
                    {copy.states?.bannedLabel || "Забанен"}
                    {user.banPermanent
                      ? ` · ${copy.states?.bannedForever || "навсегда"}`
                      : user.bannedUntil
                        ? ` · ${copy.states?.bannedUntil || "до"} ${new Date(user.bannedUntil).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}`
                        : ""}
                  </span>
                ) : null}
              </p>
              <button type="button" className="profile-page__signout" onClick={handleSignOut}>
                {copy.signOut}
              </button>
            </div>
            <div className="profile-page__hero-rule" aria-hidden="true" />
            <div className="profile-page__actions">
              {isAdmin(user) ? (
                <ActionButton to="/admin" variant="primary" className="profile-page__action profile-page__action--admin">
                  <AdminIcon />
                  <span>{copy.actions.admin}</span>
                </ActionButton>
              ) : null}
              {canSeeSupport ? (
                <ActionButton to="/support-desk" variant="secondary" className="profile-page__action">
                  <SupportIcon />
                  <span>{copy.actions.supportDesk}</span>
                </ActionButton>
              ) : null}
              <ActionButton type="button" variant="secondary" className="profile-page__action" onClick={() => setModal("activateKey")}>
                <KeyIcon />
                <span>{copy.actions.activateKey}</span>
              </ActionButton>
              <ActionButton type="button" variant="secondary" className="profile-page__action" onClick={() => setModal("changePassword")}>
                <LockIcon />
                <span>{copy.actions.changePassword}</span>
              </ActionButton>
              <ActionButton
                type="button"
                variant="secondary"
                className="profile-page__action"
                onClick={() => setModal(user.twoFactorEnabled ? "disableTwoFactor" : "twoFactor")}
              >
                <TwoFactorIcon />
                <span>{user.twoFactorEnabled ? copy.actions.disableTwoFactor : copy.actions.twoFactor}</span>
              </ActionButton>
              <ActionButton type="button" variant="secondary" className="profile-page__action" onClick={() => setModal("avatar")}>
                <IdIcon />
                <span>{copy.actions.avatar}</span>
              </ActionButton>
            </div>
          </BlurPanel>
        </Reveal>
        <Reveal as="section" className="profile-page__details" delay={60}>
          <BlurPanel className="profile-page__details-panel">
            {rows.map(({ label, value, Icon, copyable }) => (
              <div className="profile-page__detail-row" key={label}>
                <div className="profile-page__detail-label">
                  <Icon />
                  <p>{label}:</p>
                </div>
                <div className="profile-page__detail-value">
                  {copyable ? (
                    <button type="button" className="profile-page__copy" aria-label={copy.status.copy(label)} onClick={() => handleCopy(label, value)}>
                      <CopyIcon />
                    </button>
                  ) : null}
                  <span>{value}</span>
                </div>
              </div>
            ))}
            {subscriptionActive ? (
              <div className="profile-page__details-actions">
                <button type="button" className="profile-page__text-link" onClick={() => void handleDownloadLoader()} disabled={loaderBusy}>
                  {loaderBusy
                    ? locale === "ru"
                      ? "Скачивание…"
                      : "Downloading…"
                    : copy.actions.downloadLoader}
                </button>
              </div>
            ) : null}
          </BlurPanel>
        </Reveal>
        <Reveal as="section" className="profile-page__section" delay={90}>
          <BlurPanel className="profile-page__section-panel">
            <div className="profile-page__section-head">
              <div>
                <p className="profile-page__section-title">{copy.sections.sessionsTitle}</p>
                <p className="profile-page__section-subtitle">{copy.sections.sessionsSubtitle}</p>
              </div>
              <button type="button" className="profile-page__text-link" onClick={() => void loadSessions()} disabled={sessionsLoading}>
                {copy.sections.reload}
              </button>
            </div>
            {sessionsError ? <p className="profile-page__section-error">{sessionsError}</p> : null}
            <div className="profile-page__compact-list">
              {sessionsLoading ? (
                <p className="profile-page__empty-state">{copy.sections.loading}</p>
              ) : sessions.length === 0 ? (
                <p className="profile-page__empty-state">{copy.sections.noSessions}</p>
              ) : (
                sessions.map((session) => (
                  <div className="profile-page__compact-row profile-page__session-row" key={session.id}>
                    <div className="profile-page__compact-main">
                      <div className="profile-page__compact-title">
                        <span className="profile-page__session-agent" title={session.userAgent ?? copy.states.dash}>
                          {session.userAgent ?? copy.states.dash}
                        </span>
                        {session.current ? <span className="profile-page__pill">{copy.sections.currentSession}</span> : null}
                      </div>
                      <div className="profile-page__compact-meta">
                        <span className="profile-page__mono profile-page__session-id" title={session.id}>
                          {session.id}
                        </span>
                        <span>
                          {copy.sections.ip}: {session.ipAddress ?? copy.states.dash}
                        </span>
                        <span>
                          {copy.sections.lastUsed}: {session.lastUsedAt ?? session.createdAt}
                        </span>
                        <span>
                          {copy.sections.expires}: {session.expiresAt}
                        </span>
                      </div>
                    </div>
                    {session.current ? null : (
                      <button
                        type="button"
                        className="profile-page__text-link profile-page__session-action"
                        onClick={() => void handleRevokeSession(session.id)}
                        disabled={busy}
                      >
                        {copy.sections.revokeSession}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            {hasOtherSessions ? (
              <div className="profile-page__details-actions">
                <button type="button" className="profile-page__text-link" onClick={() => void handleRevokeOthers()} disabled={busy}>
                  {copy.sections.revokeOthers}
                </button>
              </div>
            ) : null}
          </BlurPanel>
        </Reveal>
      </div>
      {modal !== "closed" && (
        <Modal onClose={closeModal} ariaLabelledBy="profile-modal-title">
          <div className="profile-page__modal blur-panel" style={MODAL_BLUR_STYLE}>
            <div className="profile-page__modal-head">
              <div>
                <p id="profile-modal-title" className="profile-page__modal-title">
                  {modalCopy.title}
                </p>
                <p className="profile-page__modal-subtitle">{modalCopy.subtitle}</p>
              </div>
              <button type="button" className="profile-page__modal-close" onClick={closeModal} aria-label={copy.modal.close}>
                <CloseIcon />
              </button>
            </div>
            <div className="profile-page__modal-body">
              {modal === "activateKey" && (
                <>
                  <div className="profile-page__form-grid">
                    <div className="profile-page__field profile-page__field--wide">
                      <span>{copy.modal.activateKey.field}</span>
                      <div className="profile-page__input-wrapper">
                        <span className="profile-page__input-icon">
                          <KeyIcon />
                        </span>
                        <input
                          className="glass-input profile-page__input"
                          value={keyValue}
                          onChange={(event) => setKeyValue(event.target.value)}
                          placeholder={copy.modal.activateKey.placeholder}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="profile-page__modal-actions">
                    <ActionButton type="button" variant="primary" onClick={handleActivateKey}>
                      {busy ? "..." : null}
                      {copy.modal.activateKey.confirm}
                    </ActionButton>
                  </div>
                </>
              )}
              {modal === "changePassword" && (
                <>
                  <div className="profile-page__form-grid">
                    <div className="profile-page__field profile-page__field--wide">
                      <span>{copy.modal.changePassword.currentPassword}</span>
                      <div className="profile-page__input-wrapper">
                        <span className="profile-page__input-icon">
                          <LockIcon />
                        </span>
                        <input
                          className="glass-input profile-page__input"
                          type="password"
                          value={currentPassword}
                          onChange={(event) => setCurrentPassword(event.target.value)}
                          placeholder={copy.modal.changePassword.currentPlaceholder}
                        />
                      </div>
                    </div>
                    <div className="profile-page__field profile-page__field--wide">
                      <span>{copy.modal.changePassword.newPassword}</span>
                      <div className="profile-page__input-wrapper">
                        <span className="profile-page__input-icon">
                          <LockIcon />
                        </span>
                        <input
                          className="glass-input profile-page__input"
                          type="password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          placeholder={copy.modal.changePassword.newPlaceholder}
                        />
                      </div>
                    </div>
                    <div className="profile-page__field profile-page__field--wide">
                      <span>{copy.modal.changePassword.confirmPassword}</span>
                      <div className="profile-page__input-wrapper">
                        <span className="profile-page__input-icon">
                          <LockIcon />
                        </span>
                        <input
                          className="glass-input profile-page__input"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          placeholder={copy.modal.changePassword.confirmPlaceholder}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="profile-page__modal-actions">
                    <ActionButton type="button" variant="primary" onClick={handleChangePassword}>
                      {busy ? "..." : null}
                      {copy.modal.changePassword.confirm}
                    </ActionButton>
                  </div>
                </>
              )}
              {modal === "twoFactor" && (
                <>
                  {backupCodes.length > 0 ? (
                    <>
                      <div className="profile-page__backup-block">
                        <p className="profile-page__backup-title">{copy.modal.twoFactor.backupCodesTitle}</p>
                        <p className="profile-page__backup-subtitle">{copy.modal.twoFactor.backupCodesSubtitle}</p>
                        <div className="profile-page__backup-grid">
                          {backupCodes.map((code) => (
                            <button
                              type="button"
                              className="profile-page__backup-code"
                              onClick={() => void handleCopy(copy.modal.twoFactor.backupCodesTitle, code)}
                              key={code}
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="profile-page__modal-actions">
                        <ActionButton type="button" variant="primary" onClick={closeModal}>
                          {copy.modal.close}
                        </ActionButton>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="profile-page__form-grid">
                        <div className="profile-page__field profile-page__field--wide profile-page__field--centered">
                          <div className="profile-page__qr-placeholder">
                            {twoFactorSetup?.qrCodeDataUrl ? (
                              <img className="profile-page__qr-image" src={twoFactorSetup.qrCodeDataUrl} alt={copy.modal.twoFactor.qr} />
                            ) : (
                              <>
                                <QrIcon />
                                <span>{copy.modal.twoFactor.qr}</span>
                              </>
                            )}
                          </div>
                          <span className="profile-page__secret-label">
                            {copy.modal.twoFactor.secret}: <code>{twoFactorSetup?.secret ?? "..."}</code>
                          </span>
                        </div>
                        <div className="profile-page__field profile-page__field--wide">
                          <span>{copy.modal.twoFactor.verificationCode}</span>
                          <div className="profile-page__input-wrapper">
                            <span className="profile-page__input-icon">
                              <TwoFactorIcon />
                            </span>
                            <input
                              className="glass-input profile-page__input"
                              value={twoFactorCode}
                              onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder={copy.modal.twoFactor.placeholder}
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="profile-page__modal-actions">
                        <ActionButton type="button" variant="primary" onClick={handleConfirmTwoFactor} disabled={busy || !twoFactorSetup}>
                          {busy ? "..." : null}
                          {copy.modal.twoFactor.confirm}
                        </ActionButton>
                      </div>
                    </>
                  )}
                </>
              )}
              {modal === "disableTwoFactor" && (
                <>
                  <div className="profile-page__form-grid">
                    <div className="profile-page__field profile-page__field--wide">
                      <span>{copy.modal.disableTwoFactor.verificationCode}</span>
                      <div className="profile-page__input-wrapper">
                        <span className="profile-page__input-icon">
                          <TwoFactorIcon />
                        </span>
                        <input
                          className="glass-input profile-page__input"
                          value={disableCode}
                          onChange={(event) => setDisableCode(event.target.value.trim().slice(0, 24))}
                          placeholder={copy.modal.disableTwoFactor.placeholder}
                          autoComplete="one-time-code"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="profile-page__modal-actions">
                    <ActionButton type="button" variant="primary" onClick={handleDisableTwoFactor} disabled={busy}>
                      {busy ? "..." : null}
                      {copy.modal.disableTwoFactor.confirm}
                    </ActionButton>
                  </div>
                </>
              )}
              {modal === "avatar" && (
                <>
                  <div className="profile-page__form-grid">
                    <div className="profile-page__field profile-page__field--wide">
                      <span>{copy.modal.avatar.field}</span>
                      <div className="profile-page__input-wrapper">
                        <span className="profile-page__input-icon">
                          <IdIcon />
                        </span>
                        <input
                          className="glass-input profile-page__input"
                          value={avatarUrl}
                          onChange={(event) => setAvatarUrl(event.target.value)}
                          placeholder={copy.modal.avatar.placeholder}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="profile-page__modal-actions">
                    <ActionButton type="button" variant="primary" onClick={handleSaveAvatar} disabled={busy}>
                      {busy ? "..." : null}
                      {copy.modal.avatar.confirm}
                    </ActionButton>
                  </div>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
