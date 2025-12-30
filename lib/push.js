import webpush from 'web-push';

// Configurar VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

/**
 * Envia notificação push para um subscription
 * @param {Object} subscription - Subscription object do Web Push API
 * @param {Object} payload - Dados da notificação
 */
export async function sendPushNotification(subscription, payload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys não configuradas. Notificações push desabilitadas.');
    return;
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar notificação push:', error);
    throw error;
  }
}

/**
 * Envia notificação de novo chamado
 * @param {Object} subscription - Subscription object
 * @param {Object} ticket - Dados do chamado
 */
export async function sendNewTicketNotification(subscription, ticket) {
  const payload = {
    title: 'Novo Chamado 4Biz',
    body: `#${ticket.ticketId}: ${ticket.title}`,
    icon: '/icon-192.svg',
    badge: '/icon-96.svg',
    data: {
      ticketId: ticket.ticketId,
      type: 'new_ticket',
      url: '/dashboard',
    },
  };

  return sendPushNotification(subscription, payload);
}

/**
 * Envia notificação de alteração de status
 * @param {Object} subscription - Subscription object
 * @param {Object} ticket - Dados do chamado
 */
export async function sendStatusChangeNotification(subscription, ticket) {
  const payload = {
    title: 'Status Alterado - 4Biz',
    body: `#${ticket.ticketId}: ${ticket.oldStatus} → ${ticket.status}`,
    icon: '/icon-192.svg',
    badge: '/icon-96.svg',
    data: {
      ticketId: ticket.ticketId,
      type: 'status_change',
      oldStatus: ticket.oldStatus,
      newStatus: ticket.status,
      url: '/dashboard',
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
    title: 'Prioridade Alterada - 4Biz',
    body: `#${ticket.ticketId}: ${ticket.oldPriority} → ${ticket.priority}`,
    icon: '/icon-192.svg',
    badge: '/icon-96.svg',
    data: {
      ticketId: ticket.ticketId,
      type: 'priority_change',
      oldPriority: ticket.oldPriority,
      newPriority: ticket.priority,
      url: '/dashboard',
    },
  };

  return sendPushNotification(subscription, payload);
}
