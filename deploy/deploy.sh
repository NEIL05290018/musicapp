#!/bin/bash
set -e

echo "=== AudioSift 阿里云部署脚本 ==="

APP_DIR="/opt/audiosift"
if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 权限运行: sudo bash deploy.sh"
    exit 1
fi

echo "[1/7] 更新系统包并安装依赖..."
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip nginx ffmpeg curl > /dev/null 2>&1

echo "[2/7] 创建应用目录..."
mkdir -p $APP_DIR/{backend,frontend,uploads,outputs,logs}

echo "[3/7] 安装 Python 依赖..."
cd $APP_DIR/backend
python3 -m venv venv
source venv/bin/activate
pip install -q --upgrade pip
pip install -q fastapi uvicorn[standard] python-multipart soundfile aiofiles numpy
pip install -q torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -q demucs
deactivate

echo "[4/7] 复制项目文件..."
cp -r /tmp/audiosift-deploy/backend/*.py $APP_DIR/backend/

echo "[5/7] 构建前端..."
cd /tmp/audiosift-deploy
npm install --silent
npm run build --silent
cp -r dist/* $APP_DIR/frontend/

echo "[6/7] 配置 systemd 服务..."
cat > /etc/systemd/system/audiosift.service << 'SERVICE'
[Unit]
Description=AudioSift Backend Service
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/audiosift/backend
Environment="PATH=/opt/audiosift/backend/venv/bin"
Environment="UPLOAD_DIR=/opt/audiosift/uploads"
Environment="OUTPUT_DIR=/opt/audiosift/outputs"
ExecStart=/opt/audiosift/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

echo "[7/7] 配置 Nginx..."
cat > /etc/nginx/sites-available/audiosift << 'NGINX'
server {
    listen 80;
    server_name _;

    client_max_body_size 150M;

    location / {
        root /opt/audiosift/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 600s;
        proxy_connect_timeout 60s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/audiosift /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

systemctl daemon-reload
systemctl enable audiosift
systemctl restart audiosift
systemctl restart nginx

echo ""
echo "============================================"
echo "  部署完成！"
echo "  访问地址: http://$(curl -s ifconfig.me)"
echo "  健康检查: http://$(curl -s ifconfig.me)/api/health"
echo "============================================"
