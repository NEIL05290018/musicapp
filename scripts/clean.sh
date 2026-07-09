#!/bin/bash

echo "============================================"
echo "  AudioSift - 清理卸载"
echo "============================================"
echo ""
echo "将删除以下内容:"
echo "  · backend/venv       （Python虚拟环境 + 所有依赖 ~5GB）"
echo "  · backend/uploads    （上传的音频文件）"
echo "  · backend/outputs    （分离结果）"
echo "  · node_modules       （Node.js依赖）"
echo "  · dist               （前端构建产物）"
echo ""

read -p "确认卸载？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo ""
echo "正在清理..."

[ -d "backend/venv" ] && rm -rf backend/venv && echo "  ✓ 已删除 backend/venv"
[ -d "backend/uploads" ] && rm -rf backend/uploads && echo "  ✓ 已删除 backend/uploads"
[ -d "backend/outputs" ] && rm -rf backend/outputs && echo "  ✓ 已删除 backend/outputs"
[ -d "node_modules" ] && rm -rf node_modules && echo "  ✓ 已删除 node_modules"
[ -d "dist" ] && rm -rf dist && echo "  ✓ 已删除 dist"

echo ""
echo "============================================"
echo "  清理完成！项目代码未被删除。"
echo "  若需完全删除，直接 rm -rf 整个项目目录即可。"
echo "============================================"
