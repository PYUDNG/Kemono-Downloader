# Kemono Downloader

[English](/readme/README.en.md) [简体中文](/readme/README.zh-Hans.md) [繁體中文](/readme/README.zh-Hant.md)

A modern Pawchive/Kemono downloader userscript featuring a beautiful UI, multiple downloaders, and extensive customization options.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646cff?logo=vite)](https://vitejs.dev/)

> If you encounter any errors or have feature suggestions, feel free to [open an issue](https://github.com/PYUDNG/Kemono-Downloader/issues) for discussion.

## ✨ Features

### 🎨 Modern Interface
- Modern UI design based on PrimeVue and Tailwind CSS
- Responsive layout supporting desktop and mobile devices
- Dark/Light theme support
- Multi-language support

### 📥 Download Features
- Multi-site support: Pawchive, Kemono
- Batch download support
- Multiple downloader options: browser built-in, File System API, Aria2
- Intelligent filename handling
- Download progress display
- Download task management

### ⚙️ Custom Settings
- Customization for different downloaders
- Custom filenames (supports directory structure creation)

### 🔧 Technical Features
- Modular architecture design
- Type-safe TypeScript development
- Modern Vue 3 Composition API
- Unit testing (Vitest) and code quality checks (ESLint)
- GitHub Actions automated build and release
- Automated build pipeline
- Development server with HTTPS support

## 🏗️ Architecture

The script core is decoupled from any specific website, adapting to arbitrary sites through two abstraction layers:

1. **Site Adapter**: each supported website is implemented as an adapter, handling page detection (URL matching & lifecycle), resource extraction, and download intent submission;
2. **Download Provider**: delivers download intents to the user, currently offering the built-in browser downloader, File System API, and Aria2.

Pawchive and Kemono adapters are implemented so far. Based on this architecture, support for arbitrary websites can theoretically be added.

## Screenshots

![](https://p.sda1.dev/34/0830a093f7f0e016a95552b862241549/English-PostsSelector_v3.jpg)
![](https://p.sda1.dev/34/0d49ddc1b456830062e2f2367f3af4f4/English-Manager_v3.jpg)
![](https://p.sda1.dev/34/e96c5ba54ec3dc6894541b80466ca534/English-Settings_v3.jpg)

## 🚀 Quick Start

### Direct Installation (Suitable for Most Users)
You can install using any of the following methods:
- [Github Release](https://github.com/PYUDNG/Kemono-Downloader/releases)
- [Greasyfork](https://greasyfork.org/scripts/570258)

### Build from Source
#### Environment Requirements
> This project uses npm as the package manager for development; please try other package managers on your own.
- Node.js 18+
- npm or yarn

#### Development Environment Setup

1. **Clone the Project**
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

4. **Build the Userscript**
```bash
npm run build
# or
yarn build
```

#### Installing the Userscript

After the build completes, a `kemono-downloader.(min|greasyfork)?.user.js` file will be generated in the `/dist/` directory. You can install it by following these steps:
- Open any build artifact and copy all the code content
- Install the Tampermonkey or Violentmonkey browser extension
- Click "Add New Script" in the extension manager
- Paste the generated userscript content

## 📁 Project Structure

```
kemono-downloader/
├── src/
│   ├── components/         # Shared Vue components (DownloadButton/ListItem/TabLayout)
│   ├── modules/            # Internal script modules (settings/api/downloader/debugging/self)
│   ├── sites/              # Site adapter layer (pluggable, extensible to any website)
│   │   ├── types.ts        # Generic Site contract (hosts/modules/resolve/expand)
│   │   ├── main.ts         # Site registry and detectSite
│   │   ├── kemono.ts       # Kemono site adapter
│   │   ├── pawchive.ts     # Pawchive site adapter
│   │   └── kemono-family/  # Shared Kemono-family implementation (API/page flow/types/components)
│   ├── utils/              # Utility functions
│   ├── volt/               # PrimeVue component wrappers
│   ├── main.ts             # Application entry point
│   ├── loader.ts           # Module loader
│   └── loader-actions.ts   # Module lifecycle action determination
├── build-utils/            # Build utilities
├── scripts/                # Build scripts
├── server/                 # Development server configuration
├── package.json            # Project configuration
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration
```## 🛠️ Tech Stack

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

The production build output will be created in `/dist/`

## 🤝 Contribution Guide

You can contribute to this project by submitting Issues and Pull Requests.

### Submitting an Issue
- Describe the problem or feature request clearly
- Provide reproduction steps
- Include relevant screenshots or logs

### Submitting a Pull Request
1. Fork the project repository
2. Create a feature branch
3. Commit your code changes
4. Write clear commit messages
5. Create a Pull Request

### PR Guidelines
#### Code Standards
This project has no strict code style requirements, but please ensure your code at least:
- Contains appropriate comments
- Passes TypeScript type checking

#### Commit Standards
Each commit can contain multiple updates, and each update should be written as a list item.  
Each update should start with an update type at the beginning of the list item, separated by an English colon and a space (`: `):
| Update Type     | Description                                          |
| :-------------- | :--------------------------------------------------- |
| `feat`          | New feature added                                    |
| `improvement`   | Improvement to existing features                     |
| `code`          | No functional changes, only code (including comments) modifications (code optimization, etc.) |
| `performance`   | No functional changes, only performance improvements |
| `bug fix`       | Bug fixes                                            |
| `i18n`          | No code changes, only language pack updates          |
| `maintainence`  | Other updates without code changes, such as: TODO list updates, dependency updates, etc. |
| `refactor`      | No functional changes, complete code rewrite (refactoring) |

If an update corresponds to multiple types, use the most prominent type.  
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

The above commit messages are examples only. In actual commits, for such a large number of updates, you should try to split them into multiple commits.

## 📄 License

This project is licensed under the [GPL-3.0](https://spdx.org/licenses/GPL-3.0-or-later.html) license.

## 🙏 Acknowledgements

- [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) - Vite plugin for building user scripts
- [Pixiv Downloader](https://github.com/drunkg00se/Pixiv-Downloader/) - Downloader for multiple sites including Pixiv
- [Vue.js](https://vuejs.org/) - Progressive JavaScript framework
- [PrimeVue](https://primevue.org/) - Next-generation Vue UI component library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Vite](https://vitejs.dev/) - Next-generation frontend build tool
- [Tampermonkey](https://www.tampermonkey.net/) - Popular user script manager
- [Violentmonkey](https://violentmonkey.github.io/) - Open-source user script manager

## ✉️ Issues & Feedback

Feel free to reach out through the following channels:

- Submit a [GitHub Issue](https://github.com/Kemono-Downloader/issues)
- Submit a [Pull Request](https://github.com/PYUDNG/Kemono-Downloader/pulls)
- Submit a [Greasyfork Discussion](https://greasyfork.org/scripts/570258/feedback)

---

**Note**: This project is for learning and research purposes only. Please comply with the terms of use and copyright regulations of the relevant websites.