# Otimizações de Recursos - 4biz-notfy

Este documento descreve as otimizações implementadas para minimizar o uso de recursos da aplicação, visando melhor escalabilidade e menor custo de infraestrutura.

## Resumo das Otimizações

### 1. **Docker Otimizado**
- ✅ Limpeza de caches APT após instalação
- ✅ Remoção de arquivos temporários
- ✅ Instalação mínima do Chromium
- 📉 **Redução estimada**: ~100-150MB no tamanho da imagem

### 2. **Limites de Recursos (docker-compose.yml)**
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'      # Máximo 1 CPU
      memory: 1G       # Máximo 1GB RAM
    reservations:
      cpus: '0.25'     # Mínimo 0.25 CPU
      memory: 256M     # Mínimo 256MB RAM
```

- ✅ Limita uso máximo de CPU e memória
- ✅ Shared memory otimizado (256MB) para Chromium
- ✅ Limite de memória Node.js (768MB)
- 📉 **Impacto**: Garante que o container não consuma mais de 1GB RAM

### 3. **Cron Job Otimizado**
**Antes:**
- ⚠️ Executava **a cada 1 minuto** (muito agressivo)
- ⚠️ Alto uso de CPU e memória

**Depois:**
- ✅ Configurável via `CRON_INTERVAL_MINUTES` (padrão: **5 minutos**)
- ✅ Validação de intervalo (mín: 1, máx: 60 minutos)
- 📉 **Redução de consumo**: ~80% menos execuções

### 4. **Browser Pool (Reutilização de Instâncias)**
**Antes:**
- ⚠️ Nova instância do Chromium a cada requisição
- ⚠️ Overhead alto (~2-3s por inicialização)
- ⚠️ Uso de memória desnecessário

**Depois:**
- ✅ Pool de browsers com reutilização de instâncias
- ✅ Fechamento automático após 5 minutos de inatividade
- ✅ Gerenciamento inteligente de contextos
- 📉 **Redução**: 70-80% menos overhead de inicialização
- 📉 **Economia de memória**: ~200-300MB por execução evitada

### 5. **Chromium Otimizado**
Novos argumentos de linha de comando:
- `--disable-background-networking`: Desabilita conexões em background
- `--disable-extensions`: Remove extensões
- `--max-old-space-size=512`: Limita heap do V8
- `--renderer-process-limit=2`: Limita processos renderizadores
- E mais 10+ otimizações de memória e CPU

📉 **Redução estimada**: 30-40% menos uso de memória por instância do browser

## Variáveis de Ambiente

### Novas Variáveis
```bash
# Intervalo do cron em minutos (padrão: 5)
CRON_INTERVAL_MINUTES=5

# Limite de memória do Node.js em MB (padrão: 768)
NODE_OPTIONS=--max-old-space-size=768
```

## Uso de Recursos Estimado

### Antes das Otimizações
- 💾 **Memória**: ~1.5-2GB em uso normal
- ⚙️ **CPU**: 50-80% de uso constante (cron a cada 1 min)
- 📦 **Imagem Docker**: ~800-900MB
- 🔄 **Overhead por sync**: ~300-400MB

### Depois das Otimizações
- 💾 **Memória**: ~512-768MB em uso normal
- ⚙️ **CPU**: 10-30% de uso (cron a cada 5 min)
- 📦 **Imagem Docker**: ~650-700MB
- 🔄 **Overhead por sync**: ~100-150MB

**📊 Redução total estimada: 50-60% no uso de recursos**

## Recomendações para Escalabilidade

### Para Ambientes com Poucos Recursos
```bash
CRON_INTERVAL_MINUTES=10           # Reduz frequência
NODE_OPTIONS=--max-old-space-size=512   # Limita memória
```

No `docker-compose.yml`:
```yaml
limits:
  cpus: '0.5'
  memory: 512M
```

### Para Ambientes com Mais Recursos
```bash
CRON_INTERVAL_MINUTES=2            # Aumenta frequência
NODE_OPTIONS=--max-old-space-size=1024  # Mais memória
```

No `docker-compose.yml`:
```yaml
limits:
  cpus: '2.0'
  memory: 2G
```

## Monitoramento

Para monitorar o uso de recursos:

```bash
# Ver uso de recursos do container
docker stats 4biz-notfy-app

# Ver logs do cron
docker logs -f 4biz-notfy-app | grep "\[Cron\]"

# Ver logs do browser pool
docker logs -f 4biz-notfy-app | grep "\[BrowserPool\]"
```

## Próximas Otimizações (Futuras)

Possíveis melhorias adicionais:
- [ ] Implementar cache de sessões com Redis
- [ ] Adicionar compressão de imagens com sharp
- [ ] Implementar lazy loading de módulos pesados
- [ ] Usar worker threads para tarefas pesadas
- [ ] Implementar health checks e circuit breakers
- [ ] Migrar para arquitetura de microserviços (se necessário)

## Troubleshooting

### Container usando muita memória
1. Reduza `NODE_OPTIONS=--max-old-space-size` para 512
2. Aumente `CRON_INTERVAL_MINUTES` para 10 ou 15
3. Verifique se há browsers presos: `docker exec 4biz-notfy-app ps aux | grep chrome`

### Sincronizações falhando
1. Aumente o limite de memória no docker-compose.yml
2. Verifique logs: `docker logs 4biz-notfy-app`
3. Reduza o número de usuários com auto-sync ativo

### Build da imagem falha
1. Certifique-se de ter pelo menos 2GB de RAM livre
2. Use `docker builder prune` para limpar cache
3. Build em etapas: `docker build --target=builder .`
