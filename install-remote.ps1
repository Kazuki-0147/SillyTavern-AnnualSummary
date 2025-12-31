# SillyTavern Annual Summary 一键远程安装脚本 (Windows PowerShell)
# 用法: irm https://raw.githubusercontent.com/你的用户名/SillyTavern-AnnualSummary/main/install-remote.ps1 | iex
# 或者: .\install-remote.ps1 -STPath "C:\path\to\SillyTavern"

param(
    [string]$STPath
)

$ErrorActionPreference = "Stop"

# ============ 配置区域 - 上传 GitHub 后请修改这里 ============
$GITHUB_USER = "Kazuki-0147"
$GITHUB_REPO = "SillyTavern-AnnualSummary"
$GITHUB_BRANCH = "main"
# ===========================================================

$GITHUB_RAW = "https://raw.githubusercontent.com/$GITHUB_USER/$GITHUB_REPO/$GITHUB_BRANCH"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       SillyTavern Annual Summary 年度总结插件安装器          ║" -ForegroundColor Cyan
Write-Host "║                    一键远程安装版本                          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 检测 SillyTavern 目录
function Find-SillyTavern {
    $possiblePaths = @(
        $PWD.Path,
        "$env:USERPROFILE\SillyTavern",
        "$env:USERPROFILE\Desktop\SillyTavern",
        "$env:USERPROFILE\Documents\SillyTavern",
        "C:\SillyTavern",
        "..\SillyTavern",
        "..\..\SillyTavern"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path "$path\server.js") {
            return (Resolve-Path $path).Path
        }
    }
    
    return $null
}

# 如果没有提供参数，尝试自动检测
if (-not $STPath) {
    Write-Host "正在检测 SillyTavern 安装目录..." -ForegroundColor Yellow
    $STPath = Find-SillyTavern
}

if (-not $STPath) {
    Write-Host "未能自动检测到 SillyTavern 目录" -ForegroundColor Red
    Write-Host "请使用以下方式指定路径:"
    Write-Host '  .\install-remote.ps1 -STPath "C:\path\to\SillyTavern"'
    exit 1
}

# 验证路径
if (-not (Test-Path "$STPath\server.js")) {
    Write-Host "错误: $STPath 不是有效的 SillyTavern 目录" -ForegroundColor Red
    exit 1
}

$STPath = (Resolve-Path $STPath).Path
Write-Host "找到 SillyTavern: $STPath" -ForegroundColor Green

# 定义目标目录
$PluginDir = "$STPath\plugins\annual-summary"
$ExtensionDir = "$STPath\public\scripts\extensions\third-party\annual-summary"

# 创建目录
Write-Host "创建插件目录..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null
New-Item -ItemType Directory -Force -Path "$ExtensionDir\i18n" | Out-Null

# 下载文件函数
function Download-File {
    param($Url, $Dest)
    Write-Host "下载: $(Split-Path $Dest -Leaf)" -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $Url -OutFile $Dest -UseBasicParsing
    } catch {
        Write-Host "下载失败: $Url" -ForegroundColor Red
        throw
    }
}

# 下载服务端插件
Write-Host "下载服务端插件..." -ForegroundColor Cyan
Download-File "$GITHUB_RAW/plugin/index.mjs" "$PluginDir\index.mjs"

# 下载前端扩展
Write-Host "下载前端扩展..." -ForegroundColor Cyan
Download-File "$GITHUB_RAW/extension/manifest.json" "$ExtensionDir\manifest.json"
Download-File "$GITHUB_RAW/extension/index.js" "$ExtensionDir\index.js"
Download-File "$GITHUB_RAW/extension/style.css" "$ExtensionDir\style.css"
Download-File "$GITHUB_RAW/extension/i18n/zh-CN.json" "$ExtensionDir\i18n\zh-CN.json"

# 自动配置 enableServerPlugins
$ConfigFile = "$STPath\config.yaml"

function Configure-ServerPlugins {
    if (Test-Path $ConfigFile) {
        $configContent = Get-Content $ConfigFile -Raw -ErrorAction SilentlyContinue
        
        if ($configContent -match "enableServerPlugins:\s*true") {
            Write-Host "✓ 服务端插件已启用" -ForegroundColor Green
        } elseif ($configContent -match "enableServerPlugins:") {
            # 配置存在但不是 true，修改它
            Write-Host "正在启用服务端插件..." -ForegroundColor Yellow
            $configContent = $configContent -replace "enableServerPlugins:.*", "enableServerPlugins: true"
            Set-Content -Path $ConfigFile -Value $configContent -NoNewline
            Write-Host "✓ 已自动启用服务端插件" -ForegroundColor Green
        } else {
            # 配置不存在，添加它
            Write-Host "正在添加服务端插件配置..." -ForegroundColor Yellow
            Add-Content -Path $ConfigFile -Value "`nenableServerPlugins: true"
            Write-Host "✓ 已自动添加并启用服务端插件" -ForegroundColor Green
        }
    } else {
        # config.yaml 不存在，创建它
        Write-Host "创建 config.yaml 并启用服务端插件..." -ForegroundColor Yellow
        Set-Content -Path $ConfigFile -Value "enableServerPlugins: true"
        Write-Host "✓ 已创建 config.yaml 并启用服务端插件" -ForegroundColor Green
    }
}

Configure-ServerPlugins

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    安装完成!                                 ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "已安装到:"
Write-Host "  服务端插件: " -NoNewline; Write-Host $PluginDir -ForegroundColor Cyan
Write-Host "  前端扩展:   " -NoNewline; Write-Host $ExtensionDir -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "  1. 重启 SillyTavern"
Write-Host "  2. 在扩展菜单中点击 `"年度总结`" 按钮"
Write-Host ""
Write-Host "享受你的年度回顾吧! ✨" -ForegroundColor Cyan