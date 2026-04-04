#!/bin/bash
# Deploy O Agente frontend para producao
# Executa na maquina local — faz build e envia para o droplet
#
# Uso:
#   ./deploy/deploy.sh              # deploy da branch atual
#   ./deploy/deploy.sh main         # deploy da branch main
#
# Pre-requisitos:
#   - SSH access a root@159.203.88.15
#   - .env com as variaveis VITE_SUPABASE_*
#   - Node.js + npm instalados

set -euo pipefail

DROPLET_IP="159.203.88.15"
DROPLET_USER="root"
DEPLOY_DIR="/var/www/oagente"
BRANCH="${1:-main}"

echo "=== O Agente — Deploy para Producao ==="
echo "Branch: $BRANCH"
echo "Destino: $DROPLET_USER@$DROPLET_IP:$DEPLOY_DIR"
echo ""

# 1. Checkout da branch
echo "[1/5] Checkout $BRANCH..."
git checkout "$BRANCH"
git pull origin "$BRANCH"

# 2. Instalar dependencias
echo "[2/5] Instalando dependencias..."
npm ci --silent

# 3. Rodar testes
echo "[3/5] Rodando testes..."
npm run test -- --reporter=dot
echo "Testes OK"

# 4. Build de producao
echo "[4/5] Build de producao..."
npm run build
echo "Build OK — $(du -sh dist | cut -f1)"

# 5. Deploy via rsync
echo "[5/5] Enviando para $DROPLET_IP..."
rsync -avz --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  dist/ "$DROPLET_USER@$DROPLET_IP:$DEPLOY_DIR/"

# Verificar
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DROPLET_IP/")
if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "=== Deploy concluido com sucesso ==="
  echo "HTTP $HTTP_CODE — https://oagente.io"
else
  echo ""
  echo "=== ATENCAO: HTTP $HTTP_CODE — verificar Nginx ==="
fi
