'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SyncResultsDialog } from '@/components/SyncResultsDialog';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ percent: 0, message: '' });
  const [lastSync, setLastSync] = useState(null);
  const [isPaired, setIsPaired] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncInterval, setAutoSyncInterval] = useState(5);
  const [lastAutoSyncTimestamp, setLastAutoSyncTimestamp] = useState(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncStats, setSyncStats] = useState(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTickets();
      checkPairing();
      checkCredentials();
      checkAutoSync();
    }
  }, [status]);

  // Polling inteligente - verifica se houve auto-sync e atualiza tickets
  useEffect(() => {
    if (!autoSyncEnabled || status !== 'authenticated') {
      return;
    }

    // Verificar status de sync a cada 10 segundos
    const checkSyncStatus = async () => {
      try {
        const response = await fetch('/api/sync-status');
        const data = await response.json();

        if (response.ok && data.lastAutoSync) {
          // Se o timestamp mudou, houve uma nova sincronização
          if (lastAutoSyncTimestamp !== data.lastAutoSync) {
            console.log('[Dashboard] Nova sincronização detectada! Atualizando tickets...');
            setLastAutoSyncTimestamp(data.lastAutoSync);

            // Atualizar tickets apenas se não for a primeira vez
            if (lastAutoSyncTimestamp !== null) {
              await fetchTickets();
              setLastSync(new Date(data.lastAutoSync).toLocaleString('pt-BR'));
            }
          }
        }
      } catch (error) {
        console.error('[Dashboard] Erro ao verificar status de sync:', error);
      }
    };

    // Verificar imediatamente
    checkSyncStatus();

    // Continuar verificando a cada 10 segundos
    const pollingInterval = setInterval(checkSyncStatus, 10000);

    return () => clearInterval(pollingInterval);
  }, [autoSyncEnabled, status, lastAutoSyncTimestamp]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tickets');
      const data = await response.json();
      if (response.ok) {
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPairing = async () => {
    try {
      const response = await fetch('/api/subscribe');
      const data = await response.json();
      setIsPaired(data.isPaired);
    } catch (error) {
      console.error('Erro ao verificar pareamento:', error);
    }
  };

  const checkCredentials = async () => {
    try {
      const response = await fetch('/api/fourbiz-credentials');
      const data = await response.json();
      setHasCredentials(data.hasCredentials);
    } catch (error) {
      console.error('Erro ao verificar credenciais:', error);
    }
  };

  const checkAutoSync = async () => {
    try {
      const response = await fetch('/api/auto-sync-config');
      const data = await response.json();
      if (response.ok) {
        setAutoSyncEnabled(data.autoSyncEnabled);
        setAutoSyncInterval(data.autoSyncIntervalMinutes);
      }
    } catch (error) {
      console.error('Erro ao verificar auto-sync:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncProgress({ percent: 0, message: 'Iniciando...' });

    try {
      const eventSource = new EventSource('/api/sync-stream');

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          setSyncProgress({ percent: data.percent, message: data.message });
        } else if (data.type === 'complete') {
          setSyncProgress({ percent: 100, message: data.message });
          setLastSync(new Date().toLocaleString('pt-BR'));

          setTimeout(async () => {
            await fetchTickets();
            setSyncStats(data.stats);
            setSyncDialogOpen(true);
            setSyncing(false);
            setSyncProgress({ percent: 0, message: '' });
          }, 1000);

          eventSource.close();
        } else if (data.type === 'error') {
          toast.error('Erro na sincronização', {
            description: data.message
          });
          setSyncing(false);
          setSyncProgress({ percent: 0, message: '' });
          eventSource.close();
        }
      };

      eventSource.onerror = (error) => {
        console.error('Erro no EventSource:', error);
        eventSource.close();
        setSyncing(false);
        setSyncProgress({ percent: 0, message: '' });
      };

    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar', {
        description: 'Verifique suas credenciais nas configurações'
      });
      setSyncing(false);
      setSyncProgress({ percent: 0, message: '' });
    }
  };

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('suspensa')) return 'secondary';
    if (statusLower.includes('cancelad')) return 'destructive';
    if (statusLower.includes('resolvid') || statusLower.includes('fechad')) return 'outline';
    if (statusLower.includes('andamento')) return 'default';
    return 'default';
  };

  const getPriorityColor = (priority) => {
    const priorityLower = priority?.toLowerCase() || '';
    if (priorityLower.includes('alta') || priorityLower.includes('crítica')) return 'destructive';
    if (priorityLower.includes('média')) return 'default';
    return 'secondary';
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">4Biz Notify</h1>
              <p className="text-sm text-gray-600">Olá, {session?.user?.name}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => router.push('/settings')} variant="outline">
                Configurações
              </Button>
              <Button onClick={() => signOut({ callbackUrl: '/login' })} variant="outline">
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 mb-8 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Credenciais 4Biz:</span>
                  <Badge variant={hasCredentials ? 'default' : 'destructive'}>
                    {hasCredentials ? 'Configurado' : 'Não configurado'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Celular:</span>
                  <Badge variant={isPaired ? 'default' : 'secondary'}>
                    {isPaired ? 'Pareado' : 'Não pareado'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tickets.length}</div>
              <p className="text-xs text-gray-600">chamados sincronizados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Sincronização</CardTitle>
            </CardHeader>
            <CardContent>
              {autoSyncEnabled && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-blue-700 font-medium">
                      Auto-sync ativo (a cada {autoSyncInterval} min)
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSync}
                disabled={syncing || !hasCredentials}
                className="w-full mb-2"
              >
                {syncing
                  ? `Sincronizando ${syncProgress.percent}%`
                  : 'Sincronizar Agora'}
              </Button>

              {syncing && (
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{syncProgress.message}</span>
                    <span>{syncProgress.percent}%</span>
                  </div>
                  <Progress value={syncProgress.percent} className="h-2" />
                </div>
              )}

              {lastSync && !syncing && (
                <p className="text-xs text-gray-600 mt-2">Última: {lastSync}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chamados</CardTitle>
            <CardDescription>
              Lista de chamados sincronizados da 4Biz
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-gray-500">Carregando...</p>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Nenhum chamado encontrado</p>
                {!hasCredentials && (
                  <p className="text-sm text-gray-400">
                    Configure suas credenciais da 4Biz nas configurações
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">#{ticket.ticketId}</h3>
                          <Badge variant={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                          <Badge variant={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-gray-700 mb-2">{ticket.title}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                          {ticket.solicitante && (
                            <span>Solicitante: {ticket.solicitante}</span>
                          )}
                          {ticket.responsavel && (
                            <span>Responsável: {ticket.responsavel}</span>
                          )}
                          {ticket.sla && (
                            <span>SLA: {ticket.sla}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      Atualizado: {new Date(ticket.updatedAt).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <SyncResultsDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        stats={syncStats}
      />
    </div>
  );
}
