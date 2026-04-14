#!/bin/bash
# Setup do worker ODM na Hetzner
# Execute como root: curl -sL https://raw.githubusercontent.com/SEU_USUARIO/mapeia.ai/main/hetzner-setup.sh | bash

set -e

echo "==> Atualizando sistema..."
apt-get update && apt-get upgrade -y

echo "==> Instalando dependências..."
apt-get install -y curl git docker.io nodejs npm

echo "==> Iniciando Docker..."
systemctl enable docker
systemctl start docker

echo "==> Instalando PM2..."
npm install -g pm2

echo "==> Baixando OpenDroneMap..."
docker pull opendronemap/odm:latest

echo "==> Clonando repositório..."
git clone https://github.com/augustoaredes/Mapeia.AI.git /opt/mapeia
cd /opt/mapeia/apps/api

echo "==> Instalando dependências Node..."
npm install

echo "==> Criando .env do worker..."
cat > .env << 'ENVEOF'
# ── Banco (Railway) ───────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:SENHA@metro.proxy.rlwy.net:54616/railway

# ── Redis (Upstash) ───────────────────────────────────────────────────────────
REDIS_URL=rediss://default:TOKEN@emerging-oarfish-79979.upstash.io:6379

# ── Cloudflare R2 ─────────────────────────────────────────────────────────────
R2_ACCOUNT_ID=SEU_ACCOUNT_ID
R2_ACCESS_KEY_ID=SEU_ACCESS_KEY
R2_SECRET_KEY=SEU_SECRET_KEY
R2_BUCKET=mapeia-storage

# ── Storage local temporário ──────────────────────────────────────────────────
STORAGE_BASE_PATH=/opt/mapeia-storage

NODE_ENV=production
ENVEOF

echo "ATENÇÃO: Edite /opt/mapeia/apps/api/.env com os valores reais!"
echo ""

echo "==> Compilando TypeScript..."
npm run build
npx prisma generate

echo "==> Criando diretório de storage..."
mkdir -p /opt/mapeia-storage

echo "==> Configurando PM2..."
pm2 start dist/workers/index.js --name mapeia-worker
pm2 startup
pm2 save

echo ""
echo "================================================"
echo "  Worker ODM instalado com sucesso!"
echo "  Edite /opt/mapeia/apps/api/.env e rode:"
echo "  pm2 restart mapeia-worker"
echo "================================================"
