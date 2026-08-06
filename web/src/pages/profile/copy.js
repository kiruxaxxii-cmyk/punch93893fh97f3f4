import { formatDateTime } from "../../lib/format.js";

const STATUS_EN = {
  enterKey: "Please enter a key.",
  keySubmitted: (r1) => "Key " + r1 + " submitted for activation.",
  requiredFields: "All fields are required.",
  passwordMismatch: "New passwords do not match.",
  passwordTooShort: "Password must be at least 8 characters.",
  passwordChanged: "Password changed successfully.",
  enterAuthenticatorCode: "Enter the code from your authenticator app.",
  twoFactorEnabled: "Two-factor authentication enabled.",
  enterDisableCode: "Enter the current 2FA code.",
  twoFactorDisabled: "Two-factor authentication disabled.",
  sessionRevoked: "Session revoked.",
  otherSessionsRevoked: "Other sessions revoked.",
  sessionsLoadFailed: "Unable to load sessions.",
  loaderUnavailable: "Loader download is temporarily unavailable. Contact support.",
  loaderStarted: "The loader download was opened in a new tab.",
  copy: (r1) => "Copy " + r1
};

const STATUS_RU = {
  enterKey: "Введите ключ.",
  keySubmitted: (r1) => "Ключ " + r1 + " отправлен на активацию.",
  requiredFields: "Заполните все поля.",
  passwordMismatch: "Новые пароли не совпадают.",
  passwordTooShort: "Пароль должен содержать минимум 8 символов.",
  passwordChanged: "Пароль успешно изменён.",
  enterAuthenticatorCode: "Введите код из приложения-аутентификатора.",
  twoFactorEnabled: "Двухфакторная защита включена.",
  enterDisableCode: "Введите текущий 2FA-код.",
  twoFactorDisabled: "Двухфакторная защита отключена.",
  sessionRevoked: "Сессия отозвана.",
  otherSessionsRevoked: "Остальные сессии отозваны.",
  sessionsLoadFailed: "Не удалось загрузить сессии.",
  loaderUnavailable: "Скачивание лоудера временно недоступно. Обратитесь в поддержку.",
  loaderStarted: "Загрузка лоудера открыта в новой вкладке.",
  copy: (r1) => "Скопировать " + r1
};

export const PROFILE_COPY = {
  en: {
    signOut: "Sign Out",
    actions: {
      admin: "Admin",
      supportDesk: "Support",
      avatar: "Change avatar",
      activateKey: "Activate key",
      changePassword: "Change password",
      twoFactor: "2fa enable",
      disableTwoFactor: "Disable 2FA",
      downloadLoader: "Download loader"
    },
    rows: {
      email: "User email",
      identifier: "User ID",
      hardwareId: "Hardware ID",
      role: "Role",
      playtime: "Playtime",
      promoCode: "Promocode",
      subscriptionTill: "Subscription till",
      twoFactor: "Two-factor authentication",
      ban: "Ban",
      registerDate: "Register date"
    },
    states: {
      enabled: "enabled",
      disabled: "disabled",
      active: "active",
      expired: "expired",
      lifetime: "lifetime",
      dash: "-",
      bannedLabel: "Banned",
      bannedForever: "forever",
      bannedUntil: "until"
    },
    sections: {
      sessionsTitle: "Active sessions",
      sessionsSubtitle: "Browser sessions tied to this account.",
      currentSession: "current",
      noSessions: "No active sessions yet.",
      loading: "Loading...",
      reload: "Refresh",
      revokeSession: "Revoke",
      revokeOthers: "Revoke other sessions",
      lastUsed: "Last used",
      expires: "Expires",
      ip: "IP"
    },
    modal: {
      activateKey: {
        title: "Activate key",
        subtitle: "Enter your license key to activate subscription.",
        field: "License key",
        placeholder: "XXXX-XXXX-XXXX-XXXX",
        confirm: "Activate"
      },
      changePassword: {
        title: "Change password",
        subtitle: "Update your account password.",
        currentPassword: "Current password",
        newPassword: "New password",
        confirmPassword: "Confirm new password",
        currentPlaceholder: "Enter current password",
        newPlaceholder: "Enter new password",
        confirmPlaceholder: "Repeat new password",
        confirm: "Save changes"
      },
      twoFactor: {
        title: "Enable two-factor authentication",
        subtitle: "Scan the QR code and enter the verification code.",
        qr: "QR code for authenticator app",
        secret: "Secret",
        verificationCode: "Verification code",
        placeholder: "000000",
        confirm: "Enable 2FA",
        backupCodesTitle: "Backup codes",
        backupCodesSubtitle: "Save these codes now. Each code can be used once if the authenticator app is unavailable."
      },
      disableTwoFactor: {
        title: "Disable two-factor authentication",
        subtitle: "Enter the current 2FA code or a backup code.",
        verificationCode: "2FA or backup code",
        placeholder: "000000",
        confirm: "Disable 2FA"
      },
      avatar: {
        title: "Update avatar",
        subtitle: "Paste a direct image URL. Leave empty to reset to letter avatar.",
        field: "Image URL",
        placeholder: "https://example.com/avatar.png",
        confirm: "Save avatar"
      },
      cancel: "Cancel",
      close: "Close"
    },
    status: STATUS_EN
  },
  ru: {
    signOut: "Выйти",
    actions: {
      admin: "Админ",
      supportDesk: "Техподдержка",
      avatar: "Сменить аватар",
      activateKey: "Активировать ключ",
      changePassword: "Сменить пароль",
      twoFactor: "Включить 2FA",
      disableTwoFactor: "Отключить 2FA",
      downloadLoader: "Скачать лоудер"
    },
    rows: {
      email: "Почта",
      identifier: "ID",
      hardwareId: "HWID",
      role: "Роль",
      playtime: "Наигранное время",
      promoCode: "Промокод",
      subscriptionTill: "Подписка до",
      twoFactor: "Двухфакторная защита",
      ban: "Бан",
      registerDate: "Дата регистрации"
    },
    states: {
      enabled: "включена",
      disabled: "выключена",
      active: "активен",
      expired: "истекла",
      lifetime: "навсегда",
      dash: "-",
      bannedLabel: "Забанен",
      bannedForever: "навсегда",
      bannedUntil: "до"
    },
    sections: {
      sessionsTitle: "Активные сессии",
      sessionsSubtitle: "Браузерные сессии этого аккаунта.",
      currentSession: "текущая",
      noSessions: "Активных сессий пока нет.",
      loading: "Загрузка...",
      reload: "Обновить",
      revokeSession: "Отозвать",
      revokeOthers: "Отозвать остальные сессии",
      lastUsed: "Последнее использование",
      expires: "Истекает",
      ip: "IP"
    },
    modal: {
      activateKey: {
        title: "Активация ключа",
        subtitle: "Введите лицензионный ключ для активации подписки.",
        field: "Лицензионный ключ",
        placeholder: "XXXX-XXXX-XXXX-XXXX",
        confirm: "Активировать"
      },
      changePassword: {
        title: "Смена пароля",
        subtitle: "Обновите пароль аккаунта.",
        currentPassword: "Текущий пароль",
        newPassword: "Новый пароль",
        confirmPassword: "Подтвердите пароль",
        currentPlaceholder: "Введите текущий пароль",
        newPlaceholder: "Введите новый пароль",
        confirmPlaceholder: "Повторите новый пароль",
        confirm: "Сохранить"
      },
      twoFactor: {
        title: "Включение двухфакторной защиты",
        subtitle: "Отсканируйте QR-код и введите код подтверждения.",
        qr: "QR-код для приложения-аутентификатора",
        secret: "Секрет",
        verificationCode: "Код подтверждения",
        placeholder: "000000",
        confirm: "Включить 2FA",
        backupCodesTitle: "Резервные коды",
        backupCodesSubtitle: "Сохраните эти коды сейчас. Каждый код можно использовать один раз, если приложение-аутентификатор недоступно."
      },
      disableTwoFactor: {
        title: "Отключение двухфакторной защиты",
        subtitle: "Введите текущий 2FA-код или резервный код.",
        verificationCode: "2FA или резервный код",
        placeholder: "000000",
        confirm: "Отключить 2FA"
      },
      avatar: {
        title: "Обновить аватар",
        subtitle: "Вставьте прямую ссылку на изображение. Оставьте пустым для сброса к буквенной аватарке.",
        field: "Ссылка на изображение",
        placeholder: "https://example.com/avatar.png",
        confirm: "Сохранить аватар"
      },
      cancel: "Отмена",
      close: "Закрыть"
    },
    status: STATUS_RU
  }
};

