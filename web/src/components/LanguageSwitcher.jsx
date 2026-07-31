import { useLanguage } from "../lib/lang.jsx";

function GlobeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2C14.8 4.5 16.4 8.15 16.4 12C16.4 15.85 14.8 19.5 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2C9.2 4.5 7.6 8.15 7.6 12C7.6 15.85 9.2 19.5 12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function LanguageSwitcher() {
  const { locale, toggleLocale } = useLanguage();
  return (
    <button
      type="button"
      className="language-switcher"
      aria-label={locale === "en" ? "Switch language to Russian" : "Переключить язык на английский"}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        toggleLocale();
      }}
    >
      <span className="language-switcher__icon" aria-hidden="true">
        <GlobeIcon />
      </span>
      <span className="language-switcher__viewport">
        <span className="language-switcher__value" key={locale}>
          {locale.toUpperCase()}
        </span>
      </span>
    </button>
  );
}
