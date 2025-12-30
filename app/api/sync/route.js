import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Ticket from "@/models/Ticket";
import { login4Biz } from "@/lib/login4biz";
import { compareTickets } from "@/lib/parseTickets";
import {
  sendNewTicketNotification,
  sendStatusChangeNotification,
} from "@/lib/push";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    if (!user.fourBizEmail || !user.fourBizPassword) {
      return NextResponse.json(
        { error: "Credenciais da 4Biz não configuradas. Configure email e senha nas configurações." },
        { status: 400 }
      );
    }

    // Fazer login e extrair tickets usando Playwright
    console.log("🔄 Iniciando login e extração com Playwright...");
    const loginResult = await login4Biz(user.fourBizEmail, user.fourBizPassword);

    // login4Biz agora retorna { cookies, html, tickets }
    const { cookies, tickets: newTicketsData } = loginResult;

    // Atualizar cookies de sessão no banco (cache para próxima vez)
    if (cookies) {
      await User.findByIdAndUpdate(user._id, {
        fourBizSessionCookies: cookies,
        fourBizSessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      });
    }

    console.log(`📊 Total de tickets extraídos: ${newTicketsData?.length || 0}`);

    // Buscar tickets existentes no banco
    const existingTickets = await Ticket.find({ userId: user._id });
    console.log(`📊 Tickets existentes no banco: ${existingTickets.length}`);

    // Comparar tickets
    const comparison = compareTickets(existingTickets, newTicketsData);
    console.log(`📊 Novos: ${comparison.new.length}, Alterados: ${comparison.updated.length}, Inalterados: ${comparison.unchanged.length}`);

    // Processar novos tickets
    for (const ticketData of comparison.new) {
      const ticket = await Ticket.create({
        userId: user._id,
        ...ticketData,
      });
      console.log(`✅ Ticket criado: ${ticket.ticketId} - ${ticket.title}`);

      // Enviar notificação push se o celular estiver pareado
      if (user.phoneToken?.endpoint) {
        try {
          await sendNewTicketNotification(user.phoneToken, ticket);
        } catch (error) {
          console.error('Erro ao enviar notificação de novo ticket:', error);
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
      console.log(`🔄 Ticket atualizado: ${ticketData.ticketId} - ${ticketData.title}`);

      // Enviar notificação push se o celular estiver pareado
      if (user.phoneToken?.endpoint) {
        try {
          await sendStatusChangeNotification(user.phoneToken, ticketData);
        } catch (error) {
          console.error('Erro ao enviar notificação de alteração:', error);
        }
      }
    }

    // Atualizar tickets sem alterações (para manter dados frescos)
    for (const ticketData of comparison.unchanged) {
      await Ticket.findOneAndUpdate(
        { userId: user._id, ticketId: ticketData.ticketId },
        ticketData
      );
    }

    console.log(`✅ Sincronização concluída!`);

    return NextResponse.json({
      success: true,
      message: "Sincronização concluída",
      stats: {
        total: newTicketsData.length,
        new: comparison.new.length,
        updated: comparison.updated.length,
        unchanged: comparison.unchanged.length,
      },
      lastSync: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Erro na sincronização:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao sincronizar" },
      { status: 500 }
    );
  }
}
