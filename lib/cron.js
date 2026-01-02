import cron from 'node-cron';
import dbConnect from './mongodb.js';
import User from '../models/User.js';
import { syncUserTickets } from './sync.js';

let cronInitialized = false;

/**
 * Inicializa o cron job de auto-sync
 * Intervalo configurável via CRON_INTERVAL_MINUTES (padrão: 5 minutos)
 */
export function initAutoSyncCron() {
  // Prevenir múltiplas inicializações
  if (cronInitialized) {
    console.log('[Cron] Auto-sync já inicializado');
    return;
  }

  // Intervalo configurável via env (padrão: 5 minutos)
  const intervalMinutes = parseInt(process.env.CRON_INTERVAL_MINUTES || '5', 10);

  // Validar intervalo (mínimo 1, máximo 60 minutos)
  const validInterval = Math.max(1, Math.min(intervalMinutes, 60));

  // Criar cron pattern baseado no intervalo
  const cronPattern = validInterval === 1
    ? '* * * * *'  // A cada minuto
    : `*/${validInterval} * * * *`;  // A cada N minutos

  console.log(`[Cron] Inicializando auto-sync job (intervalo: ${validInterval} minutos)...`);

  // Executar no intervalo configurado
  cron.schedule(cronPattern, async () => {
    try {
      console.log('[Cron] Executando verificação de auto-sync...');

      await dbConnect();

      // Buscar usuários com auto-sync habilitado
      const users = await User.find({
        autoSyncEnabled: true,
        fourBizEmail: { $exists: true, $ne: '' },
        fourBizPassword: { $exists: true, $ne: '' },
      });

      if (users.length === 0) {
        return;
      }

      console.log(`[Cron] Encontrados ${users.length} usuários com auto-sync habilitado`);

      const now = new Date();
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (const user of users) {
        try {
          // Verificar se já passou o intervalo desde o último sync
          const lastSync = user.lastAutoSync || new Date(0);
          const intervalMs = (user.autoSyncIntervalMinutes || 5) * 60 * 1000;
          const nextSync = new Date(lastSync.getTime() + intervalMs);

          if (now < nextSync) {
            skippedCount++;
            continue;
          }

          console.log(`[Cron] Sincronizando usuário ${user.email}...`);

          // Executar sincronização
          const syncResult = await syncUserTickets(user._id.toString());

          // Atualizar lastAutoSync
          await User.findByIdAndUpdate(user._id, {
            lastAutoSync: now,
          });

          console.log(`[Cron] Usuário ${user.email}: ${syncResult.stats.new} novos, ${syncResult.stats.updated} atualizados`);
          successCount++;

        } catch (error) {
          console.error(`[Cron] Erro ao sincronizar usuário ${user.email}:`, error.message);
          errorCount++;
        }
      }

      if (successCount > 0 || errorCount > 0) {
        console.log(`[Cron] Auto-sync concluído: ${successCount} sucessos, ${errorCount} erros, ${skippedCount} pulados`);
      }

    } catch (error) {
      console.error('[Cron] Erro geral ao executar auto-sync:', error.message);
    }
  });

  cronInitialized = true;
  console.log(`[Cron] Auto-sync job inicializado com sucesso (a cada ${validInterval} minuto(s))`);
}
