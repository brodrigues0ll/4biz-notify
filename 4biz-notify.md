# 4biz Notify – Sistema de Notificações de Chamados 4Biz

Aplicação Web + PWA para monitoramento de chamados da NAV/4Biz e envio de notificações automáticas para celular.

---

## DESCRIÇÃO GERAL

O **4biz Notify** é uma aplicação web desenvolvida para monitorar automaticamente os chamados atribuídos ao técnico no sistema **NAV 4Biz**.  
O objetivo é detectar:

- Novos chamados na fila
- Alteração de status de chamados existentes

E enviar **notificações push** diretamente para o celular do técnico.

A aplicação será:

- Web + PWA (funciona como app instalado)
- Com login via NextAuth
- Com dashboard para visualização dos chamados sincronizados
- Com sistema de pareamento via QRCode para conectar o celular
- Com backend que executa sincronização periódica dos chamados diretamente no HTML retornado pela 4Biz

---

## ARQUITETURA GERAL DO SISTEMA

**Tecnologias utilizadas:**

- **Next.js 15** (somente JavaScript, sem TypeScript)
- **TailwindCSS** + **shadcn/ui** para UI
- **MongoDB + Mongoose** para persistência
- **NextAuth** (provavelmente provider Credentials)
- **Cheerio** para extrair dados da tabela HTML da 4Biz
- **Web Push API** para notificações no celular
- **Service Worker + Manifest** para PWA
- **QRCode** para pareamento do app com o celular

---

## PROCESSO DE LOGIN NA 4BIZ

O sistema oficial da 4Biz utiliza autenticação federada com o botão:

```
<button class="gsi-material-button">Entra ID Ziva</button>
```

Fluxo manual do usuário:

1. Clicar no botão “Entra ID Ziva”
2. Preencher email
3. Preencher senha
4. Clicar em “Sim” para manter sessão

---

## TABELA DE CHAMADOS (REFERÊNCIA DO HTML)

A tabela exibida na página é composta por elementos `.request-item` contendo:

- Número do chamado
- Data limite
- Prioridade
- Serviço
- Solicitação
- Solicitante
- Responsável
- Status/Situação
- SLA
- Data de criação
- Dados adicionais renderizados via AngularJS

Exemplo de item:

```html
<div class="tableless-tr request-item" data-request="23021">
  <div class="request-id">23021</div>
  <div class="solicitacao">Instalar, atualizar, remover software...</div>
  <div class="responsavel">Bernardo Rodrigues Gomes</div>
  <span class="badge">Suspensa</span>
</div>
```

O scraper irá extrair os dados acima para salvar no MongoDB.

---

## SISTEMA DE NOTIFICAÇÕES

O sistema enviará notificações nos seguintes casos:

### ✅ Novo chamado detectado

- Encontrado no HTML da 4Biz
- Não existe no banco de dados local
- Notificação push enviada ao celular pareado

### ✅ Alteração de status

- Status do chamado no HTML é diferente do salvo no banco
- Evento disparado para o celular

### ✅ Alteração de prioridade

Opcional, pode ser habilitado depois.

---

## MODELO DE DADOS (TICKETS)

### **Tabela: tickets**

| Campo     | Tipo   | Obrigatório | Descrição                           |
| --------- | ------ | ----------- | ----------------------------------- |
| ticketId  | Number | ✅          | ID do chamado na 4Biz               |
| title     | Texto  | ✅          | Descrição/Solicitação do chamado    |
| status    | Texto  | ✅          | Situação atual do chamado           |
| priority  | Texto  | ✅          | Prioridade (Alta, Média, Baixa)     |
| sla       | Texto  | ❌          | Tempo restante de SLA (se houver)   |
| createdAt | Data   | ✅          | Data de criação                     |
| updatedAt | Data   | ✅          | Última mudança detectada            |
| raw       | JSON   | ❌          | HTML/dados crus extraídos do scrape |

---

## SISTEMA DE PAREAMENTO (CELULAR VIA QR CODE)

Fluxo:

1. Usuário clica em **"Conectar celular"** no dashboard
2. Backend gera **token pareamento**
3. Gera QRCode contendo URL:
   ```
   https://seusite.com/pair?token=UUID
   ```
4. O app no celular (PWA) abre a URL
5. O app pede permissão para notificações
6. O subscription WebPush é enviado para o backend
7. O backend salva no User.phoneToken

Campo salvo no usuário:

### **User.phoneToken (subscription)**

```
{
  endpoint: "...",
  keys: {
    p256dh: "...",
    auth: "..."
  }
}
```

Cada notificação usa essa estrutura.

---

## FUNCIONAMENTO COMO PWA

O sistema será instalável no celular:

Arquivos necessários:

- `public/manifest.json`
- `public/sw.js`
- `icon.png`

O service worker escuta:

```
self.addEventListener("push", ...)
```

E cria notificações usando o `registration.showNotification()`.

---

## SINCRONIZAÇÃO AUTOMÁTICA

A sincronização funciona de duas formas:

### ✅ 1. Agendador externo (recomendado)

Use cron-job.org chamando:

```
GET https://seusite.com/api/sync
```

A cada 1 minuto.

### ✅ 2. Agendador interno (menos recomendado)

Rodar setInterval via serverless pode não ser estável em Next.js.

---

## ROTA DE SINCRONIZAÇÃO (`/api/sync`)

Fluxo:

1. Recebe cookies de sessão da 4Biz (criptografados no banco ou enviados pelo usuário)
2. Faz GET na página
3. Extrai HTML
4. Executa parse com Cheerio
5. Compara com banco
6. Dispara notificações se necessário
7. Atualiza banco de dados

---

## ROTA DE LOGIN (NextAuth)

O login será local, NÃO no 4Biz.

NextAuth armazenará apenas:

- nome
- email
- cookie 4Biz (criptografado)

O 4Biz continuará sendo acessado manualmente.

---

## TELAS DO SISTEMA

### ✅ Login (NextAuth)

Email + senha local do sistema

### ✅ Dashboard

- Lista de chamados sincronizados
- Botão sincronizar agora
- Vínculo do celular via QRCode
- Indicador de última sincronização

### ✅ Página de pareamento

Abre após escanear QRCode:

- Solicita permissão de notificação
- Envia subscription para o servidor
- Informa “Celular pareado com sucesso!”

### ✅ Configurações

- Editar cookies da 4Biz
- Forçar ressincronização
- Limpar banco

---

## BENEFÍCIOS DA APLICAÇÃO

- Recebe notificações push instantâneas
- Não precisa ficar abrindo a NAV 4Biz para checar chamados
- Funciona em qualquer celular (Android/iPhone)
- Não depende de app nativo
- Controle total da fila de atendimento
- Histórico de mudanças de status armazenado localmente

---

## SUGESTÃO DE ESTRUTURA DE PASTAS

```
4biz-notify/
  app/
    api/
      auth/[...nextauth]/
      sync/
      pair/
    dashboard/
    login/
    layout.jsx
  models/
    User.js
    Ticket.js
  lib/
    mongodb.js
    fetch4biz.js
    parseTickets.js
    push.js
  public/
    sw.js
    manifest.json
    icon.png
  components/
  styles/
```

---

## FIM DO DOCUMENTO
