import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "../../components/shared.jsx";
import { useAuth } from "../../lib/auth.jsx";
import { isAdmin } from "../../lib/theme.js";
import { apiEbdBackup, apiEbdDedupe, apiEbdInfo } from "../../lib/ebdApi.js";
import { ApiError } from "../../lib/api.js";

function formatBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return v + " B";
  if (v < 1024 * 1024) return (v / 1024).toFixed(1) + " KB";
  return (v / (1024 * 1024)).toFixed(2) + " MB";
}

export default function EbdSection({ copy, locale, pushNotice }) {
  const { user, isAuthenticated } = useAuth();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canUse = isAuthenticated && isAdmin(user);

  const load = useCallback(async () => {
    if (!canUse) return;
    setBusy(true);
    setError("");
    try {
      setInfo(await apiEbdInfo());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err?.message || err));
      setInfo(null);
    } finally {
      setBusy(false);
    }
  }, [canUse]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onBackup() {
    setBusy(true);
    setError("");
    try {
      const blob = await apiEbdBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "punch-ebd.db";
      a.click();
      URL.revokeObjectURL(url);
      pushNotice?.({ tone: "success", title: copy.ebd.backupDone, message: "punch-ebd.db" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function onDedupe() {
    setBusy(true);
    setError("");
    try {
      const res = await apiEbdDedupe();
      setInfo(res.ebd || (await apiEbdInfo()));
      pushNotice?.({
        tone: "success",
        title: copy.ebd.dedupeDone,
        message: copy.ebd.removed(res.removed ?? 0)
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  if (!canUse) {
    return (
      <div className="ebd-panel">
        <p className="ebd-panel__lead">{copy.ebd.lead}</p>
        <p className="ebd-panel__lead">
          {locale === "ru"
            ? "Войдите на сайте под Punch admin/owner, затем откройте эту вкладку."
            : "Sign in on the site as Punch admin/owner, then open this tab."}
        </p>
        <ActionButton to="/sign-in" variant="primary">
          {locale === "ru" ? "Войти" : "Sign in"}
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="ebd-panel">
      <p className="ebd-panel__lead">{copy.ebd.lead}</p>
      <div className="ebd-panel__grid">
        <div className="ebd-panel__card">
          <span>{copy.ebd.file}</span>
          <strong>{info?.path ?? "—"}</strong>
        </div>
        <div className="ebd-panel__card">
          <span>{copy.ebd.dataDir}</span>
          <strong>{info?.dataDir ?? "—"}</strong>
        </div>
        <div className="ebd-panel__card">
          <span>{copy.ebd.size}</span>
          <strong>{info ? formatBytes(info.sizeBytes) : "—"}</strong>
        </div>
        <div className="ebd-panel__card">
          <span>{copy.ebd.status}</span>
          <strong>{info ? (info.healthy ? copy.ebd.ok : copy.ebd.dupes) : "—"}</strong>
        </div>
        <div className="ebd-panel__card">
          <span>{copy.ebd.users}</span>
          <strong>{info?.tables?.users ?? "—"}</strong>
        </div>
      </div>
      <div className="ebd-panel__actions">
        <ActionButton type="button" variant="secondary" disabled={busy} onClick={() => void load()}>
          {copy.ebd.refresh}
        </ActionButton>
        <ActionButton type="button" variant="primary" disabled={busy} onClick={() => void onBackup()}>
          {copy.ebd.backup}
        </ActionButton>
        <ActionButton type="button" variant="secondary" disabled={busy} onClick={() => void onDedupe()}>
          {copy.ebd.dedupe}
        </ActionButton>
      </div>
      {error ? <p className="ebd-panel__error">{error}</p> : null}
      <h3>{copy.ebd.dupEmails}</h3>
      <pre className="ebd-panel__pre">
        {info?.duplicateEmails?.length
          ? info.duplicateEmails.map((d) => `${d.email} (${d.count}): ${d.accounts}`).join("\n")
          : copy.ebd.none}
      </pre>
      <h3>{copy.ebd.dupUsers}</h3>
      <pre className="ebd-panel__pre">
        {info?.duplicateUsernames?.length
          ? info.duplicateUsernames.map((d) => `${d.username} (${d.count}): ${d.accounts}`).join("\n")
          : copy.ebd.none}
      </pre>
    </div>
  );
}
