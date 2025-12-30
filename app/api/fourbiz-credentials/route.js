import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req) {
  try {
    console.log('[fourbiz-credentials] POST - Iniciando salvamento de credenciais');

    const session = await getServerSession(authOptions);
    console.log('[fourbiz-credentials] Session:', session ? 'Autenticado' : 'Não autenticado');

    if (!session) {
      console.log('[fourbiz-credentials] Erro: Usuário não autenticado');
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      );
    }

    const { email, password } = await req.json();
    console.log('[fourbiz-credentials] Email recebido:', email ? 'Sim' : 'Não');
    console.log('[fourbiz-credentials] Senha recebida:', password ? 'Sim' : 'Não');

    if (!email || !password) {
      console.log('[fourbiz-credentials] Erro: Email ou senha não fornecidos');
      return NextResponse.json(
        { error: "Email e senha da 4Biz são obrigatórios" },
        { status: 400 }
      );
    }

    console.log('[fourbiz-credentials] Conectando ao MongoDB...');
    await dbConnect();

    // NOTA: A senha é armazenada em texto claro no banco
    // porque precisamos dela para fazer login automático na 4Biz
    // Em produção, considere usar criptografia reversível (AES) com chave no .env
    console.log('[fourbiz-credentials] Atualizando usuário:', session.user.email);

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      {
        fourBizEmail: email,
        fourBizPassword: password,
        fourBizSessionCookies: '', // Limpar cookies antigos
        fourBizSessionExpiry: null,
      },
      { new: true }
    );

    if (!user) {
      console.log('[fourbiz-credentials] Erro: Usuário não encontrado');
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    console.log('[fourbiz-credentials] Sucesso! Credenciais salvas');
    console.log('[fourbiz-credentials] Email 4Biz:', user.fourBizEmail);

    return NextResponse.json({
      success: true,
      message: "Credenciais da 4Biz salvas com sucesso",
    });

  } catch (error) {
    console.error("Erro ao salvar credenciais:", error);
    return NextResponse.json(
      { error: "Erro ao salvar credenciais" },
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

    const hasCredentials = !!(user.fourBizEmail && user.fourBizPassword);

    return NextResponse.json({
      hasCredentials,
      email: hasCredentials ? user.fourBizEmail : null,
      sessionValid: user.fourBizSessionExpiry ? new Date(user.fourBizSessionExpiry) > new Date() : false,
    });

  } catch (error) {
    console.error("Erro ao buscar credenciais:", error);
    return NextResponse.json(
      { error: "Erro ao buscar credenciais" },
      { status: 500 }
    );
  }
}
