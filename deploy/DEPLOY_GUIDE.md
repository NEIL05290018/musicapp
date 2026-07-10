# AudioSift 阿里云 + 宝塔面板部署指南

## 1. 服务器要求

| 项目 | 最低配置 | 推荐配置 |
|------|---------|---------|
| 操作系统 | CentOS 7+ (阿里云 ECS) | CentOS 7+ |
| 面板 | 宝塔面板 | 宝塔面板 |
| CPU | 4 核 | 8 核+ |
| 内存 | 8GB | 16GB+ |
| 硬盘 | 50GB SSD | 100GB SSD |
| GPU | 不需要 | NVIDIA T4/A10 (显著加速) |
| 网络 | 公网 IP + 安全组开放 80 端口 | 建议开通 443 (HTTPS) |

> **GPU 说明**: Demucs 在 CPU 上约 0.5x 实时速度，GPU 约 10x 实时。若用 CPU，30 秒音频约需 60 秒处理。若并发用户多，建议使用 GPU 实例。

## 2. 部署架构

```
宝塔面板管理的 Nginx (:80)
├── / → /www/wwwroot/musicapp/ (Vue 前端静态文件)
└── /api/* → 127.0.0.1:8000 (FastAPI 后端，由 systemd 管理)
```

**前端部署路径**: `/www/wwwroot/musicapp/`（宝塔网站根目录）

**后端路径**: `/opt/audiosift/`
- `backend/main.py` — FastAPI 入口
- `backend/separator.py` — Demucs 分离器工具
- `backend/venv/` — Python 虚拟环境
- `uploads/` — 上传的原始音频文件
- `outputs/` — 分离结果输出
- `logs/` — 运行日志

## 3. 自动部署（GitHub Actions）

项目已配置 GitHub Actions 自动部署工作流。

### 前置条件

