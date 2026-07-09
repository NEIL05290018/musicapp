@echo off
chcp 65001 > nul
echo ============================================
echo   AudioSift - 清理卸载
echo ============================================
echo.

echo 将删除以下内容:
echo   · backend/venv       （Python虚拟环境 + 所有依赖 ~5GB）
echo   · backend/uploads    （上传的音频文件）
echo   · backend/outputs    （分离结果）
echo   · node_modules       （Node.js依赖）
echo   · dist               （前端构建产物）
echo.

choice /C YN /M "确认卸载？(Y=是, N=否)"
if errorlevel 2 exit /b 0

cd /d "%~dp0.."

echo.
echo 正在清理...

if exist "backend\venv" (
    rmdir /s /q "backend\venv"
    echo   ✓ 已删除 backend\venv
)

if exist "backend\uploads" (
    rmdir /s /q "backend\uploads"
    echo   ✓ 已删除 backend\uploads
)

if exist "backend\outputs" (
    rmdir /s /q "backend\outputs"
    echo   ✓ 已删除 backend\outputs
)

if exist "node_modules" (
    rmdir /s /q "node_modules"
    echo   ✓ 已删除 node_modules
)

if exist "dist" (
    rmdir /s /q "dist"
    echo   ✓ 已删除 dist
)

echo.
echo ============================================
echo   清理完成！项目代码未被删除。
echo   若需完全删除，直接删除整个项目文件夹即可。
echo ============================================
