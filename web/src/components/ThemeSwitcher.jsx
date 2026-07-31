import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../lib/lang.jsx";
import { useSiteTheme } from "../lib/siteTheme.jsx";

function PaletteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path
        d="M12 3C7.03 3 3 6.69 3 11.25c0 2.7 1.52 5.07 3.86 6.45.35.2.64-.05.64-.4l-.05-1.05a1 1 0 0 1 .3-.74C9.3 14 11.4 13 13.7 13h.55C17.4 13 20 15.2 20 17.95c0 .35.1.7.28 1 .28.45.92.55 1.3.18C23.1 17.4 24 15.5 24 13.4 24 8.1 18.6 3 12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
        transform="translate(-1.2 0) scale(0.95)"
      />
      <circle cx="8" cy="10.5" r="1.2" fill="currentColor" />
      <circle cx="11.2" cy="8" r="1.2" fill="currentColor" />
      <circle cx="15" cy="8.2" r="1.2" fill="currentColor" />
      <circle cx="17.6" cy="11" r="1.2" fill="currentColor" />
    </svg>
  );
}

export default function ThemeSwitcher() {
  const { locale } = useLanguage();
  const { themeId, setThemeId, presets, accent } = useSiteTheme();
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPanelMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setPanelVisible(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setPanelVisible(false);
    const t = window.setTimeout(() => setPanelMounted(false), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={
        "theme-switcher" +
        (open ? " theme-switcher--open" : "") +
        (panelVisible ? " theme-switcher--panel-in" : "")
      }
      ref={rootRef}
    >
      {panelMounted ? (
        <div
          className="theme-switcher__panel"
          role="listbox"
          aria-label={locale === "ru" ? "Тема сайта" : "Site theme"}
        >
          {presets.map((preset, index) => {
            const label = locale === "ru" ? preset.labelRu : preset.labelEn;
            const active = preset.id === themeId;
            return (
              <button
                type="button"
                key={preset.id}
                role="option"
                aria-selected={active}
                aria-label={label}
                title={label}
                className={"theme-switcher__swatch" + (active ? " theme-switcher__swatch--active" : "")}
                style={{ "--swatch-color": preset.accent, "--swatch-i": index }}
                onClick={() => {
                  setThemeId(preset.id);
                  setOpen(false);
                }}
              >
                <span className="theme-switcher__dot" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      ) : null}
      <button
        type="button"
        className="theme-switcher__toggle"
        aria-label={locale === "ru" ? "Сменить тему" : "Change theme"}
        aria-expanded={open}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="theme-switcher__icon" aria-hidden="true" style={{ color: accent }}>
          <PaletteIcon />
        </span>
      </button>
    </div>
  );
}
