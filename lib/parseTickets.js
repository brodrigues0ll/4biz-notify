/**
 * Compara dois arrays de tickets e identifica novos, alterados e removidos
 * @param {Array} oldTickets - Tickets antigos do banco
 * @param {Array} newTickets - Tickets novos extraídos via Playwright
 * @returns {Object} Objeto com tickets novos, alterados, inalterados e removidos
 */
export function compareTickets(oldTickets, newTickets) {
  const oldTicketsMap = new Map(
    oldTickets.map((t) => [t.ticketId.toString(), t])
  );

  const newTicketsMap = new Map(
    newTickets.map((t) => {
      const ticketId = t.ticketId?.toString() || t.numero?.toString();
      return [ticketId, t];
    })
  );

  const result = {
    new: [],
    updated: [],
    unchanged: [],
    removed: [],
  };

  // Processar tickets novos e atualizados
  newTickets.forEach((newTicket) => {
    const ticketIdStr = newTicket.ticketId?.toString() || newTicket.numero?.toString();
    const oldTicket = oldTicketsMap.get(ticketIdStr);

    if (!oldTicket) {
      // Ticket novo
      result.new.push(newTicket);
    } else if (
      oldTicket.status !== newTicket.status ||
      oldTicket.priority !== newTicket.priority
    ) {
      // Ticket alterado
      result.updated.push({
        ...newTicket,
        oldStatus: oldTicket.status,
        oldPriority: oldTicket.priority,
      });
    } else {
      // Ticket sem alterações
      result.unchanged.push(newTicket);
    }
  });

  // Identificar tickets removidos (existem no banco mas não na 4Biz)
  oldTickets.forEach((oldTicket) => {
    const ticketIdStr = oldTicket.ticketId.toString();
    if (!newTicketsMap.has(ticketIdStr)) {
      result.removed.push(oldTicket);
    }
  });

  return result;
}
