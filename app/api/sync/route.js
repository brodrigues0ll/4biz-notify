import { NextResponse } from "next/server";
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

    const loginResult = await login4Biz(user.fourBizEmail, user.fourBizPassword);
    const { cookies, tickets: newTicketsData } = loginResult;

    if (cookies) {
      await User.findByIdAndUpdate(user._id, {
        fourBizSessionCookies: cookies,
        fourBizSessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    const existingTickets = await Ticket.find({ userId: user._id });
    const comparison = compareTickets(existingTickets, newTicketsData);

    for (const ticketData of comparison.new) {
      const ticket = await Ticket.create({
        userId: user._id,
        ...ticketData,
      });

      if (user.phoneToken?.endpoint) {
        try {
          await sendNewTicketNotification(user.phoneToken, ticket);
        } catch (error) {
          console.error('Erro ao enviar notificação:', error);
        }
      }
    }

    for (const ticketData of comparison.updated) {
      await Ticket.findOneAndUpdate(
        { userId: user._id, ticketId: ticketData.ticketId },
        {
          ...ticketData,
          updatedAt: new Date(),
        }
      );

      if (user.phoneToken?.endpoint) {
        try {
          await sendStatusChangeNotification(user.phoneToken, ticketData);
        } catch (error) {
          console.error('Erro ao enviar notificação:', error);
        }
      }
    }

    for (const ticketData of comparison.unchanged) {
      await Ticket.findOneAndUpdate(
        { userId: user._id, ticketId: ticketData.ticketId },
        ticketData
      );
    }

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
