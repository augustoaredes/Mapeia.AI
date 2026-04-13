#!/bin/sh
set -e

echo "==> Aplicando schema do banco..."
npx prisma db push --skip-generate

echo "==> Iniciando API (porta $PORT)..."
node dist/index.js &
API_PID=$!

echo "==> Iniciando Worker..."
node dist/workers/index.js &
WORKER_PID=$!

# Aguarda qualquer processo terminar
wait -n $API_PID $WORKER_PID

# Se um morrer, mata o outro
kill $API_PID $WORKER_PID 2>/dev/null
