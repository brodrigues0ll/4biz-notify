import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { syncUserTickets } from '@/lib/sync';

/**
 * Endpoint para trigger automático de sincronização
 * Este endpoint verifica todos os usuários com auto-sync habilitado
 * e executa a sincronização se o intervalo já passou
 */
export async function GET(request) {
  try {
    // Verificar chave de autorização (opcional, para segurança)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret-change-in-production';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Buscar usuários com auto-sync habilitado
    const users = await User.find({
      autoSyncEnabled: true,
      fourBizEmail: { $exists: true, $ne: '' },
      fourBizPassword: { $exists: true, $ne: '' },
    });

    console.log(`[Auto-Sync] Encontrados ${users.length} usuários com auto-sync habilitado`);

    const results = [];
    const now = new Date();

    for (const user of users) {
      try {
        // Verificar se já passou o intervalo desde o último sync
        const lastSync = user.lastAutoSync || new Date(0);
        const intervalMs = (user.autoSyncIntervalMinutes || 5) * 60 * 1000;
        const nextSync = new Date(lastSync.getTime() + intervalMs);

        if (now < nextSync) {
          console.log(`[Auto-Sync] Usuário ${user.email}: próximo sync em ${Math.round((nextSync - now) / 1000 / 60)} minutos`);
          results.push({
            userId: user._id,
            email: user.email,
            status: 'skipped',
            reason: 'Intervalo não atingido',
            nextSync: nextSync.toISOString(),
          });
          continue;
        }

        console.log(`[Auto-Sync] Sincronizando usuário ${user.email}...`);

        // Executar sincronização
        const syncResult = await syncUserTickets(user._id.toString());

        // Atualizar lastAutoSync
        await User.findByIdAndUpdate(user._id, {
          lastAutoSync: now,
        });

        console.log(`[Auto-Sync] Usuário ${user.email}: ${syncResult.stats.new} novos, ${syncResult.stats.updated} atualizados`);

        results.push({
          userId: user._id,
          email: user.email,
          status: 'success',
          stats: syncResult.stats,
          lastSync: now.toISOString(),
        });

      } catch (error) {
        console.error(`[Auto-Sync] Erro ao sincronizar usuário ${user.email}:`, error);
        results.push({
          userId: user._id,
          email: user.email,
          status: 'error',
          error: error.message,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log(`[Auto-Sync] Finalizado: ${successCount} sucesso, ${errorCount} erros, ${skippedCount} pulados`);

    return NextResponse.json({
      success: true,
      message: 'Auto-sync executado',
      summary: {
        total: users.length,
        success: successCount,
        errors: errorCount,
        skipped: skippedCount,
      },
      results,
    });

  } catch (error) {
    console.error('[Auto-Sync] Erro geral:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao executar auto-sync' },
      { status: 500 }
    );
  }
}