1. 在阿里云 ECS 上安装 GitHub Actions **Self-Hosted Runner**：
   ```bash
   # 在 GitHub 仓库 → Settings → Actions → Runners → New self-hosted runner 获取安装命令
   mkdir actions-runner && cd actions-runner
   curl -o actions-runner-linux-x64-xxx.tar.gz -L <下载地址>
   tar xzf ./actions-runner-linux-x64-xxx.tar.gz
   ./config.sh --url https://github.com/<your-repo> --token <your-token>
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

2. Runner 需要以 **root** 身份运行（用于 systemctl 重启服务）：
   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

3. 确认宝塔面板中网站根目录设置为 `/www/wwwroot/musicapp/`

### 部署流程

push 到 `main` 分支时自动触发（[deploy.yml](file:///c:/Users/NEIL/AppData/Roaming/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/6a4da5c25923191041f7bc77/.github/workflows/deploy.yml)）：

1. Checkout 代码
2. `npm install` + `npm run build` 构建前端
3. 复制 `dist/*` 到 `/www/wwwroot/musicapp/`
4. 复制 `backend/*.py` 到 `/opt/audiosift/backend/`
5. 安装/更新 systemd 服务 (`audiosift.service`)
6. 重启后端服务

## 4. 手动部署步骤（备用方案）

### 步骤 1: 安装 Node.js

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs
node --version && npm --version
```

### 步骤 2: 构建前端

```bash
cd /path/to/project
npm config set registry https://registry.npmmirror.com
npm install
npm run build
```

### 步骤 3: 部署前端到宝塔目录

```bash
mkdir -p /www/wwwroot/musicapp
rm -rf /www/wwwroot/musicapp/*
cp -r dist/* /www/wwwroot/musicapp/
```

### 步骤 4: 设置后端目录和虚拟环境

```bash
mkdir -p /opt/audiosift/{backend,uploads,outputs,logs}
cd /opt/audiosift/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 步骤 5: 复制后端文件

```bash
cp backend/main.py /opt/audiosift/backend/
cp backend/separator.py /opt/audiosift/backend/
```

### 步骤 6: 注册并启动 systemd 服务

```bash
cp .github/deploy/audiosift.service /etc/systemd/system/audiosift.service
sudo systemctl daemon-reload
sudo systemctl enable audiosift.service
sudo systemctl start audiosift.service
```

### 步骤 7: 配置宝塔站点

宝塔面板 → 网站 → 添加站点：
- 域名：你的 IP 或域名
- 根目录：`/www/wwwroot/musicapp`
- PHP 版本：纯静态

配置 Nginx 反向代理（宝塔 → 站点 → 配置文件）：

```nginx
# 在 server 块中添加 API 反代
location /api/ {
    proxy_pass http://127.0.0.1:8000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    client_max_body_size 100M;
}
```

### 步骤 8: 阿里云安全组

登录阿里云控制台 → ECS → 安全组 → 添加规则：
- 方向: 入方向
- 端口: 80 (HTTP)
- 授权对象: 0.0.0.0/0

## 5. 访问验证

```
前端页面: http://<你的服务器公网IP>
健康检查: http://<你的服务器公网IP>/api/health
返回示例: {"status":"ok","gpu_available":false}
```

## 6. 可选: 配置 HTTPS

```bash
yum install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
certbot renew --dry-run
```

## 7. 可选: GPU 加速

如果使用 GPU 实例 (NVIDIA)，修改 `backend/requirements.txt` 中的 PyTorch 安装为 CUDA 版本：

```bash
pip install torch torchaudio  # 自动检测 CUDA 版本
```

## 8. 常用管理命令

```bash
# 查看后端服务状态
systemctl status audiosift.service

# 重启后端服务
systemctl restart audiosift.service

# 查看实时日志
journalctl -u audiosift.service -f

# 重启 Nginx（宝塔面板管理）
nginx -s reload
# 或宝塔面板 → 网站 → 重载配置

# 查看 GitHub Actions Runner 状态
cd /path/to/actions-runner
sudo ./svc.sh status

# 重启 Runner
sudo ./svc.sh restart

# 查看后端进程
ps aux | grep uvicorn

# 查看磁盘使用
du -sh /opt/audiosift/uploads/
du -sh /opt/audiosift/outputs/

# 清理旧文件 (1 天前的分离结果)
find /opt/audiosift/outputs -type d -mtime +1 -exec rm -rf {} \;
find /opt/audiosift/uploads -type f -mtime +1 -delete

# 查看前端部署状态
ls -la /www/wwwroot/musicapp/
```

## 9. 项目完整结构

```
/www/wwwroot/musicapp/     ← 宝塔网站根目录（前端 Vue dist/ 产物）
├── index.html
├── favicon.svg
├── albums/                ← 专辑封面图片 (album-1.jpg ~ album-30.jpg)
└── assets/                ← JS/CSS 构建产物

/opt/audiosift/            ← 后端与数据目录
├── backend/
│   ├── main.py            ← FastAPI 入口 (HTTP 路由)
│   ├── separator.py       ← Demucs 分离器工具函数
│   ├── requirements.txt   ← Python 依赖
│   └── venv/              ← Python 虚拟环境
├── uploads/               ← 用户上传的原始音频
├── outputs/               ← 分离结果输出
└── logs/                  ← 运行日志

/etc/systemd/system/
└── audiosift.service      ← systemd 服务配置
```

## 10. 故障排查

| 问题 | 解决方法 |
|------|---------|
| 页面 404 / 空白 | 确认宝塔网站根目录为 `/www/wwwroot/musicapp/` 且 `index.html` 存在 |
| 502 Bad Gateway | `systemctl restart audiosift.service` 检查后端是否启动。确认 Nginx 反代配置指向 `127.0.0.1:8000` |
| 后端启动慢 | 首次加载 Demucs 模型需要下载预训练权重 (约 160MB)，等待 2-5 分钟 |
| 后端 217/USER 错误 | systemd 配置中 `User=root` / `Group=root`。如果使用了其他用户名，需确保该用户在 ECS 上存在 |
| 内存不足 | 减小音频文件限制 (`max_file_size`)，或升级服务器配置 |
| 前端文件未更新 | 检查 GitHub Actions Runner 状态：`sudo ./svc.sh status`。确认 Actions 工作流执行成功且部署到了 `/www/wwwroot/musicapp/` |
| API 请求 404 | 检查宝塔 Nginx 配置是否包含 `/api/` 的 `proxy_pass` 反向代理规则 |
