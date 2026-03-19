import { loadConfig } from './config.js';
import { processSourceReadme, saveProcessedContent, copyEnglishReadme } from './fileProcessor.js';
import { translateFile } from './translator.js';
import { getProjectRoot, formatProgress, copyFile, readFile } from './utils.js';
import { join } from 'path';
import type { ProgressInfo } from './types.js';

/**
 * Copy English README from greasyfork to root if GitHub version failed
 */
async function copyEnglishReadmeFromGreasyfork(): Promise<void> {
    const projectRoot = getProjectRoot();
    const sourcePath = join(projectRoot, 'readme', 'greasyfork', 'README.en.md');
    const destPath = join(projectRoot, 'README.md');
    
    console.log('   📋 Copying English README from GreasyFork version to root...');
    await copyFile(sourcePath, destPath);
    console.log('   ✅ English README copied to root');
}

/**
 * Main function
 */
async function main() {
    console.log('🚀 Starting README builder...\n');
    
    let allErrors: string[] = [];
    let githubEnglishTranslated = true;
    
    try {
        // Step 1: Load configuration
        console.log('📋 Loading configuration...');
        const config = await loadConfig();
        console.log(`✅ Configuration loaded:`);
        console.log(`   Source language: ${config.source}`);
        console.log(`   Target languages: ${config.target.join(', ')}`);
        console.log(`   Model: ${config.model}`);
        console.log(`   API Base: ${config.base}\n`);
        
        // Step 2: Process source README
        console.log('📄 Processing source README...');
        const { githubContent, greasyforkContent } = await processSourceReadme(
            (info) => console.log(`   ${formatProgress(info.current, info.total, info.message)}`)
        );
        console.log('✅ Source README processed\n');
        
        // Step 3: Save processed content
        console.log('💾 Saving processed content...');
        await saveProcessedContent(
            githubContent,
            greasyforkContent,
            config.source,
            (info) => console.log(`   ${formatProgress(info.current, info.total, info.message)}`)
        );
        console.log('✅ Processed content saved\n');
        
        const projectRoot = getProjectRoot();
        
        // Step 4: Translate GitHub version
        console.log('🌐 Translating GitHub version...');
        const githubFilePath = join(projectRoot, 'readme', `README.${config.source}.md`);
        const githubResult = await translateFile(
            githubFilePath,
            config.source,
            config.target,
            config,
            (info) => console.log(`   ${formatProgress(info.current, info.total, info.message)}`)
        );
        
        if (githubResult.success) {
            console.log('✅ GitHub version translated successfully\n');
        } else {
            console.log('⚠️  GitHub version translation had errors:');
            githubResult.errors.forEach(error => console.log(`   - ${error}`));
            allErrors.push(...githubResult.errors);
            
            // Check if English translation failed
            if (githubResult.errors.some(err => err.includes('translate to en'))) {
                githubEnglishTranslated = false;
                console.log('   ℹ️  English translation for GitHub version failed\n');
            } else {
                console.log();
            }
        }
        
        // Step 5: Translate GreasyFork version
        console.log('🌐 Translating GreasyFork version...');
        const greasyforkFilePath = join(projectRoot, 'readme', 'greasyfork', `README.${config.source}.md`);
        const greasyforkResult = await translateFile(
            greasyforkFilePath,
            config.source,
            config.target,
            config,
            (info) => console.log(`   ${formatProgress(info.current, info.total, info.message)}`)
        );
        
        if (greasyforkResult.success) {
            console.log('✅ GreasyFork version translated successfully\n');
        } else {
            console.log('⚠️  GreasyFork version translation had errors:');
            greasyforkResult.errors.forEach(error => console.log(`   - ${error}`));
            allErrors.push(...greasyforkResult.errors);
            console.log();
        }
        
        // Step 6: Copy English README to root
        console.log('📋 Copying English README to root...');
        
        if (githubEnglishTranslated) {
            // Use GitHub English version
            await copyEnglishReadme(
                (info) => console.log(`   ${formatProgress(info.current, info.total, info.message)}`)
            );
            console.log('✅ English README (GitHub version) copied to root\n');
        } else {
            // Fallback to GreasyFork English version
            await copyEnglishReadmeFromGreasyfork();
            console.log('✅ English README (GreasyFork version) copied to root\n');
        }
        
        // Summary
        console.log('📊 Summary:');
        console.log(`   Source files created: 2 (${config.source})`);
        
        // Count successfully translated files
        const githubEnPath = join(projectRoot, 'readme', 'README.en.md');
        const githubZhHantPath = join(projectRoot, 'readme', 'README.zh-Hant.md');
        const greasyforkEnPath = join(projectRoot, 'readme', 'greasyfork', 'README.en.md');
        const greasyforkZhHantPath = join(projectRoot, 'readme', 'greasyfork', 'README.zh-Hant.md');
        
        const files = [
            { path: githubEnPath, lang: 'en', type: 'GitHub' },
            { path: githubZhHantPath, lang: 'zh-Hant', type: 'GitHub' },
            { path: greasyforkEnPath, lang: 'en', type: 'GreasyFork' },
            { path: greasyforkZhHantPath, lang: 'zh-Hant', type: 'GreasyFork' }
        ];
        
        let translatedCount = 0;
        for (const file of files) {
            try {
                await readFile(file.path);
                translatedCount++;
            } catch {
                // File doesn't exist or can't be read
            }
        }
        
        console.log(`   Translated files created: ${translatedCount}/${config.target.length * 2}`);
        console.log(`   Total files processed: ${2 + translatedCount}`);
        
        if (allErrors.length > 0) {
            console.log(`\n⚠️  Completed with ${allErrors.length} error(s):`);
            allErrors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
            
            if (!githubEnglishTranslated) {
                console.log('\nℹ️  Note: Used GreasyFork English version as fallback for root README.md');
            }
            
            console.log('\n⚠️  Some translations may be incomplete. Check the generated files.');
        } else {
            console.log('\n🎉 README builder completed successfully!');
            console.log('   You can now run: npm run build');
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

// Run main function
main();