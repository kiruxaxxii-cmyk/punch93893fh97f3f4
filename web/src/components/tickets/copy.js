export const TICKETS_COPY = {
  en: {
    toolbarStatus: (count) => count + " tickets loaded",
    filters: {
      all: "All",
      open: "Open",
      unassigned: "Unassigned",
      mine: "Mine",
      closed: "Closed"
    },
    searchPlaceholder: "Search tickets by title, user, assignee, or message",
    ticketListTitle: "Ticket feed",
    ticketListNote: "Users create tickets here, and Helper/Admin/Owner staff review them. The list refreshes automatically.",
    deskNote: "Moderation actions stay in Support Desk so this page remains focused on the conversation.",
    openDesk: "Open support desk",
    newTicket: "New ticket",
    openConversation: "Open conversation",
    messageCountMeta: (count) => count + " msg",
    composerTitle: "Create a new ticket",
    composerNote: "Limits: max 2 open tickets, title up to 96 chars, message up to 1500 chars, cooldown 30 seconds for users.",
    ticketTitleLabel: "Title",
    ticketTitlePlaceholder: "Describe the issue briefly",
    ticketMessageLabel: "First message",
    ticketMessagePlaceholder: "Write the details, what happened, and what you already tried.",
    createTicket: "Create ticket",
    creatingTicket: "Creating...",
    threadTitle: "Ticket thread",
    threadEmpty: "Select a ticket to read the conversation and reply.",
    listEmpty: "No tickets match the current filter.",
    replyTitle: "Reply",
    replyPlaceholder: "Write a reply for this ticket.",
    sendReply: "Send message",
    sendingReply: "Sending...",
    takeTicket: "Take ticket",
    closeTicket: "Close ticket",
    deleteTicket: "Delete ticket",
    markRead: "Read",
    assignedTo: "Reviewed by",
    createdBy: "Created by",
    updatedAt: "Updated",
    status: {
      open: "open",
      closed: "closed",
      read: "read",
      unread: "unread",
      assigned: "assigned",
      unassigned: "unassigned"
    },
    notices: {
      ticketCreated: "Support ticket created.",
      messageSent: "Support message sent.",
      ticketTaken: "Ticket is now assigned to you.",
      ticketClosed: "Ticket closed.",
      ticketDeleted: "Ticket deleted.",
      loadFailed: "Unable to load support tickets right now.",
      readFailed: "Unable to update read state.",
      noSelection: "Pick a ticket first.",
      closedTicketReply: "This ticket is closed. Reopening is not available yet.",
      replyLocked: "Only the assigned Helper/Admin/Owner can reply to this ticket."
    }
  },
  ru: {
    toolbarStatus: (count) => "Загружено тикетов: " + count,
    filters: {
      all: "Все",
      open: "Открытые",
      unassigned: "Свободные",
      mine: "Мои",
      closed: "Закрытые"
    },
    searchPlaceholder: "Поиск по заголовку, пользователю, исполнителю или сообщению",
    ticketListTitle: "Поток тикетов",
    ticketListNote: "Тикеты создают пользователи, а проверяют их Helper, Admin и Owner. Список обновляется автоматически.",
    deskNote: "Действия модератора вынесены в Support Desk, чтобы эта страница оставалась про сам диалог.",
    openDesk: "Открыть support desk",
    newTicket: "Новый тикет",
    openConversation: "Открыть переписку",
    messageCountMeta: (count) => count + " сообщ.",
    composerTitle: "Создать новый тикет",
    composerNote: "Лимиты: максимум 2 открытых тикета, заголовок до 96 символов, сообщение до 1500, кулдаун 30 секунд для пользователей.",
    ticketTitleLabel: "Заголовок",
    ticketTitlePlaceholder: "Кратко опишите проблему",
    ticketMessageLabel: "Первое сообщение",
    ticketMessagePlaceholder: "Опишите детали, что произошло и что уже пробовали сделать.",
    createTicket: "Создать тикет",
    creatingTicket: "Создаю...",
    threadTitle: "Переписка по тикету",
    threadEmpty: "Выберите тикет, чтобы открыть переписку и отвечать.",
    listEmpty: "По текущему фильтру тикеты не найдены.",
    replyTitle: "Ответ",
    replyPlaceholder: "Введите сообщение по этому тикету.",
    sendReply: "Отправить сообщение",
    sendingReply: "Отправляю...",
    takeTicket: "Взять тикет",
    closeTicket: "Закрыть тикет",
    deleteTicket: "Удалить тикет",
    markRead: "Прочитано",
    assignedTo: "Проверяет",
    createdBy: "Создал",
    updatedAt: "Обновлён",
    status: {
      open: "открыт",
      closed: "закрыт",
      read: "прочитано",
      unread: "непрочитано",
      assigned: "назначен",
      unassigned: "свободен"
    },
    notices: {
      ticketCreated: "Тикет создан.",
      messageSent: "Сообщение отправлено.",
      ticketTaken: "Тикет назначен на вас.",
      ticketClosed: "Тикет закрыт.",
      ticketDeleted: "Тикет удалён.",
      loadFailed: "Не удалось загрузить тикеты поддержки.",
      readFailed: "Не удалось обновить статус прочтения.",
      noSelection: "Сначала выберите тикет.",
      closedTicketReply: "Тикет закрыт. Повторное открытие пока не реализовано.",
      replyLocked: "Отвечать в этом тикете может только назначенный Helper/Admin/Owner."
    }
  }
};

export function ticketTime(ticket) {
  return "" + ticket.updatedAt;
}

export function authorRoleLabel(role) {
  switch (("" + (role ?? "")).trim().toLowerCase()) {
    case "helper":
      return "Helper";
    case "admin":
      return "Admin";
    case "owner":
      return "Owner";
    case "user":
      return "User";
    default:
      return ("" + (role ?? "")).trim() || "User";
  }
}

export function assigneeLabel(ticket, copy) {
  if (!ticket.assignedToDisplayName) {
    return copy.status.unassigned;
  }
  const roleSuffix = ticket.assignedToRole ? " · " + authorRoleLabel(ticket.assignedToRole) : "";
  return "" + ticket.assignedToDisplayName + roleSuffix;
}
