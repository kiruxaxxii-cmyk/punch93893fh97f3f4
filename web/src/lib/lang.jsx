import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const LANGUAGE_KEY = "website-language";

const LanguageContext = createContext(null);

function getInitialLocale() {
  if (typeof window === "undefined") return "en";
  if (window.localStorage.getItem(LANGUAGE_KEY) === "ru") return "ru";
  return "en";
}

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(() => getInitialLocale());

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, locale);
  }, [locale]);

  const setLocale = useCallback((next) => {
    setLocaleState(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => (prev === "en" ? "ru" : "en"));
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale }),
    [locale, setLocale, toggleLocale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
