#!/usr/bin/env bash
set -e

# ============================================
# StudyPro — Oracle Cloud ARM Ubuntu Setup
# Run once on a fresh Ubuntu 22.04+ VM
# ============================================

REPO_URL="https://github.com/renj-arch/dimsred.git"
APP_DIR="$HOME/studypro"

echo "=== 1. System update ==="
sudo apt update -y && sudo apt upgrade -y

echo "=== 2. Install Node.js 20 ==="
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "Node: $(node -v) — npm: $(npm -v)"

echo "=== 3. Install PM2 ==="
sudo npm install -g pm2

echo "=== 4. Clone / pull app ==="
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "=== 5. Install dependencies ==="
npm install

echo "=== 6. Create log directory ==="
sudo mkdir -p /var/log/studypro
sudo chown -R "$USER:$USER" /var/log/studypro

echo "=== 7. Start with PM2 ==="
pm2 start ecosystem.config.js
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$USER" --hp "$HOME"

echo "=== 8. Setup firewall ==="
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw --force enable

echo ""
echo "============================================"
echo "  StudyPro is running on port 3000"
echo "  Test: curl http://localhost:3000"
echo ""
echo "  Next: Set up Cloudflare Tunnel:"
echo "  1. Install cloudflared:"
echo "     sudo apt install -y cloudflared"
echo "  2. Authenticate & create tunnel:"
echo "     cloudflared tunnel login"
echo "     cloudflared tunnel create studypro"
echo "  3. Route DNS:"
echo "     cloudflared tunnel route dns studypro vlymbooq.qzz.io"
echo "  4. Create config at ~/.cloudflared/config.yml:"
echo "     tunnel: studypro"
echo "     credentials-file: ~/.cloudflared/studypro.json"
echo "     ingress:"
echo "       - hostname: vlymbooq.qzz.io"
echo "         service: http://localhost:3000"
echo "       - service: http_status:404"
echo "  5. Install as service:"
echo "     sudo cloudflared service install"
echo "============================================"
