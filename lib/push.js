import webpush from "web-push";

// Controle de inicialização
let isInitialized = false;

/**
 * Inicializa webpush com VAPID keys (lazy initialization)
 */
function initializeWebPush() {
  if (isInitialized) return true;

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn(
      "VAPID keys não configuradas. Notificações push desabilitadas.",
    );
    return false;
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    isInitialized = true;
    return true;
  } catch (error) {
    console.error("Erro ao inicializar webpush:", error);
    return false;
  }
}

/**
 * Envia notificação push para um subscription
 * @param {Object} subscription - Subscription object do Web Push API
 * @param {Object} payload - Dados da notificação
 */
export async function sendPushNotification(subscription, payload) {
  // Inicializar apenas quando for enviar
  if (!initializeWebPush()) {
    return;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    console.error("Erro ao enviar notificação push:", error);
    throw error;
  }
}

/**
 * Envia notificação de novo chamado
 * @param {Object} subscription - Subscription object
 * @param {Object} ticket - Dados do chamado
 */
export async function sendNewTicketNotification(subscription, ticket) {
  const situacao = ticket.situacao || ticket.status || "Nova";

  const payload = {
    title: "Novo Chamado 4Biz",
    body: `#${ticket.ticketId}: ${ticket.title}\nSituação: ${situacao}`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      ticketId: ticket.ticketId,
      type: "new_ticket",
      situacao: situacao,
      url: "/dashboard",
    },
  };

  return sendPushNotification(subscription, payload);
}

/**
 * Envia notificação de alteração de situação
 * @param {Object} subscription - Subscription object
 * @param {Object} ticket - Dados do chamado (com oldSituacao e situacao)
 */
export async function sendStatusChangeNotification(subscription, ticket) {
  // Prioriza situacao (texto legível) sobre status (código)
  const oldSituacao = ticket.oldSituacao || ticket.oldStatus || "Anterior";
  const newSituacao = ticket.situacao || ticket.status || "Nova";

  const payload = {
    title: "Situação Alterada - 4Biz",
    body: `#${ticket.ticketId}: ${oldSituacao} → ${newSituacao}\n${ticket.descricao}`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      ticketId: ticket.ticketId,
      type: "status_change",
      oldSituacao: oldSituacao,
      newSituacao: newSituacao,
      url: "/dashboard",
    },
  };

  return sendPushNotification(subscription, payload);
}

/**
 * Envia notificação de alteração de prioridade
 * @param {Object} subscription - Subscription object
 * @param {Object} ticket - Dados do chamado
 */
export async function sendPriorityChangeNotification(subscription, ticket) {
  const payload = {
    title: "Prioridade Alterada - 4Biz",
    body: `#${ticket.ticketId}: ${ticket.oldPriority} → ${ticket.priority}`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      ticketId: ticket.ticketId,
      type: "priority_change",
      oldPriority: ticket.oldPriority,
      newPriority: ticket.priority,
      url: "/dashboard",
    },
  };

  return sendPushNotification(subscription, payload);
}
