# SillyTavern Annual Summary 一键安装脚本
# 支持 Windows PowerShell

$ErrorActionPreference = "Stop"

# 颜色函数
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       SillyTavern Annual Summary 年度总结插件安装器          ║" -ForegroundColor Cyan
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

# 获取脚本所在目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "正在检测 SillyTavern 安装目录..." -ForegroundColor Yellow

# 尝试自动检测
$STPath = Find-SillyTavern

if (-not $STPath) {
    Write-Host "未能自动检测到 SillyTavern 目录" -ForegroundColor Yellow
    $STPath = Read-Host "请输入 SillyTavern 的安装路径"
}

# 验证路径
if (-not (Test-Path "$STPath\server.js")) {
    Write-Host "错误: $STPath 不是有效的 SillyTavern 目录" -ForegroundColor Red
    Write-Host "请确保输入的路径包含 server.js 文件"
    exit 1
}

# 转换为绝对路径
$STPath = (Resolve-Path $STPath).Path
Write-Host "找到 SillyTavern: $STPath" -ForegroundColor Green

# 定义目标目录
$PluginDir = "$STPath\plugins\annual-summary"
$ExtensionDir = "$STPath\public\scripts\extensions\third-party\annual-summary"

# 创建目录
Write-Host "创建插件目录..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null
New-Item -ItemType Directory -Force -Path "$ExtensionDir\i18n" | Out-Null

# 复制服务端插件
Write-Host "安装服务端插件..." -ForegroundColor Cyan
Copy-Item "$ScriptDir\plugin\index.mjs" -Destination $PluginDir -Force

# 复制前端扩展
Write-Host "安装前端扩展..." -ForegroundColor Cyan
Copy-Item "$ScriptDir\extension\manifest.json" -Destination $ExtensionDir -Force
Copy-Item "$ScriptDir\extension\index.js" -Destination $ExtensionDir -Force
Copy-Item "$ScriptDir\extension\style.css" -Destination $ExtensionDir -Force
Copy-Item "$ScriptDir\extension\i18n\zh-CN.json" -Destination "$ExtensionDir\i18n" -Force

# 检查 config.yaml 中的 enableServerPlugins 设置
$ConfigFile = "$STPath\config.yaml"
if (Test-Path $ConfigFile) {
    $configContent = Get-Content $ConfigFile -Raw
    if ($configContent -match "enableServerPlugins:\s*true") {
        Write-Host "✓ 服务端插件已启用" -ForegroundColor Green
    } else {
        Write-Host "⚠ 需要启用服务端插件" -ForegroundColor Yellow
        Write-Host "请在 config.yaml 中设置: enableServerPlugins: true" -ForegroundColor Yellow
        
        $enablePlugins = Read-Host "是否自动启用? (y/n)"
        if ($enablePlugins -eq "y" -or $enablePlugins -eq "Y") {
            if ($configContent -match "enableServerPlugins:") {
                $configContent = $configContent -replace "enableServerPlugins:.*", "enableServerPlugins: true"
            } else {
                $configContent += "`nenableServerPlugins: true"
            }
            Set-Content -Path $ConfigFile -Value $configContent
            Write-Host "✓ 已启用服务端插件" -ForegroundColor Green
        }
    }
} else {
    Write-Host "⚠ 未找到 config.yaml，请手动创建并添加:" -ForegroundColor Yellow
    Write-Host "enableServerPlugins: true"
}

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
Write-Host "  1. 确保 config.yaml 中设置了 " -NoNewline; Write-Host "enableServerPlugins: true" -ForegroundColor Green
Write-Host "  2. 重启 SillyTavern"
Write-Host "  3. 在扩展菜单中点击 `"年度总结`" 按钮"
Write-Host ""
Write-Host "享受你的年度回顾吧! ✨" -ForegroundColor Cyan
Write-Host ""
Read-Host "按 Enter 键退出"