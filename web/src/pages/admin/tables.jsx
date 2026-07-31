import { useState, useEffect, useMemo } from "react";
import { ActionButton } from "../../components/shared.jsx";
import { canManage } from "../../lib/theme.js";
import { errorMessage, apiAdminPaymentPlans, apiAdminCreatePlan, apiAdminUpdatePlan, apiAdminDeletePlan, apiAdminUploadArtifact } from "../../lib/api.js";
import { useNotice } from "../../lib/notice.jsx";
import { formatDateTime, isSystemOwner } from "../../lib/format.js";
import { TrashIcon, CopyIcon, copyToClipboard } from "./icons.jsx";
import {
  FOLDER_INPUT_ATTRS,
  formatUploadProgress,
  mcpBatchId,
  mcpLibraryPathFromFile,
  parseClientJarKind,
  parseNativeDllKind,
  parseMcpLibraryKind,
  clientJarKind,
  nativeDllKind,
  displayLoaderType,
  artifactDisplayName,
  versionScopes,
  runtimeVersions,
  subscriptionPill,
  formatSubscriptionLabel
} from "./copy.js";

export function UsersTable({ copy: r6, actor: r7, users: r8, isEmpty: r9, onEditUser: rN, onRevokeSessions: rB }) {
  var rk = {
    className: "admin-page__cell admin-page__cell--muted",
    children: "—"
  };
  return (
    <div className="admin-page__table" role="table" aria-label={r6.tabs.users}>
      <div className="admin-page__row admin-page__row--head admin-page__row--users" role="row">
        <div className="admin-page__cell" role="columnheader">{r6.table.uid}</div>
        <div className="admin-page__cell" role="columnheader">{r6.table.login}</div>
        <div className="admin-page__cell" role="columnheader">{r6.table.email}</div>
        <div className="admin-page__cell" role="columnheader">{r6.table.subscription}</div>
        <div className="admin-page__cell" role="columnheader">{r6.table.role}</div>
        <div className="admin-page__cell" role="columnheader">{r6.table.ban}</div>
        <div className="admin-page__cell" role="columnheader">{r6.table.twoFactor}</div>
        <div className="admin-page__cell admin-page__cell--right" role="columnheader">{r6.table.actions}</div>
      </div>
      <div className="admin-page__body" role="rowgroup">
        {r9 ? (
          <div className="admin-page__empty-state">{r6.empty.users}</div>
        ) : (
          r8.map(rV => (
            <div className="admin-page__row admin-page__row--users" role="row" key={rV.id}>
              <div className="admin-page__cell admin-page__cell--mono admin-page__cell--strong" role="cell" title={"UID " + rV.uid}>#{rV.uid}</div>
              <div className="admin-page__cell admin-page__cell--strong" role="cell" title={rV.displayName}>
                <span className="admin-page__login">{rV.displayName}</span>
                {isSystemOwner(rV) ? <span className="admin-page__pill admin-page__pill--owner">{r6.pills.root}</span> : null}
              </div>
              <div className="admin-page__cell admin-page__cell--muted" role="cell" title={rV.email ?? ""}>{rV.email ?? "—"}</div>
              <div className="admin-page__cell" role="cell">
                {(() => {
                  let rI = subscriptionPill(rV.subscriptionTill, r6);
                  return (
                    <span
                      className={rI.state === "active" ? "admin-page__pill admin-page__pill--success" : rI.state === "expired" ? "admin-page__pill admin-page__pill--danger" : rI.state === "lifetime" ? "admin-page__pill admin-page__pill--owner" : "admin-page__pill"}
                      title={rV.subscriptionTill ?? ""}
                    >
                      {formatSubscriptionLabel(rV.subscriptionTill, r6)}
                    </span>
                  );
                })()}
              </div>
              <div className="admin-page__cell" role="cell">
                <span className="admin-page__pill admin-page__pill--role">{rV.role}</span>
              </div>
              <div className="admin-page__cell" role="cell">
                <span className={rV.isBanned ? "admin-page__pill admin-page__pill--danger" : "admin-page__pill admin-page__pill--neutral"}>{rV.isBanned ? r6.pills.banned : r6.pills.ok}</span>
              </div>
              <div className="admin-page__cell" role="cell">
                <span className={rV.twoFactorEnabled ? "admin-page__pill admin-page__pill--neutral" : "admin-page__pill"}>{rV.twoFactorEnabled ? r6.pills.on : r6.pills.off}</span>
              </div>
              <div className="admin-page__cell admin-page__cell--right" role="cell">
                {canManage(r7, rV) ? (
                  <div className="admin-page__row-actions">
                    <ActionButton type="button" variant="secondary" className="admin-page__row-action" onClick={() => rN(rV.id)}>{r6.buttons.edit}</ActionButton>
                    <ActionButton type="button" variant="secondary" className="admin-page__row-action admin-page__row-action--danger" onClick={() => rB(rV.id)}>{r6.buttons.revoke}</ActionButton>
                  </div>
                ) : (
                  <span {...rk} />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function OnlineTable({ copy: r6, connections: r7, isEmpty: r8, canManageConnectionUser: r9, onKick: rN }) {
  var rX = {
    className: "admin-page__cell admin-page__cell--muted",
    children: "—"
  };
  return (
    <div className="admin-page__table" role="table" aria-label={r6.tabs.online}>
      <div className="admin-page__row admin-page__row--head admin-page__row--online" role="row">
        <div className="admin-page__cell" role="columnheader">{r6.table.login}</div>
        <div className="admin-page__cell" role="columnheader">{r6.table.session}</div>
        <div className="admin-page__cell" role="columnheader">Discord</div>
        <div className="admin-page__cell" role="columnheader">{r6.table.connected}</div>
        <div className="admin-page__cell admin-page__cell--right" role="columnheader">{r6.table.actions}</div>
      </div>
      <div className="admin-page__body" role="rowgroup">
        {r8 ? (
          <div className="admin-page__empty-state">{r6.empty.online}</div>
        ) : (
          r7.map(rU => (
            <div className="admin-page__row admin-page__row--online" role="row" key={rU.sessionId}>
              <div className="admin-page__cell admin-page__online-account" role="cell" title={rU.email ?? rU.displayName}>
                <div className="admin-page__online-primary">
                  <span className="admin-page__login">#{rU.uid} · {rU.displayName}</span>
                  <span className="admin-page__pill admin-page__pill--role">{rU.role}</span>
                </div>
                <span className="admin-page__online-secondary">{rU.email ?? "-"}</span>
              </div>
              <div className="admin-page__cell admin-page__online-stack admin-page__cell--mono" role="cell" title={rU.sessionId}>
                <span>{rU.sessionId}</span>
                <span className="admin-page__online-secondary">{r6.table.connections}: {rU.connectionCount}</span>
              </div>
              <div className="admin-page__cell admin-page__online-stack admin-page__cell--mono" role="cell" title={rU.hardwareId ? (rU.discordUsername ?? "-") + " · " + rU.hardwareId : rU.discordUsername ?? ""}>
                <span>{rU.discordUsername ?? "-"}</span>
                {rU.hardwareId ? <span className="admin-page__online-secondary">{rU.hardwareId}</span> : null}
              </div>
              <div className="admin-page__cell admin-page__online-stack" role="cell" title={rU.connectedAt + " · " + rU.lastSeenAt}>
                <span>{rU.connectedAt}</span>
                <span className="admin-page__online-secondary">{rU.lastSeenAt}</span>
              </div>
              <div className="admin-page__cell admin-page__cell--right" role="cell">
                {r9(rU.userId) ? (
                  <ActionButton type="button" variant="secondary" className="admin-page__row-action" onClick={() => rN(rU.sessionId)}>{r6.buttons.kick}</ActionButton>
                ) : (
                  <span {...rX} />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function KeysTable({ copy: r1, keys: r5, isEmpty: r6, onEdit: r7, onDelete: r8 }) {
  return (
    <div className="admin-page__table" role="table" aria-label={r1.tabs.keys}>
      <div className="admin-page__row admin-page__row--head admin-page__row--keys" role="row">
        <div className="admin-page__cell" role="columnheader">{r1.table.code}</div>
        <div className="admin-page__cell" role="columnheader">{r1.table.product}</div>
        <div className="admin-page__cell" role="columnheader">{r1.table.duration}</div>
        <div className="admin-page__cell" role="columnheader">{r1.table.status}</div>
        <div className="admin-page__cell" role="columnheader">{r1.table.assigned}</div>
        <div className="admin-page__cell admin-page__cell--right" role="columnheader">{r1.table.actions}</div>
      </div>
      <div className="admin-page__body" role="rowgroup">
        {r6 ? (
          <div className="admin-page__empty-state">{r1.empty.keys}</div>
        ) : (
          r5.map(r9 => (
            <div className="admin-page__row admin-page__row--keys" role="row" key={r9.id}>
              <div className="admin-page__cell admin-page__cell--mono admin-page__cell--strong" role="cell" title={r9.code}>{r9.code}</div>
              <div className="admin-page__cell" role="cell" title={r9.product}>
                {r9.product}
                <span className="admin-page__pill admin-page__pill--role">{r9.subscriptionTier}</span>
              </div>
              <div className="admin-page__cell admin-page__cell--muted" role="cell">{r9.duration}</div>
              <div className="admin-page__cell" role="cell">
                <span className={r9.status === "revoked" ? "admin-page__pill admin-page__pill--danger" : r9.status === "assigned" ? "admin-page__pill admin-page__pill--owner" : "admin-page__pill admin-page__pill--success"}>{r1.status[r9.status]}</span>
              </div>
              <div className="admin-page__cell admin-page__cell--muted" role="cell" title={r9.assignedTo ?? ""}>{r9.assignedTo ?? "—"}</div>
              <div className="admin-page__cell admin-page__cell--right" role="cell">
                <div className="admin-page__row-actions">
                  <ActionButton type="button" variant="secondary" className="admin-page__row-action" onClick={() => r7(r9.id)}>{r1.buttons.edit}</ActionButton>
                  <button type="button" className="admin-page__icon-action" onClick={() => void copyToClipboard(r9.code)} aria-label={r1.buttons.copy} title={r1.buttons.copy}>
                    <CopyIcon />
                  </button>
                  <button type="button" className="admin-page__icon-action admin-page__icon-action--danger" onClick={() => r8(r9.id)} aria-label={r1.buttons.delete}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function PromosTable({ copy: r1, promos: r5, isEmpty: r6, onEdit: r7, onDelete: r8 }) {
  return (
    <div className="admin-page__table" role="table" aria-label={r1.tabs.promos}>
      <div className="admin-page__row admin-page__row--head admin-page__row--promos" role="row">
        <div className="admin-page__cell" role="columnheader">{r1.table.code}</div>
        <div className="admin-page__cell" role="columnheader">{r1.table.discount}</div>
        <div className="admin-page__cell" role="columnheader">{r1.table.uses}</div>
        <div className="admin-page__cell" role="columnheader">{r1.table.status}</div>
        <div className="admin-page__cell" role="columnheader">{r1.table.expires}</div>
        <div className="admin-page__cell admin-page__cell--right" role="columnheader">{r1.table.actions}</div>
      </div>
      <div className="admin-page__body" role="rowgroup">
        {r6 ? (
          <div className="admin-page__empty-state">{r1.empty.promos}</div>
        ) : (
          r5.map(r9 => (
            <div className="admin-page__row admin-page__row--promos" role="row" key={r9.id}>
              <div className="admin-page__cell admin-page__cell--mono admin-page__cell--strong" role="cell">{r9.code}</div>
              <div className="admin-page__cell" role="cell">{r9.discountPercent}%</div>
              <div className="admin-page__cell admin-page__cell--muted" role="cell">{r9.uses}/{r9.maxUses}</div>
              <div className="admin-page__cell" role="cell">
                <span className={r9.status === "active" ? "admin-page__pill admin-page__pill--success" : "admin-page__pill admin-page__pill--danger"}>{r1.status[r9.status]}</span>
              </div>
              <div className="admin-page__cell admin-page__cell--muted" role="cell">{r9.expiresAt ?? "—"}</div>
              <div className="admin-page__cell admin-page__cell--right" role="cell">
                <div className="admin-page__row-actions">
                  <ActionButton type="button" variant="secondary" className="admin-page__row-action" onClick={() => r7(r9.id)}>{r1.buttons.edit}</ActionButton>
                  <button type="button" className="admin-page__icon-action" onClick={() => void copyToClipboard(r9.code)} aria-label={r1.buttons.copy} title={r1.buttons.copy}>
                    <CopyIcon />
                  </button>
                  <button type="button" className="admin-page__icon-action admin-page__icon-action--danger" onClick={() => r8(r9.id)} aria-label={r1.buttons.delete}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function SalesTable({ copy: rX, sales: rU, summary: rk, isEmpty: rV }) {
  return (
    <div className="admin-page__sales-wrap">
      <div className="admin-page__sales-cards">
        <div className="admin-page__sales-card blur-panel">
          <p className="admin-page__sales-label">Revenue</p>
          <p className="admin-page__sales-value">{rk.revenueTotal} RUB</p>
        </div>
        <div className="admin-page__sales-card blur-panel">
          <p className="admin-page__sales-label">Completed</p>
          <p className="admin-page__sales-value">{rk.completedCount}</p>
        </div>
        <div className="admin-page__sales-card blur-panel">
          <p className="admin-page__sales-label">Pending / Unpaid</p>
          <p className="admin-page__sales-value">{rk.pendingCount} / {rk.unpaidCount}</p>
        </div>
        <div className="admin-page__sales-card blur-panel">
          <p className="admin-page__sales-label">Today / Week</p>
          <p className="admin-page__sales-value">{rk.completedToday} / {rk.completedThisWeek}</p>
        </div>
      </div>
      <div className="admin-page__table" role="table" aria-label={rX.tabs.sales}>
        <div className="admin-page__row admin-page__row--head admin-page__row--sales" role="row">
          <div className="admin-page__cell" role="columnheader">{rX.table.status}</div>
          <div className="admin-page__cell" role="columnheader">{rX.table.plan}</div>
          <div className="admin-page__cell" role="columnheader">{rX.table.buyer}</div>
          <div className="admin-page__cell" role="columnheader">{rX.table.amount}</div>
          <div className="admin-page__cell" role="columnheader">{rX.table.created}</div>
        </div>
        <div className="admin-page__body" role="rowgroup">
          {rV ? (
            <div className="admin-page__empty-state">{rX.empty.sales}</div>
          ) : (
            rU.map(rW => (
              <div className="admin-page__row admin-page__row--sales" role="row" key={rW.userId + "-" + rW.planId + "-" + rW.createdAt}>
                <div className="admin-page__cell" role="cell">
                  <span className={rW.status === "completed" ? "admin-page__pill admin-page__pill--success" : rW.status === "unpaid" ? "admin-page__pill admin-page__pill--danger" : "admin-page__pill admin-page__pill--neutral"}>{rW.status}</span>
                </div>
                <div className="admin-page__cell admin-page__cell--strong" role="cell" title={rW.planId}>{rW.planName}</div>
                <div className="admin-page__cell admin-page__cell--muted" role="cell" title={rW.userId}>{rW.userEmail || rW.userId}</div>
                <div className="admin-page__cell" role="cell">{rW.amount > 0 ? rW.amount + " " + rW.currency : "—"}</div>
                <div className="admin-page__cell admin-page__cell--muted" role="cell">{rW.createdAt}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function LauncherTable({ copy: r1, versions: r5, isEmpty: r6, onEdit: r7, onDelete: r8 }) {
  return (
    <div className="admin-page__table" role="table" aria-label={r1.tabs.launcher}>
      <div className="admin-page__row admin-page__row--head admin-page__row--launcher" role="row">
        <div className="admin-page__cell" role="columnheader">{r1.table.version}</div>
        <div className="admin-page__cell" role="columnheader">{r1.table.loader}</div>
        <div className="admin-page__cell" role="columnheader">{r1.table.roles}</div>
        <div className="admin-page__cell" role="columnheader">{r1.table.created}</div>
        <div className="admin-page__cell admin-page__cell--right" role="columnheader">{r1.table.actions}</div>
      </div>
      <div className="admin-page__body" role="rowgroup">
        {r6 ? (
          <div className="admin-page__empty-state">{r1.empty.launcher}</div>
        ) : (
          r5.map(r9 => (
            <div className="admin-page__row admin-page__row--launcher" role="row" key={r9.id}>
              <div className="admin-page__cell admin-page__cell--strong" role="cell">{r9.minecraftVersion}</div>
              <div className="admin-page__cell" role="cell">
                <span className="admin-page__pill admin-page__pill--role">{r9.loaderType}</span>
              </div>
              <div className="admin-page__cell" role="cell">
                <div className="admin-page__launcher-role-list">
                  {r9.allowedRoles.map(rN => (
                    <span className="admin-page__pill admin-page__pill--neutral" key={r9.id + "-" + rN}>{rN}</span>
                  ))}
                </div>
              </div>
              <div className="admin-page__cell admin-page__cell--muted" role="cell">{r9.createdAt}</div>
              <div className="admin-page__cell admin-page__cell--right" role="cell">
                <div className="admin-page__row-actions">
                  <ActionButton type="button" variant="secondary" className="admin-page__row-action" onClick={() => r7(r9.id)}>{r1.buttons.edit}</ActionButton>
                  <button type="button" className="admin-page__icon-action admin-page__icon-action--danger" onClick={() => r8(r9.id)} aria-label={r1.buttons.delete}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function LogsTable({ copy: r1, logs: r5, isEmpty: r6 }) {
  return (
    <div className="admin-page__log-list" aria-label={r1.tabs.logs}>
      {r6 ? (
        <div className="admin-page__empty-state">{r1.empty.logs}</div>
      ) : (
        r5.map(r7 => (
          <article className="admin-page__log-card" key={r7.id}>
            <div className="admin-page__log-head">
              <span className={"admin-page__pill " + (r7.level === "error" ? "admin-page__pill--danger" : r7.level === "success" ? "admin-page__pill--success" : "admin-page__pill--neutral")}>{r7.level}</span>
              <span className="admin-page__pill admin-page__pill--role">{r7.category}</span>
              <span className="admin-page__cell admin-page__cell--muted">{r7.createdAt}</span>
            </div>
            <p className="admin-page__log-title">{r7.message}</p>
            <p className="admin-page__log-meta">{r7.actorLabel}{r7.entityLabel ? " -> " + r7.entityLabel : ""} · {r7.action}</p>
            {r7.details ? <p className="admin-page__log-details">{r7.details}</p> : null}
          </article>
        ))
      )}
    </div>
  );
}

function UpdatesPanel(rU) {
  let { pushNotice: rV } = useNotice();
  let [rI, rL] = useState({});
  let [rz, rC] = useState(null);
  let [rP, rp] = useState(null);
  let rj = useMemo(() => runtimeVersions(rU.launcherVersions), [rU.launcherVersions]);
  let rM = useMemo(() => versionScopes(rU.launcherVersions), [rU.launcherVersions]);
  let rW = useMemo(
    () =>
      ["client-dll", "jvm-dll"].map(rq => rU.allArtifacts.find(d0 => d0.kind === rq) ?? {
        kind: rq,
        displayName: artifactDisplayName(rq)
      }),
    [rU.allArtifacts]
  );
  let rA = useMemo(
    () =>
      rM.map(rq => rU.allArtifacts.find(d0 => d0.kind === rq) ?? {
        kind: rq,
        displayName: artifactDisplayName(rq)
      }),
    [rU.allArtifacts, rM]
  );
  let rg = useMemo(() => (rj.length ? rj.find(rq => rq.key === rz) ?? rj[0] : null), [rz, rj]);
  useEffect(() => {
    if (!rj.length) {
      rC(null);
      return;
    }
    rC(rq => (rq && rj.some(d0 => d0.key === rq) ? rq : rj[0].key));
  }, [rj]);
  let rx = useMemo(() => {
    if (!rg) {
      return rA;
    }
    let rq = nativeDllKind(rg.loaderType, rg.minecraftVersion);
    let d0 = clientJarKind(rg.loaderType, rg.minecraftVersion);
    return rA.filter(d1 => d1.kind === rq || d1.kind === d0);
  }, [rg, rA]);
  let rQ = useMemo(() => {
    if (!rg || rg.loaderType !== "mcp") {
      return [];
    }
    let rq = "mcp-library:" + rg.minecraftVersion + ":";
    return rU.allArtifacts.filter(d1 => d1.kind.startsWith(rq)).slice().sort((d1, d2) => d1.kind.localeCompare(d2.kind, undefined, { numeric: true }));
  }, [rg, rU.allArtifacts]);
  let rS = rx;
  let rH = rg && rP?.key === mcpBatchId(rg.key) ? rP : null;

  function rE(rq, d0) {
    let d1 = {
      key: rq,
      fileName: d0.name,
      loadedBytes: 0,
      totalBytes: d0.size > 0 ? d0.size : null,
      percent: d0.size > 0 ? 0 : null
    };
    rp(d1);
    rU.setStatusText(rU.locale === "ru" ? "Загружаем " + d0.name + ": " + formatUploadProgress(d1, rU.locale) : "Uploading " + d0.name + ": " + formatUploadProgress(d1, rU.locale));
  }

  function rF(rq, d0) {
    return d1 => {
      let d3 = { ...d1 };
      d3.key = rq;
      d3.fileName = d0.name;
      let d4 = formatUploadProgress(d3, rU.locale);
      let d5 = d3.percent === 100 ? (rU.locale === "ru" ? " · ждем ответ сервера" : " · waiting for server") : "";
      rp(d3);
      rU.setStatusText(rU.locale === "ru" ? "Загружаем " + d0.name + ": " + d4 + d5 : "Uploading " + d0.name + ": " + d4 + d5);
    };
  }

  function rT(rq) {
    rp(d0 => (d0?.key === rq ? null : d0));
  }

  function rw(rq) {
    let d0 = formatUploadProgress(rq, rU.locale);
    let d1 = rq.percent === null;
    return (
      <div
        className={"admin-page__upload-progress" + (d1 ? " admin-page__upload-progress--indeterminate" : "")}
        role="progressbar"
        aria-label={rq.fileName}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rq.percent ?? undefined}
      >
        <div className="admin-page__upload-progress-track" aria-hidden="true">
          <span style={{ width: d1 ? undefined : rq.percent + "%" }} />
        </div>
        <span className="admin-page__upload-progress-text">{d0}</span>
      </div>
    );
  }

  async function rY(rq) {
    let d1 = rI[rq];
    if (!d1) {
      return;
    }
    let d2 = rq;
    let d3 = rF(d2, d1);
    rU.setBusy(true);
    rE(d2, d1);
    try {
      if (rq === "client-dll" || rq === "jvm-dll") {
        await apiAdminUploadArtifact(rq, d1, undefined, d3);
      } else {
        let d5 = parseNativeDllKind(rq);
        if (d5) {
          await apiAdminUploadArtifact("native-dll", d1, d5, d3);
        } else {
          let d6 = parseClientJarKind(rq);
          if (d6) {
            await apiAdminUploadArtifact("client-jar", d1, d6, d3);
          } else {
            let d7 = parseMcpLibraryKind(rq);
            if (!d7) {
              throw Error("Unsupported runtime artifact kind.");
            }
            await apiAdminUploadArtifact("mcp-library", d1, d7, d3);
          }
        }
      }
      rU.setStatusText(rU.locale === "ru" ? d1.name + " загружен, обновляем данные..." : d1.name + " uploaded, refreshing...");
      await rU.reloadDashboard(true);
      rL(d8 => ({ ...d8, [rq]: null }));
      let d4 = artifactDisplayName(rq);
      rU.setStatusText(rU.locale === "ru" ? d4 + " обновлён." : d4 + " updated.");
      rV({
        tone: "success",
        title: rU.locale === "ru" ? "Артефакт обновлён" : "Artifact updated",
        message: d4
      });
    } catch (d8) {
      let d9 = errorMessage(d8, rU.locale === "ru" ? "Не удалось загрузить артефакт." : "Unable to upload the artifact.");
      rU.setStatusText(d9);
      rV({
        tone: "error",
        title: rU.locale === "ru" ? "Ошибка загрузки артефакта" : "Artifact upload failed",
        message: d9
      });
    } finally {
      rU.setBusy(false);
      rT(d2);
    }
  }

  async function rD(rq) {
    if (!rg) {
      return;
    }
    let d0 = new Map();
    for (let d7 of rq) {
      let d8 = mcpLibraryPathFromFile(d7, rg.minecraftVersion);
      if (d8) {
        d0.set(d8, d7);
      }
    }
    let d2 = Array.from(d0.entries()).sort(([d9], [dN]) => d9.localeCompare(dN, undefined, { numeric: true }));
    if (!d2.length) {
      let d9 = rU.locale === "ru" ? "В выбранной папке нет JAR библиотек." : "No JAR libraries were found in the selected folder.";
      rU.setStatusText(d9);
      rV({
        tone: "error",
        title: rU.locale === "ru" ? "Библиотеки не найдены" : "No libraries found",
        message: d9
      });
      return;
    }
    let d3 = mcpBatchId(rg.key);
    let d4 = d2.reduce((dN, [, dB]) => dN + Math.max(0, dB.size), 0);
    let d5 = 0;
    rU.setBusy(true);
    rp({
      key: d3,
      fileName: rU.locale === "ru" ? "MCP библиотеки" : "MCP libraries",
      loadedBytes: 0,
      totalBytes: d4 > 0 ? d4 : null,
      percent: d4 > 0 ? 0 : null
    });
    rU.setStatusText(rU.locale === "ru" ? "Загружаем MCP библиотеки: 0/" + d2.length : "Uploading MCP libraries: 0/" + d2.length);
    try {
      for (let dN = 0; dN < d2.length; dN += 1) {
        let [dB, dX] = d2[dN];
        let dU = dN + 1;
        await apiAdminUploadArtifact(
          "mcp-library",
          dX,
          {
            minecraftVersion: rg.minecraftVersion,
            libraryPath: dB
          },
          dk => {
            let dV = d5 + dk.loadedBytes;
            let dI = {
              key: d3,
              fileName: dU + "/" + d2.length + " " + dX.name,
              loadedBytes: dV,
              totalBytes: d4 > 0 ? d4 : dk.totalBytes,
              percent: d4 > 0 ? Math.max(0, Math.min(100, Math.round((dV / d4) * 100))) : dk.percent
            };
            rp(dI);
            rU.setStatusText(
              rU.locale === "ru"
                ? "Загружаем MCP библиотеки: " + dU + "/" + d2.length + " " + dB + " · " + formatUploadProgress(dI, rU.locale)
                : "Uploading MCP libraries: " + dU + "/" + d2.length + " " + dB + " · " + formatUploadProgress(dI, rU.locale)
            );
          }
        );
        d5 += Math.max(0, dX.size);
      }
      rU.setStatusText(rU.locale === "ru" ? "MCP библиотеки загружены, обновляем данные..." : "MCP libraries uploaded, refreshing...");
      await rU.reloadDashboard(true);
      rU.setStatusText(rU.locale === "ru" ? "Загружено MCP библиотек: " + d2.length + "." : "Uploaded MCP libraries: " + d2.length + ".");
      rV({
        tone: "success",
        title: rU.locale === "ru" ? "MCP библиотеки загружены" : "MCP libraries uploaded",
        message: rU.locale === "ru" ? d2.length + " файлов для " + rg.minecraftVersion : d2.length + " files for " + rg.minecraftVersion
      });
    } catch (dk) {
      let dV = errorMessage(dk, rU.locale === "ru" ? "Не удалось загрузить MCP библиотеки." : "Unable to upload MCP libraries.");
      rU.setStatusText(dV);
      rV({
        tone: "error",
        title: rU.locale === "ru" ? "Ошибка загрузки библиотек" : "Library upload failed",
        message: dV
      });
    } finally {
      rU.setBusy(false);
      rT(d3);
    }
  }

  function rb(rq) {
    let d0 = rI[rq.kind];
    let d1 = rq.kind.startsWith("mcp-library:") || rq.kind.startsWith("fabric-library:");
    let d2 = rq.kind.startsWith("client-jar:") || d1;
    let d3 = (rq.kind !== "client-dll" && rq.kind !== "jvm-dll" && !rq.kind.startsWith("native-dll:")) || rU.canUploadProtectedBinaries;
    let d4 = d2 ? ".jar" : ".dll";
    let d5 = rq.displayName || artifactDisplayName(rq.kind);
    let d6 = rP?.key === rq.kind ? rP : null;
    return (
      <div className="admin-page__row admin-page__row--updates-rt" role="row" key={rq.kind}>
        <div className="admin-page__cell admin-page__cell--strong" role="cell">
          {d5}
          <span className={"admin-page__pill " + (rq.sha256 ? "admin-page__pill--success" : "admin-page__pill--neutral")} style={{ marginLeft: "0.4rem" }}>
            {rq.sha256 ? rU.copy.statusOk : rU.copy.statusNone}
          </span>
        </div>
        <div className="admin-page__cell admin-page__cell--muted" role="cell">{rq.originalName ?? "—"}</div>
        <div className="admin-page__cell admin-page__cell--muted" role="cell">{rq.updatedAt ? formatDateTime(rq.updatedAt) : "—"}</div>
        <div className="admin-page__cell admin-page__cell--mono" role="cell" title={rq.sha256 ?? undefined}>{rq.sha256 ? rq.sha256.slice(0, 10) + "…" : "—"}</div>
        <div className="admin-page__cell admin-page__cell--right admin-page__upload-cell" role="cell">
          <div className="admin-page__row-actions">
            <label
              className="admin-page__update-upload"
              style={{
                padding: "0.35rem 0.65rem",
                cursor: "pointer",
                display: "inline-flex",
                gap: "0.4rem",
                alignItems: "center"
              }}
            >
              <span className="admin-page__update-upload-title" style={{ fontSize: "0.78rem", fontWeight: 400 }}>
                {d3 ? (d0 ? d0.name : rU.locale === "ru" ? "Выбрать " + (d2 ? "JAR" : "DLL") : "Choose " + (d2 ? "JAR" : "DLL")) : rU.locale === "ru" ? "Только Owner" : "Owner only"}
              </span>
              <input
                type="file"
                accept={d4}
                disabled={!d3}
                onChange={dX => {
                  let dU = dX.target.files?.[0] ?? null;
                  rL(dk => ({ ...dk, [rq.kind]: dU }));
                }}
              />
            </label>
            <ActionButton type="button" variant="secondary" className="admin-page__row-action" disabled={!d3 || !d0 || rU.isBusy} onClick={() => void rY(rq.kind)}>
              {rU.locale === "ru" ? "Загрузить" : "Upload"}
            </ActionButton>
          </div>
          {d6 ? rw(d6) : null}
        </div>
      </div>
    );
  }

  function rh(rq, d0) {
    return (
      <div className="admin-page__table" role="table" aria-label={d0}>
        <div className="admin-page__row admin-page__row--head admin-page__row--updates-rt" role="row">
          <div className="admin-page__cell" role="columnheader">{rU.locale === "ru" ? "Артефакт" : "Artifact"}</div>
          <div className="admin-page__cell" role="columnheader">{rU.copy.fileLabel}</div>
          <div className="admin-page__cell" role="columnheader">{rU.copy.updatedLabel}</div>
          <div className="admin-page__cell" role="columnheader">{rU.copy.hashLabel}</div>
          <div className="admin-page__cell admin-page__cell--right" role="columnheader">{rU.locale === "ru" ? "Файл" : "Upload"}</div>
        </div>
        <div className="admin-page__body" role="rowgroup">{rq.map(rb)}</div>
      </div>
    );
  }

  if (!rW.length && !rS.length) {
    return <div className="admin-page__empty-state">{rU.copy.emptyState}</div>;
  }
  return (
    <div className="admin-page__tab-panel">
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.9rem", flexWrap: "wrap" }}>
          <div>
            <p className="admin-page__cell admin-page__cell--strong" style={{ margin: 0 }}>
              {rU.locale === "ru" ? "Статические артефакты" : "Static artifacts"}
            </p>
            <p className="admin-page__cell admin-page__cell--muted" style={{ margin: 0 }}>
              {rU.locale === "ru" ? "client.dll и jvm.dll загружаются один раз для всего лаунчера." : "client.dll and jvm.dll are uploaded once for the whole launcher."}
            </p>
          </div>
        </div>
        {rh(rW, rU.locale === "ru" ? "Статические артефакты" : "Static artifacts")}
      </div>
      {rj.length > 0 ? (
        <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.9rem", flexWrap: "wrap" }}>
            <div>
              <p className="admin-page__cell admin-page__cell--strong" style={{ margin: 0 }}>
                {rU.locale === "ru" ? "Артефакты по версии" : "Version-scoped artifacts"}
              </p>
              <p className="admin-page__cell admin-page__cell--muted" style={{ margin: 0 }}>
                {rU.locale === "ru"
                  ? "Для каждой версии отдельно загружаются native.dll и client.jar. MCP библиотеки остаются привязаны к выбранной MCP версии."
                  : "Each version has its own native.dll and client.jar. MCP libraries stay attached to the selected MCP version."}
              </p>
            </div>
            <nav className="admin-page__tabs" aria-label="Runtime versions">
              {rj.map(rq => (
                <button type="button" className={"admin-page__tab" + (rq.key === rg?.key ? " admin-page__tab--active" : "")} onClick={() => rC(rq.key)} key={rq.key}>
                  {displayLoaderType(rq.loaderType)} {rq.minecraftVersion}
                  {(() => {
                    let d0 = nativeDllKind(rq.loaderType, rq.minecraftVersion);
                    let d1 = clientJarKind(rq.loaderType, rq.minecraftVersion);
                    let d2 = "mcp-library:" + rq.minecraftVersion + ":";
                    let d3 =
                      [d0, d1].filter(d5 => rU.allArtifacts.some(d6 => d6.kind === d5 && d6.sha256)).length +
                      (rq.loaderType === "mcp" ? rU.allArtifacts.filter(d5 => d5.kind.startsWith(d2)).length : 0);
                    if (d3 > 0) {
                      return (
                        <span className="admin-page__pill admin-page__pill--neutral" style={{ marginLeft: "0.45rem" }}>
                          {d3}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </button>
              ))}
            </nav>
          </div>
          {rg?.loaderType === "mcp" ? (
            <div className="admin-page__mcp-upload-area">
              <div className="admin-page__mcp-upload-form">
                <span className="admin-page__mcp-library-count">{rU.locale === "ru" ? "MCP библиотек: " + rQ.length : "MCP libraries: " + rQ.length}</span>
                <label className="admin-page__update-upload admin-page__mcp-folder-picker">
                  <span className="admin-page__update-upload-title">{rU.locale === "ru" ? "Выбрать папку библиотек" : "Choose libraries folder"}</span>
                  <input
                    type="file"
                    accept=".jar"
                    multiple={true}
                    disabled={rU.isBusy}
                    {...FOLDER_INPUT_ATTRS}
                    onChange={rq => {
                      let d0 = Array.from(rq.target.files ?? []);
                      rq.currentTarget.value = "";
                      rD(d0);
                    }}
                  />
                </label>
                <span className="admin-page__mcp-folder-hint">
                  {rU.locale === "ru" ? "Пути JAR сохраняются автоматически." : "Choose the libraries folder or a folder with JAR files. Relative paths are preserved automatically."}
                </span>
              </div>
              {rH ? rw(rH) : null}
            </div>
          ) : null}
          {rh(
            rS,
            rU.locale === "ru"
              ? "Артефакты версии " + (rg ? displayLoaderType(rg.loaderType) + " " + rg.minecraftVersion : "")
              : "Artifacts for " + (rg ? displayLoaderType(rg.loaderType) + " " + rg.minecraftVersion : "selected version")
          )}
        </div>
      ) : null}
    </div>
  );
}

export function UpdatesSection(r5) {
  var r6 = {
    locale: r5.locale,
    copy: {},
    canUploadProtectedBinaries: r5.isSystemOwner,
    launcherVersions: r5.launcherVersions,
    allArtifacts: r5.updateArtifacts,
    visibleArtifacts: r5.updateArtifacts,
    isBusy: r5.isBusy,
    setBusy: r5.setBusy,
    setStatusText: r5.setStatusText,
    reloadDashboard: r5.reloadDashboard
  };
  r6.copy.emptyState = r5.copy.empty.updates;
  r6.copy.fileLabel = r5.copy.table.file;
  r6.copy.hashLabel = r5.copy.table.hash;
  r6.copy.updatedLabel = r5.copy.table.updated;
  r6.copy.statusOk = r5.copy.pills.ok;
  r6.copy.statusNone = r5.copy.pills.none;
  return <UpdatesPanel {...r6} />;
}

export const PLAN_TIERS = ["Premium", "Beta"];
export const PLAN_CURRENCIES = ["RUB", "USD", "EUR"];
export const DURATION_UNITS = ["hours", "days", "weeks", "months"];
export const PROFILE_BLUR_STYLE = {
  backdropFilter: "blur(24px) saturate(1.04)",
  WebkitBackdropFilter: "blur(24px) saturate(1.04)"
};

const EMPTY_PLAN_FORM = {
  id: "",
  name: "Premium 30 Days",
  description: "Full premium access for 30 days.",
  price: 399,
  currency: "RUB",
  durationDays: 30,
  subscriptionTier: "Premium",
  isActive: true,
  isPopular: true,
  sortOrder: 10
};

export function PlansSection() {
  var rQ = { ...EMPTY_PLAN_FORM };
  rQ.editingId = null;
  let [rS, rH] = useState([]);
  let [rE, rF] = useState(true);
  let [rT, rw] = useState(null);
  let [rY, rD] = useState(rQ);
  let [rb, rh] = useState(false);
  let [rJ, rR] = useState(false);

  let rm = () => {
    rF(true);
    rw(null);
    apiAdminPaymentPlans()
      .then(rH)
      .catch(dP => rw(errorMessage(dP, "Unable to load payment plans.")))
      .finally(() => rF(false));
  };

  useEffect(() => {
    rm();
  }, []);

  let ry = () => {
    var dP = { ...EMPTY_PLAN_FORM };
    dP.editingId = null;
    rD(dP);
    rh(true);
  };

  let rK = dP => {
    var dp = {
      id: dP.id,
      name: dP.name,
      description: dP.description,
      price: dP.price,
      currency: dP.currency,
      durationDays: dP.durationDays,
      subscriptionTier: dP.subscriptionTier,
      isActive: dP.isActive,
      isPopular: dP.isPopular,
      sortOrder: dP.sortOrder,
      editingId: dP.id
    };
    rD(dp);
    rh(true);
  };

  let rO = () => {
    if (!rY.name.trim()) {
      rw("Name is required.");
      return;
    }
    let dj = Number(rY.price);
    let dM = Number(rY.durationDays);
    let dW = Number(rY.sortOrder);
    if (!Number.isFinite(dj) || dj < 0) {
      rw("Price must be a non-negative number.");
      return;
    }
    if (!Number.isFinite(dM) || (dM <= 0 && dM !== -1)) {
      rw("Duration must be positive or -1 for HWID reset.");
      return;
    }
    if (!Number.isFinite(dW)) {
      rw("Sort order must be a valid number.");
      return;
    }
    rw(null);
    rR(true);
    let dA = {
      id: rY.editingId ? undefined : rY.id || undefined,
      name: rY.name.trim(),
      description: rY.description.trim(),
      price: Math.trunc(dj),
      currency: rY.currency,
      durationDays: Math.trunc(dM),
      subscriptionTier: rY.subscriptionTier,
      isActive: rY.isActive,
      isPopular: rY.isPopular,
      sortOrder: Math.trunc(dW)
    };
    (rY.editingId ? apiAdminUpdatePlan(rY.editingId, dA) : apiAdminCreatePlan(dA))
      .then(() => {
        rh(false);
        rm();
      })
      .catch(dg => rw(errorMessage(dg, "Unable to save payment plan.")))
      .finally(() => rR(false));
  };

  let rZ = dP => {
    rw(null);
    apiAdminDeletePlan(dP)
      .then(rm)
      .catch(dp => rw(errorMessage(dp, "Unable to delete payment plan.")));
  };

  let rv = (dP, dp) => {
    rD(dj => ({ ...dj, [dP]: dp }));
  };

  return (
    <div className="admin-page__plans">
      <div className="admin-page__plans-toolbar">
        <ActionButton type="button" variant="primary" onClick={ry}>
          New plan
        </ActionButton>
        {rT && <span className="admin-page__plans-error">{rT}</span>}
      </div>
      {rb && (
        <div className="admin-page__plans-form">
          <h3 className="admin-page__plans-form-title">{rY.editingId ? "Edit plan" : "Create plan"}</h3>
          <div className="admin-page__plans-fields">
            <label className="admin-page__field">
              <span className="admin-page__field-label">ID (optional)</span>
              <input className="admin-page__field-input" value={rY.id ?? ""} onChange={dP => rv("id", dP.target.value)} placeholder="e.g. premium-1m (auto if empty)" disabled={!!rY.editingId} />
            </label>
            <label className="admin-page__field">
              <span className="admin-page__field-label">Name *</span>
              <input className="admin-page__field-input" value={rY.name} onChange={dP => rv("name", dP.target.value)} placeholder="e.g. Premium 1 Month" />
            </label>
            <label className="admin-page__field admin-page__field--wide">
              <span className="admin-page__field-label">Description</span>
              <textarea className="admin-page__field-input admin-page__field-textarea" value={rY.description} onChange={dP => rv("description", dP.target.value)} placeholder="Short plan description shown on /products" rows={2} />
            </label>
            <label className="admin-page__field">
              <span className="admin-page__field-label">Price</span>
              <input className="admin-page__field-input" type="number" min={0} value={rY.price} onChange={dP => rv("price", dP.target.value === "" ? 0 : Number(dP.target.value))} />
            </label>
            <label className="admin-page__field">
              <span className="admin-page__field-label">Currency</span>
              <select className="admin-page__field-input" value={rY.currency} onChange={dP => rv("currency", dP.target.value)}>
                {PLAN_CURRENCIES.map(dP => (
                  <option value={dP} key={dP}>{dP}</option>
                ))}
              </select>
            </label>
            <label className="admin-page__field">
              <span className="admin-page__field-label">Duration (days)</span>
              <input className="admin-page__field-input" type="number" value={rY.durationDays} onChange={dP => rv("durationDays", dP.target.value === "" ? 0 : Number(dP.target.value))} placeholder="-1 for HWID reset" />
            </label>
            <label className="admin-page__field">
              <span className="admin-page__field-label">Subscription tier</span>
              <select className="admin-page__field-input" value={rY.subscriptionTier} onChange={dP => rv("subscriptionTier", dP.target.value)}>
                {PLAN_TIERS.map(dP => (
                  <option value={dP} key={dP}>{dP}</option>
                ))}
              </select>
            </label>
            <label className="admin-page__field">
              <span className="admin-page__field-label">Sort order</span>
              <input className="admin-page__field-input" type="number" value={rY.sortOrder} onChange={dP => rv("sortOrder", dP.target.value === "" ? 0 : Number(dP.target.value))} />
            </label>
            <label className="admin-page__field admin-page__field--checkbox">
              <input type="checkbox" checked={rY.isActive} onChange={dP => rv("isActive", dP.target.checked)} />
              <span className="admin-page__field-label">Active (shown on /products)</span>
            </label>
            <label className="admin-page__field admin-page__field--checkbox">
              <input type="checkbox" checked={rY.isPopular} onChange={dP => rv("isPopular", dP.target.checked)} />
              <span className="admin-page__field-label">Popular (highlighted)</span>
            </label>
          </div>
          <div className="admin-page__plans-form-actions">
            <ActionButton type="button" variant="primary" onClick={rO} disabled={rJ || !rY.name.trim()}>
              {rJ ? "Saving…" : rY.editingId ? "Save changes" : "Create plan"}
            </ActionButton>
            <ActionButton type="button" variant="secondary" onClick={() => rh(false)}>
              Cancel
            </ActionButton>
          </div>
        </div>
      )}
      <div className="admin-page__table" role="table" aria-label="Payment plans">
        <div className="admin-page__row admin-page__row--head admin-page__row--plans" role="row">
          <div className="admin-page__cell" role="columnheader">ID</div>
          <div className="admin-page__cell" role="columnheader">Name</div>
          <div className="admin-page__cell" role="columnheader">Price</div>
          <div className="admin-page__cell" role="columnheader">Days</div>
          <div className="admin-page__cell" role="columnheader">Tier</div>
          <div className="admin-page__cell" role="columnheader">Status</div>
          <div className="admin-page__cell" role="columnheader">Popular</div>
          <div className="admin-page__cell admin-page__cell--right" role="columnheader">Actions</div>
        </div>
        <div className="admin-page__body" role="rowgroup">
          {rE ? (
            <div className="admin-page__empty-state">Loading…</div>
          ) : rS.length === 0 ? (
            <div className="admin-page__empty-state">No plans yet. Create one above.</div>
          ) : (
            rS.map(dP => (
              <div className="admin-page__row admin-page__row--plans" role="row" key={dP.id}>
                <div className="admin-page__cell admin-page__cell--mono admin-page__cell--muted" role="cell" title={dP.id}>{dP.id}</div>
                <div className="admin-page__cell admin-page__cell--strong" role="cell">{dP.name}</div>
                <div className="admin-page__cell" role="cell">{dP.price} {dP.currency}</div>
                <div className="admin-page__cell" role="cell">{dP.durationDays < 0 ? "HWID reset" : dP.durationDays + "d"}</div>
                <div className="admin-page__cell" role="cell">
                  <span className="admin-page__pill admin-page__pill--role">{dP.subscriptionTier}</span>
                </div>
                <div className="admin-page__cell" role="cell">
                  <span className={dP.isActive ? "admin-page__pill admin-page__pill--success" : "admin-page__pill admin-page__pill--neutral"}>{dP.isActive ? "active" : "inactive"}</span>
                </div>
                <div className="admin-page__cell" role="cell">
                  <span className={dP.isPopular ? "admin-page__pill admin-page__pill--owner" : "admin-page__pill"}>{dP.isPopular ? "yes" : "no"}</span>
                </div>
                <div className="admin-page__cell admin-page__cell--right admin-page__cell--gap" role="cell">
                  <ActionButton type="button" variant="secondary" className="admin-page__row-action" onClick={() => rK(dP)}>
                    Edit
                  </ActionButton>
                  <ActionButton type="button" variant="secondary" className="admin-page__icon-action admin-page__icon-action--danger" onClick={() => rZ(dP.id)}>
                    <TrashIcon />
                  </ActionButton>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
