# Kemono Downloader

[English](/readme/README.en.md) [简体中文](/readme/README.zh-Hans.md) [繁體中文](/readme/README.zh-Hant.md)

一個現代化的 Pawchive/Kemono 下載器使用者腳本，提供美觀的 UI 介面、多種下載器和高度自訂功能。

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
- 多站點支援：Pawchive、Kemono
- 批次下載支援
- 多種下載器選擇：瀏覽器內建下載器、File System API、Aria2
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
- 單元測試（Vitest）與程式碼品質檢查（ESLint）
- GitHub Actions 自動建置與發布
- 自動化的建置流程
- 開發伺服器支援 HTTPS

## 🏗️ 架構說明

腳本核心與具體網站解耦，透過兩層抽象適配任意網站：

1. **Site Adapter（站點適配層）**：每個受支援的網站實作一個 adapter，負責頁面識別（URL 比對與生命週期）、資源提取與提交下載意圖；
2. **Download Provider（下載交付層）**：負責將下載意圖真正交付給使用者，目前提供瀏覽器內建、File System API 與 Aria2 三種下載方式。

目前已實作 Pawchive 與 Kemono 兩個站點 adapter。基於此架構，理論上可擴充支援任意網站。

## 截圖

![](https://p.sda1.dev/34/3bf374557ca96efcc763a05c9dbf8972/%E7%B9%81%E4%B8%AD-PostsSelector_v3.jpg)
![](https://p.sda1.dev/34/b3570a8ebcbe34629ee19d92077dd765/%E7%B9%81%E4%B8%AD-Manager_v3.jpg)
![](https://p.sda1.dev/34/1a5f57d5bd623cc3f891a3860b527bf7/%E7%B9%81%E4%B8%AD-Settings_v3.jpg)

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
- 在擴充功能管理員中點擊「新增新腳本」
- 貼上建置產生的使用者腳本內容

## 📁 專案結構

```
kemono-downloader/
├── src/
│   ├── components/         # 公用 Vue 元件（DownloadButton/ListItem/TabLayout）
│   ├── modules/            # 腳本內部功能模組（settings/api/downloader/debugging/self）
│   ├── sites/              # 站點適配層（site adapter，可插拔擴充任意網站）
│   │   ├── types.ts        # 通用 Site 契約（hosts/modules/resolve/expand）
│   │   ├── main.ts         # 站點註冊表與 detectSite
│   │   ├── kemono.ts       # Kemono 站點 adapter
│   │   ├── pawchive.ts     # Pawchive 站點 adapter
│   │   └── kemono-family/  # Kemono 系共享實作（API/頁面流程/型別/元件）
│   ├── utils/              # 工具函式
│   ├── volt/               # PrimeVue 元件封裝
│   ├── main.ts             # 應用程式入口
│   ├── loader.ts           # 模組載入器
│   └── loader-actions.ts   # 模組生命週期動作判定
├── build-utils/            # 建置工具
├── scripts/                # 建置腳本
├── server/                 # 開發伺服器設定
├── package.json            # 專案設定
├── vite.config.ts          # Vite 設定
└── tsconfig.json           # TypeScript 設定
```## 🛠️ 技術棧

- **前端框架**: Vue 3 + TypeScript
- **建置工具**: Vite
- **UI 元件庫**: PrimeVue
- **樣式方案**: Tailwind CSS
- **使用者腳本**: vite-plugin-monkey
- **狀態管理**: Vue Composition API
- **國際化**: vue-i18n
- **工具庫**: mitt, uuid, dedent

## 📦 建置與部署

### 開發測試
```bash
npm run dev
```

### 生產建置
```bash
npm run build
```

生產建置的產物將在 `/dist/` 中建立

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
4. 編寫清晰的提交訊息
5. 建立 Pull Request

### PR 規範
#### 程式碼規範
本專案沒有硬性的程式碼規範要求，但是請您確保您的程式碼至少能做到：
- 保留有合適的註解
- 通過 TypeScript 型別檢查

#### Commit 規範
每條 commit 中可以包含多個更新內容，每個更新內容應當寫成一條列表項  
每條更新內容應當在列表項開頭處標明更新類型，並用英文冒號+空格（`: `）隔開：
| 更新類型        | 描述                                                 |
| :-------------- | :--------------------------------------------------- |
| `feat`          | 新功能新增                                           |
| `improvement`   | 既有功能改進                                         |
| `code`          | 功能無變化，僅程式碼（包含註解）修改（程式碼最佳化等）|
| `performance`   | 功能無變化，僅效能改進                               |
| `bug fix`       | 修復 bug                                             |
| `i18n`          | 程式碼無變化，僅更新語言包                           |
| `maintainence`  | 程式碼無變化的其他更新，如：TODO 清單更新、依賴更新等|
| `refactor`      | 功能無變化，程式碼整體重寫（重構）                   |

如果一條更新對應多個類型，以其最主要的類型書寫  
commit 訊息應當用英文書寫

commit 訊息範例：
```
- feat: new download provider `aria2`
- improvement: debounce TextInput for settings
- bug fix: download button no response after multiple clicks
- maintainence: updated TODO
- maintainence: updated README
- refactor: build script
```

以上 commit 訊息僅作範例。實際 commit 中，對於如此多的更新內容，應當盡量分多次 commit 提交

## 📄 授權條款

本專案採用 [GPL-3.0](https://spdx.org/licenses/GPL-3.0-or-later.html) 授權條款。

## 🙏 致謝

- [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) - 用於建置使用者腳本的 Vite 外掛
- [Pixiv Downloader](https://github.com/drunkg00se/Pixiv-Downloader/) - 適用於包括 Pixiv 在內的多站點下載器
- [Vue.js](https://vuejs.org/) - 漸進式 JavaScript 框架
- [PrimeVue](https://primevue.org/) - 次世代 Vue UI 元件庫
- [Tailwind CSS](https://tailwindcss.com/) - 實用優先的 CSS 框架
- [Vite](https://vitejs.dev/) - 次世代前端建置工具
- [Tampermonkey](https://www.tampermonkey.net/) - 流行的使用者腳本管理器
- [Violentmonkey](https://violentmonkey.github.io/) - 開源的使用者腳本管理器

## ✉️ 問題與回饋

歡迎透過以下方式：

- 提交 [GitHub Issue](https://github.com/Kemono-Downloader/issues)
- 提交 [Pull Request](https://github.com/PYUDNG/Kemono-Downloader/pulls)
- 提交 [Greasyfork Discussion](https://greasyfork.org/scripts/570258/feedback)

---

**注意**: 本專案僅供學習和研究使用，請遵守相關網站的使用條款和版權規定。