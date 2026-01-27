import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Ticket from '@/models/Ticket';
import { login4Biz, fetchTicketsFromAPI, organizarDadosTicket } from '@/lib/4biz';
import { compareTickets } from '@/lib/parseTickets';
import {
  sendNewTicketNotification,
  sendStatusChangeNotification,
} from '@/lib/push';
import { decrypt } from '@/lib/crypto';

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

  let newTicketsData;
  let cookies = null;

  // Tentar usar cookies configurados pelo usuário no banco (ÚNICO MÉTODO)
  if (user.fourBizSessionCookie && user.fourBizAuthToken) {
    try {
      console.log(`[Sync] 🍪 Usando cookies configurados pelo usuário ${user.email}`);

      // Descriptografar os cookies
      const sessionCookie = decrypt(user.fourBizSessionCookie);
      const authToken = decrypt(user.fourBizAuthToken);

      // Buscar tickets via API
      const ticketsAPI = await fetchTicketsFromAPI({
        sessionCookie,
        authToken,
      });

      newTicketsData = ticketsAPI.map(organizarDadosTicket);
      console.log(`[Sync] ✅ ${newTicketsData.length} tickets obtidos via API (método recomendado)`);

    } catch (cookieError) {
      console.error(`[Sync] ❌ Erro ao usar cookies: ${cookieError.message}`);
      console.error(`[Sync] 💡 Dica: Os cookies podem ter expirado. Atualize em /settings`);
      newTicketsData = null;
    }
  } else {
    console.log(`[Sync] ⚠️  Cookies não configurados para ${user.email}`);
  }

  // Se não conseguiu via cookies, tenta via Playwright (fallback)
  if (!newTicketsData) {
    // Verificar se tem credenciais para tentar Playwright
    if (!user.fourBizEmail || !user.fourBizPassword) {
      throw new Error('❌ Configure seus cookies da 4Biz em /settings para ativar sincronização automática');
    }

    console.log(`[Sync] Fazendo login via Playwright para ${user.email}`);

    try {
      // Descriptografa a senha do 4Biz
      const decryptedPassword = decrypt(user.fourBizPassword);

      // Login na 4Biz e buscar tickets
      const loginResult = await login4Biz(user.fourBizEmail, decryptedPassword);
      cookies = loginResult.cookies;
      newTicketsData = loginResult.tickets;

      // Atualizar cookies de sessão
      if (cookies) {
        await User.findByIdAndUpdate(user._id, {
          fourBizSessionCookies: cookies,
          fourBizSessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });
      }
    } catch (decryptError) {
      console.error(`[Sync] ❌ Erro ao descriptografar senha: ${decryptError.message}`);
      throw new Error('❌ Erro ao descriptografar credenciais. A ENCRYPTION_KEY pode ter mudado. Configure cookies manualmente em /settings');
    }
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
