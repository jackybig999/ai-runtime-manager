# AI Runtime Manager CLI

> Auto-detect local proxy and launch AI tools with proxy configuration.  
> 自动检测本地代理，为 AI 工具配置代理后启动。

[![License](https://img.shields.io/badge/license-BSL%201.1-blue)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![Verify](https://github.com/jackybig999/ai-runtime-manager/actions/workflows/verify.yml/badge.svg)](https://github.com/jackybig999/ai-runtime-manager/actions)

---

## 这是什么？

一个命令行交互工具，自动扫描本地代理服务（Clash / v2rayN / sing-box 等），检测可用代理，然后以交互方式选择工作目录并启动 AI CLI 工具（Claude Code / Codex CLI），启动后自动追踪进程，支持终止进程和监控模式。

**解决的问题**：
- 每次手动 `set HTTP_PROXY=...` 太繁琐
- 忘记配置代理导致 AI 工具连不上
- 工具关闭后进程残留
- 多个工具切换时不知道哪个还在运行

---

## What is this?

A CLI interactive tool that auto-scans local proxy services (Clash, v2rayN, sing-box, etc.), detects available proxies, guides you through working directory selection, and launches AI CLI tools (Claude Code / Codex CLI) with proper proxy configuration. It tracks launched processes, supports kill operations, and provides a monitor mode.

**Problems it solves**:
- Tedious manual `set HTTP_PROXY=...` every time
- Forgetting proxy config causing AI tools to fail
- Stale processes left after tool exit
- Lost track of which tool is still running

---

## 安装

```bash
# 从 GitHub 克隆
git clone https://github.com/jackybig/ai-runtime-manager.git
cd ai-runtime-manager/cli

# 安装依赖
npm install

# 启动
npm start
```

**依赖**：Node.js >= 18

---

## Installation

```bash
# Clone from GitHub
git clone https://github.com/jackybig/ai-runtime-manager.git
cd ai-runtime-manager/cli

# Install dependencies
npm install

# Start
npm start
```

**Requires**: Node.js >= 18

---

## 使用方法

```
╔══════════════════════════════════════════╗
║     AI Runtime Manager - 交互启动器      ║
╚══════════════════════════════════════════╝

选择语言 → 检测代理 → 选择菜单：

  1. Claude Code      ← 启动 Claude CLI
  2. Codex CLI        ← 启动 Codex CLI
  3. 终止所有进程      ← Kill All
  0. 退出             ← Exit
```

### 支持的代理工具

| 工具 | 检测端口 |
|------|---------|
| Clash / Clash Verge | 7890-7899, 4780-4799 |
| v2rayN / Xray | 10808-10809, 20171-20172 |
| Shadowsocks | 8388-8389 |
| sing-box | 2330-2339 |
| Nekoray / Nekobox | 2080-2089, 2440-2449 |
| Surge | 9090-9091 |
| Trojan | 51830-51839 |
| Squid / Privoxy / Fiddler / Charles | 3128, 8118, 8888-8889 |

---

## Usage

```
╔══════════════════════════════════════════╗
║     AI Runtime Manager                  ║
╚══════════════════════════════════════════╝

Select Language → Detect Proxy → Action Menu:

  1. Claude Code      ← Launch Claude CLI
  2. Codex CLI        ← Launch Codex CLI
  3. Kill All         ← Terminate all
  0. Exit             ← Quit
```

### Supported proxy tools

| Tool | Scanned Ports |
|------|-------------|
| Clash / Clash Verge | 7890-7899, 4780-4799 |
| v2rayN / Xray | 10808-10809, 20171-20172 |
| Shadowsocks | 8388-8389 |
| sing-box | 2330-2339 |
| Nekoray / Nekobox | 2080-2089, 2440-2449 |
| Surge | 9090-9091 |
| Trojan | 51830-51839 |
| Squid / Privoxy / Fiddler / Charles | 3128, 8118, 8888-8889 |

---

## 许可证 / License

**Business Source License 1.1**

Copyright (c) 2026 **jackybig** &lt;jacky_big@outlook.com&gt;

| 用途 | 是否需要授权 |
|------|------------|
| 个人学习、研究 | 🆓 免费 |
| 非商业开源项目使用 | 🆓 免费 |
| 评估和内部测试 | 🆓 免费 |
| **商业产品集成** | 🔒 需购买授权 |
| **作为 SaaS 提供服务** | 🔒 需购买授权 |
| **付费服务中使用** | 🔒 需购买授权 |

**Change Date**: 2029-06-10  
3 年后自动转为 **Apache License 2.0**，届时所有使用场景均免费。

商业授权咨询：jacky_big@outlook.com

---

## 项目结构

```
cli/
├── src/
│   ├── main.js              ← 交互入口
│   ├── ui/prompts.js        ← 交互式 UI 组件
│   ├── i18n/index.js        ← 国际化 (中/英/繁)
│   └── core/
│       ├── proxy/           ← 代理检测引擎
│       │   ├── detector.js  ← 两阶段扫描 (TCP+验证)
│       │   ├── ports.js     ← 端口配置
│       │   └── protocols.js ← 协议识别
│       ├── launcher/        ← 进程启动管理
│       ├── browser/         ← 浏览器配置
│       ├── history/         ← 对话历史管理
│       └── utils/           ← 工具函数
├── locales/                 ← 翻译文件
├── config/                  ← 配置文件
└── bin/                     ← CLI 入口脚本
```

---

## 桌面版

AI Runtime Manager 同时提供 **桌面版**（Electron GUI）：  
🖥 图形化代理检测 · 一键启动 · 系统托盘 · 对话历史浏览

> 桌面版为商业软件，[点击购买](https://github.com/jackybig/ai-runtime-manager/releases)

---

**Made with ❤️ by jackybig**
