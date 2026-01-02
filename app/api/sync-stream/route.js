import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Ticket from "@/models/Ticket";
import { login4Biz } from "@/lib/4biz";
import { compareTickets } from "@/lib/parseTickets";
import {
  sendNewTicketNotification,
  sendStatusChangeNotification,
} from "@/lib/push";
import { decrypt } from "@/lib/crypto";

export async function GET(req) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        sendEvent({
          type: "progress",
          percent: 0,
          message: "Iniciando sincronização...",
        });

        const session = await getServerSession(authOptions);

        if (!session) {
          sendEvent({ type: "error", message: "Não autenticado" });
          controller.close();
          return;
        }

        await dbConnect();

        const user = await User.findOne({ email: session.user.email });

        if (!user) {
          sendEvent({ type: "error", message: "Usuário não encontrado" });
          controller.close();
          return;
        }

        if (!user.fourBizEmail || !user.fourBizPassword) {
          sendEvent({
            type: "error",
            message: "Credenciais da 4Biz não configuradas",
          });
          controller.close();
          return;
        }

        // Callback de progresso
        const onProgress = (percent, message) => {
          sendEvent({ type: "progress", percent, message });
        };

        // Descriptografa a senha do 4Biz
        const decryptedPassword = decrypt(user.fourBizPassword);

        // Fazer login e extrair tickets usando Playwright com callback de progresso
        const loginResult = await login4Biz(
          user.fourBizEmail,
          decryptedPassword,
          onProgress
        );

        const { cookies, tickets: newTicketsData } = loginResult;

        // Atualizar cookies de sessão no banco
        if (cookies) {
          await User.findByIdAndUpdate(user._id, {
            fourBizSessionCookies: cookies,
            fourBizSessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
          });
        }

        sendEvent({
          type: "progress",
          percent: 96,
          message: `Processando ${newTicketsData?.length || 0} tickets...`,
        });

        // Buscar tickets existentes no banco
        const existingTickets = await Ticket.find({ userId: user._id });

        // Comparar tickets
        const comparison = compareTickets(existingTickets, newTicketsData);

        sendEvent({
          type: "progress",
          percent: 97,
          message: `Salvando ${comparison.new.length} novos tickets...`,
        });

        // Processar novos tickets
        for (const ticketData of comparison.new) {
          const ticket = await Ticket.create({
            userId: user._id,
            ...ticketData,
          });

          // Enviar notificação push se o celular estiver pareado
          if (user.phoneToken?.endpoint) {
            try {
              await sendNewTicketNotification(user.phoneToken, ticket);
            } catch (error) {
              console.error(
                "Erro ao enviar notificação de novo ticket:",
                error
              );
            }
          }
        }

        // Processar tickets alterados
        for (const ticketData of comparison.updated) {
          await Ticket.findOneAndUpdate(
            { userId: user._id, ticketId: ticketData.ticketId },
            {
              ...ticketData,
              updatedAt: new Date(),
            }
          );

          // Enviar notificação push se o celular estiver pareado
          if (user.phoneToken?.endpoint) {
            try {
              await sendStatusChangeNotification(user.phoneToken, ticketData);
            } catch (error) {
              console.error("Erro ao enviar notificação de alteração:", error);
            }
          }
        }

        // Atualizar tickets sem alterações
        for (const ticketData of comparison.unchanged) {
          await Ticket.findOneAndUpdate(
            { userId: user._id, ticketId: ticketData.ticketId },
            ticketData
          );
        }

        sendEvent({
          type: "progress",
          percent: 98,
          message: `Removendo ${comparison.removed.length} tickets obsoletos...`,
        });

        // Deletar tickets removidos (não existem mais na 4Biz)
        for (const ticketData of comparison.removed) {
          await Ticket.findOneAndDelete({
            userId: user._id,
            ticketId: ticketData.ticketId,
          });
        }

        sendEvent({
          type: "complete",
          percent: 100,
          message: "Sincronização concluída!",
          stats: {
            total: newTicketsData.length,
            new: comparison.new.length,
            updated: comparison.updated.length,
            unchanged: comparison.unchanged.length,
            removed: comparison.removed.length,
          },
        });

        controller.close();
      } catch (error) {
        console.error("Erro na sincronização:", error);
        sendEvent({
          type: "error",
          message: error.message || "Erro ao sincronizar",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
