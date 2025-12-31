#!/bin/bash
# SillyTavern Annual Summary 一键远程安装脚本
# 用法: curl -sSL https://raw.githubusercontent.com/你的用户名/SillyTavern-AnnualSummary/main/install.sh | bash
# 或者: curl -sSL URL | bash -s -- /path/to/SillyTavern

set -e

# ============ 配置区域 - 上传 GitHub 后请修改这里 ============
GITHUB_USER="Kazuki-0147"
GITHUB_REPO="SillyTavern-AnnualSummary"
GITHUB_BRANCH="main"
# ===========================================================

GITHUB_RAW="https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       SillyTavern Annual Summary 年度总结插件安装器          ║"
echo "║                    一键远程安装版本                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检测 SillyTavern 目录
detect_sillytavern() {
    local possible_paths=(
        "$PWD"
        "$HOME/SillyTavern"
        "$HOME/sillytavern"
        "/opt/SillyTavern"
        "/opt/sillytavern"
        "../SillyTavern"
        "../../SillyTavern"
    )
    
    for path in "${possible_paths[@]}"; do
        if [ -f "$path/server.js" ] && [ -d "$path/public" ]; then
            echo "$path"
            return 0
        fi
    done
    
    return 1
}

# 检查是否提供了命令行参数
if [ -n "$1" ]; then
    ST_PATH="$1"
else
    echo -e "${YELLOW}正在检测 SillyTavern 安装目录...${NC}"
    ST_PATH=$(detect_sillytavern) || ST_PATH=""
fi

if [ -z "$ST_PATH" ]; then
    echo -e "${RED}未能自动检测到 SillyTavern 目录${NC}"
    echo "请使用以下方式指定路径:"
    echo "  curl -sSL URL | bash -s -- /path/to/SillyTavern"
    exit 1
fi

# 验证路径
if [ ! -f "$ST_PATH/server.js" ]; then
    echo -e "${RED}错误: $ST_PATH 不是有效的 SillyTavern 目录${NC}"
    exit 1
fi

# 转换为绝对路径
ST_PATH=$(cd "$ST_PATH" && pwd)
echo -e "${GREEN}找到 SillyTavern: $ST_PATH${NC}"

# 定义目标目录
PLUGIN_DIR="$ST_PATH/plugins/annual-summary"
EXTENSION_DIR="$ST_PATH/public/scripts/extensions/third-party/annual-summary"

# 创建目录
echo -e "${BLUE}创建插件目录...${NC}"
mkdir -p "$PLUGIN_DIR"
mkdir -p "$EXTENSION_DIR/i18n"

# 下载文件函数
download_file() {
    local url="$1"
    local dest="$2"
    echo -e "${BLUE}下载: $(basename "$dest")${NC}"
    if command -v curl &> /dev/null; then
        curl -sSL "$url" -o "$dest"
    elif command -v wget &> /dev/null; then
        wget -q "$url" -O "$dest"
    else
        echo -e "${RED}错误: 需要 curl 或 wget${NC}"
        exit 1
    fi
}

# 下载服务端插件
echo -e "${BLUE}下载服务端插件...${NC}"
download_file "${GITHUB_RAW}/plugin/index.mjs" "$PLUGIN_DIR/index.mjs"

# 下载前端扩展
echo -e "${BLUE}下载前端扩展...${NC}"
download_file "${GITHUB_RAW}/extension/manifest.json" "$EXTENSION_DIR/manifest.json"
download_file "${GITHUB_RAW}/extension/index.js" "$EXTENSION_DIR/index.js"
download_file "${GITHUB_RAW}/extension/style.css" "$EXTENSION_DIR/style.css"
download_file "${GITHUB_RAW}/extension/i18n/zh-CN.json" "$EXTENSION_DIR/i18n/zh-CN.json"

# 自动配置 enableServerPlugins
CONFIG_FILE="$ST_PATH/config.yaml"

configure_server_plugins() {
    if [ -f "$CONFIG_FILE" ]; then
        if grep -q "enableServerPlugins: true" "$CONFIG_FILE"; then
            echo -e "${GREEN}✓ 服务端插件已启用${NC}"
        elif grep -q "enableServerPlugins:" "$CONFIG_FILE"; then
            # 配置存在但不是 true，修改它
            echo -e "${YELLOW}正在启用服务端插件...${NC}"
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' 's/enableServerPlugins:.*/enableServerPlugins: true/' "$CONFIG_FILE"
            else
                # Linux
                sed -i 's/enableServerPlugins:.*/enableServerPlugins: true/' "$CONFIG_FILE"
            fi
            echo -e "${GREEN}✓ 已自动启用服务端插件${NC}"
        else
            # 配置不存在，添加它
            echo -e "${YELLOW}正在添加服务端插件配置...${NC}"
            echo "" >> "$CONFIG_FILE"
            echo "enableServerPlugins: true" >> "$CONFIG_FILE"
            echo -e "${GREEN}✓ 已自动添加并启用服务端插件${NC}"
        fi
    else
        # config.yaml 不存在，创建它
        echo -e "${YELLOW}创建 config.yaml 并启用服务端插件...${NC}"
        echo "enableServerPlugins: true" > "$CONFIG_FILE"
        echo -e "${GREEN}✓ 已创建 config.yaml 并启用服务端插件${NC}"
    fi
}

configure_server_plugins

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    安装完成!                                 ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "已安装到:"
echo -e "  服务端插件: ${BLUE}$PLUGIN_DIR${NC}"
echo -e "  前端扩展:   ${BLUE}$EXTENSION_DIR${NC}"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo -e "  1. 重启 SillyTavern"
echo -e "  2. 在扩展菜单中点击 \"年度总结\" 按钮"
echo ""
echo -e "${BLUE}享受你的年度回顾吧! ✨${NC}"