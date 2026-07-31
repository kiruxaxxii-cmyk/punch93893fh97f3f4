import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const NoticeContext = createContext(null);

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now() + "-" + Math.random().toString(36).slice(2);
}

export function NoticeProvider({ children }) {
  const [notices, setNotices] = useState([]);
  const timers = useRef(new Map());

  const removeNotice = useCallback((id) => {
    const entry = timers.current.get(id);
    if (entry?.dismissTimer) window.clearTimeout(entry.dismissTimer);
    if (entry?.removeTimer) window.clearTimeout(entry.removeTimer);
    timers.current.delete(id);
    setNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissNotice = useCallback(
    (id) => {
      setNotices((prev) =>
        prev.map((n) => (n.id === id && !n.isLeaving ? { ...n, isLeaving: true } : n))
      );
      const entry = timers.current.get(id) ?? {};
      if (entry.dismissTimer) window.clearTimeout(entry.dismissTimer);
      if (entry.removeTimer) window.clearTimeout(entry.removeTimer);
      entry.removeTimer = window.setTimeout(() => removeNotice(id), 220);
      timers.current.set(id, entry);
    },
    [removeNotice]
  );

  const pushNotice = useCallback(
    (payload) => {
      const id = makeId();
      const notice = {
        id,
        title: payload.title.trim(),
        message: payload.message?.trim() ?? "",
        tone: payload.tone ?? "info",
        durationMs: payload.durationMs ?? 3000,
        isLeaving: false
      };
      setNotices((prev) => [notice, ...prev].slice(0, 6));
      const dismissTimer = window.setTimeout(() => dismissNotice(id), notice.durationMs);
      timers.current.set(id, { dismissTimer });
    },
    [dismissNotice]
  );

  useEffect(
    () => () => {
      for (const entry of timers.current.values()) {
        if (entry.dismissTimer) window.clearTimeout(entry.dismissTimer);
        if (entry.removeTimer) window.clearTimeout(entry.removeTimer);
      }
      timers.current.clear();
    },
    []
  );

  const value = useMemo(() => ({ pushNotice }), [pushNotice]);

  return (
    <NoticeContext.Provider value={value}>
      {children}
      <div className="app-notice-center" aria-live="polite" aria-atomic="true">
        {notices.map((n) => (
          <div
            className={"app-notice app-notice--" + n.tone + (n.isLeaving ? " app-notice--leaving" : "")}
            role="status"
            key={n.id}
          >
            <p className="app-notice__title">{n.title}</p>
            {n.message ? <p className="app-notice__message">{n.message}</p> : null}
          </div>
        ))}
      </div>
    </NoticeContext.Provider>
  );
}

export function useNotice() {
  const ctx = useContext(NoticeContext);
  if (!ctx) throw new Error("useNotice must be used within NoticeProvider");
  return ctx;
}
