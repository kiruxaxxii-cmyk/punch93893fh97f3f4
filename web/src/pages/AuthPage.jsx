import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { theme } from "../lib/theme.js";
import { apiConfig, apiLoaderHandoff, errorMessage } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { useLanguage } from "../lib/lang.jsx";
import { useNotice } from "../lib/notice.jsx";
import { ActionButton, BlurPanel, Reveal, RouteIntro } from "../components/shared.jsx";
import Yacaptcha from "../components/Yacaptcha.jsx";

const AUTH_COPY = {
  en: {
    signIn: "Sign In",
    signUp: "Sign Up",
    signInDescription: "Sign in with your email or username to manage your account and products.",
    signUpDescription: "Create an account to access your profile and purchases.",
    loginPlaceholder: "enter your email or username",
    usernamePlaceholder: "enter your username",
    emailPlaceholder: "enter your email",
    passwordPlaceholder: "enter any password",
    loginLabel: "Email or username",
    usernameLabel: "Username",
    emailLabel: "Email",
    passwordLabel: "Password",
    signInNote: "Use your email or username to continue.",
    signUpNote: "Fill in your details to create a new account.",
    noAccount: "Not with us yet?",
    hasAccount: "Already with us?",
    register: "Register!"
  },
  ru: {
    signIn: "Вход",
    signUp: "Регистрация",
    signInDescription: "Войдите по почте или логину, чтобы управлять аккаунтом и продуктами.",
    signUpDescription: "Создайте аккаунт для доступа к профилю и покупкам.",
    loginPlaceholder: "введите почту или логин",
    usernamePlaceholder: "введите ваш ник",
    emailPlaceholder: "введите вашу почту",
    passwordPlaceholder: "введите любой пароль",
    loginLabel: "Почта или логин",
    usernameLabel: "Имя пользователя",
    emailLabel: "Почта",
    passwordLabel: "Пароль",
    signInNote: "Используйте почту или логин аккаунта для входа.",
    signUpNote: "Заполните данные, чтобы создать новый аккаунт.",
    noAccount: "Ещё не с нами?",
    hasAccount: "Уже есть аккаунт?",
    register: "Зарегистрироваться!"
  }
};

function stripControlChars(value) {
  return value.replace(/[\u0000-\u001F\u007F]/g, "");
}

function authErrorMessage(error, locale) {
  const key = error?.trim().toLowerCase() ?? "";
  if (key.startsWith("account is banned:")) {
    const idx = error?.indexOf(":") ?? -1;
    const reason = idx >= 0 ? error?.slice(idx + 1).trim() : "";
    if (reason) {
      return locale === "ru" ? "Аккаунт заблокирован: " + reason : "This account is banned: " + reason;
    }
  }
  switch (key) {
    case "invalid credentials":
      return locale === "ru" ? "Неверный логин или пароль." : "Invalid login or password.";
    case "identifier and password are required":
      return locale === "ru" ? "Введите почту или логин и пароль." : "Email or username and password are required.";
    case "reserved owner email cannot be registered":
      return locale === "ru" ? "Почта owner зарезервирована и недоступна для регистрации." : "Owner email is reserved and cannot be registered.";
    case "user with this email already exists":
      return locale === "ru" ? "Пользователь с такой почтой уже существует." : "A user with this email already exists.";
    case "user with this display name already exists":
      return locale === "ru" ? "Пользователь с таким логином уже существует." : "A user with this username already exists.";
    case "email is invalid":
      return locale === "ru" ? "Почта указана в неверном формате." : "Email format is invalid.";
    case "email must not exceed 120 characters":
      return locale === "ru" ? "Почта не должна быть длиннее 120 символов." : "Email must not exceed 120 characters.";
    case "display name must contain at least 2 characters":
      return locale === "ru" ? "Имя пользователя слишком короткое." : "Username is too short.";
    case "display name must use only latin letters, numbers, dot, underscore, or hyphen":
      return locale === "ru"
        ? "Имя пользователя может содержать только латиницу, цифры, точку, подчёркивание и дефис."
        : "Username may contain only latin letters, numbers, dots, underscores, and hyphens.";
    case "password must contain at least 6 characters":
      return locale === "ru" ? "Пароль должен содержать минимум 6 символов." : "Password must contain at least 6 characters.";
    case "password must contain at least 8 characters":
      return locale === "ru" ? "Пароль должен содержать минимум 8 символов." : "Password must contain at least 8 characters.";
    case "password must use only printable latin characters without spaces":
      return locale === "ru"
        ? "Пароль может содержать только латиницу, цифры и символы без пробелов."
        : "Password may contain only printable latin characters without spaces.";
    case "account is banned":
      return locale === "ru" ? "Аккаунт заблокирован." : "This account is banned.";
    case "two-factor code is required":
      return locale === "ru"
        ? "Для этого аккаунта нужен код двухфакторной авторизации."
        : "A two-factor authentication code is required for this account.";
    case "invalid two-factor code":
      return locale === "ru" ? "Код двухфакторной авторизации неверный." : "Two-factor authentication code is invalid.";
    case "hardware id is required":
      return locale === "ru" ? "HWID не был получен от лоадера." : "The loader did not provide a hardware ID.";
    case "hardware id format is invalid":
      return locale === "ru" ? "HWID передан в неверном формате." : "Hardware ID format is invalid.";
    case "subscription is inactive":
      return locale === "ru" ? "У аккаунта нет активной подписки." : "This account does not have an active subscription.";
    case "hardware id is bound to another device":
      return locale === "ru" ? "Аккаунт привязан к другому устройству." : "This account is bound to another device.";
    case "loader access is denied":
      return locale === "ru" ? "Доступ к лоадеру запрещён." : "Loader access is denied.";
    case "rate limit exceeded":
      return locale === "ru" ? "Слишком много попыток. Повторите чуть позже." : "Too many attempts. Try again a little later.";
    case "captcha verification failed":
      return locale === "ru" ? "Проверка Yacaptcha не пройдена. Попробуйте ещё раз." : "Yacaptcha verification failed. Please try again.";
    case "eyeglass error":
      return "Eyeglass error";
    default:
      return error?.trim() || (locale === "ru" ? "Не удалось выполнить запрос авторизации." : "Authentication request failed.");
  }
}

function UserIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 21A8 8 0 0 0 4 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 7L13.009 12.727A2 2 0 0 1 11 12.727L2 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11V8A5 5 0 0 1 17 8V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C7.5 20.35 4 16.2 4 11.4V5.5L12 2L20 5.5V11.4C20 16.2 16.5 20.35 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12L11 14L15 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AuthPage({ mode }) {
  const { isAuthReady, isAuthenticated, signIn, signUp } = useAuth();
  const { locale } = useLanguage();
  const { pushNotice } = useNotice();
  const location = useLocation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [oneTimeCode, setOneTimeCode] = useState("");
  const [require2fa, setRequire2fa] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaFailed, setCaptchaFailed] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const captchaEnabled = true;
  const loaderSession = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("loader");
    return raw && raw.length >= 8 ? raw : "";
  }, [location.search]);
  const from = useMemo(() => location.state?.from ?? "/profile", [location.state]);
  const isSignIn = mode === "sign-in";
  const stubNote =
    apiConfig.mode === "stub"
      ? locale === "ru"
        ? "Сейчас включён локальный stub-режим без backend API."
        : "Local stub mode is active right now without the backend API."
      : null;
  const copy = AUTH_COPY[locale];
  const title = isSignIn ? copy.signIn : copy.signUp;
  const description = isSignIn ? copy.signInDescription : copy.signUpDescription;
  const canSubmit = isSignIn
    ? identifier.trim().length > 0 &&
      password.trim().length > 0 &&
      (!require2fa || oneTimeCode.trim().length === 6) &&
      (!captchaEnabled || captchaToken.trim().length > 0)
    : displayName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.trim().length > 0 &&
      (!captchaEnabled || captchaToken.trim().length > 0);

  useEffect(() => {
    setOneTimeCode("");
    setRequire2fa(false);
  }, [identifier, mode, password]);

  const resetCaptcha = () => {
    setCaptchaToken("");
    setCaptchaFailed(false);
    setCaptchaKey((k) => k + 1);
  };

  if (apiConfig.mode === "live" && !isAuthReady) {
    return null;
  }
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }
  return (
    <section className="route-page route-page--centered auth-page" style={theme.sectionColorVars}>
      <div className="auth-page__layout">
        <Reveal delay={0}>
          <RouteIntro badgeLabel={title} badgeIcon={<UserIcon />} title={title} description={description} titleAs="h1" />
        </Reveal>
        <BlurPanel as="section" className="auth-page__panel" delay={100}>
          <form
            className="auth-page__form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!canSubmit) {
                return;
              }
              const result = await (isSignIn
                ? signIn({
                    identifier,
                    password,
                    oneTimeCode: oneTimeCode.trim() || undefined,
                    captchaToken
                  })
                : signUp({
                    displayName,
                    email,
                    password,
                    captchaToken
                  }));
              if (!result.ok) {
                resetCaptcha();
                const key = result.error?.trim().toLowerCase() ?? "";
                if (isSignIn && (key === "two-factor code is required" || key === "invalid two-factor code")) {
                  setRequire2fa(true);
                  setOneTimeCode("");
                }
                pushNotice({
                  tone: "error",
                  title: locale === "ru" ? "Ошибка авторизации" : "Authentication error",
                  message: authErrorMessage(result.error, locale)
                });
                return;
              }
              if (loaderSession) {
                try {
                  await apiLoaderHandoff(loaderSession);
                  pushNotice({
                    tone: "success",
                    title: locale === "ru" ? "Лоудер подключён" : "Loader connected",
                    message:
                      locale === "ru"
                        ? "Сессия передана в Punch Loader. Можно вернуться в лаунчер."
                        : "Session was sent to Punch Loader. You can return to the launcher."
                  });
                } catch (err) {
                  pushNotice({
                    tone: "warning",
                    title: locale === "ru" ? "Лоудер" : "Loader",
                    message: errorMessage(
                      err,
                      locale === "ru" ? "Не удалось передать сессию в лоудер." : "Could not hand off session to the loader."
                    )
                  });
                }
              }
              if (result.nextStep === "sign-in") {
                resetCaptcha();
                pushNotice({
                  tone: "success",
                  title: locale === "ru" ? "Запрос принят" : "Request accepted",
                  message:
                    locale === "ru"
                      ? "Если эта почта доступна для регистрации, аккаунт подготовлен. Теперь выполните вход."
                      : "If this email can be registered, the account is ready. Sign in to continue."
                });
                setIdentifier(email.trim());
                setPassword("");
                navigate("/sign-in", { replace: true, state: { from } });
                return;
              }
              pushNotice({
                tone: "success",
                title: locale === "ru" ? "Вход выполнен" : "Signed in successfully",
                message:
                  locale === "ru"
                    ? "Сессия активна. Выполняется переход в профиль."
                    : "Session is active. Redirecting to your profile."
              });
              setRequire2fa(false);
              setOneTimeCode("");
              navigate(from, { replace: true });
            }}
          >
            {isSignIn ? (
              <label className="auth-page__field auth-page__field--minimal">
                <span className="auth-page__field-icon" aria-hidden="true">
                  <UserIcon />
                </span>
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(stripControlChars(event.target.value))}
                  className="glass-input auth-page__input"
                  placeholder={copy.loginPlaceholder}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-label={copy.loginLabel}
                />
              </label>
            ) : (
              <>
                <label className="auth-page__field auth-page__field--minimal">
                  <span className="auth-page__field-icon" aria-hidden="true">
                    <UserIcon />
                  </span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="glass-input auth-page__input"
                    placeholder={copy.usernamePlaceholder}
                    autoComplete="name"
                    aria-label={copy.usernameLabel}
                  />
                </label>
                <label className="auth-page__field auth-page__field--minimal">
                  <span className="auth-page__field-icon" aria-hidden="true">
                    <MailIcon />
                  </span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    className="glass-input auth-page__input"
                    placeholder={copy.emailPlaceholder}
                    autoComplete="email"
                    aria-label={copy.emailLabel}
                  />
                </label>
              </>
            )}
            <label className="auth-page__field auth-page__field--minimal">
              <span className="auth-page__field-icon" aria-hidden="true">
                <LockIcon />
              </span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="glass-input auth-page__input"
                placeholder={copy.passwordPlaceholder}
                autoComplete={isSignIn ? "current-password" : "new-password"}
                aria-label={copy.passwordLabel}
              />
            </label>
            {isSignIn && require2fa ? (
              <label className="auth-page__field auth-page__field--minimal">
                <span className="auth-page__field-icon" aria-hidden="true">
                  <ShieldIcon />
                </span>
                <input
                  value={oneTimeCode}
                  onChange={(event) => setOneTimeCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="glass-input auth-page__input"
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label="2FA"
                  maxLength={6}
                />
              </label>
            ) : null}
            {captchaEnabled ? (
              <Yacaptcha
                key={captchaKey}
                locale={locale}
                onToken={(token) => {
                  setCaptchaToken(token || "");
                  setCaptchaFailed(false);
                }}
                onError={() => {
                  setCaptchaToken("");
                  setCaptchaFailed(true);
                }}
              />
            ) : null}
            {captchaEnabled && captchaFailed ? (
              <p className="page-note">Eyeglass error</p>
            ) : null}
            <ActionButton type="submit" disabled={!canSubmit} variant="primary" className="auth-page__submit">
              {title}
            </ActionButton>
            <p className="page-note">{isSignIn ? copy.signInNote : copy.signUpNote}</p>
            {stubNote ? <p className="page-note">{stubNote}</p> : null}
            <p className="auth-page__switch">
              {isSignIn ? copy.noAccount : copy.hasAccount}{" "}
              <Link to={isSignIn ? "/sign-up" : "/sign-in"} className="page-link">
                {isSignIn ? copy.register : copy.signIn}
              </Link>
            </p>
          </form>
        </BlurPanel>
      </div>
    </section>
  );
}
