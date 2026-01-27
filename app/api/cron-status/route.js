import { NextResponse } from 'next/server';

let cronStatus = {
  initialized: false,
  lastCheck: null,
  error: null,
};

export async function GET(req) {
  try {
    // Tentar importar e inicializar o cron se ainda não foi
    const { initAutoSyncCron } = await import('@/lib/cron.js');

    try {
      initAutoSyncCron();
      cronStatus.initialized = true;
      cronStatus.lastCheck = new Date().toISOString();
      cronStatus.error = null;
    } catch (error) {
      cronStatus.error = error.message;
    }

    return NextResponse.json({
      ...cronStatus,
      message: cronStatus.initialized
        ? 'Cron auto-sync está rodando'
        : 'Cron auto-sync não inicializado',
    });
  } catch (error) {
    console.error('[Cron Status] Erro:', error);
    return NextResponse.json(
      {
        error: 'Erro ao verificar status do cron',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    console.log('[Cron Status] Forçando inicialização do cron...');

    const { initAutoSyncCron } = await import('@/lib/cron.js');
    initAutoSyncCron();

    cronStatus.initialized = true;
    cronStatus.lastCheck = new Date().toISOString();
    cronStatus.error = null;

    return NextResponse.json({
      success: true,
      message: 'Cron inicializado manualmente',
      ...cronStatus,
    });
  } catch (error) {
    console.error('[Cron Status] Erro ao forçar inicialização:', error);
    return NextResponse.json(
      {
        error: 'Erro ao inicializar cron',
        details: error.message
      },
      { status: 500 }
    );
  }
}
