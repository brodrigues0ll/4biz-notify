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

    const { cookies } = await req.json();

    if (!cookies) {
      return NextResponse.json(
        { error: "Cookies não fornecidos" },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { cookies4biz: cookies },
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
      message: "Cookies atualizados com sucesso",
    });

  } catch (error) {
    console.error("Erro ao atualizar cookies:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar cookies" },
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

    const hasCookies = !!user.cookies4biz;

    return NextResponse.json({
      hasCookies,
      cookies: hasCookies ? user.cookies4biz.substring(0, 50) + '...' : null,
    });

  } catch (error) {
    console.error("Erro ao buscar cookies:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cookies" },
      { status: 500 }
    );
  }
}
