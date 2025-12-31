# SillyTavern Annual Summary / 年度总结插件

<p align="center">
  <img src="https://img.shields.io/badge/SillyTavern-Plugin-purple" alt="SillyTavern Plugin">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version 1.0.0">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
</p>

一个为 SillyTavern 打造的年度聊天数据统计与可视化插件，帮助你回顾一年的对话历程。

## ✨ 功能特性

- 📊 **数据总览** - 全年会话数、消息数、Token消耗、活跃天数统计
- 👤 **角色互动** - TOP10排行榜、角色分布饼图、首次对话记录
- ⏰ **时间分析** - 24小时热力图、星期分布、月度趋势
- 📝 **内容分析** - 高频词云图、消息长度统计

---

## 🚀 一键安装

### Linux / macOS (curl)

在 **SillyTavern 目录**下运行：
```bash
curl -sSL https://raw.githubusercontent.com/Kazuki-0147/SillyTavern-AnnualSummary/main/install.sh | bash
```

或者指定 SillyTavern 路径：
```bash
curl -sSL https://raw.githubusercontent.com/Kazuki-0147/SillyTavern-AnnualSummary/main/install.sh | bash -s -- /path/to/SillyTavern
```

### Windows (PowerShell)

在 **SillyTavern 目录**下运行：
```powershell
irm https://raw.githubusercontent.com/Kazuki-0147/SillyTavern-AnnualSummary/main/install-remote.ps1 | iex
```

或者指定路径：
```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/Kazuki-0147/SillyTavern-AnnualSummary/main/install-remote.ps1))) -STPath "C:\path\to\SillyTavern"
```

---

## 📦 手动安装

1. 下载本项目
2. 复制 `plugin/index.mjs` 到 `SillyTavern/plugins/annual-summary/`
3. 复制 `extension/` 文件夹到 `SillyTavern/public/scripts/extensions/third-party/annual-summary/`
4. 编辑 `config.yaml`，添加：
   ```yaml
   enableServerPlugins: true
   ```
5. 重启 SillyTavern

---

## 📖 使用方法

1. 启动 SillyTavern
2. 点击扩展菜单 → **年度总结**
3. 输入年份，查看你的年度报告！

---

## 📁 项目结构

```
SillyTavern-AnnualSummary/
├── install.sh               # Linux/macOS 远程安装脚本
├── install-remote.ps1       # Windows 远程安装脚本
├── install.ps1              # Windows 本地安装脚本
├── install.bat              # Windows 批处理安装脚本
├── plugin/
│   └── index.mjs            # 服务端插件
└── extension/
    ├── manifest.json
    ├── index.js
    ├── style.css
    └── i18n/zh-CN.json
```

---

## ⚠️ 上传前配置

上传到 GitHub 前，请修改以下文件中的用户名：

**install.sh** (第9行):
```bash
GITHUB_USER="YOUR_GITHUB_USERNAME"  # 改为你的用户名
```

**install-remote.ps1** (第12行):
```powershell
$GITHUB_USER = "YOUR_GITHUB_USERNAME"  # 改为你的用户名
```

---

## ❓ 常见问题

**Q: 消息数量不准确？**
A: 插件只统计每个角色**当前选中的对话**

**Q: 显示"未找到数据"？**
A: 确保 `config.yaml` 中设置了 `enableServerPlugins: true`

**Q: 图表空白？**
A: 检查网络是否能访问 CDN (Chart.js)

---

## 📄 License

MIT License

---

**祝你的年度回顾充满美好回忆！** ✨