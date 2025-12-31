@echo off
chcp 65001 >nul
title SillyTavern Annual Summary 安装器

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║       SillyTavern Annual Summary 年度总结插件安装器          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: 获取脚本目录
set "SCRIPT_DIR=%~dp0"

:: 检测 SillyTavern 目录
echo 正在检测 SillyTavern 安装目录...

set "ST_PATH="

:: 检查常见位置
if exist "%CD%\server.js" set "ST_PATH=%CD%"
if "%ST_PATH%"=="" if exist "%USERPROFILE%\SillyTavern\server.js" set "ST_PATH=%USERPROFILE%\SillyTavern"
if "%ST_PATH%"=="" if exist "%USERPROFILE%\Desktop\SillyTavern\server.js" set "ST_PATH=%USERPROFILE%\Desktop\SillyTavern"
if "%ST_PATH%"=="" if exist "C:\SillyTavern\server.js" set "ST_PATH=C:\SillyTavern"
if "%ST_PATH%"=="" if exist "..\SillyTavern\server.js" set "ST_PATH=..\SillyTavern"

if "%ST_PATH%"=="" (
    echo 未能自动检测到 SillyTavern 目录
    set /p "ST_PATH=请输入 SillyTavern 的安装路径: "
)

:: 验证路径
if not exist "%ST_PATH%\server.js" (
    echo 错误: %ST_PATH% 不是有效的 SillyTavern 目录
    echo 请确保输入的路径包含 server.js 文件
    pause
    exit /b 1
)

echo 找到 SillyTavern: %ST_PATH%

:: 定义目标目录
set "PLUGIN_DIR=%ST_PATH%\plugins\annual-summary"
set "EXTENSION_DIR=%ST_PATH%\public\scripts\extensions\third-party\annual-summary"

:: 创建目录
echo 创建插件目录...
if not exist "%PLUGIN_DIR%" mkdir "%PLUGIN_DIR%"
if not exist "%EXTENSION_DIR%\i18n" mkdir "%EXTENSION_DIR%\i18n"

:: 复制服务端插件
echo 安装服务端插件...
copy /Y "%SCRIPT_DIR%plugin\index.mjs" "%PLUGIN_DIR%\" >nul

:: 复制前端扩展
echo 安装前端扩展...
copy /Y "%SCRIPT_DIR%extension\manifest.json" "%EXTENSION_DIR%\" >nul
copy /Y "%SCRIPT_DIR%extension\index.js" "%EXTENSION_DIR%\" >nul
copy /Y "%SCRIPT_DIR%extension\style.css" "%EXTENSION_DIR%\" >nul
copy /Y "%SCRIPT_DIR%extension\i18n\zh-CN.json" "%EXTENSION_DIR%\i18n\" >nul

:: 检查 config.yaml
set "CONFIG_FILE=%ST_PATH%\config.yaml"
if exist "%CONFIG_FILE%" (
    findstr /C:"enableServerPlugins: true" "%CONFIG_FILE%" >nul
    if %ERRORLEVEL%==0 (
        echo √ 服务端插件已启用
    ) else (
        echo.
        echo ⚠ 需要启用服务端插件
        echo 请在 config.yaml 中设置: enableServerPlugins: true
        echo.
    )
) else (
    echo.
    echo ⚠ 未找到 config.yaml，请手动创建并添加:
    echo enableServerPlugins: true
    echo.
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    安装完成!                                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 已安装到:
echo   服务端插件: %PLUGIN_DIR%
echo   前端扩展:   %EXTENSION_DIR%
echo.
echo 下一步:
echo   1. 确保 config.yaml 中设置了 enableServerPlugins: true
echo   2. 重启 SillyTavern
echo   3. 在扩展菜单中点击 "年度总结" 按钮
echo.
echo 享受你的年度回顾吧! ✨
echo.
pause