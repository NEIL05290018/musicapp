#!/bin/bash
set -e

echo "============================================"
echo "  AudioSift - Python 后端环境安装"
echo "============================================"
echo ""

cd "$(dirname "$0")/../backend"

echo "[1/3] 创建虚拟环境..."
python3 -m venv venv

echo "[2/3] 激活虚拟环境并安装依赖..."
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt

echo "[3/3] 预下载 Demucs 模型（约160MB）..."
python -c "import demucs; from demucs import pretrained; pretrained.get_model('htdemucs'); print('模型就绪')"

echo ""
echo "============================================"
echo "  安装完成！"
echo "  启动后端:"
echo "    source backend/venv/bin/activate"
echo "    python backend/main.py"
echo "============================================"
