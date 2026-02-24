# Kemono Downloader

一个现代化的Kemono下载器用户脚本，提供美观的UI界面、多种下载方式和高度自定义功能。

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646cff?logo=vite)](https://vitejs.dev/)

## ✨ 功能特性

### 🎨 现代化界面
- 基于PrimeVue和Tailwind CSS的现代化UI设计
- 响应式布局，支持桌面和移动端
- 深色/浅色主题支持
- 多语言支持

### 📥 下载功能
- 批量下载支持
- 多种下载方式选择
- 智能文件名处理
- 下载进度显示
- 下载任务管理

### ⚙️ 自定义设置
- 不同的下载方式自定义
- 自定义文件名（支持创建目录结构）

### 🔧 技术特性
- 模块化架构设计
- 类型安全的TypeScript开发
- 现代化的Vue 3 Composition API
- 自动化的构建流程
- 开发服务器支持HTTPS

## 🚀 快速开始

### 直接安装使用（适合大多数用户）
您可以选择以下任一方式安装
- [Github Release](https://github.com/PYUDNG/kemono-downloader/releases)
- [Greasyfork](https://www.greasyfork.orrg/script/123456)

### 自行构建
#### 环境要求
- Node.js 18+ 
- npm 或 yarn

#### 开发环境设置

1. **克隆项目**
```bash
git clone <repository-url>
cd kemono-downloader
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
```

4. **构建用户脚本**
```bash
npm run build
# 或
yarn build
```

### 安装用户脚本

构建完成后，会在项目根目录生成 `kemono-downloader.user.js` 文件，可以通过以下方式安装：

1. **Greasy Fork**（推荐）
   - 访问 [Greasy Fork](https://greasyfork.org/)
   - 搜索 "Kemono Downloader"
   - 点击安装按钮

2. **本地安装**
   - 安装Tampermonkey或Violentmonkey浏览器扩展
   - 在扩展管理器中点击"添加新脚本"
   - 粘贴构建生成的用户脚本内容

## 📁 项目结构

```
kemono-downloader/
├── src/
│   ├── components/         # 公用Vue组件
│   │   ├── ListItem.vue    # 单行列表项组件
│   │   ├── PostsSelector/  # 帖子选择器组件
│   │   └── TabLayout/      # 标签页布局组件
│   ├── modules/            # 功能模块
│   │   ├── api/            # API模块
│   │   ├── creator/        # 创作者页面模块
│   │   ├── downloader/     # 下载器模块
│   │   ├── post/           # 帖子页面模块
│   │   └── settings/       # 设置模块
│   ├── utils/              # 工具函数
│   ├── volt/               # PrimeVue组件封装
│   ├── main.ts             # 应用入口
│   └── loader.ts           # 模块加载器
├── build-utils/            # 构建工具
├── scripts/                # 构建脚本
├── server/                 # 开发服务器配置
├── package.json            # 项目配置
├── vite.config.ts          # Vite配置
└── tsconfig.json           # TypeScript配置
```

## 🛠️ 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **UI组件库**: PrimeVue
- **样式方案**: Tailwind CSS
- **用户脚本**: vite-plugin-monkey
- **状态管理**: Vue Composition API
- **国际化**: vue-i18n
- **工具库**: mitt, uuid, dedent

## 📦 构建与部署

### 开发测试
```bash
npm run dev
```

### 生产构建
```bash
npm run build
```

生产构建的产物将在`/dist/`中创建

## 🤝 贡献指南

您可以通过提交Issue和Pull Request参与到本项目中

### 提交Issue
- 描述清晰的问题或功能需求
- 提供复现步骤
- 包含相关截图或日志

### 提交Pull Request
1. Fork项目仓库
2. 创建功能分支
3. 提交代码变更
4. 编写清晰的提交信息
5. 创建Pull Request

### 代码规范
本项目没有硬性的代码规范要求，但是请您确保您的代码至少能做到：
- 保留有合适的注释
- 通过typescript类型检查

## 📄 许可证

本项目采用 [GPL-3.0](https://spdx.org/licenses/GPL-3.0-or-later.html) 许可证。

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式JavaScript框架
- [PrimeVue](https://primevue.org/) - 下一代Vue UI组件库
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的CSS框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Tampermonkey](https://www.tampermonkey.net/) - 流行的用户脚本管理器
- [Violentmonkey](https://violentmonkey.github.io/) - 开源的用户脚本管理器

## 📞 支持与反馈

如有问题或建议，请通过以下方式联系：

- 提交 [GitHub Issue](https://github.com/your-repo/issues)
- 查看 [FAQ](#)（建设中）
- 参与社区讨论

---

**注意**: 本项目仅供学习和研究使用，请遵守相关网站的使用条款和版权规定。