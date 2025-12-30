/**
 * Compara dois arrays de tickets e identifica novos e alterados
 * @param {Array} oldTickets - Tickets antigos do banco
 * @param {Array} newTickets - Tickets novos extraídos via Playwright
 * @returns {Object} Objeto com tickets novos e alterados
 */
export function compareTickets(oldTickets, newTickets) {
  const oldTicketsMap = new Map(
    oldTickets.map((t) => [t.ticketId.toString(), t])
  );

  const result = {
    new: [],
    updated: [],
    unchanged: [],
  };

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

  return result;
}
