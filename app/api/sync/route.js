import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { syncUserTickets } from "@/lib/sync";

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

    // Usar função compartilhada de sincronização
    const result = await syncUserTickets(user._id.toString());

    return NextResponse.json(result);

  } catch (error) {
    console.error("Erro na sincronização:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao sincronizar" },
      { status: 500 }
    );
  }
}
