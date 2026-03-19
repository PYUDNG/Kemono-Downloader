# Kemono Downloader
<!-- Github -->
[English](/readme/README.en.md) [简体中文](/readme/README.zh-Hans.md) [繁體中文](/readme/README.zh-Hant.md)

<!-- /Github -->
A modern Kemono downloader user script, featuring a beautiful UI, multiple downloader options, and highly customizable functionality.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646cff?logo=vite)](https://vitejs.dev/)

> The project is currently in active development. Expected phenomena include, but are not limited to, *bugs everywhere* and *unreliable functionality*. If you encounter errors, please [submit an issue](https://github.com/PYUDNG/Kemono-Downloader/issues) to discuss and resolve them together.

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

### ⚙️ Customizable Settings
- Customization for different downloaders
- Customizable filenames (supports creating directory structures)

### 🔧 Technical Features
- Modular architecture design
- Type-safe TypeScript development
- Modern Vue 3 Composition API
- Automated build process
- Development server with HTTPS support

<!-- Github -->
## 🚀 Quick Start

### Direct Installation (Recommended for Most Users)
You can choose any of the following methods to install:
- [Github Release](https://github.com/PYUDNG/Kemono-Downloader/releases)
- <del>[Greasyfork](#)</del> Greasyfork version not yet uploaded

### Build from Source
#### Prerequisites
> This project uses npm as the package manager for development. Please try other package managers at your own discretion.
- Node.js 18+
- npm or yarn

#### Development Environment Setup

1. **Clone the Repository**
```bash
git clone https://github.com/PYUDNG/Kemono-Downloader.git
cd kemono-downloader
```

2. **Install Dependencies**
```bash
npm install
# or
yarn install
```

3. **Start the Development Server**
```bash
npm run dev
# or
yarn dev
```

4. **Build the User Script**
```bash
npm run build
# or
yarn build
```

#### Installing the User Script

After building, the `kemono-downloader.(min|greasyfork)?.user.js` file will be generated in the project's `/dist/` directory. You can install it by following these steps:
- Open any build artifact and copy all its code content.
- Install the Tampermonkey or Violentmonkey browser extension.
- Click "Add new script" in the extension manager.
- Paste the content of the built user script.

## 📁 Project Structure

```
kemono-downloader/
├── src/
│   ├── components/         # Common Vue Components
│   │   ├── ListItem.vue    # Single List Item Component
│   │   ├── PostsSelector/  # Posts Selector Component
│   │   └── TabLayout/      # Tab Layout Component
│   ├── modules/            # Functional Modules
│   │   ├── api/            # API Module
│   │   ├── creator/        # Creator Page Module
│   │   ├── downloader/     # Downloader Module
│   │   ├── post/           # Post Page Module
│   │   └── settings/       # Settings Module
│   ├── utils/              # Utility Functions
│   ├── volt/               # PrimeVue Component Wrappers
│   ├── main.ts             # Application Entry Point
│   └── loader.ts           # Module Loader
├── build-utils/            # Build Tools
├── scripts/                # Build Scripts
├── server/                 # Development Server Configuration
├── package.json            # Project Configuration
├── vite.config.ts          # Vite Configuration
└── tsconfig.json           # TypeScript Configuration
```

## 🛠️ Tech Stack

- **Frontend Framework**: Vue 3 + TypeScript
- **Build Tool**: Vite
- **UI Component Library**: PrimeVue
- **Styling Solution**: Tailwind CSS
- **User Script**: vite-plugin-monkey
- **State Management**: Vue Composition API
- **Internationalization**: vue-i18n
- **Utility Libraries**: mitt, uuid, dedent

## 📦 Build & Deployment

### Development Testing
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

Production build artifacts will be created in `/dist/`## 🤝 Contribution Guide

You can participate in this project by submitting Issues and Pull Requests.

### Submitting an Issue
- Clearly describe the problem or feature request.
- Provide steps to reproduce.
- Include relevant screenshots or logs.

### Submitting a Pull Request
1. Fork the project repository.
2. Create a feature branch.
3. Commit your code changes.
4. Write clear commit messages.
5. Create a Pull Request.

### PR Guidelines
#### Code Guidelines
This project does not have strict code style requirements, but please ensure your code at least meets the following:
- Contains appropriate comments.
- Passes TypeScript type checking.

#### Commit Guidelines
A single commit can contain multiple updates. Each update should be written as a list item.  
Each update item should begin with the update type, followed by an English colon and a space (`: `):
| Update Type      | Description                                                                 |
| :--------------- | :-------------------------------------------------------------------------- |
| `feat`           | New feature addition                                                        |
| `improvement`    | Improvement to an existing feature                                          |
| `code`           | Code-only changes (including comments) with no functional change (e.g., code optimization) |
| `performance`    | Performance improvements with no functional change                          |
| `bug fix`        | Bug fix                                                                     |
| `i18n`           | Language pack updates only, no code changes                                 |
| `maintainence`   | Other non-code updates, e.g., TODO list updates, dependency updates, etc.   |
| `refactor`       | Code rewrite (refactoring) with no functional change                        |

If an update corresponds to multiple types, use the primary type.  
Commit messages should be written in English.

Example commit message:
```
- feat: new download provider `aria2`
- improvement: debounce TextInput for settings
- bug fix: download button no response after multiple clicks
- maintainence: updated TODO
- maintainence: updated README
- refactor: build script
```

The above commit message is for example only. In practice, for this many updates, try to split them across multiple commits.
<!-- /Github -->

## 📄 License

This project is licensed under the [GPL-3.0](https://spdx.org/licenses/GPL-3.0-or-later.html) License.

## 🙏 Acknowledgments

- [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) - Vite plugin for building userscripts
- [Pixiv Downloader](https://github.com/drunkg00se/Pixiv-Downloader/) - Downloader for multiple sites including Pixiv
- [Vue.js](https://vuejs.org/) - The Progressive JavaScript Framework
- [PrimeVue](https://primevue.org/) - Next-Gen Vue UI Component Library
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [Tampermonkey](https://www.tampermonkey.net/) - Popular userscript manager
- [Violentmonkey](https://violentmonkey.github.io/) - Open-source userscript manager

## ✉️ Issues & Feedback

Welcome to reach out via:

- Submitting a [GitHub Issue](https://github.com/Kemono-Downloader/issues)
- Submitting a [Pull Request](https://github.com/PYUDNG/Kemono-Downloader/pulls)
- Submitting <del> [Greasyfork Discussion](#)</del> (Greasyfork version not yet uploaded)

---

**Note**: This project is for learning and research purposes only. Please comply with the terms of use and copyright regulations of the relevant websites.