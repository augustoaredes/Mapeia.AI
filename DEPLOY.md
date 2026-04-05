# Mapeia.AI — Guia de Deploy

## Visão Geral

| Serviço | Plataforma | Custo estimado |
|---|---|---|
| Frontend (Next.js) | Vercel | Grátis (Hobby) |
| Backend (Node.js API) | Railway | ~$5/mês |
| Worker (BullMQ) | Railway | ~$5/mês |
| PostgreSQL | Railway | ~$5/mês |
| Redis | Railway | ~$5/mês |

---

## 1. Pré-requisitos

- Conta no [Vercel](https://vercel.com)
- Conta no [Railway](https://railway.app)
- Repositório no GitHub com o código do Mapeia.AI
- (Opcional) Conta no [Stripe](https://stripe.com) para pagamentos

---

## 2. Deploy do Backend (Railway)

### 2.1 Criar projeto no Railway

1. Acesse [railway.app](https://railway.app) → **New Project**
2. Selecione **Deploy from GitHub repo** → escolha `mapeia.ai`
3. Na tela do projeto, clique em **Add Service** → **Database** → **PostgreSQL**
4. Clique em **Add Service** → **Database** → **Redis**

### 2.2 Configurar a API

1. Clique no serviço da API → **Settings** → **Source**
   - Root Directory: `apps/api`
   - Start Command: `npm run start`

2. Em **Variables**, adicione:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
PORT=3001
FRONTEND_URL=https://seu-app.vercel.app
STORAGE_BASE_PATH=/app/storage

# Stripe (opcional)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_AVULSO_100=price_...
STRIPE_PRICE_AVULSO_300=price_...
STRIPE_PRICE_AVULSO_1000=price_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
```

3. Aguarde o deploy. O Railway executa automaticamente:
   ```bash
   npm install
   npx prisma generate
   npx prisma migrate deploy
   npm run build
   npm run start
   ```

### 2.3 Configurar o Worker (BullMQ)

1. **Add Service** → **Empty Service**
2. Source: mesmo repositório, Root Directory: `apps/api`
3. Start Command: `npm run start:worker`
4. Adicione as mesmas variáveis de ambiente da API

### 2.4 Storage persistente (importante)

No Railway, o sistema de arquivos é efêmero. Para produção:

**Opção A — Railway Volume (simples)**
- No serviço da API → **Volumes** → **New Volume**
- Mount path: `/app/storage`

**Opção B — AWS S3 (recomendado para escala)**
```env
STORAGE_DRIVER=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=sa-east-1
AWS_S3_BUCKET=mapeia-storage
```
> Ative o código S3 em `apps/api/src/lib/storage.ts`

---

## 3. Deploy do Frontend (Vercel)

### 3.1 Conectar repositório

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório do GitHub
3. **Framework Preset:** Next.js
4. **Root Directory:** `apps/web`

### 3.2 Variáveis de ambiente

Em **Environment Variables**, adicione:

```env
NEXT_PUBLIC_API_URL=https://sua-api.railway.app

# Stripe (frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 3.3 Deploy

Clique em **Deploy**. O Vercel detecta Next.js e configura automaticamente.

URL de produção: `https://mapeia-ai.vercel.app` (ou seu domínio customizado)

---

## 4. Domínio Customizado (opcional)

### Frontend (Vercel)
1. Vercel → Project → **Domains** → Add `mapeia.ai`
2. Configure o DNS: `A 76.76.21.21` ou `CNAME cname.vercel-dns.com`

### Backend (Railway)
1. Railway → Service → **Settings** → **Networking** → **Generate Domain**
2. Ou adicione domínio customizado: `api.mapeia.ai`

---

## 5. Configurar Stripe (produção)

### 5.1 Criar produtos no Stripe Dashboard

| Produto | Preço | Price ID |
|---|---|---|
| Avulso — até 100 fotos | R$ 29 (único) | `price_avulso_100` |
| Avulso — até 300 fotos | R$ 59 (único) | `price_avulso_300` |
| Avulso — até 1.000 fotos | R$ 99 (único) | `price_avulso_1000` |
| Starter Mensal | R$ 97/mês | `price_starter` |
| Pro Mensal | R$ 197/mês | `price_pro` |

### 5.2 Configurar Webhook

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add Endpoint**
2. URL: `https://sua-api.railway.app/api/billing/webhook`
3. Eventos: `checkout.session.completed`, `customer.subscription.deleted`
4. Copie o **Signing Secret** → adicione como `STRIPE_WEBHOOK_SECRET`

---

## 6. Checklist de Produção

- [ ] HTTPS ativo em todos os serviços (Railway e Vercel fazem isso automaticamente)
- [ ] `DATABASE_URL` apontando para PostgreSQL cloud
- [ ] Migrations rodaram (`prisma migrate deploy`)
- [ ] Worker rodando em processo separado
- [ ] Volume ou S3 configurado para storage persistente
- [ ] `FRONTEND_URL` no backend apontando para o domínio correto (CORS)
- [ ] Webhook do Stripe configurado e testado
- [ ] Variável `STRIPE_WEBHOOK_SECRET` configurada
- [ ] PWA testada: manifest, ícones e service worker funcionando em HTTPS
- [ ] `/health` respondendo 200 OK

---

## 7. Monitoramento (recomendado)

| Ferramenta | O que monitora | Grátis? |
|---|---|---|
| Railway Metrics | CPU, memória, requests | Sim |
| Vercel Analytics | Core Web Vitals, visitas | Sim (básico) |
| UptimeRobot | Disponibilidade da API | Sim |
| Sentry | Erros em produção | Sim (5k eventos/mês) |

### Sentry (opcional)
```bash
cd apps/api && npm install @sentry/node
cd apps/web && npm install @sentry/nextjs
```

---

## 8. Escalabilidade

Quando o volume crescer:

| Quando | Ação |
|---|---|
| > 100 projetos/dia | Migrar storage para S3 |
| > 500 projetos/dia | Aumentar concorrência do worker (BullMQ) |
| > 1.000 usuários | Adicionar autenticação (NextAuth.js ou Clerk) |
| > 5.000 projetos/mês | CDN para tiles do mapa (CloudFront) |
