import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { subscription } = await req.json();

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription não fornecido" },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        phoneToken: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Celular pareado com sucesso",
    });

  } catch (error) {
    console.error("Erro ao salvar subscription:", error);
    return NextResponse.json(
      { error: "Erro ao parear celular" },
      { status: 500 }
    );
  }
}

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

    const isPaired = !!(user.phoneToken?.endpoint);

    return NextResponse.json({
      isPaired,
      phoneToken: isPaired ? {
        endpoint: user.phoneToken.endpoint.substring(0, 50) + '...'
      } : null,
    });

  } catch (error) {
    console.error("Erro ao verificar subscription:", error);
    return NextResponse.json(
      { error: "Erro ao verificar pareamento" },
      { status: 500 }
    );
  }
}
