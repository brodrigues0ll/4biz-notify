import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

/**
 * Retorna status de sincronização do usuário
 * Usado para polling eficiente - apenas timestamp
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      lastAutoSync: user.lastAutoSync?.toISOString() || null,
      autoSyncEnabled: user.autoSyncEnabled || false,
      autoSyncIntervalMinutes: user.autoSyncIntervalMinutes || 5,
    });
  } catch (error) {
    console.error('Erro ao buscar status de sync:', error);
    return NextResponse.json({ error: 'Erro ao buscar status' }, { status: 500 });
  }
}
