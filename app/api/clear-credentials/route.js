import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

/**
 * Limpa as credenciais antigas (email/senha criptografadas com chave antiga)
 * Útil quando a ENCRYPTION_KEY mudou
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    await dbConnect();

    await User.findOneAndUpdate(
      { email: session.user.email },
      {
        fourBizEmail: '',
        fourBizPassword: '',
        fourBizSessionCookies: '',
        fourBizSessionExpiry: null,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Credenciais antigas removidas. Configure cookies manualmente em /settings',
    });
  } catch (error) {
    console.error('Erro ao limpar credenciais:', error);
    return NextResponse.json(
      { error: 'Erro ao limpar credenciais' },
      { status: 500 }
    );
  }
}
