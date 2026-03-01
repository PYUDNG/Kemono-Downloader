import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { transform } from 'esbuild';
import prettier from 'prettier';
import dedent from 'dedent';
import { UserscriptMeta } from './userscript-meta.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');

// 配置
const config = {
    // 构建输出的原始文件
    rawFile: 'kemono-downloader.user.js',
    // 后处理生成的格式化文件（greasyfork版本）
    greasyforkFile: 'kemono-downloader.greasyfork.user.js',
    // 后处理生成的压缩文件（压缩版本）
    minifiedFile: 'kemono-downloader.min.user.js',
    // 后处理生成的更新文件（仅metadata）
    metaFile: 'kemono-downloader.meta.js',
    // GitHub 仓库链接
    githubRepo: 'https://github.com/PYUDNG/Kemono-Downloader',
    // Minified version 脚本下载/更新链接
    downloadURL: 'https://github.com/PYUDNG/Kemono-Downloader/releases/latest/download/kemono-downloader.user.js',
    updateURL: 'https://github.com/PYUDNG/Kemono-Downloader/releases/latest/download/kemono-downloader.meta.js',
    // Greasyfork版本源代码说明
    get comment() {
        return dedent`
            // ============================================================================
            // 📝 源代码说明 / Source Code Notice
            // 
            // 你好！这是用户脚本的构建版本，不是原始源代码。
            // 这个脚本是用 TypeScript 和 Vue.js 开发的，通过构建工具编译成 JavaScript。
            // 
            // Hello! This is the built version of the userscript, not the original source code.
            // This script is developed in TypeScript and Vue.js, compiled to JavaScript via build tools.
            // 
            // 🔍 查看完整源代码 / View Full Source Code:
            // ${config.githubRepo}
            // 
            // 仓库中包含 / Repository includes:
            // • TypeScript 源代码 (.ts) / TypeScript source files
            // • Vue.js 组件 (.vue) / Vue.js components
            // • 构建配置和开发脚本 / Build configurations and development scripts
            // • 详细的文档说明 / Detailed documentation
            // • 包含代码压缩的构建版本 / built version with code compression
            // 
            // 这个未压缩版本是为了满足 GreasyFork 的代码审查要求而提供的。
            // 如果你愿意，也可以阅读这个构建版本的代码来了解脚本的实际执行逻辑。
            // 
            // This unminified version is provided to comply with GreasyFork's code review requirements.
            // If you'd like, you can also read this built version to understand the script's actual execution logic.
            // 
            // 有任何疑问或建议？欢迎在 GitHub 上提交 Issue！
            // Questions or suggestions? Feel free to submit an Issue on GitHub!
            // ============================================================================
        `
    },
    // ESBuild配置
    esbuildOptions: {
        minify: true,
        minifyWhitespace: true,
        minifyIdentifiers: true,
        minifySyntax: true,
        target: 'es2020',
        charset: 'utf8',
    },
    // Prettier 格式化配置
    prettierOptions: {
        parser: 'babel',
        printWidth: 999999999,
        tabWidth: 1,
        semicolons: true,
        quotes: true,
        trailingCommas: 'es5',
        bracketSpacing: false,
        objectWrap: 'collapse',
        arrowFunctionParentheses: 'avoid',
        endOfLine: 'lf',
        embeddedLanguageFormatting: 'off',
    }
};

// 使用 Prettier 格式化代码
async function formatCodeWithPrettier(code) {
    try {
        // 尝试读取项目中的 Prettier 配置文件
        let prettierConfig = config.prettierOptions;
        try {
            const configFile = join(projectRoot, '.prettierrc');
            const configContent = readFileSync(configFile, 'utf8');
            const projectConfig = JSON.parse(configContent);
            prettierConfig = { ...prettierConfig, ...projectConfig };
            console.log('📋 使用项目 Prettier 配置');
        } catch (configError) {
            // 如果没有项目配置文件，使用默认配置
            console.log('📋 使用默认 Prettier 配置');
        }
        
        const formatted = await prettier.format(code, prettierConfig);
        console.log('✨ 代码格式化完成');
        return formatted;
    } catch (error) {
        console.warn('⚠️ Prettier 格式化失败，使用原始代码:', error.message);
        // 降级处理：返回原始代码
        return code;
    }
}

