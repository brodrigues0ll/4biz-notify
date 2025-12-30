import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Ticket from '@/models/Ticket';
import { login4Biz } from '@/lib/4biz';
import { compareTickets } from '@/lib/parseTickets';
import {
  sendNewTicketNotification,
  sendStatusChangeNotification,
} from '@/lib/push';

/**
 * Executa sincronização de tickets para um usuário específico
 * @param {string} userId - ID do usuário no MongoDB
 * @returns {Object} Resultado da sincronização
 */
export async function syncUserTickets(userId) {
  await dbConnect();

  const user = await User.findById(userId);

  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  if (!user.fourBizEmail || !user.fourBizPassword) {
    throw new Error('Credenciais da 4Biz não configuradas');
  }

  // Login na 4Biz e buscar tickets
  const loginResult = await login4Biz(user.fourBizEmail, user.fourBizPassword);
  const { cookies, tickets: newTicketsData } = loginResult;

  // Atualizar cookies de sessão
  if (cookies) {
    await User.findByIdAndUpdate(user._id, {
      fourBizSessionCookies: cookies,
      fourBizSessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  }

  // Comparar tickets existentes com novos
  const existingTickets = await Ticket.find({ userId: user._id });
  const comparison = compareTickets(existingTickets, newTicketsData);

  // Processar novos tickets
  for (const ticketData of comparison.new) {
    const ticket = await Ticket.create({
      userId: user._id,
      ...ticketData,
    });

    // Enviar notificação de novo ticket
    if (user.phoneToken?.endpoint) {
      try {
        await sendNewTicketNotification(user.phoneToken, ticket);
      } catch (error) {
        console.error('Erro ao enviar notificação de novo ticket:', error);
      }
    }
  }

  // Atualizar tickets modificados
  for (const ticketData of comparison.updated) {
    await Ticket.findOneAndUpdate(
      { userId: user._id, ticketId: ticketData.ticketId },
      {
        ...ticketData,
        updatedAt: new Date(),
      }
    );

    // Enviar notificação de mudança de status
    if (user.phoneToken?.endpoint) {
      try {
        await sendStatusChangeNotification(user.phoneToken, ticketData);
      } catch (error) {
        console.error('Erro ao enviar notificação de mudança:', error);
      }
    }
  }

  // Atualizar tickets inalterados (refresh)
  for (const ticketData of comparison.unchanged) {
    await Ticket.findOneAndUpdate(
      { userId: user._id, ticketId: ticketData.ticketId },
      ticketData
    );
  }

  // Deletar tickets removidos (não existem mais na 4Biz)
  for (const ticketData of comparison.removed) {
    await Ticket.findOneAndDelete({
      userId: user._id,
      ticketId: ticketData.ticketId,
    });
    console.log(`Ticket removido: #${ticketData.ticketId} - ${ticketData.title}`);
  }

  return {
    success: true,
    message: 'Sincronização concluída',
    stats: {
      total: newTicketsData.length,
      new: comparison.new.length,
      updated: comparison.updated.length,
      unchanged: comparison.unchanged.length,
      removed: comparison.removed.length,
    },
    lastSync: new Date().toISOString(),
  };
}
