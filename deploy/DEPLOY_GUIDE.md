# AudioSift 阿里云部署指南

## 1. 服务器要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| 操作系统 | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |
| CPU | 4核 | 8核+ |
| 内存 | 8GB | 16GB+ |
| 硬盘 | 50GB SSD | 100GB SSD |
| GPU | 不需要 | NVIDIA T4/A10 (显著加速) |
| 网络 | 公网IP + 安全组开放80端口 | 建议开通443(HTTPS) |

> **GPU说明**: Demucs 在 CPU 上大约 0.5x 实时速度，GPU 约 10x 实时。若用 CPU，
> 30秒音频约需60秒处理。若并发用户多，建议使用GPU实例。

## 2. 快速部署（5步）

### 步骤1: 上传代码到服务器

```bash
# 在本地打包项目
cd /path/to/project
tar czf audiosift-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.trae' \
  --exclude='.vscode' \
  --exclude='backend/venv' \
  backend/ src/ public/ deploy/ \
  index.html package.json vite.config.ts \
  tsconfig.json tailwind.config.js postcss.config.js \
  tsconfig.app.json eslint.config.js

# 上传到阿里云服务器
scp audiosift-deploy.tar.gz root@<你的服务器IP>:/tmp/

# SSH登录服务器
ssh root@<你的服务器IP>

# 解压
mkdir -p /tmp/audiosift-deploy
tar xzf /tmp/audiosift-deploy.tar.gz -C /tmp/audiosift-deploy
```

### 步骤2: 安装Node.js并构建前端

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version
```

### 步骤3: 执行部署脚本

```bash
cd /tmp/audiosift-deploy
chmod +x deploy/deploy.sh
bash deploy/deploy.sh
```

### 步骤4: 配置阿里云安全组

登录阿里云控制台 → ECS → 安全组 → 添加规则:
- 方向: 入方向
- 端口: 80 (HTTP)
- 授权对象: 0.0.0.0/0

### 步骤5: 访问验证

```
浏览器打开: http://<你的服务器公网IP>
健康检查: http://<你的服务器公网IP>/api/health
```

## 3. 可选: 配置HTTPS

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
certbot renew --dry-run
```

## 4. 可选: GPU加速

如果使用GPU实例(NVIDIA)，修改部署脚本中的 PyTorch 安装:

```bash
pip install torch torchaudio  # 自动检测CUDA版本
```

## 5. 常用管理命令

```bash
# 查看后端状态
systemctl status audiosift

# 重启后端
systemctl restart audiosift

# 查看实时日志
journalctl -u audiosift -f

# 重启Nginx
systemctl restart nginx

# 查看磁盘使用
du -sh /opt/audiosift/uploads/
du -sh /opt/audiosift/outputs/

# 清理旧文件(1天前的分离结果)
find /opt/audiosift/outputs -type d -mtime +1 -exec rm -rf {} \;
find /opt/audiosift/uploads -type f -mtime +1 -delete
```

## 6. 项目结构

```
/opt/audiosift/
├── backend/           # Python后端
│   ├── main.py        # FastAPI入口
│   ├── separator.py   # Demucs分离器
│   ├── requirements.txt
│   └── venv/          # Python虚拟环境
├── frontend/          # Vue构建产物(dist/)
│   ├── index.html
│   └── assets/
├── uploads/           # 上传的原始文件
├── outputs/           # 分离结果
└── logs/              # 日志
```

## 7. 故障排查

| 问题 | 解决方法 |
|------|---------|
| 502 Bad Gateway | `systemctl restart audiosift` 检查后端是否启动 |
| 后端启动慢 | 首次加载Demucs模型需要下载(约160MB)，等待2-5分钟 |
| 内存不足 | 减小音频限制，或升级服务器配置 |
