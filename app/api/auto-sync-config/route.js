import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

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
      autoSyncEnabled: user.autoSyncEnabled || false,
      autoSyncIntervalMinutes: user.autoSyncIntervalMinutes || 5,
      lastAutoSync: user.lastAutoSync,
    });
  } catch (error) {
    console.error('Erro ao buscar configurações de auto-sync:', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { autoSyncEnabled, autoSyncIntervalMinutes } = body;

    // Validações
    if (typeof autoSyncEnabled !== 'boolean') {
      return NextResponse.json({ error: 'autoSyncEnabled deve ser boolean' }, { status: 400 });
    }

    if (autoSyncIntervalMinutes !== undefined) {
      if (typeof autoSyncIntervalMinutes !== 'number' || autoSyncIntervalMinutes < 1) {
        return NextResponse.json({ error: 'autoSyncIntervalMinutes deve ser >= 1' }, { status: 400 });
      }
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Atualizar configurações
    user.autoSyncEnabled = autoSyncEnabled;
    if (autoSyncIntervalMinutes !== undefined) {
      user.autoSyncIntervalMinutes = autoSyncIntervalMinutes;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      autoSyncEnabled: user.autoSyncEnabled,
      autoSyncIntervalMinutes: user.autoSyncIntervalMinutes,
    });
  } catch (error) {
    console.error('Erro ao salvar configurações de auto-sync:', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}
