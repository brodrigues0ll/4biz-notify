/**
 * Instrumentation file - executado quando o servidor Next.js inicia
 * Usado para inicializar serviços como cron jobs
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Apenas no servidor Node.js (não no Edge Runtime)
    const { initAutoSyncCron } = await import('./lib/cron.js');
    initAutoSyncCron();
  }
}
