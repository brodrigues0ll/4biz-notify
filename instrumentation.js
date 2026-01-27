/**
 * Instrumentation file - executado quando o servidor Next.js inicia
 * Usado para inicializar serviços como cron jobs
 */
export async function register() {
  console.log('');
  console.log('🔧 [Instrumentation] Iniciando...');
  console.log(`🔧 [Instrumentation] NEXT_RUNTIME: ${process.env.NEXT_RUNTIME || 'undefined'}`);
  console.log(`🔧 [Instrumentation] NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🔧 [Instrumentation] ✅ Runtime é Node.js - Inicializando cron...');
    // Apenas no servidor Node.js (não no Edge Runtime)
    const { initAutoSyncCron } = await import('./lib/cron.js');
    initAutoSyncCron();
  } else {
    console.log('🔧 [Instrumentation] ⚠️  Runtime não é Node.js - Cron não será inicializado');
  }
}
