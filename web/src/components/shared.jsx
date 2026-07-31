import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { theme } from "../lib/theme.js";

export function ActionButton(props) {
  const className = ("action-button action-button--" + (props.variant ?? "secondary") + " " + (props.className ?? "")).trim();
  if ("to" in props && props.to) {
    const { children, to } = props;
    return (
      <Link to={to} className={className}>
        {children}
      </Link>
    );
  }
  if ("href" in props && props.href) {
    const { children, href, target, rel } = props;
    return (
      <a href={href} target={target} rel={rel} className={className}>
        {children}
      </a>
    );
  }
  const { children, type = "button", variant, className: _ignored, ...rest } = props;
  return (
    <button {...rest} type={type} className={className}>
      {children}
    </button>
  );
}

export function Reveal({ as: Tag = "div", children, className, delay = 0, rootMargin = "0px 0px -10% 0px", style }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const mergedStyle = { ...style };
  mergedStyle["--page-reveal-delay"] = delay + "ms";

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin, threshold: 0.18 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <Tag
      ref={(node) => {
        ref.current = node;
      }}
      className={visible ? ("page-reveal page-reveal--visible " + (className ?? "")).trim() : ("page-reveal " + (className ?? "")).trim()}
      style={mergedStyle}
    >
      {children}
    </Tag>
  );
}

const BLUR_STYLE = {
  backdropFilter: "blur(15px) saturate(1.02)",
  WebkitBackdropFilter: "blur(15px) saturate(1.02)"
};

export function BlurPanel({ as: Tag = "div", children, className, delay, interactive = false, style }) {
  const cls = interactive ? ("blur-panel blur-panel--interactive " + (className ?? "")).trim() : ("blur-panel " + (className ?? "")).trim();
  const mergedStyle = style ? { ...BLUR_STYLE, ...style } : BLUR_STYLE;
  if (typeof delay === "number") {
    return (
      <Reveal as={Tag} className={cls} delay={delay} style={mergedStyle}>
        {children}
      </Reveal>
    );
  }
  return (
    <Tag className={cls} style={mergedStyle}>
      {children}
    </Tag>
  );
}

export function Modal({ children, onClose, ariaLabelledBy }) {
  useEffect(() => {
    document.documentElement.classList.add("app-modal-open");
    document.body.classList.add("app-modal-open");
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("app-modal-open");
      document.body.classList.remove("app-modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="app-modal-portal"
      style={theme.appColorVars}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      onMouseDown={onClose}
    >
      <div className="app-modal-portal__surface" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function Pagination({ currentPage, totalPages, onPageChange, pageLabel, previousLabel, nextLabel }) {
  const [value, setValue] = useState("" + currentPage);

  useEffect(() => {
    setValue("" + currentPage);
  }, [currentPage]);

  if (totalPages <= 1) return null;

  const commit = () => {
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isFinite(parsed)) {
      setValue("" + currentPage);
      return;
    }
    const clamped = Math.min(Math.max(parsed, 1), totalPages);
    setValue("" + clamped);
    if (clamped !== currentPage) onPageChange(clamped);
  };

  return (
    <nav className="pagination" aria-label={pageLabel}>
      <button type="button" className="pagination__nav" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
        {previousLabel}
      </button>
      <div className="pagination__center">
        <span className="pagination__label">{pageLabel}</span>
        <span className="pagination__slash" aria-hidden="true">
          |
        </span>
        <label className="pagination__input-shell">
          <span className="pagination__input-caption">Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
            onBlur={commit}
            className="pagination__input"
          />
        </label>
      </div>
      <button type="button" className="pagination__nav" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
        {nextLabel}
      </button>
    </nav>
  );
}

export function RouteIntro({ badgeLabel, badgeIcon, title, description, align = "center", className, style, titleAs: TitleTag = "h1" }) {
  return (
    <div
      className={((align === "left" ? "route-intro route-intro--left" : "route-intro") + " " + (className ?? "")).trim()}
      style={style}
    >
      <div className="route-badge">
        <span className="route-badge__icon" aria-hidden="true">
          {badgeIcon}
        </span>
        <span className="route-badge__text">{badgeLabel}</span>
      </div>
      <TitleTag className="route-title">{title}</TitleTag>
      <p className="route-description">{description}</p>
    </div>
  );
}
