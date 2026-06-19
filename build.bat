@echo off
echo ========================================
echo   xVideo Windows 构建脚本
echo ========================================
echo.

echo [1/3] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未安装 Node.js，请先安装 https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js 已就绪

echo.
echo [2/3] 检查 Rust...
cargo --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未安装 Rust，请先安装 https://rustup.rs/
    pause
    exit /b 1
)
echo Rust 已就绪

echo.
echo [3/3] 安装依赖并构建...
call npm install
if errorlevel 1 (
    echo 错误: 安装依赖失败
    pause
    exit /b 1
)

call npm run tauri build
if errorlevel 1 (
    echo 错误: 构建失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo   构建完成！
echo   安装包位置: src-tauri\target\release\bundle\msi\
echo ========================================
pause