async function postCompress() {
    try {
        console.log('🚀 开始后压缩处理...');

        // 1. 读取构建版本
        const rawPath = join(distDir, config.rawFile);
        const greasyforkPath = join(distDir, config.greasyforkFile);
        const minifiedPath = join(distDir, config.minifiedFile);
        const metaPath = join(distDir, config.metaFile);

        console.log(`📖 读取文件: ${config.rawFile}`);
        const originalCode = readFileSync(rawPath, 'utf8');

        // 2. 提取头部和代码
        console.log('🔍 提取用户脚本头部注释...');
        const metaGreasyfork = new UserscriptMeta(originalCode);
        const metaMinified = new UserscriptMeta(originalCode);

        // 3. 对GreasyFork版本代码部分进行美化
        console.log('✨ 美化GreasyFork版本代码...');
        metaGreasyfork.setBody(await formatCodeWithPrettier(metaGreasyfork.body));

        // 4. 为GreasyFork版本添加源代码说明
        console.log('📝 为美化版本添加源代码说明...');
        metaGreasyfork.setBodyPrefix('\n' + config.comment + '\n');

        // 5. 写入Greasyfork版本
        console.log(`💾 写入美化版本: ${config.greasyforkFile}`);
        writeFileSync(greasyforkPath, metaGreasyfork.code, 'utf8');

        // 6. 为压缩版本添加@downloadURL
        metaMinified.set('downloadURL', config.downloadURL);
        metaMinified.set('updateURL', config.updateURL);

        // 7. 对压缩版本进行代码压缩
        console.log('⚡ 使用esbuild压缩代码部分...');
        const result = await transform(metaMinified.body, config.esbuildOptions);
        metaMinified.setBody(result.code);

        // 8. 写入压缩后的版本
        console.log(`💾 写入压缩版本: ${config.minifiedFile}`);
        writeFileSync(minifiedPath, metaMinified.code, 'utf8');

        // 8. 写入metadata更新文件
        console.log(`💾 写入meta文件: ${config.minifiedFile}`);
        writeFileSync(metaPath, metaMinified.header, 'utf8');

        // 9. 输出文件大小信息
        const originalSize = Buffer.byteLength(originalCode, 'utf8');
        const greasyforkSize = Buffer.byteLength(metaGreasyfork.code, 'utf8');
        const minifiedSize = Buffer.byteLength(metaMinified.code, 'utf8');
        const compressionRatio = ((originalSize - minifiedSize) / originalSize * 100).toFixed(2);

        console.log('\n📊 压缩结果:');
        console.log(`  原始文件: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log(`  Greasyfork版本: ${(greasyforkSize / 1024).toFixed(2)} KB (已美化 + 源代码说明)`);
        console.log(`  压缩文件: ${(minifiedSize / 1024).toFixed(2)} KB`);
        console.log(`  压缩率: ${compressionRatio}%`);
        console.log(`  节省空间: ${((originalSize - minifiedSize) / 1024).toFixed(2)} KB`);

        console.log('\n✅ 后压缩处理完成！');
        console.log(`  原始构建: dist/${config.rawFile} (原始构建版本，未处理)`);
        console.log(`  美化版本: dist/${config.greasyforkFile} (已格式化，包含源代码说明)`);
        console.log(`  压缩版本: dist/${config.minifiedFile} (已压缩，保留头部注释)`);
        console.log(`  更新文件: dist/${config.metaFile} (仅包含头部注释，用于检查更新)`);

    } catch (error) {
        console.error('❌ 后压缩处理失败:', error);
        process.exit(1);
    }
}

// 执行后压缩处理
postCompress();