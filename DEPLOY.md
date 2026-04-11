# Deploy Mapeia.AI — Railway + Vercel

## Arquitetura

```
Vercel (frontend)  ──▶  Railway API  ──▶  Railway Worker (ou VPS)
                              │                  │
                         Supabase DB        Upstash Redis
                         (já configurado)    (gratuito)
                              │
                         Railway Volume
                         /app/storage
```

---

## Passo 1 — Redis no Upstash (gratuito)

1. Acesse **upstash.com** → Create Database
2. Tipo: **Redis** | Região: **São Paulo** | TLS: **On**
3. Copie a URL no formato: `rediss://:TOKEN@HOST.upstash.io:6379`

---

## Passo 2 — API no Railway

### Criar serviço

```bash
npm install -g @railway/cli
railway login
cd /caminho/para/Mapeia.AI
railway init                          # cria projeto
railway service create --name api
```

### Settings no Dashboard → api → Settings
- **Dockerfile Path**: `apps/api/Dockerfile`
- **Watch Paths**: `apps/api/**`

### Volume persistente

```
Railway Dashboard → api → Volumes → Add Volume
  Mount Path: /app/storage
  Size: 50 GB
```

### Variáveis de ambiente (api)

```
DATABASE_URL           = [Supabase connection string]
JWT_SECRET             = [openssl rand -hex 32]
NODE_ENV               = production
PORT                   = 3001
FRONTEND_URL           = https://mapeia.ai
API_URL                = https://api.mapeia.ai
REDIS_URL              = [Upstash rediss://...]
STORAGE_BASE_PATH      = /app/storage
RESEND_API_KEY         = re_xxxx
RESEND_FROM            = Mapeia.AI <no-reply@mapeia.ai>
STRIPE_SECRET_KEY      = sk_live_xxxx
STRIPE_WEBHOOK_SECRET  = whsec_xxxx
STRIPE_PRICE_AVULSO_150   = price_xxxx
STRIPE_PRICE_AVULSO_400   = price_xxxx
STRIPE_PRICE_AVULSO_1200  = price_xxxx
STRIPE_PRICE_STARTER      = price_xxxx
STRIPE_PRICE_PRO          = price_xxxx
STRIPE_PRICE_BUSINESS     = price_xxxx
```

### Domínio customizado
```
Railway → api → Settings → Domains → Custom Domain
→ api.mapeia.ai → CNAME apontando para domínio Railway
```

---

## Passo 3 — Worker de processamento

O worker executa o OpenDroneMap. Precisa de Docker.

### Opção A — Railway (sem ODM real, modo simulado)

```bash
railway service create --name worker
```

Settings:
- **Dockerfile Path**: `apps/api/Dockerfile.worker`
- **Volume**: monte o MESMO volume `/app/storage`
- Mesmas variáveis da API

Neste modo o worker processa em simulação (sem Docker-in-Docker).

### Opção B — VPS com Docker (produção real) ← recomendado

Use **Hetzner CX32** (4 vCPU, 8 GB RAM, €7/mês) ou DigitalOcean 8 GB ($48/mês).

```bash
# No VPS
apt update && apt install -y docker.io nodejs npm git
git clone https://github.com/SEU_USUARIO/mapeia.git
cd mapeia/apps/api

cp .env.example .env
# Edite .env com as variáveis de produção
# STORAGE_BASE_PATH=/mnt/storage (monte volume compartilhado com Railway via NFS ou S3)

npm install && npm run build && npx prisma generate

npm install -g pm2
pm2 start dist/workers/index.js --name mapeia-worker
pm2 startup && pm2 save
```

> Para compartilhar o storage entre Railway e VPS, use **Cloudflare R2**
> ou **DigitalOcean Spaces** — adapte `storage.ts` para usar o SDK do S3.

---

## Passo 4 — Frontend no Vercel

```bash
npm install -g vercel
cd apps/web
vercel --prod
```

Ou conecte via Vercel Dashboard → New Project → Import Git Repository.

### Variáveis no Vercel

```
NEXT_PUBLIC_API_URL = https://api.mapeia.ai
NEXTAUTH_URL        = https://mapeia.ai
NEXTAUTH_SECRET     = [openssl rand -hex 32]
```

### Domínio
```
Vercel → Project → Settings → Domains → Add → mapeia.ai
→ Siga instruções de DNS
```

---

## Passo 5 — Stripe Webhook

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. **URL**: `https://api.mapeia.ai/api/billing/webhook`
3. **Eventos**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copie o **Signing Secret** → `STRIPE_WEBHOOK_SECRET`

---

## Passo 6 — Resend (e-mails)

1. resend.com → Domains → Add → `mapeia.ai`
2. Adicione os registros DNS (MX, SPF, DKIM)
3. resend.com → API Keys → Create → `RESEND_API_KEY`

---

## Checklist antes de ir ao ar

- [ ] `JWT_SECRET` e `NEXTAUTH_SECRET` gerados (`openssl rand -hex 32`)
- [ ] `REDIS_URL` Upstash configurado e testado
- [ ] Railway Volume `/app/storage` montado
- [ ] Worker rodando e consumindo a fila
- [ ] `RESEND_API_KEY` configurado + domínio verificado no Resend
- [ ] Stripe produtos criados + todos os `STRIPE_PRICE_*` preenchidos
- [ ] Webhook do Stripe apontando para a API
- [ ] `FRONTEND_URL` e `API_URL` com domínios reais
- [ ] `NODE_ENV=production` nos dois serviços
- [ ] Testar fluxo completo: cadastro → e-mail → login → upload → processar → download

---

## Logs e troubleshooting

```bash
# Logs em tempo real
railway logs --service api --tail
railway logs --service worker --tail

# Redeploy
railway up --service api

# Banco via Prisma Studio (local apontando para prod)
cd apps/api
DATABASE_URL="postgresql://..." npx prisma studio
```
