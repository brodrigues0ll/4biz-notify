import cron from 'node-cron';
import dbConnect from './mongodb.js';
import User from '../models/User.js';
import { syncUserTickets } from './sync.js';

let cronInitialized = false;

/**
 * Inicializa o cron job de auto-sync
 * Roda a cada 1 minuto e verifica o intervalo configurado individualmente por usuário
 */
export function initAutoSyncCron() {
  // Prevenir múltiplas inicializações
  if (cronInitialized) {
    console.log('[Cron] ⚠️  Auto-sync já inicializado');
    return;
  }

  // Executar a cada 1 minuto para verificar usuários
  // Cada usuário tem seu próprio intervalo configurado
  const cronPattern = '* * * * *';  // A cada minuto

  console.log('');
  console.log('='.repeat(60));
  console.log('[Cron] 🚀 INICIALIZANDO AUTO-SYNC');
  console.log('[Cron] ⏱️  Verificação a cada 1 minuto');
  console.log('[Cron] 📋 Cada usuário tem seu próprio intervalo');
  console.log('[Cron] 🍪 Usa cookies configurados em /settings');
  console.log('='.repeat(60));
  console.log('');

  // Executar no intervalo configurado
  cron.schedule(cronPattern, async () => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('pt-BR');

    try {
      console.log(`\n[Cron ${timestamp}] 🔄 Executando verificação de auto-sync...`);

      await dbConnect();

      // Buscar usuários com auto-sync habilitado
      // Aceita usuários com cookies OU com email/senha
      const users = await User.find({
        autoSyncEnabled: true,
        $or: [
          // Tem credenciais (email/senha)
          {
            fourBizEmail: { $exists: true, $ne: '' },
            fourBizPassword: { $exists: true, $ne: '' },
          },
          // OU tem cookies configurados
          {
            fourBizSessionCookie: { $exists: true, $ne: '' },
            fourBizAuthToken: { $exists: true, $ne: '' },
          },
        ],
      });

      if (users.length === 0) {
        console.log(`[Cron ${timestamp}] ℹ️  Nenhum usuário com auto-sync habilitado`);
        return;
      }

      console.log(`[Cron ${timestamp}] ✅ Encontrados ${users.length} usuários com auto-sync habilitado`);
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (const user of users) {
        try {
          // Verificar se já passou o intervalo desde o último sync
          const lastSync = user.lastAutoSync || new Date(0);
          const intervalMinutes = user.autoSyncIntervalMinutes || 5;
          const intervalMs = intervalMinutes * 60 * 1000;
          const nextSync = new Date(lastSync.getTime() + intervalMs);
          const minutesSinceLastSync = Math.floor((now - lastSync) / 60000);

          if (now < nextSync) {
            const minutesUntilNext = Math.ceil((nextSync - now) / 60000);
            console.log(`[Cron ${timestamp}] ⏳ ${user.email}: aguardando ${minutesUntilNext} min (última sync: ${minutesSinceLastSync} min atrás)`);
            skippedCount++;
            continue;
          }

          console.log(`[Cron ${timestamp}] 🔄 Sincronizando ${user.email} (intervalo: ${intervalMinutes} min, última: ${minutesSinceLastSync} min atrás)...`);

          // Executar sincronização
          const syncResult = await syncUserTickets(user._id.toString());

          // Atualizar lastAutoSync
          await User.findByIdAndUpdate(user._id, {
            lastAutoSync: now,
          });

          console.log(`[Cron ${timestamp}] ✅ ${user.email}: ${syncResult.stats.new} novos, ${syncResult.stats.updated} atualizados, ${syncResult.stats.total} total`);
          successCount++;

        } catch (error) {
          console.error(`[Cron ${timestamp}] ❌ Erro ao sincronizar ${user.email}:`, error.message);
          errorCount++;
        }
      }

      if (successCount > 0 || errorCount > 0) {
        console.log(`\n[Cron ${timestamp}] 📊 Resumo: ${successCount} ✅ | ${errorCount} ❌ | ${skippedCount} ⏳`);
      }

    } catch (error) {
      console.error(`[Cron ${timestamp}] ❌ Erro geral ao executar auto-sync:`, error.message);
    }
  });

  cronInitialized = true;
  console.log('[Cron] ✅ Auto-sync job inicializado com sucesso');
  console.log('[Cron] 🕐 Próxima verificação em 1 minuto...');
  console.log('='.repeat(60));
  console.log('');
}
