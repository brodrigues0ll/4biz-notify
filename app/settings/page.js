'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Credenciais 4Biz
  const [fourBizEmail, setFourBizEmail] = useState('');
  const [fourBizPassword, setFourBizPassword] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);

  // Pareamento
  const [isPaired, setIsPaired] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Auto-sync
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncIntervalMinutes, setAutoSyncIntervalMinutes] = useState(5);
  const [savingAutoSync, setSavingAutoSync] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      checkPairing();
      loadCredentials();
      loadAutoSyncConfig();
    }
  }, [status]);

  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/fourbiz-credentials');
      const data = await response.json();

      if (data.hasCredentials) {
        setHasCredentials(true);
        setFourBizEmail(data.email);
        setFourBizPassword('**********');
        setSessionValid(data.sessionValid);
      }
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error);
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

  const loadAutoSyncConfig = async () => {
    try {
      const response = await fetch('/api/auto-sync-config');
      const data = await response.json();

      if (response.ok) {
        setAutoSyncEnabled(data.autoSyncEnabled);
        setAutoSyncIntervalMinutes(data.autoSyncIntervalMinutes);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de auto-sync:', error);
    }
  };

  const handleSaveAutoSync = async () => {
    if (autoSyncIntervalMinutes < 1) {
      alert('O intervalo deve ser de pelo menos 1 minuto');
      return;
    }

    setSavingAutoSync(true);
    try {
      const response = await fetch('/api/auto-sync-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          autoSyncEnabled,
          autoSyncIntervalMinutes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Configurações de sincronização automática salvas!');
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar configurações de auto-sync:', error);
      alert('Erro ao salvar configurações');
    } finally {
      setSavingAutoSync(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!fourBizEmail || !fourBizPassword) {
      alert('Preencha email e senha da 4Biz');
      return;
    }

    if (fourBizPassword === '**********') {
      alert('Digite a senha novamente para atualizar');
      return;
    }

    setSavingCredentials(true);
    try {
      const response = await fetch('/api/fourbiz-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: fourBizEmail,
          password: fourBizPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Credenciais salvas com sucesso!');
        setHasCredentials(true);
        setFourBizPassword('**********');
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Erro ao salvar credenciais:', error);
      alert('Erro ao salvar credenciais');
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleGenerateQR = async () => {
    try {
      const pairUrl = `${window.location.origin}/pair?session=${session?.user?.email}`;
      const qrDataUrl = await QRCode.toDataURL(pairUrl, {
        width: 300,
        margin: 2,
      });

      setQrCodeUrl(qrDataUrl);
      setShowQR(true);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      alert('Erro ao gerar QR Code');
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador não suporta notificações');
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const vapidResponse = await fetch('/api/vapid');
        const { publicKey } = await vapidResponse.json();

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        });

        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscription }),
        });

        if (response.ok) {
          alert('Notificações ativadas com sucesso!');
          setIsPaired(true);
          setShowQR(false);
        } else {
          alert('Erro ao ativar notificações');
        }
      } else {
        alert('Permissão de notificação negada');
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      alert('Erro ao ativar notificações');
    }
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Credenciais da 4Biz</CardTitle>
            <CardDescription>
              Configure seu email e senha da 4Biz para sincronização automática
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">Status das credenciais</p>
                <p className="text-sm text-gray-600">
                  {hasCredentials ? 'Credenciais configuradas' : 'Nenhuma credencial configurada'}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant={hasCredentials ? 'default' : 'secondary'}>
                  {hasCredentials ? 'Configurado' : 'Não configurado'}
                </Badge>
                {sessionValid && (
                  <Badge variant="default">
                    Sessão válida
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fourBizEmail">Email da 4Biz</Label>
              <Input
                id="fourBizEmail"
                type="email"
                placeholder="seu.email@empresa.com"
                value={fourBizEmail}
                onChange={(e) => setFourBizEmail(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Email que você usa para acessar a 4Biz
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fourBizPassword">Senha da 4Biz</Label>
              <Input
                id="fourBizPassword"
                type="password"
                placeholder="••••••••"
                value={fourBizPassword}
                onChange={(e) => setFourBizPassword(e.target.value)}
                onFocus={(e) => {
                  if (e.target.value === '**********') {
                    setFourBizPassword('');
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Senha que você usa para acessar a 4Biz
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-yellow-800">
                <strong>Nota de segurança:</strong> Suas credenciais são armazenadas de forma segura
                e usadas apenas para fazer login automático na 4Biz e buscar seus chamados.
                Nunca compartilharemos suas credenciais com terceiros.
              </p>
            </div>

            <Button
              onClick={handleSaveCredentials}
              disabled={savingCredentials || !fourBizEmail || !fourBizPassword}
            >
              {savingCredentials ? 'Salvando...' : 'Salvar Credenciais'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações Push</CardTitle>
            <CardDescription>
              Configure seu celular para receber notificações de novos chamados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Status do pareamento</p>
                <p className="text-sm text-gray-600">
                  {isPaired ? 'Dispositivo conectado' : 'Nenhum dispositivo conectado'}
                </p>
              </div>
              <Badge variant={isPaired ? 'default' : 'secondary'}>
                {isPaired ? 'Pareado' : 'Não pareado'}
              </Badge>
            </div>

            {!isPaired && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Opção 1: Parear via QR Code</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Gere um QR Code e escaneie com seu celular
                  </p>
                  <Button onClick={handleGenerateQR}>
                    Gerar QR Code
                  </Button>

                  {showQR && qrCodeUrl && (
                    <div className="mt-4 text-center">
                      <img src={qrCodeUrl} alt="QR Code" className="mx-auto border rounded" />
                      <p className="text-sm text-gray-600 mt-2">
                        Escaneie este QR Code com seu celular
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Opção 2: Ativar neste dispositivo</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Ative as notificações diretamente neste navegador
                  </p>
                  <Button onClick={handleRequestNotificationPermission}>
                    Ativar Notificações
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sincronização Automática</CardTitle>
            <CardDescription>
              Configure a sincronização automática de chamados da 4Biz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Status da sincronização</p>
                <p className="text-sm text-gray-600">
                  {autoSyncEnabled ? 'Ativada' : 'Desativada'}
                </p>
              </div>
              <Badge variant={autoSyncEnabled ? 'default' : 'secondary'}>
                {autoSyncEnabled ? 'Ativada' : 'Desativada'}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoSyncEnabled"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="autoSyncEnabled" className="cursor-pointer">
                  Ativar sincronização automática
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Quando ativada, a aplicação sincronizará automaticamente seus chamados da 4Biz
              </p>
            </div>

            {autoSyncEnabled && (
              <div className="space-y-2">
                <Label htmlFor="autoSyncInterval">Intervalo de sincronização (minutos)</Label>
                <Input
                  id="autoSyncInterval"
                  type="number"
                  min="1"
                  value={autoSyncIntervalMinutes}
                  onChange={(e) => setAutoSyncIntervalMinutes(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-gray-500">
                  A cada {autoSyncIntervalMinutes} minuto{autoSyncIntervalMinutes !== 1 ? 's' : ''}, a aplicação verificará novos chamados
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Para usar a sincronização automática, você precisa ter configurado
                suas credenciais da 4Biz acima.
              </p>
            </div>

            <Button
              onClick={handleSaveAutoSync}
              disabled={savingAutoSync}
            >
              {savingAutoSync ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Usuário:</span>
                <span className="font-medium">{session?.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{session?.user?.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
