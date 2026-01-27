/**
 * Normaliza um valor para comparação (remove espaços, converte para lowercase)
 */
function normalizeValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

/**
 * Compara dois arrays de tickets e identifica novos, alterados e removidos
 * @param {Array} oldTickets - Tickets antigos do banco
 * @param {Array} newTickets - Tickets novos extraídos via API
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
    } else {
      // Normaliza os valores para comparação
      const oldPriority = normalizeValue(oldTicket.priority);
      const newPriority = normalizeValue(newTicket.priority);
      const oldSituacao = normalizeValue(oldTicket.situacao);
      const newSituacao = normalizeValue(newTicket.situacao);

      // Só considera mudança se o ticket antigo já tinha o campo preenchido
      // Isso evita detectar como "alterado" quando o campo é novo ou estava vazio
      const priorityChanged =
        oldTicket.priority !== undefined &&
        oldTicket.priority !== null &&
        oldTicket.priority !== "" &&
        oldPriority !== newPriority;

      const situacaoChanged =
        oldTicket.situacao !== undefined &&
        oldTicket.situacao !== null &&
        oldTicket.situacao !== "" &&
        oldSituacao !== newSituacao;

      if (priorityChanged || situacaoChanged) {
        // Debug: log das alterações detectadas
        if (priorityChanged) {
          console.log(`[Ticket ${ticketIdStr}] Prioridade alterada: "${oldTicket.priority}" → "${newTicket.priority}"`);
        }
        if (situacaoChanged) {
          console.log(`[Ticket ${ticketIdStr}] Situação alterada: "${oldTicket.situacao}" → "${newTicket.situacao}"`);
        }

        // Ticket alterado
        result.updated.push({
          ...newTicket,
          oldPriority: oldTicket.priority,
          oldSituacao: oldTicket.situacao,
        });
      } else {
        // Ticket sem alterações
        result.unchanged.push(newTicket);
      }
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
