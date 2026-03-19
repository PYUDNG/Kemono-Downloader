import { loadConfig } from './config.js';
import { processSourceReadme, copyEnglishReadmeToRoot } from './fileProcessor.js';
import { translateText } from './translator.js';
import { getProjectRoot, formatProgress, readFile, writeFile } from './utils.js';
import { join } from 'path';

/**
 * 翻译单个文件
 */
async function translateSingleFile(
    sourceFilePath: string,
    targetFilePath: string,
    sourceLang: string,
    targetLang: string,
    config: any,
    onProgress?: (info: any) => void
): Promise<{ success: boolean; error?: string }> {
    try {
        onProgress?.({
            current: 1,
            total: 2,
            message: `Reading source file for translation`,
            filePath: sourceFilePath
        });
        
        // 读取源文件
        const sourceContent = await readFile(sourceFilePath);
        
        onProgress?.({
            current: 2,
            total: 2,
            message: `Translating from ${sourceLang} to ${targetLang}`,
            filePath: targetFilePath
        });
        
        // 翻译文本
        const result = await translateText({
            text: sourceContent,
            sourceLang,
            targetLang,
            config
        });
        
        if (result.success && result.translatedText) {
            // 保存翻译后的文件
            await writeFile(targetFilePath, result.translatedText);
            return { success: true };
        } else {
            return { 
                success: false, 
                error: result.error || 'Translation failed' 
            };
        }
        
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
        };
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 Starting README builder...\n');
    
    let allErrors: string[] = [];
    
    try {
        // 步骤1: 加载配置
        console.log('📋 Loading configuration...');
        const config = await loadConfig();
        console.log(`✅ Configuration loaded:`);
        console.log(`   Source language: ${config.source}`);
        console.log(`   Target languages: ${config.target.join(', ')}`);
        console.log(`   Model: ${config.model}`);
        console.log(`   API Base: ${config.base}\n`);
        
        const platforms = ['github', 'greasyfork'];
        const allLanguages = [config.source, ...config.target];
        
        // 步骤2: 为每个平台和语言处理源文件（条件过滤）
        console.log('📄 Processing source README for all platforms and languages...');
        
        const processedFiles: Array<{
            platform: string;
            language: string;
            filePath: string;
            isSourceLanguage: boolean;
        }> = [];
        
        for (const platform of platforms) {
            for (const language of allLanguages) {
                console.log(`\n   Processing ${platform}/${language}...`);
                
                try {
                    // 处理源文件（条件过滤）
                    const content = await processSourceReadme(
                        platform,
                        language,
                        (info) => console.log(`     ${formatProgress(info.current, info.total, info.message)}`)
                    );
                    
                    // 确定文件路径
                    let filePath: string;
                    if (platform === 'github') {
                        filePath = join(getProjectRoot(), 'readme', `README.${language}.md`);
                    } else {
                        filePath = join(getProjectRoot(), 'readme', 'greasyfork', `README.${language}.md`);
                    }
                    
                    // 保存处理后的文件
                    await writeFile(filePath, content);
                    
                    console.log(`   ✅ ${platform}/${language} processed and saved`);
                    
                    // 记录处理后的文件信息
                    processedFiles.push({
                        platform,
                        language,
                        filePath,
                        isSourceLanguage: language === config.source
                    });
                    
                } catch (error) {
                    const errorMsg = `Failed to process ${platform}/${language}: ${error instanceof Error ? error.message : String(error)}`;
                    console.error(`   ❌ ${errorMsg}`);
                    allErrors.push(errorMsg);
                }
            }
        }
        
        console.log('\n✅ All source files processed (condition filtering completed)\n');
        
        // 步骤3: 翻译非源语言文件
        console.log('🌐 Translating non-source language files...');
        
        const translationTasks: Array<{
            sourceFile: string;
            targetFile: string;
            sourceLang: string;
            targetLang: string;
            platform: string;
        }> = [];
        
        // 准备翻译任务
        for (const sourceFile of processedFiles) {
            if (sourceFile.isSourceLanguage) {
                // 为每个目标语言创建翻译任务
                for (const targetLang of config.target) {
                    // 跳过源语言自身
                    if (targetLang === config.source) continue;
                    
                    // 确定目标文件路径
                    let targetFilePath: string;
                    if (sourceFile.platform === 'github') {
                        targetFilePath = join(getProjectRoot(), 'readme', `README.${targetLang}.md`);
                    } else {
                        targetFilePath = join(getProjectRoot(), 'readme', 'greasyfork', `README.${targetLang}.md`);
                    }
                    
                    // 就地翻译：目标文件已经写入了经过解析和过滤的未翻译内容，应基于此内容进行翻译
                    translationTasks.push({
                        sourceFile: targetFilePath,
                        targetFile: targetFilePath,
                        sourceLang: config.source,
                        targetLang,
                        platform: sourceFile.platform
                    });
                }
            }
        }
        
        console.log(`   Found ${translationTasks.length} translation tasks\n`);
        
        // 并行执行翻译任务
        let completedTranslations = 0;
        await Promise.allSettled(translationTasks.map(async task => {
            console.log(`   Translating ${task.platform}/${task.targetLang}...`);
            
            const result = await translateSingleFile(
                task.sourceFile,
                task.targetFile,
                task.sourceLang,
                task.targetLang,
                config,
                (info) => console.log(`     ${formatProgress(info.current, info.total, info.message)}`)
            );
            
            if (result.success) {
                console.log(`   ✅ ${task.platform}/${task.targetLang} translated successfully`);
                completedTranslations++;
            } else {
                const errorMsg = `Failed to translate ${task.platform}/${task.targetLang}: ${result.error}`;
                console.error(`   ❌ ${errorMsg}`);
                allErrors.push(errorMsg);
            }
            
            console.log(); // 空行分隔
        })).catch(err => { throw err; });
        
        console.log(`✅ Translation completed: ${completedTranslations}/${translationTasks.length} successful\n`);
        
        // 步骤4: 复制GitHub英文README到根目录
        console.log('📋 Copying GitHub English README to root...');
        
        try {
            await copyEnglishReadmeToRoot(
                'github',
                (info) => console.log(`   ${formatProgress(info.current, info.total, info.message)}`)
            );
            console.log('✅ English README copied to root\n');
        } catch (error) {
            const errorMsg = `Failed to copy English README to root: ${error instanceof Error ? error.message : String(error)}`;
            console.error(`   ❌ ${errorMsg}`);
            allErrors.push(errorMsg);
        }
        
        // 步骤5: 最终统计
        console.log('📊 Final Summary:');
        console.log(`   Platforms processed: ${platforms.length} (${platforms.join(', ')})`);
        console.log(`   Languages processed: ${allLanguages.length} (${allLanguages.join(', ')})`);
        console.log(`   Total files generated: ${platforms.length * allLanguages.length}`);
        console.log(`   Source language files: ${platforms.length}`);
        console.log(`   Translated files: ${translationTasks.length}`);
        console.log(`   Successful translations: ${completedTranslations}`);
        console.log(`   Failed translations: ${translationTasks.length - completedTranslations}`);
        
        if (allErrors.length > 0) {
            console.log(`\n⚠️  Completed with ${allErrors.length} error(s):`);
            allErrors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
            console.log('\n⚠️  Some files may be incomplete. Check the generated files.');
        } else {
            console.log('\n🎉 README builder completed successfully!');
            console.log('   All files have been generated in the /readme/ directory.');
            console.log('   Root README.md has been updated with GitHub English version.');
        }
        
    } catch (error) {
        console.error('\n❌ Fatal error:');
        console.error(`   ${error instanceof Error ? error.message : String(error)}`);
        
        if (error instanceof Error && error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        
        process.exit(1);
    }
}

// 运行主函数
main();