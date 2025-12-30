'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function PairContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('waiting');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Verificar se veio de um QR Code válido
    const session = searchParams.get('session');
    if (!session) {
      setStatus('error');
      setMessage('Link de pareamento inválido');
    }
  }, [searchParams]);

  const handlePair = async () => {
    if (!('Notification' in window)) {
      setStatus('error');
      setMessage('Este navegador não suporta notificações');
      return;
    }

    try {
      setStatus('requesting');
      setMessage('Solicitando permissão...');

      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setStatus('error');
        setMessage('Permissão de notificação negada');
        return;
      }

      setMessage('Registrando dispositivo...');

      // Aguardar service worker estar pronto
      const registration = await navigator.serviceWorker.ready;

      // Buscar VAPID public key
      const vapidResponse = await fetch('/api/vapid');
      const { publicKey } = await vapidResponse.json();

      // Criar subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      setMessage('Salvando pareamento...');

      // Enviar subscription para o servidor
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription }),
      });

      if (response.ok) {
        setStatus('success');
        setMessage('Celular pareado com sucesso! Você receberá notificações de novos chamados.');

        // Enviar notificação de teste
        setTimeout(() => {
          registration.showNotification('4Biz Notify', {
            body: 'Pareamento realizado com sucesso! Você receberá notificações aqui.',
            icon: '/icon-192.png',
            badge: '/icon-96.png',
          });
        }, 1000);
      } else {
        setStatus('error');
        setMessage('Erro ao salvar pareamento no servidor');
      }
    } catch (error) {
      console.error('Erro ao parear:', error);
      setStatus('error');
      setMessage(`Erro ao parear: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Pareamento de Celular</CardTitle>
          <CardDescription>
            Configure seu dispositivo para receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'waiting' && (
            <>
              <div className="text-center space-y-2">
                <p className="text-gray-600">
                  Ao clicar no botão abaixo, você será solicitado a permitir notificações.
                </p>
                <p className="text-sm text-gray-500">
                  Isso permitirá que você receba alertas de novos chamados e alterações.
                </p>
              </div>
              <Button onClick={handlePair} className="w-full">
                Parear Dispositivo
              </Button>
            </>
          )}

          {status === 'requesting' && (
            <div className="text-center space-y-2">
              <div className="animate-pulse">
                <div className="h-12 w-12 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <div className="h-6 w-6 bg-blue-500 rounded-full"></div>
                </div>
              </div>
              <p className="text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="h-12 w-12 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-green-600 font-medium">{message}</p>
              <p className="text-sm text-gray-500">
                Você pode fechar esta página agora.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="h-12 w-12 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-red-600 font-medium">{message}</p>
              <Button onClick={() => setStatus('waiting')} variant="outline" className="w-full">
                Tentar Novamente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PairPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Carregando...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <PairContent />
    </Suspense>
  );
}
