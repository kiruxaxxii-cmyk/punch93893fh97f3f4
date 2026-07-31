import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ApiError,
  apiCreateTicket,
  apiTicket,
  apiTicketClose,
  apiTicketDelete,
  apiTicketMarkRead,
  apiTicketReply,
  apiTicketTake,
  apiTickets,
  errorMessage
} from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { useLanguage } from "../lib/lang.jsx";
import { useNotice } from "../lib/notice.jsx";
import { ActionButton, BlurPanel } from "./shared.jsx";
import { TICKETS_COPY, assigneeLabel, authorRoleLabel, ticketTime } from "./tickets/copy.js";

export default function TicketsWorkspace({
  staffMode = false,
  compactMode = false,
  showComposer = !staffMode,
  showDeskActions = staffMode,
  deskHref
}) {
  const { user } = useAuth();
  const { locale } = useLanguage();
  const { pushNotice } = useNotice();
  const copy = TICKETS_COPY[locale];
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState(staffMode ? "open" : "all");
  const [toolbarStatus, setToolbarStatus] = useState("");
  const [composerTitle, setComposerTitle] = useState("");
  const [composerMessage, setComposerMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const [view, setView] = useState("thread");
  const [loading, setLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const selectedIdRef = useRef(null);
  const messagesRef = useRef(null);
  const refreshRef = useRef(async () => {});
  const openTicketRef = useRef(async () => {});

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const node = messagesRef.current;
    if (node) {
      node.scrollTo({ top: node.scrollHeight, behavior });
    }
  }, []);

  const refreshTickets = useCallback(
    async (autoSelect = true) => {
      if (!user) return;
      setLoading(true);
      try {
        const list = await apiTickets();
        setTickets(list);
        setToolbarStatus(copy.toolbarStatus(list.length));
        setSelectedId((prev) => (autoSelect && prev && list.some((ticket) => ticket.id === prev) ? prev : list[0]?.id ?? null));
        if (list.length === 0) {
          setDetail(null);
          if (showComposer) {
            setView("composer");
          }
        }
      } catch (err) {
        const message = errorMessage(err, copy.notices.loadFailed);
        setToolbarStatus(message);
        pushNotice({ tone: "error", title: staffMode ? "Support desk" : "Support", message });
      } finally {
        setLoading(false);
      }
    },
    [copy.notices.loadFailed, copy, pushNotice, showComposer, staffMode, user]
  );

  const markRead = useCallback(
    async (id) => {
      try {
        await apiTicketMarkRead(id);
        setTickets((prev) => prev.map((ticket) => (ticket.id === id ? { ...ticket, unread: false } : ticket)));
        setDetail((prev) =>
          !prev || prev.ticket.id !== id ? prev : { ...prev, ticket: { ...prev.ticket, unread: false } }
        );
      } catch {
        setToolbarStatus(copy.notices.readFailed);
      }
    },
    [copy.notices.readFailed]
  );

  const openTicket = useCallback(
    async (id, shouldMarkRead = true) => {
      if (!id) {
        setDetail(null);
        return;
      }
      setThreadLoading(true);
      try {
        const loaded = await apiTicket(id);
        setDetail(loaded);
        if (shouldMarkRead && loaded.ticket.unread) {
          markRead(id);
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setDetail(null);
          setSelectedId(null);
          await refreshTickets(false);
        } else {
          setToolbarStatus(errorMessage(err, copy.notices.loadFailed));
        }
      } finally {
        setThreadLoading(false);
      }
    },
    [copy.notices.loadFailed, markRead, refreshTickets]
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    refreshRef.current = refreshTickets;
  }, [refreshTickets]);

  useEffect(() => {
    openTicketRef.current = openTicket;
  }, [openTicket]);

  useEffect(() => {
    refreshTickets(false);
  }, [refreshTickets]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    openTicket(selectedId);
  }, [openTicket, selectedId]);

  useEffect(() => {
    if (detail?.ticket.id) {
      window.requestAnimationFrame(() => scrollToBottom("auto"));
    }
  }, [detail?.ticket.id, scrollToBottom]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => {
      refreshRef.current();
      if (selectedIdRef.current) {
        openTicketRef.current(selectedIdRef.current, false);
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [user?.id]);

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (staffMode) {
        if (
          (filter === "open" && ticket.status !== "open") ||
          (filter === "closed" && ticket.status !== "closed") ||
          (filter === "unassigned" && (ticket.status !== "open" || ticket.assignedToUserId)) ||
          (filter === "mine" && ticket.assignedToUserId !== user?.id)
        ) {
          return false;
        }
      } else if (filter === "open" && ticket.status !== "open") {
        return false;
      } else if (filter === "closed" && ticket.status !== "closed") {
        return false;
      }
      if (!query) return true;
      return [
        ticket.title,
        ticket.userDisplayName,
        ticket.userEmail ?? "",
        ticket.assignedToDisplayName ?? "",
        ticket.lastMessagePreview
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [filter, search, staffMode, tickets, user?.id]);

  const rootClassName = compactMode ? "support-workspace support-workspace--compact" : "support-workspace";
  const composerActive = showComposer && view === "composer";
  const filterKeys = staffMode ? ["all", "open", "unassigned", "mine", "closed"] : ["all", "open", "closed"];

  const handleCreate = async () => {
    setCreating(true);
    try {
      const created = await apiCreateTicket({ title: composerTitle, message: composerMessage });
      setComposerTitle("");
      setComposerMessage("");
      setDetail(created);
      setSelectedId(created.ticket.id);
      setView("thread");
      setToolbarStatus(copy.notices.ticketCreated);
      pushNotice({ tone: "success", title: "Support", message: copy.notices.ticketCreated });
      await refreshTickets(false);
      markRead(created.ticket.id);
      window.requestAnimationFrame(() => scrollToBottom("auto"));
    } catch (err) {
      const message = errorMessage(err, copy.notices.loadFailed);
      setToolbarStatus(message);
      pushNotice({ tone: "error", title: "Support", message });
    } finally {
      setCreating(false);
    }
  };

  const handleTake = async () => {
    if (!selectedId) {
      setToolbarStatus(copy.notices.noSelection);
      return;
    }
    setActionBusy(true);
    try {
      await apiTicketTake(selectedId);
      setToolbarStatus(copy.notices.ticketTaken);
      pushNotice({ tone: "success", title: "Support desk", message: copy.notices.ticketTaken });
      await refreshTickets();
      await openTicket(selectedId, false);
    } catch (err) {
      const message = errorMessage(err, copy.notices.loadFailed);
      setToolbarStatus(message);
      pushNotice({ tone: "error", title: "Support desk", message });
    } finally {
      setActionBusy(false);
    }
  };

  const handleClose = async () => {
    if (!selectedId) {
      setToolbarStatus(copy.notices.noSelection);
      return;
    }
    setActionBusy(true);
    try {
      await apiTicketClose(selectedId);
      setToolbarStatus(copy.notices.ticketClosed);
      pushNotice({ tone: "success", title: "Support", message: copy.notices.ticketClosed });
      await refreshTickets();
      await openTicket(selectedId, false);
    } catch (err) {
      const message = errorMessage(err, copy.notices.loadFailed);
      setToolbarStatus(message);
      pushNotice({ tone: "error", title: "Support", message });
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) {
      setToolbarStatus(copy.notices.noSelection);
      return;
    }
    setActionBusy(true);
    try {
      await apiTicketDelete(selectedId);
      setToolbarStatus(copy.notices.ticketDeleted);
      pushNotice({ tone: "success", title: "Support", message: copy.notices.ticketDeleted });
      setDetail(null);
      setSelectedId(null);
      await refreshTickets(false);
    } catch (err) {
      const message = errorMessage(err, copy.notices.loadFailed);
      setToolbarStatus(message);
      pushNotice({ tone: "error", title: "Support", message });
    } finally {
      setActionBusy(false);
    }
  };

  const handleReply = async () => {
    if (!selectedId) {
      setToolbarStatus(copy.notices.noSelection);
      return;
    }
    if (detail?.ticket.status === "closed") {
      setToolbarStatus(copy.notices.closedTicketReply);
      return;
    }
    setSending(true);
    try {
      await apiTicketReply(selectedId, { message: replyText });
      setReplyText("");
      setToolbarStatus(copy.notices.messageSent);
      pushNotice({ tone: "success", title: "Support", message: copy.notices.messageSent });
      await refreshTickets();
      await openTicket(selectedId, false);
      window.requestAnimationFrame(() => scrollToBottom());
    } catch (err) {
      const message = errorMessage(err, copy.notices.loadFailed);
      setToolbarStatus(message);
      pushNotice({ tone: "error", title: "Support", message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={rootClassName}>
      <div className="support-workspace__layout">
        <BlurPanel as="aside" className="support-workspace__sidebar">
          <div className="support-workspace__sidebar-head">
            <div className="support-workspace__sidebar-topline">
              <div className="support-workspace__sidebar-heading">
                <h2 className="support-workspace__sidebar-title">{copy.ticketListTitle}</h2>
                <span className="support-workspace__sidebar-status">{toolbarStatus || copy.toolbarStatus(tickets.length)}</span>
              </div>
              <div className="support-workspace__sidebar-actions">
                {showComposer ? (
                  <button
                    type="button"
                    className="support-workspace__text-action"
                    onClick={() => setView((current) => (current === "composer" && selectedId ? "thread" : "composer"))}
                  >
                    {view === "composer" && selectedId ? copy.openConversation : copy.newTicket}
                  </button>
                ) : null}
                {deskHref ? (
                  <Link to={deskHref} className="support-workspace__desk-link">
                    {copy.openDesk}
                  </Link>
                ) : null}
              </div>
            </div>
            <div
              className="support-workspace__filters"
              role="tablist"
              aria-label={staffMode ? "Support desk filters" : "Support ticket filters"}
            >
              {filterKeys.map((key) => (
                <button
                  type="button"
                  className={
                    filter === key
                      ? "support-workspace__filter support-workspace__filter--active"
                      : "support-workspace__filter"
                  }
                  onClick={() => setFilter(key)}
                  key={key}
                >
                  {copy.filters[key]}
                </button>
              ))}
            </div>
            <label className="support-workspace__search">
              <input
                type="search"
                className="glass-input support-workspace__input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={copy.searchPlaceholder}
              />
            </label>
          </div>
          <div className="support-workspace__list">
            {filteredTickets.length ? (
              filteredTickets.map((ticket) => (
                <button
                  type="button"
                  className={
                    selectedId === ticket.id
                      ? "support-workspace__ticket-button support-workspace__ticket-button--active"
                      : "support-workspace__ticket-button"
                  }
                  onClick={() => {
                    setSelectedId(ticket.id);
                    setView("thread");
                  }}
                  key={ticket.id}
                >
                  <div className="support-workspace__ticket-head">
                    <strong className="support-workspace__ticket-title">{ticket.title}</strong>
                    <span className="support-workspace__ticket-time">{ticketTime(ticket)}</span>
                  </div>
                  <div className="support-workspace__ticket-meta support-workspace__ticket-meta--summary">
                    <span
                      className={
                        ticket.status === "open"
                          ? "support-workspace__ticket-state support-workspace__ticket-state--open"
                          : "support-workspace__ticket-state"
                      }
                    >
                      {copy.status[ticket.status]}
                    </span>
                    <span className="support-workspace__ticket-separator" aria-hidden="true">
                      •
                    </span>
                    <span className="support-workspace__meta">{assigneeLabel(ticket, copy)}</span>
                    <span className="support-workspace__ticket-separator" aria-hidden="true">
                      •
                    </span>
                    <span className="support-workspace__meta">{copy.messageCountMeta(ticket.messageCount)}</span>
                    <span className="support-workspace__ticket-separator" aria-hidden="true">
                      •
                    </span>
                    <span
                      className={
                        ticket.unread
                          ? "support-workspace__read-state support-workspace__read-state--unread"
                          : "support-workspace__read-state"
                      }
                    >
                      {ticket.unread ? copy.status.unread : copy.status.read}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="support-workspace__empty">{copy.listEmpty}</div>
            )}
          </div>
        </BlurPanel>
        <div className="support-workspace__stack">
          <BlurPanel as="section" className="support-workspace__panel">
            {composerActive ? (
              <div className="support-workspace__stack">
                <div className="support-workspace__composer-head">
                  <h2 className="support-workspace__composer-title">{copy.composerTitle}</h2>
                  {compactMode ? null : <p className="support-workspace__composer-note">{copy.composerNote}</p>}
                </div>
                <div className="support-workspace__field">
                  <span className="support-workspace__field-label">{copy.ticketTitleLabel}</span>
                  <input
                    className="glass-input support-workspace__input"
                    value={composerTitle}
                    onChange={(event) => setComposerTitle(event.target.value.slice(0, 96))}
                    placeholder={copy.ticketTitlePlaceholder}
                  />
                  <span className="support-workspace__limit">{composerTitle.length}/96</span>
                </div>
                <div className="support-workspace__field">
                  <span className="support-workspace__field-label">{copy.ticketMessageLabel}</span>
                  <textarea
                    className="glass-textarea support-workspace__textarea"
                    value={composerMessage}
                    onChange={(event) => setComposerMessage(event.target.value.slice(0, 1500))}
                    placeholder={copy.ticketMessagePlaceholder}
                  />
                  <span className="support-workspace__limit">{composerMessage.length}/1500</span>
                </div>
                <div className="support-workspace__composer-footer">
                  {selectedId ? (
                    <button type="button" className="support-workspace__text-action" onClick={() => setView("thread")}>
                      {copy.openConversation}
                    </button>
                  ) : (
                    <span className="support-workspace__status">
                      {loading ? "..." : copy.toolbarStatus(filteredTickets.length)}
                    </span>
                  )}
                  <ActionButton
                    type="button"
                    variant="primary"
                    disabled={creating || !composerTitle.trim() || !composerMessage.trim()}
                    onClick={handleCreate}
                  >
                    {creating ? copy.creatingTicket : copy.createTicket}
                  </ActionButton>
                </div>
              </div>
            ) : detail ? (
              <div className="support-workspace__stack">
                <div className="support-workspace__panel-head">
                  <div>
                    <h2 className="support-workspace__panel-title">{detail.ticket.title}</h2>
                    <p className="support-workspace__panel-note">
                      {copy.updatedAt}: {detail.ticket.updatedAt}
                    </p>
                  </div>
                  <div className="support-workspace__panel-actions">
                    <span
                      className={
                        detail.ticket.status === "open"
                          ? "support-workspace__ticket-state support-workspace__ticket-state--open"
                          : "support-workspace__ticket-state"
                      }
                    >
                      {copy.status[detail.ticket.status]}
                    </span>
                    <div className="support-workspace__panel-action-row">
                      {deskHref ? (
                        <Link to={deskHref} className="support-workspace__desk-link">
                          {copy.openDesk}
                        </Link>
                      ) : null}
                      {showDeskActions && detail.ticket.canTake ? (
                        <ActionButton type="button" variant="secondary" disabled={actionBusy} onClick={handleTake}>
                          {copy.takeTicket}
                        </ActionButton>
                      ) : null}
                      {showDeskActions && detail.ticket.canClose ? (
                        <ActionButton type="button" variant="secondary" disabled={actionBusy} onClick={handleClose}>
                          {copy.closeTicket}
                        </ActionButton>
                      ) : null}
                      {showDeskActions && detail.ticket.canDelete ? (
                        <ActionButton type="button" variant="secondary" disabled={actionBusy} onClick={handleDelete}>
                          {copy.deleteTicket}
                        </ActionButton>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="support-workspace__thread-meta">
                  <span className="support-workspace__meta">
                    {copy.createdBy}: {detail.ticket.userDisplayName}
                  </span>
                  <span className="support-workspace__ticket-separator" aria-hidden="true">
                    •
                  </span>
                  <span className="support-workspace__meta">
                    {copy.assignedTo}: {assigneeLabel(detail.ticket, copy)}
                  </span>
                  <span className="support-workspace__ticket-separator" aria-hidden="true">
                    •
                  </span>
                  <span
                    className={
                      detail.ticket.unread
                        ? "support-workspace__read-state support-workspace__read-state--unread"
                        : "support-workspace__read-state"
                    }
                  >
                    {detail.ticket.unread ? copy.status.unread : copy.status.read}
                  </span>
                </div>
                <div ref={messagesRef} className="support-workspace__messages">
                  {detail.messages.map((message) => (
                    <article
                      className={[
                        "support-workspace__message",
                        message.isStaff ? "support-workspace__message--staff" : "",
                        message.authorUserId === user?.id ? "support-workspace__message--own" : ""
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={message.id}
                    >
                      <div className="support-workspace__message-head">
                        <strong className="support-workspace__message-author">{message.authorDisplayName}</strong>
                        <span className="support-workspace__message-meta">
                          {authorRoleLabel(message.authorRole)} · {message.createdAt}
                        </span>
                      </div>
                      <div className="support-workspace__message-body">{message.body}</div>
                    </article>
                  ))}
                </div>
                {detail.ticket.canReply ? (
                  <div className="support-workspace__reply support-workspace__field">
                    <span className="support-workspace__field-label">{copy.replyTitle}</span>
                    <textarea
                      className="glass-textarea support-workspace__textarea"
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value.slice(0, 1500))}
                      placeholder={copy.replyPlaceholder}
                    />
                    <div className="support-workspace__composer-footer">
                      <span className="support-workspace__limit">{replyText.length}/1500</span>
                      <ActionButton
                        type="button"
                        variant="primary"
                        disabled={sending || !replyText.trim()}
                        onClick={handleReply}
                      >
                        {sending ? copy.sendingReply : copy.sendReply}
                      </ActionButton>
                    </div>
                  </div>
                ) : (
                  <p className="support-workspace__reply-disabled">
                    {detail.ticket.status === "closed" ? copy.notices.closedTicketReply : copy.notices.replyLocked}
                  </p>
                )}
              </div>
            ) : (
              <div className="support-workspace__empty">{threadLoading ? "..." : copy.threadEmpty}</div>
            )}
          </BlurPanel>
        </div>
      </div>
    </div>
  );
}
