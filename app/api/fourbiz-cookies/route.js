import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { encrypt } from '@/lib/crypto';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return Response.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { sessionCookie, authToken } = await req.json();

    if (!sessionCookie || !authToken) {
      return Response.json(
        { error: 'SESSION_COOKIE e AUTH_TOKEN são obrigatórios' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Criptografar os cookies antes de salvar
    const encryptedSessionCookie = encrypt(sessionCookie);
    const encryptedAuthToken = encrypt(authToken);

    await User.findOneAndUpdate(
      { email: session.user.email },
      {
        fourBizSessionCookie: encryptedSessionCookie,
        fourBizAuthToken: encryptedAuthToken,
        fourBizSessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      }
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Erro ao salvar cookies:', error);
    return Response.json(
      { error: 'Erro ao salvar cookies' },
      { status: 500 }
    );
  }
}
