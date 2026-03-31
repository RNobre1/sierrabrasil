#!/bin/bash
# Setup script para deploy no Droplet DigitalOcean
# Executar como root no droplet

set -e

APP_DIR="/var/www/theagent"
REPO="https://github.com/RNobre1/theagent.git"

echo "=== Instalando dependencias do sistema ==="
apt-get update
apt-get install -y nginx nodejs npm git

# Node 20+ via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== Clonando repositorio ==="
mkdir -p $APP_DIR
cd $APP_DIR
if [ -d ".git" ]; then
    git pull origin main
else
    git clone $REPO .
fi

echo "=== Configurando variaveis de ambiente ==="
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "IMPORTANTE: Edite $APP_DIR/.env com as credenciais reais do Supabase"
    echo "Depois execute: npm run build"
    exit 1
fi

echo "=== Instalando dependencias e buildando ==="
npm ci
npm run build

echo "=== Configurando Nginx ==="
cp deploy/nginx.conf /etc/nginx/sites-available/theagent
ln -sf /etc/nginx/sites-available/theagent /etc/nginx/sites-enabled/theagent
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== Deploy concluido ==="
echo "Frontend acessivel na porta 80"
echo "Para HTTPS, instale certbot: apt install certbot python3-certbot-nginx && certbot --nginx"
