#!/usr/bin/env bash
set -e

echo "=== [1/6] Installing Node.js, Git, and Nginx ==="
sudo dnf update -y
sudo dnf install -y git nodejs npm nginx

echo "=== [2/6] Installing PM2 process manager ==="
sudo npm install -g pm2

echo "=== [3/6] Setting up HushHawk codebase ==="
cd /home/ec2-user
if [ -d "hushhawk" ]; then
  cd hushhawk
  git pull origin main
else
  git clone https://github.com/HushHawk/HushHawk.git hushhawk
  cd hushhawk
fi

echo "=== [4/6] Installing dependencies ==="
npm install

echo "=== [5/6] Creating production .env file ==="
cat << 'EOF' > .env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://hushhawk:HushHawk2026!DB@hushhawk-postgres.cxsqkk2qulh9.us-east-2.rds.amazonaws.com:5432/hushhawk
EOF

echo "=== [6/6] Starting HushHawk API with PM2 ==="
pm2 delete hushhawk-api 2>/dev/null || true
pm2 start backend/src/server.js --name "hushhawk-api"
pm2 save

echo "=== Configuring Nginx Reverse Proxy (Port 80 -> 3001) ==="
sudo sed -i 's/listen       80;/listen       8088;/' /etc/nginx/nginx.conf 2>/dev/null || true
sudo sed -i 's/listen       \[::\]:80;/listen       \[::\]:8088;/' /etc/nginx/nginx.conf 2>/dev/null || true

sudo tee /etc/nginx/conf.d/hushhawk.conf > /dev/null << 'NGINX_CONF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX_CONF

sudo nginx -t
sudo systemctl enable nginx --now
sudo systemctl restart nginx

echo ""
echo "=========================================================="
echo "✅ DEPLOYMENT COMPLETE! Testing live endpoints..."
echo "=========================================================="
sleep 2
curl -s http://localhost:3001/api/v1/health | grep -o '"status":"ONLINE"' && echo "✅ API is ONLINE and connected to RDS!" || echo "⚠️ Check API logs: pm2 logs"
