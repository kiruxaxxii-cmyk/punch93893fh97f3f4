import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "../../components/shared.jsx";
import {
  apiAdminLoaderControl,
  apiAdminLoaderCommand,
  apiAdminLoaderPublish,
  errorMessage
} from "../../lib/api.js";

const FORCE_MSG = "Punch has been updated. Please restart loader.";

export default function LoaderPanel({ copy, locale, pushNotice }) {
  const [state, setState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setState(await apiAdminLoaderControl());
      setError("");
    } catch (err) {
      setError(errorMessage(err, locale === "ru" ? "Не удалось загрузить Loader Panel." : "Unable to load Loader Panel."));
    }
  }, [locale]);

  useEffect(() => {
    void reload();
    const id = window.setInterval(() => void reload(), 10000);
    return () => window.clearInterval(id);
  }, [reload]);

  const run = async (fn, okTitle, okMsg) => {
    setBusy(true);
    setError("");
    try {
      const res = await fn();
      setState((prev) => ({ ...(prev || {}), ...res }));
      pushNotice({ tone: "success", title: okTitle, message: okMsg });
      await reload();
    } catch (err) {
      const msg = errorMessage(err, locale === "ru" ? "Ошибка команды." : "Command failed.");
      setError(msg);
      pushNotice({ tone: "error", title: "Loader Panel", message: msg });
    } finally {
      setBusy(false);
    }
  };

  const onForce = () =>
    void run(
      () => apiAdminLoaderCommand({ type: "force_update", message: FORCE_MSG }),
      locale === "ru" ? "Команда отправлена" : "Command sent",
      locale === "ru"
        ? "Все лоудеры закроют клиент и покажут сообщение Windows."
        : "All loaders will close the client and show a Windows message."
    );

  const onSilent = () =>
    void run(
      () => apiAdminLoaderCommand({ type: "silent_update" }),
      locale === "ru" ? "Тихое обновление" : "Silent update",
      locale === "ru"
        ? "Лоудеры скачают exe и обновятся без текста."
        : "Loaders will download the exe and update silently."
    );

  const onPublish = (silent) => {
    if (!file) {
      setError(locale === "ru" ? "Выбери punch-loader.exe" : "Choose punch-loader.exe");
      return;
    }
    void run(
      () => apiAdminLoaderPublish(file, { silent }),
      locale === "ru" ? "Версия залита" : "Version published",
      silent
        ? locale === "ru"
          ? "Файл залит и запущено тихое обновление."
          : "File uploaded and silent update started."
        : locale === "ru"
          ? "Файл залит. Можно отправить Silent/Force."
          : "File uploaded. You can send Silent/Force."
    );
  };

  const c = copy.loaderPanel;

  return (
    <div className="admin-page__loader-panel">
      <div className="admin-page__panel-block" style={{ display: "grid", gap: 14, maxWidth: 720 }}>
        <p style={{ margin: 0, opacity: 0.78, lineHeight: 1.45 }}>{c.lead}</p>

        {error ? <p className="admin-page__section-error" style={{ margin: 0 }}>{error}</p> : null}

        <div className="admin-page__panel" style={{ padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div><strong>{c.version}:</strong> {state?.version ?? "—"}</div>
            <div><strong>{c.commandId}:</strong> {state?.commandId ?? 0}</div>
            <div><strong>{c.lastCommand}:</strong> {state?.command?.type ?? c.none}</div>
            <div><strong>{c.updatedAt}:</strong> {state?.updatedAt ?? "—"}</div>
            <div>
              <strong>{c.exe}:</strong>{" "}
              {state?.exeExists ? `${c.ready} (${Math.round((state.exeSize || 0) / 1024 / 1024)} MB)` : c.missing}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <ActionButton type="button" variant="primary" disabled={busy} onClick={onForce}>
            {c.forceUpdate}
          </ActionButton>
          <ActionButton type="button" variant="secondary" disabled={busy || !state?.exeExists} onClick={onSilent}>
            {c.silentUpdate}
          </ActionButton>
          <ActionButton type="button" variant="secondary" disabled={busy} onClick={() => void reload()}>
            {c.refresh}
          </ActionButton>
        </div>

        <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>{c.forceHint}</p>
        <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.7 }}>{c.silentHint}</p>

        <div className="admin-page__panel" style={{ padding: 16, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "grid", gap: 12 }}>
          <strong>{c.uploadTitle}</strong>
          <input
            type="file"
            accept=".exe,application/octet-stream"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <ActionButton type="button" variant="secondary" disabled={busy || !file} onClick={() => onPublish(false)}>
              {c.uploadOnly}
            </ActionButton>
            <ActionButton type="button" variant="primary" disabled={busy || !file} onClick={() => onPublish(true)}>
              {c.uploadAndSilent}
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
