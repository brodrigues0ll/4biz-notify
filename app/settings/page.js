"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShieldCheck,
  CheckCircle2,
  Info,
  AlertCircle,
  RefreshCw,
  Download,
} from "lucide-react";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Cookies 4Biz (Método Recomendado)
  const [sessionCookie, setSessionCookie] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [savingCookies, setSavingCookies] = useState(false);
  const [hasCookies, setHasCookies] = useState(false);

  // Credenciais 4Biz (Método Alternativo)
  const [fourBizEmail, setFourBizEmail] = useState("");
  const [fourBizPassword, setFourBizPassword] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);

  // Pareamento
  const [isPaired, setIsPaired] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Auto-sync
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncIntervalMinutes, setAutoSyncIntervalMinutes] = useState(5);
  const [savingAutoSync, setSavingAutoSync] = useState(false);

  // Validation errors
  const [intervalError, setIntervalError] = useState("");
  const [credentialsError, setCredentialsError] = useState("");

  // PWA Update
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      checkPairing();
      loadCredentials();
      loadAutoSyncConfig();
    }
  }, [status]);

  useEffect(() => {
    // Detectar quando há uma atualização disponível
    const handleUpdateAvailable = (event) => {
      setUpdateAvailable(true);
      setSwRegistration(event.detail.registration);
      toast.info("Nova versão disponível!", {
        description: "Uma atualização da aplicação está disponível",
        duration: 10000,
      });
    };

    window.addEventListener("sw-update-available", handleUpdateAvailable);

    // Verificar se já existe um SW esperando
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration && registration.waiting) {
          setUpdateAvailable(true);
          setSwRegistration(registration);
        }
      });
    }

    return () => {
      window.removeEventListener("sw-update-available", handleUpdateAvailable);
    };
  }, []);

  const loadCredentials = async () => {
    try {
      const response = await fetch("/api/fourbiz-credentials");
      const data = await response.json();

      if (data.hasCredentials) {
        setHasCredentials(true);
        setFourBizEmail(data.email);
        setFourBizPassword("**********");
        setSessionValid(data.sessionValid);
      }

      // Carregar cookies se existirem
      if (data.hasCookies) {
        setHasCookies(true);
        setSessionCookie(data.sessionCookie ? "••••••••" : "");
        setAuthToken(data.authToken ? "••••••••" : "");
      }
    } catch (error) {
      console.error("Erro ao carregar credenciais:", error);
    }
  };

  const handleSaveCookies = async () => {
    if (!sessionCookie || !authToken) {
      toast.error("Campos obrigatórios", {
        description: "Preencha SESSION_COOKIE e AUTH_TOKEN",
      });
      return;
    }

    if (sessionCookie === "••••••••" || authToken === "••••••••") {
      toast.error("Digite os cookies novamente", {
        description: "Os campos mascarados precisam ser atualizados",
      });
      return;
    }

    setSavingCookies(true);
    try {
      const response = await fetch("/api/fourbiz-cookies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionCookie,
          authToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Cookies salvos!", {
          description: "Sincronização via API ativada",
        });
        setHasCookies(true);
        setSessionCookie("••••••••");
        setAuthToken("••••••••");
      } else {
        toast.error("Erro ao salvar cookies", {
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Erro ao salvar cookies:", error);
      toast.error("Erro ao salvar cookies", {
        description: "Verifique sua conexão e tente novamente",
      });
    } finally {
      setSavingCookies(false);
    }
  };

  const checkPairing = async () => {
    try {
      const response = await fetch("/api/subscribe");
      const data = await response.json();
      setIsPaired(data.isPaired);
    } catch (error) {
      console.error("Erro ao verificar pareamento:", error);
    }
  };

  const loadAutoSyncConfig = async () => {
    try {
      const response = await fetch("/api/auto-sync-config");
      const data = await response.json();

      if (response.ok) {
        setAutoSyncEnabled(data.autoSyncEnabled);
        setAutoSyncIntervalMinutes(data.autoSyncIntervalMinutes);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações de auto-sync:", error);
    }
  };

  const handleSaveAutoSync = async () => {
    if (autoSyncIntervalMinutes < 1) {
      setIntervalError("O intervalo deve ser de pelo menos 1 minuto");
      return;
    }

    setIntervalError("");
    setSavingAutoSync(true);
    try {
      const response = await fetch("/api/auto-sync-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          autoSyncEnabled,
          autoSyncIntervalMinutes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Configurações salvas!", {
          description: "Sincronização automática configurada com sucesso",
        });
      } else {
        toast.error("Erro ao salvar configurações", {
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Erro ao salvar configurações de auto-sync:", error);
      toast.error("Erro ao salvar configurações", {
        description: "Tente novamente em alguns instantes",
      });
    } finally {
      setSavingAutoSync(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!fourBizEmail || !fourBizPassword) {
      setCredentialsError("Preencha email e senha da 4Biz");
      return;
    }

    if (fourBizPassword === "**********") {
      setCredentialsError("Digite a senha novamente para atualizar");
      return;
    }

    setCredentialsError("");
    setSavingCredentials(true);
    try {
      const response = await fetch("/api/fourbiz-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: fourBizEmail,
          password: fourBizPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Credenciais salvas!", {
          description: "Suas credenciais foram armazenadas com segurança",
        });
        setHasCredentials(true);
        setFourBizPassword("**********");
      } else {
        toast.error("Erro ao salvar credenciais", {
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Erro ao salvar credenciais:", error);
      toast.error("Erro ao salvar credenciais", {
        description: "Verifique sua conexão e tente novamente",
      });
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
      console.error("Erro ao gerar QR Code:", error);
      toast.error("Erro ao gerar QR Code", {
        description: "Tente novamente",
      });
    }
  };

  const handleUpdateApp = async () => {
    if (!swRegistration || !swRegistration.waiting) {
      toast.error("Nenhuma atualização disponível", {
        description: "Não há atualizações pendentes no momento",
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Enviar mensagem para o service worker pular a espera
      swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });

      toast.success("Atualizando aplicação...", {
        description: "A página será recarregada em instantes",
      });

      // O reload acontecerá automaticamente via controllerchange event
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar", {
        description: "Tente recarregar a página manualmente",
      });
      setIsUpdating(false);
    }
  };

  const handleCheckForUpdates = async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();

          // Aguardar um pouco para ver se há atualização
          setTimeout(() => {
            if (registration.waiting) {
              setUpdateAvailable(true);
              setSwRegistration(registration);
              toast.info("Nova versão encontrada!", {
                description: 'Clique em "Atualizar Agora" para aplicar',
              });
            } else {
              toast.success("Aplicação atualizada", {
                description: "Você está usando a versão mais recente",
              });
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Erro ao verificar atualizações:", error);
        toast.error("Erro ao verificar atualizações", {
          description: "Tente novamente mais tarde",
        });
      }
    }
  };

  const handleRequestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Navegador não suportado", {
        description: "Este navegador não possui suporte para notificações push",
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const vapidResponse = await fetch("/api/vapid");
        const { publicKey } = await vapidResponse.json();

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        });

        const response = await fetch("/api/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subscription }),
        });

        if (response.ok) {
          toast.success("Notificações ativadas!", {
            description: "Você receberá alertas de novos chamados",
          });
          setIsPaired(true);
          setShowQR(false);
        } else {
          toast.error("Erro ao ativar notificações", {
            description: "Não foi possível conectar ao servidor",
          });
        }
      } else {
        toast.error("Permissão negada", {
          description:
            "Você precisa permitir notificações nas configurações do navegador",
        });
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
      toast.error("Erro ao ativar notificações", {
        description: "Ocorreu um erro ao solicitar permissão",
      });
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
            <Button onClick={() => router.push("/dashboard")} variant="outline">
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Atualização do Aplicativo</CardTitle>
            <CardDescription>
              Mantenha seu aplicativo sempre atualizado com as últimas melhorias
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Status da aplicação</p>
                <p className="text-sm text-gray-600">
                  {updateAvailable
                    ? "Nova versão disponível"
                    : "Aplicação atualizada"}
                </p>
              </div>
              <Badge variant={updateAvailable ? "default" : "secondary"}>
                {updateAvailable ? "Atualização disponível" : "Atualizado"}
              </Badge>
            </div>

            {updateAvailable && (
              <Alert>
                <Download className="h-4 w-4" />
                <AlertDescription>
                  <strong>Nova versão disponível!</strong> Atualize agora para
                  obter as últimas melhorias e correções.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCheckForUpdates} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar Atualizações
              </Button>

              {updateAvailable && (
                <Button onClick={handleUpdateApp} disabled={isUpdating}>
                  <Download className="h-4 w-4 mr-2" />
                  {isUpdating ? "Atualizando..." : "Atualizar Agora"}
                </Button>
              )}
            </div>

            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Após clicar em "Atualizar Agora", a aplicação será recarregada
                automaticamente. Não é mais necessário desinstalar e reinstalar
                o PWA.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cookies da 4Biz (Recomendado) ⚡</CardTitle>
                <CardDescription>
                  Sincronização rápida via API - Configure manualmente os
                  cookies
                </CardDescription>
              </div>
              <Badge variant="default" className="bg-green-600">
                Mais Rápido
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">Status dos cookies</p>
                <p className="text-sm text-gray-600">
                  {hasCookies
                    ? "Cookies configurados"
                    : "Nenhum cookie configurado"}
                </p>
              </div>
              <Badge variant={hasCookies ? "default" : "secondary"}>
                {hasCookies ? "Configurado" : "Não configurado"}
              </Badge>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>5-10x mais rápido!</strong> Use cookies diretamente ao
                invés de email/senha. Obtenha os cookies na aba Network do
                DevTools após fazer login no 4biz Navigator.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="sessionCookie">SESSION_COOKIE</Label>
              <Input
                id="sessionCookie"
                type="text"
                placeholder="ZTNmY2VmMGEtYmMwMy00OWVkLTg0NWEtZDQwNzRiOGJiYWEw"
                value={sessionCookie}
                onChange={(e) => setSessionCookie(e.target.value)}
                onFocus={(e) => {
                  if (e.target.value === "••••••••") {
                    setSessionCookie("");
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Cookie SESSION encontrado nos headers de requisição
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authToken">AUTH_TOKEN (HYPER-AUTH-TOKEN)</Label>
              <Input
                id="authToken"
                type="text"
                placeholder="eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6IC..."
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                onFocus={(e) => {
                  if (e.target.value === "••••••••") {
                    setAuthToken("");
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Token HYPER-AUTH-TOKEN encontrado nos headers de requisição
              </p>
            </div>

            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Como obter os cookies:</strong>
                <ol className="list-decimal ml-4 mt-2 space-y-1 text-sm">
                  <li>Acesse nav.4biz.one e faça login</li>
                  <li>Abra DevTools (F12) → Aba Network</li>
                  <li>Faça uma ação qualquer (recarregar página)</li>
                  <li>Clique em uma requisição → Headers → Cookie</li>
                  <li>Copie os valores de SESSION e HYPER-AUTH-TOKEN</li>
                </ol>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleSaveCookies}
              disabled={savingCookies || !sessionCookie || !authToken}
            >
              {savingCookies ? "Salvando..." : "Salvar Cookies"}
            </Button>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Credenciais da 4Biz (Alternativo)</CardTitle>
                <CardDescription>
                  Login automático via Playwright - Mais lento mas automático
                </CardDescription>
              </div>
              <Badge variant="secondary">Alternativo</Badge>
            </div>
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
                onChange={(e) => {
                  setFourBizEmail(e.target.value);
                  setCredentialsError('');
                }}
                aria-invalid={!!credentialsError}
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
                onChange={(e) => {
                  setFourBizPassword(e.target.value);
                  setCredentialsError('');
                }}
                onFocus={(e) => {
                  if (e.target.value === '**********') {
                    setFourBizPassword('');
                  }
                }}
                aria-invalid={!!credentialsError}
              />
              <p className="text-xs text-gray-500">
                Senha que você usa para acessar a 4Biz
              </p>
            </div>

            {credentialsError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {credentialsError}
              </p>
            )}

            <Alert variant="warning" className="mt-4">
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                <strong>Nota de segurança:</strong> Suas credenciais são armazenadas de forma segura
                e usadas apenas para fazer login automático na 4Biz e buscar seus chamados.
                Nunca compartilharemos suas credenciais com terceiros.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleSaveCredentials}
              disabled={savingCredentials || !fourBizEmail || !fourBizPassword}
            >
              {savingCredentials ? 'Salvando...' : 'Salvar Credenciais'}
            </Button>
          </CardContent>
        </Card> */}

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
                  {isPaired
                    ? "Dispositivo conectado"
                    : "Nenhum dispositivo conectado"}
                </p>
              </div>
              <Badge variant={isPaired ? "default" : "secondary"}>
                {isPaired ? "Pareado" : "Não pareado"}
              </Badge>
            </div>

            {isPaired ? (
              <div className="space-y-4">
                <Alert variant="success">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Dispositivo conectado!</strong> Você está recebendo
                    notificações push neste dispositivo.
                  </AlertDescription>
                </Alert>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Re-parear dispositivo</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure um novo dispositivo ou atualize o pareamento atual
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleGenerateQR} variant="outline">
                      Gerar QR Code
                    </Button>
                    <Button
                      onClick={handleRequestNotificationPermission}
                      variant="outline"
                    >
                      Re-ativar Notificações
                    </Button>
                  </div>

                  {showQR && qrCodeUrl && (
                    <div className="mt-4 text-center">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="mx-auto border rounded"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        Escaneie este QR Code com seu celular
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">
                    Opção 1: Parear via QR Code
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Gere um QR Code e escaneie com seu celular
                  </p>
                  <Button onClick={handleGenerateQR}>Gerar QR Code</Button>

                  {showQR && qrCodeUrl && (
                    <div className="mt-4 text-center">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="mx-auto border rounded"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        Escaneie este QR Code com seu celular
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">
                    Opção 2: Ativar neste dispositivo
                  </h3>
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
                  {autoSyncEnabled ? "Ativada" : "Desativada"}
                </p>
              </div>
              <Badge variant={autoSyncEnabled ? "default" : "secondary"}>
                {autoSyncEnabled ? "Ativada" : "Desativada"}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="autoSyncEnabled"
                  checked={autoSyncEnabled}
                  onCheckedChange={setAutoSyncEnabled}
                />
                <Label htmlFor="autoSyncEnabled" className="cursor-pointer">
                  Ativar sincronização automática
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Quando ativada, a aplicação sincronizará automaticamente seus
                chamados da 4Biz
              </p>
            </div>

            {autoSyncEnabled && (
              <div className="space-y-2">
                <Label htmlFor="autoSyncInterval">
                  Intervalo de sincronização (minutos)
                </Label>
                <Input
                  id="autoSyncInterval"
                  type="number"
                  min="1"
                  value={autoSyncIntervalMinutes}
                  onChange={(e) => {
                    setAutoSyncIntervalMinutes(parseInt(e.target.value) || 1);
                    setIntervalError("");
                  }}
                  aria-invalid={!!intervalError}
                  aria-describedby={
                    intervalError ? "interval-error" : undefined
                  }
                />
                {intervalError && (
                  <p
                    id="interval-error"
                    className="text-sm text-destructive flex items-center gap-1"
                  >
                    <AlertCircle className="h-3 w-3" />
                    {intervalError}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  A cada {autoSyncIntervalMinutes} minuto
                  {autoSyncIntervalMinutes !== 1 ? "s" : ""}, a aplicação
                  verificará novos chamados
                </p>
              </div>
            )}

            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Nota:</strong> Para usar a sincronização automática,
                você precisa ter configurado suas credenciais da 4Biz acima.
              </AlertDescription>
            </Alert>

            <Button onClick={handleSaveAutoSync} disabled={savingAutoSync}>
              {savingAutoSync ? "Salvando..." : "Salvar Configurações"}
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
