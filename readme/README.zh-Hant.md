# Kemono Downloader

[English](/readme/README.en.md) [简体中文](/readme/README.zh-Hans.md) [繁體中文](/readme/README.zh-Hant.md)

一個現代化的 Kemono 下載器使用者腳本，提供美觀的 UI 介面、多種下載器及高度自訂功能。

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646cff?logo=vite)](https://vitejs.dev/)

> 如遇錯誤或有功能建議，歡迎 [提出 issue](https://github.com/PYUDNG/Kemono-Downloader/issues) 共同討論解決

## ✨ 功能特性

### 🎨 現代化介面
- 基於 PrimeVue 和 Tailwind CSS 的現代化 UI 設計
- 響應式佈局，支援桌面和行動端
- 深色/淺色主題支援
- 多語言支援

### 📥 下載功能
- 批次下載支援
- 多種下載器選擇
- 智慧檔案名稱處理
- 下載進度顯示
- 下載任務管理

### ⚙️ 自訂設定
- 不同的下載器自訂
- 自訂檔案名稱（支援建立目錄結構）

### 🔧 技術特性
- 模組化架構設計
- 型別安全的 TypeScript 開發
- 現代化的 Vue 3 Composition API
- 自動化的建置流程
- 開發伺服器支援 HTTPS

## 截圖

![](https://p.sda1.dev/32/c88e54e8f9b13fc33a8acd35d58bc67e/PostsSelector.png)
![](https://p.sda1.dev/31/603cc320752a6167a58473768c553274/Manager.jpg)
![](https://p.sda1.dev/31/d16bee941f34ae4abe025201b86e9dc5/Settings.jpg)

## 🚀 快速開始

### 直接安裝使用（適合大多數使用者）
您可以選擇以下任一方式安裝
- [Github Release](https://github.com/PYUDNG/Kemono-Downloader/releases)
- [Greasyfork](https://greasyfork.org/scripts/570258)

### 自行建置
#### 環境需求
> 本專案使用 npm 作為套件管理器開發，其他套件管理器請自行嘗試
- Node.js 18+ 
- npm 或 yarn

#### 開發環境設定

1. **克隆專案**
```bash
git clone https://github.com/PYUDNG/Kemono-Downloader.git
cd kemono-downloader
```

2. **安裝依賴**
```bash
npm install
# 或
yarn install
```

3. **啟動開發伺服器**
```bash
npm run dev
# 或
yarn dev
```

4. **建置使用者腳本**
```bash
npm run build
# 或
yarn build
```

#### 安裝使用者腳本

建置完成後，會在專案 `/dist/` 目錄產生 `kemono-downloader.(min|greasyfork)?.user.js` 檔案，可以透過以下步驟安裝：
- 開啟任一建置產物，複製其中全部程式碼內容
- 安裝 Tampermonkey 或 Violentmonkey 瀏覽器擴充功能
- 在擴充功能管理員中點擊「新增腳本」
- 貼上建置產生的使用者腳本內容

## 📁 專案結構

```
kemono-downloader/
├── src/
│   ├── components/         # 公用 Vue 元件
│   │   ├── ListItem.vue    # 單行列項目元件
│   │   ├── PostsSelector/  # 貼文選擇器元件
│   │   └── TabLayout/      # 標籤頁佈局元件
│   ├── modules/            # 功能模組
│   │   ├── api/            # API 模組
│   │   ├── creator/        # 創作者頁面模組
│   │   ├── downloader/     # 下載器模組
│   │   ├── post/           # 貼文頁面模組
│   │   └── settings/       # 設定模組
│   ├── utils/              # 工具函式
│   ├── volt/               # PrimeVue 元件封裝
│   ├── main.ts             # 應用程式入口
│   └── loader.ts           # 模組載入器
├── build-utils/            # 建置工具
├── scripts/                # 建置腳本
├── server/                 # 開發伺服器設定
├── package.json            # 專案設定
├── vite.config.ts          # Vite 設定
└── tsconfig.json           # TypeScript 設定
```

## 🛠️ 技術棧

- **前端框架**: Vue 3 + TypeScript
- **建置工具**: Vite
- **UI 元件庫**: PrimeVue
- **樣式方案**: Tailwind CSS
- **使用者腳本**: vite-plugin-monkey
- **狀態管理**: Vue Composition API
- **國際化**: vue-i18n
- **工具庫**: mitt, uuid, dedent## 📦 構建與部署

### 開發測試
```bash
npm run dev
```

### 生產構建
```bash
npm run build
```

生產構建的產物將在 `/dist/` 中建立

## 🤝 貢獻指南

您可以透過提交 Issue 和 Pull Request 參與到本專案中

### 提交 Issue
- 描述清晰的問題或功能需求
- 提供重現步驟
- 包含相關截圖或日誌

### 提交 Pull Request
1. Fork 專案倉庫
2. 建立功能分支
3. 提交程式碼變更
4. 編寫清晰的提交資訊
5. 建立 Pull Request

### PR 規範
#### 程式碼規範
本專案沒有硬性的程式碼規範要求，但請您確保您的程式碼至少能做到：
- 保留有合適的註解
- 通過 TypeScript 型別檢查

#### Commit 規範
每條 commit 中可以包含多個更新內容，每個更新內容應寫成一條列表項  
每條更新內容應在列表項開頭處標明更新類型，並用英文冒號+空格（`: `）隔開：
| 更新類型        | 描述                                                 |
| :-------------- | :--------------------------------------------------- |
| `feat`          | 新功能新增                                           |
| `improvement`   | 已有功能改進                                         |
| `code`          | 功能無變化，僅程式碼（包含註解）修改（程式碼最佳化等） |
| `performance`   | 功能無變化，僅效能改進                               |
| `bug fix`       | 修復 Bug                                             |
| `i18n`          | 程式碼無變化，僅更新語言包                           |
| `maintainence`  | 程式碼無變化的其他更新，如：TODO 列表更新、依賴更新等 |
| `refactor`      | 功能無變化，程式碼整體重寫（重構）                   |

如果一條更新對應多個類型，以其最主要的類型書寫  
commit 訊息應使用英文書寫

commit 訊息範例：
```
- feat: new download provider `aria2`
- improvement: debounce TextInput for settings
- bug fix: download button no response after multiple clicks
- maintainence: updated TODO
- maintainence: updated README
- refactor: build script
```

以上 commit 訊息僅作範例。實際 commit 中，對於如此多的更新內容，應盡量分多次 commit 提交

## 📄 授權條款

本專案採用 [GPL-3.0](https://spdx.org/licenses/GPL-3.0-or-later.html) 授權條款。

## 🙏 致謝

- [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) - 用於建置使用者腳本的 Vite 外掛
- [Pixiv Downloader](https://github.com/drunkg00se/Pixiv-Downloader/) - 適用於包括 Pixiv 在內的多站點下載器
- [Vue.js](https://vuejs.org/) - 漸進式 JavaScript 框架
- [PrimeVue](https://primevue.org/) - 下一代 Vue UI 元件庫
- [Tailwind CSS](https://tailwindcss.com/) - 實用優先的 CSS 框架
- [Vite](https://vitejs.dev/) - 下一代前端建置工具
- [Tampermonkey](https://www.tampermonkey.net/) - 流行的使用者腳本管理器
- [Violentmonkey](https://violentmonkey.github.io/) - 開源的使用者腳本管理器

## ✉️ 問題與回饋

歡迎透過以下方式：

- 提交 [GitHub Issue](https://github.com/Kemono-Downloader/issues)
- 提交 [Pull Request](https://github.com/PYUDNG/Kemono-Downloader/pulls)
- 提交 [Greasyfork Discussion](https://greasyfork.org/scripts/570258/feedback)

---

**注意**: 本專案僅供學習與研究使用，請遵守相關網站的使用條款與版權規定。