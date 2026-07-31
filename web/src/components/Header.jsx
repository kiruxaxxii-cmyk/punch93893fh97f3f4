import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { useLanguage } from "../lib/lang.jsx";
import { theme } from "../lib/theme.js";
import { ActionButton } from "./shared.jsx";

const headerAccentStyle = { "--app-header-accent": theme.raysColor };

const NAV_LINKS = {
  en: [
    { label: "Home", to: "/", end: true },
    { label: "Products", to: "/products" },
    { label: "Contacts", to: "/contacts" },
    { label: "User Agreement", to: "/user-agreement" }
  ],
  ru: [
    { label: "Главная", to: "/", end: true },
    { label: "Товары", to: "/products" },
    { label: "Контакты", to: "/contacts" },
    { label: "Соглашение", to: "/user-agreement" }
  ]
};

const COPY = {
  en: {
    home: "Home",
    primary: "Primary",
    profile: "Profile",
    signUp: "Sign Up",
    signIn: "Sign In",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation"
  },
  ru: {
    home: "Главная",
    primary: "Навигация",
    profile: "Профиль",
    signUp: "Регистрация",
    signIn: "Войти",
    openNavigation: "Открыть навигацию",
    closeNavigation: "Закрыть навигацию"
  }
};

const surfaceStyle = {
  backdropFilter: "blur(20px) saturate(1.02)",
  WebkitBackdropFilter: "blur(20px) saturate(1.02)"
};

function BrandMark() {
  return (
    <img
      src="/punch-logo.jpg"
      alt="Punch"
      className="app-header__brand-logo"
      width={36}
      height={36}
      decoding="async"
    />
  );
}

function BurgerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const { locale } = useLanguage();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const profilePath = "/profile";
  const copy = COPY[locale];
  const links = NAV_LINKS[locale];
  const showProfile = isAuthReady && isAuthenticated;
  const showAuth = isAuthReady && !isAuthenticated;

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 36);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className={condensed ? "app-header app-header--condensed" : "app-header"} style={headerAccentStyle}>
      <div className="app-header__sticky">
        <div className="app-header__shell">
          <div className="app-header__surface" style={surfaceStyle}>
            <div className="app-header__inner">
              <div className="app-header__left">
                <Link to="/" aria-label={copy.home} className="app-header__brand focus-visible:outline-none">
                  <BrandMark />
                </Link>
                <nav aria-label={copy.primary} className="app-header__nav">
                  {links.map(({ label, to, end }) => (
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        isActive
                          ? "app-header__nav-link app-header__nav-link--active focus-visible:outline-none"
                          : "app-header__nav-link focus-visible:outline-none"
                      }
                      key={label}
                    >
                      {label}
                    </NavLink>
                  ))}
                </nav>
              </div>
              <div className="app-header__actions">
                {isAuthReady ? (
                  showProfile ? (
                    <ActionButton to={profilePath} variant="secondary" className="app-header__profile app-header__profile--desktop focus-visible:outline-none">
                      {copy.profile}
                    </ActionButton>
                  ) : showAuth ? (
                    <div className="app-header__auth-desktop">
                      <ActionButton to="/sign-up" variant="secondary" className="app-header__profile app-header__profile--desktop focus-visible:outline-none">
                        {copy.signUp}
                      </ActionButton>
                      <ActionButton to="/sign-in" variant="secondary" className="app-header__profile app-header__profile--desktop focus-visible:outline-none">
                        {copy.signIn}
                      </ActionButton>
                    </div>
                  ) : null
                ) : (
                  <span className="app-header__actions-placeholder" aria-hidden="true" />
                )}
                <button
                  type="button"
                  aria-label={menuOpen ? copy.closeNavigation : copy.openNavigation}
                  aria-expanded={menuOpen}
                  className="app-header__menu focus-visible:outline-none"
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  {menuOpen ? <CloseIcon /> : <BurgerIcon />}
                </button>
              </div>
            </div>
          </div>
          {menuOpen ? (
            <div className="app-header__mobile-panel md:hidden" style={surfaceStyle}>
              <div className="app-header__mobile-inner">
                {links.map(({ label, to, end }) => (
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      isActive
                        ? "app-header__mobile-link app-header__mobile-link--active focus-visible:outline-none"
                        : "app-header__mobile-link focus-visible:outline-none"
                    }
                    key={label}
                  >
                    {label}
                  </NavLink>
                ))}
                {showProfile ? (
                  <ActionButton to={profilePath} variant="secondary" className="app-header__profile app-header__mobile-profile focus-visible:outline-none">
                    {copy.profile}
                  </ActionButton>
                ) : showAuth ? (
                  <div className="app-header__mobile-auth">
                    <Link to="/sign-up" className="app-header__mobile-auth-link focus-visible:outline-none">
                      {copy.signUp}
                    </Link>
                    <ActionButton to="/sign-in" variant="secondary" className="app-header__profile app-header__mobile-profile focus-visible:outline-none">
                      {copy.signIn}
                    </ActionButton>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
