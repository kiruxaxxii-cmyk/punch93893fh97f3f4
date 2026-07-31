import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { THEME_PRESETS, THEME_STORAGE_KEY, buildTheme, getPresetById } from "./theme.js";

const SiteThemeContext = createContext(null);

function readStoredThemeId() {
  if (typeof window === "undefined") return "blue";
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (THEME_PRESETS.some((p) => p.id === raw)) return raw;
  return "blue";
}

export function SiteThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(() => readStoredThemeId());
  const [flashAccent, setFlashAccent] = useState(null);
  const flashTimer = useRef(0);

  const preset = useMemo(() => getPresetById(themeId), [themeId]);
  const theme = useMemo(() => buildTheme(preset.accent), [preset]);

  const rootStyle = useMemo(
    () => ({
      ...theme.appColorVars,
      ...theme.heroColorVars,
      ...theme.aboutColorVars,
      ...theme.sectionColorVars
    }),
    [theme]
  );

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
    document.documentElement.setAttribute("data-punch-theme", themeId);
  }, [themeId]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const setThemeId = useCallback((id) => {
    const next = THEME_PRESETS.find((p) => p.id === id);
    if (!next) return;
    setThemeIdState((prev) => {
      if (prev === id) return prev;
      setFlashAccent(next.accent);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setFlashAccent(null), 780);
      return id;
    });
  }, []);

  const value = useMemo(
    () => ({
      themeId,
      setThemeId,
      preset,
      presets: THEME_PRESETS,
      theme,
      accent: preset.accent
    }),
    [themeId, setThemeId, preset, theme]
  );

  return (
    <SiteThemeContext.Provider value={value}>
      <div
        className={"punch-theme-root" + (flashAccent ? " punch-theme-root--flash" : "")}
        style={rootStyle}
        data-punch-theme={themeId}
      >
        {flashAccent ? (
          <div
            className="punch-theme-flash"
            aria-hidden="true"
            style={{ "--theme-flash": flashAccent }}
            key={flashAccent + themeId}
          />
        ) : null}
        {children}
      </div>
    </SiteThemeContext.Provider>
  );
}

export function useSiteTheme() {
  const ctx = useContext(SiteThemeContext);
  if (!ctx) throw new Error("useSiteTheme must be used within SiteThemeProvider");
  return ctx;
}
