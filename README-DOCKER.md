# 4Biz Notfy - Docker Setup

Sistema plug-and-play de notificações para chamados 4Biz com sincronização automática.

## 🚀 Início Rápido

### 1. Configurar MongoDB

Configure a variável `MONGODB_URI` com sua URL do MongoDB Atlas:

```bash
# Criar arquivo .env
cp .env.example .env

# Editar e adicionar sua URL do MongoDB
nano .env
```

Ou defina diretamente no ambiente:

```bash
export MONGODB_URI="mongodb+srv://usuario:senha@cluster.mongodb.net/4biz-notify"
```

### 2. Iniciar aplicação

```bash
docker-compose up -d
```

### 3. Acessar

Abra: http://localhost:3000

### 3. Primeiro uso

1. Crie uma conta
2. Faça login
3. Vá em "Configurações"
4. Configure suas credenciais da 4Biz
5. Ative notificações push (via QR Code no celular)

**Pronto!** A aplicação está funcionando! 🎉

## 📦 O que está incluído

- ✅ Next.js 16 com App Router
- ✅ Integração com MongoDB Atlas (online)
- ✅ Playwright para web scraping
- ✅ Web Push para notificações
- ✅ NextAuth para autenticação
- ✅ Sincronização automática com cron jobs integrado

## 🔧 Comandos Úteis

```bash
# Iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Parar
docker-compose down

# Rebuild
docker-compose up -d --build

# Limpar tudo
docker-compose down -v
```

## 🌐 Portas

- **3000**: Aplicação Next.js

## 🔐 Variáveis de Ambiente

### Obrigatórias:

- `MONGODB_URI`: URL do MongoDB Atlas (você precisa fornecer)

### Opcionais (já com valores padrão):

- `NEXTAUTH_SECRET`: Chave de autenticação (valor padrão incluído)
- `NEXTAUTH_URL`: URL da aplicação (padrão: http://localhost:3000)
- `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`: Chaves para push (valores padrão incluídos)
- `VAPID_SUBJECT`: Email para VAPID (padrão: mailto:admin@4biz-notfy.local)

### Como configurar:

**Opção 1: Arquivo .env (recomendado)**

```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

**Opção 2: Variável de ambiente do sistema**

```bash
export MONGODB_URI="sua-url-aqui"
docker-compose up -d
```

**Opção 3: Editar docker-compose.yml diretamente**

### Gerar novas chaves VAPID (opcional)

```bash
npx web-push generate-vapid-keys
```

Copie as chaves geradas para o `docker-compose.yml`.

## 📱 Uso

### Configurar credenciais 4Biz

1. Acesse "Configurações"
2. Preencha email e senha da 4Biz
3. Salve

### Ativar notificações

**Opção 1: QR Code (celular)**
1. Clique em "Gerar QR Code"
2. Escaneie com o celular
3. Permita notificações

**Opção 2: Mesmo navegador**
1. Clique em "Ativar Notificações"
2. Permita quando solicitado

### Sincronizar chamados

**Sincronização Manual:**
1. Vá ao Dashboard
2. Clique em "Sincronizar Agora"
3. Aguarde a conclusão

**Sincronização Automática:**
1. Vá em "Configurações"
2. Role até "Sincronização Automática"
3. Ative a opção
4. Defina o intervalo em minutos (padrão: 5 minutos)
5. Salve as configurações

A aplicação sincronizará automaticamente seus chamados no intervalo definido!

## 🛠️ Troubleshooting

### Aplicação não inicia

```bash
docker-compose logs -f app
```

### MongoDB não conecta

Verifique se a variável `MONGODB_URI` está correta:
```bash
docker-compose exec app env | grep MONGODB_URI
```

Certifique-se de que:
- A URL do MongoDB Atlas está correta
- Seu IP está na whitelist do MongoDB Atlas
- As credenciais estão corretas

### Reinstalar do zero

```bash
docker-compose down -v
docker-compose up -d --build
```

## 📊 Estrutura

```
├── app/                 # Next.js App Router
│   ├── api/            # API Routes
│   ├── dashboard/      # Dashboard
│   ├── settings/       # Configurações
│   └── login/          # Login
├── lib/                # Bibliotecas
├── models/             # MongoDB Models
├── components/         # React Components
├── Dockerfile          # Docker build
└── docker-compose.yml  # Docker Compose config
```

## 🔒 Segurança

- Credenciais criptografadas no banco
- Autenticação obrigatória
- HTTPS recomendado em produção
- Trocar `NEXTAUTH_SECRET` em produção

## 📄 Licença

Privado

## 💬 Suporte

Abra uma issue no repositório.
