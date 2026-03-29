# Kagami Craft Launcher

---

## 简介

Kagami Craft Launcher (KCL) 是一款开源、跨平台的 Minecraft 启动器，支持账户管理、游戏版本管理、模组管理等功能。

KCL 基于 Tauri + React + TypeScript + Rust 构建，具有高效、轻量、跨平台等特点。

## 下载

你可以通过以下渠道下载 Kagami Craft Launcher：

- [GitHub Releases](https://github.com/Kagami-Git/KCL/releases)
- [Kagami-Git/KCL](https://github.com/Kagami-Git/KCL)

## 功能特点

- **账户管理** - 支持 Microsoft 正版账户和离线账户管理
- **跨平台** - 支持 Windows、~~Linux、macOS~~ 等操作系统
- **轻量高效** - 基于 Tauri 构建，包体积小、启动速度快
- **开源免费** - 完全开源，基于 GPL-3.0 协议

## 从源码构建

### 环境要求

- Node.js 18+
- Rust 1.70+
- pnpm

### 构建步骤

1. 克隆仓库
```bash
git clone https://github.com/Kagami-Git/KCL.git
cd KCL
```

2. 安装依赖
```bash
pnpm install
```

3. 配置 Client ID（可选）

   复制 `.env.example` 为 `.env`，填入你的 Microsoft OAuth Client ID：
```bash
cp src-tauri/.env.example src-tauri/.env
```

4. 运行开发版本
```bash
pnpm tauri dev
```

5. 构建发布版本
```bash
pnpm tauri build
```

## 参与贡献

Kagami Craft Launcher 是一个社区驱动的开源项目，欢迎任何人参与贡献代码或提出建议。

你可以通过以下方式参与开发：

- 通过 [GitHub Issues](https://github.com/Kagami-Git/KCL/issues/new/choose) 报告 Bug 或提出功能请求
- 通过 Fork 仓库并提交 Pull Request 来贡献代码

### 附加条款

1. 当你分发该程序的修改版本时，你必须以一种合理的方式修改该程序的名称或版本号，以示其与原始版本不同。
2. 你不得移除该程序所显示的版权声明。

## 致谢

- [Tauri](https://tauri.app/) - 构建跨平台应用框架
- [React](https://react.dev/) - 用户界面库
- [Plain Minecraft Launcher](https://github.com/Meloong-Git/PCL) - Minecraft 启动器 Plain Craft Launcher（PCL）。

## 声明

本软件非 MINECRAFT 官方产品。
未经 MOJANG 或 MICROSOFT 批准，也不与 MOJANG 或 MINECRAFT 关联。