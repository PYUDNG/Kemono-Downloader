# Kemono Downloader

[English](/readme/README.en.md) [简体中文](/readme/README.zh-Hans.md) [繁體中文](/readme/README.zh-Hant.md)

A modern Kemono downloader userscript featuring a beautiful UI, multiple downloaders, and extensive customization options.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646cff?logo=vite)](https://vitejs.dev/)

> If you encounter any errors or have feature suggestions, feel free to [open an issue](https://github.com/PYUDNG/Kemono-Downloader/issues) for discussion.

## ✨ Features

### 🎨 Modern Interface
- Modern UI design based on PrimeVue and Tailwind CSS
- Responsive layout supporting desktop and mobile
- Dark/Light theme support
- Multi-language support

### 📥 Download Features
- Batch download support
- Multiple downloader options
- Intelligent filename handling
- Download progress display
- Download task management

### ⚙️ Customization Settings
- Custom settings for different downloaders
- Custom filenames (supports directory structure creation)

### 🔧 Technical Features
- Modular architecture design
- Type-safe TypeScript development
- Modern Vue 3 Composition API
- Automated build process
- Development server with HTTPS support

## Screenshots

![](https://p.sda1.dev/32/d5fa056e2fc167000bb0f27d5f1c2bf7/PostsSelector.png)
![](https://p.sda1.dev/31/55a983d7d8e4c7957e9cbbb02068c23c/Manager.jpg)
![](https://p.sda1.dev/31/d922777e076a727ec4dc32944c3fb941/Settings.jpg)

## 🚀 Quick Start

### Direct Installation (Recommended for Most Users)
Choose one of the following methods:
- [Github Release](https://github.com/PYUDNG/Kemono-Downloader/releases)
- [Greasyfork](https://greasyfork.org/scripts/570258)

### Build from Source
#### Prerequisites
> This project uses npm as the package manager for development. Other package managers may require manual adaptation.
- Node.js 18+ 
- npm or yarn

#### Development Setup

1. **Clone the project**
```bash
git clone https://github.com/PYUDNG/Kemono-Downloader.git
cd kemono-downloader
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Start the development server**
```bash
npm run dev
# or
yarn dev
```

4. **Build the userscript**
```bash
npm run build
# or
yarn build
```

#### Installing the Userscript

After building, a `kemono-downloader.(min|greasyfork)?.user.js` file will be generated in the `/dist/` directory. Install it by following these steps:
- Open any build artifact and copy all its code content
- Install the Tampermonkey or Violentmonkey browser extension
- Click "Add new script" in the extension manager
- Paste the generated userscript content

## 📁 Project Structure

```
kemono-downloader/
├── src/
│   ├── components/         # Shared Vue components
│   │   ├── ListItem.vue    # Single-line list item component
│   │   ├── PostsSelector/  # Post selector component
│   │   └── TabLayout/      # Tab layout component
│   ├── modules/            # Feature modules
│   │   ├── api/            # API module
│   │   ├── creator/        # Creator page module
│   │   ├── downloader/     # Downloader module
│   │   ├── post/           # Post page module
│   │   └── settings/       # Settings module
│   ├── utils/              # Utility functions
│   ├── volt/               # PrimeVue component wrappers
│   ├── main.ts             # Application entry point
│   └── loader.ts           # Module loader
├── build-utils/            # Build utilities
├── scripts/                # Build scripts
├── server/                 # Development server configuration
├── package.json            # Project configuration
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration
```

## 🛠️ Tech Stack

- **Frontend Framework**: Vue 3 + TypeScript
- **Build Tool**: Vite
- **UI Component Library**: PrimeVue
- **Styling Solution**: Tailwind CSS
- **Userscript**: vite-plugin-monkey
- **State Management**: Vue Composition API
- **Internationalization**: vue-i18n
- **Utility Libraries**: mitt, uuid, dedent## 📦 Build & Deployment

### Development Testing
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

The production build output will be created in `/dist/`

## 🤝 Contribution Guide

You can participate in this project by submitting Issues and Pull Requests.

### Submitting an Issue
- Clearly describe the problem or feature request
- Provide reproduction steps
- Include relevant screenshots or logs

### Submitting a Pull Request
1. Fork the project repository
2. Create a feature branch
3. Commit code changes
4. Write clear commit messages
5. Create a Pull Request

### PR Guidelines
#### Code Standards
This project does not have strict code style requirements, but please ensure your code at least:
- Includes appropriate comments
- Passes TypeScript type checking

#### Commit Standards
Each commit can contain multiple updates, and each update should be written as a list item.  
Each update should indicate the update type at the beginning of the list item, separated by an English colon and space (`: `):
| Update Type      | Description                                                |
| :--------------- | :--------------------------------------------------------- |
| `feat`           | New feature addition                                       |
| `improvement`    | Improvement to existing features                           |
| `code`           | No functional changes, only code (including comments) modifications (code optimization, etc.) |
| `performance`    | No functional changes, only performance improvements       |
| `bug fix`        | Bug fixes                                                  |
| `i18n`           | No code changes, only language pack updates                |
| `maintainence`   | Other updates with no code changes, e.g., TODO list updates, dependency updates, etc. |
| `refactor`       | No functional changes, complete code rewrite (refactoring) |

If an update corresponds to multiple types, use the most primary type.  
Commit messages should be written in English.

Commit message example:
```
- feat: new download provider `aria2`
- improvement: debounce TextInput for settings
- bug fix: download button no response after multiple clicks
- maintainence: updated TODO
- maintainence: updated README
- refactor: build script
```

The above commit messages are just examples. In actual commits, for so many updates, try to split them into multiple commits.

## 📄 License

This project is licensed under the [GPL-3.0](https://spdx.org/licenses/GPL-3.0-or-later.html) license.

## 🙏 Acknowledgments

- [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) - Vite plugin for building user scripts
- [Pixiv Downloader](https://github.com/drunkg00se/Pixiv-Downloader/) - Downloader for multiple sites including Pixiv
- [Vue.js](https://vuejs.org/) - Progressive JavaScript framework
- [PrimeVue](https://primevue.org/) - Next-generation Vue UI component library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vite](https://vitejs.dev/) - Next-generation frontend build tool
- [Tampermonkey](https://www.tampermonkey.net/) - Popular user script manager
- [Violentmonkey](https://violentmonkey.github.io/) - Open-source user script manager

## ✉️ Issues & Feedback

Welcome to reach out via:

- Submit a [GitHub Issue](https://github.com/Kemono-Downloader/issues)
- Submit a [Pull Request](https://github.com/PYUDNG/Kemono-Downloader/pulls)
- Submit a [Greasyfork Discussion](https://greasyfork.org/scripts/570258/feedback)

---

**Note**: This project is for learning and research purposes only. Please comply with the terms of use and copyright regulations of relevant websites.