export const MODAL_BLUR_STYLE = {
  backdropFilter: "blur(24px) saturate(1.04)",
  WebkitBackdropFilter: "blur(24px) saturate(1.04)"
};

export function parseMskDate(r1) {
  let r6 = String(r1 ?? "").trim();
  if (!r6) return null;
  let r7 = r6.match(/^(\d{2})\.(\d{2})\.(\d{4})(?:[\sT](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (r7) {
    let [, rk, rV, rI, rL = "00", rz = "00"] = r7;
    let rC = Number(rk);
    let rP = Number(rV);
    let rp = Number(rI);
    let rj = Number(rL);
    let rM = Number(rz);
    let rW = new Date(Date.UTC(rp, rP - 1, rC, rj - 3, rM));
    let rA = new Date(rW.getTime() + 10800000);
    if (
      Number.isNaN(rW.getTime()) ||
      rA.getUTCFullYear() !== rp ||
      rA.getUTCMonth() !== rP - 1 ||
      rA.getUTCDate() !== rC ||
      rA.getUTCHours() !== rj ||
      rA.getUTCMinutes() !== rM
    ) {
      return null;
    }
    return rW;
  }
  let r8 = r6.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (r8) {
    let [, r9, rN, rB, rX = "00", rU = "00"] = r8;
    return parseMskDate(rB + "." + rN + "." + r9 + " " + rX + ":" + rU);
  }
  const parsed = Date.parse(r6);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

export function hasActiveSubscription(r5) {
  let r8 = ("" + (r5 ?? "")).trim();
  if (!r8) {
    return false;
  }
  if (r8.toLowerCase() === "lifetime") {
    return true;
  }
  let r9 = parseMskDate(r8);
  if (r9) {
    return r9.getTime() >= Date.now();
  }
  return false;
}

export function formatSubscription(r1, r5) {
  let r7 = ("" + (r1 ?? "")).trim();
  if (!r7) {
    return r5.states.dash;
  }
  if (r7.toLowerCase() === "lifetime") {
    return r5.states.lifetime;
  }
  let r8 = formatDateTime(r7);
  let r9 = parseMskDate(r7);
  if (r9 && r9.getTime() < Date.now()) {
    return r8 + " · " + r5.states.expired;
  }
  return r8;
}

export function formatPlaytime(r5, r6) {
  let r9 = Math.floor(Math.max(0, Math.floor(r5)) / 60);
  let rN = r9 % 60;
  let rB = Math.floor(r9 / 60);
  let rX = rB % 24;
  let rU = Math.floor(rB / 24);
  if (r6 === "ru") {
    return rU + " д " + rX + " ч " + rN + " мин";
  }
  return rU + "d " + rX + "h " + rN + "m";
}
