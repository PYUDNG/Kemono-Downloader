import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { transform } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist');

// 配置
const config = {
  // 构建输出的无压缩文件（greasyfork版本）
  uncompressedFile: 'kemono-downloader.greasyfork.user.js',
  // 后处理生成的压缩文件（一般版本）
  compressedFile: 'kemono-downloader.user.js',
  // GitHub 仓库链接
  githubRepo: 'https://github.com/PYUDNG/kemono-downloader',
  esbuildOptions: {
    minify: true,
    minifyWhitespace: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    target: 'es2020',
    charset: 'utf8',
  }
};

// 提取用户脚本头部注释块
function extractUserScriptHeader(code) {
  const lines = code.split('\n');
  let headerEndIndex = -1;
  
  // 查找头部注释块的结束位置
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '// ==/UserScript==') {
      headerEndIndex = i;
      break;
    }
  }
  
  if (headerEndIndex === -1) {
    throw new Error('未找到用户脚本头部注释块结束标记 (// ==/UserScript==)');
  }
  
  // 提取头部注释块（包含结束标记）
  const headerLines = lines.slice(0, headerEndIndex + 1);
  const header = headerLines.join('\n');
  
  // 提取代码部分（头部注释块之后的内容）
  const codeLines = lines.slice(headerEndIndex + 1);
  const codeBody = codeLines.join('\n');
  
  return { header, code: codeBody };
}

// 为 greasyfork 版本添加源代码说明
function addSourceCodeNotice(header, codeBody) {
  const notice = `

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

`;
  
  return header + notice + codeBody;
}

async function postCompress() {
  try {
    console.log('🚀 开始后压缩处理...');
    
    // 1. 读取无压缩的构建版本
    const uncompressedPath = join(distDir, config.uncompressedFile);
    const compressedPath = join(distDir, config.compressedFile);
    
    console.log(`📖 读取文件: ${config.uncompressedFile}`);
    const originalCode = readFileSync(uncompressedPath, 'utf8');
    
    // 2. 为 greasyfork 版本添加源代码说明
    console.log('📝 为 greasyfork 版本添加源代码说明...');
    const { header, code: codeBody } = extractUserScriptHeader(originalCode);
    const greasyforkCodeWithNotice = addSourceCodeNotice(header, codeBody);
    
    // 3. 重新写入带说明的 greasyfork 版本
    console.log(`💾 更新 greasyfork 版本: ${config.uncompressedFile}`);
    writeFileSync(uncompressedPath, greasyforkCodeWithNotice, 'utf8');
    
    // 4. 使用 esbuild 压缩代码部分（不压缩头部注释）
    console.log('⚡ 使用 esbuild 压缩代码部分...');
    const result = await transform(codeBody, config.esbuildOptions);
    
    // 5. 合并头部注释和压缩后的代码（压缩版本不需要添加说明）
    const compressedCode = header + '\n\n' + result.code;
    
    // 6. 写入压缩后的版本
    console.log(`💾 写入压缩版本: ${config.compressedFile}`);
    writeFileSync(compressedPath, compressedCode, 'utf8');
    
    // 7. 输出文件大小信息
    const originalSize = Buffer.byteLength(originalCode, 'utf8');
    const greasyforkSize = Buffer.byteLength(greasyforkCodeWithNotice, 'utf8');
    const compressedSize = Buffer.byteLength(compressedCode, 'utf8');
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
    
    console.log('\n📊 压缩结果:');
    console.log(`  原始文件: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`  Greasyfork版本: ${(greasyforkSize / 1024).toFixed(2)} KB (添加了源代码说明)`);
    console.log(`  压缩文件: ${(compressedSize / 1024).toFixed(2)} KB`);
    console.log(`  压缩率: ${compressionRatio}%`);
    console.log(`  节省空间: ${((originalSize - compressedSize) / 1024).toFixed(2)} KB`);
    
    console.log('\n✅ 后压缩处理完成！');
    console.log(`  调试版本: dist/${config.uncompressedFile} (未压缩，包含源代码说明)`);
    console.log(`  发布版本: dist/${config.compressedFile} (已压缩，保留头部注释)`);
    
  } catch (error) {
    console.error('❌ 后压缩处理失败:', error);
    process.exit(1);
  }
}

// 执行后压缩处理
postCompress();