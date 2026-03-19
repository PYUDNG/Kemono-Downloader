import { join } from 'path';
import { getProjectRoot, readFile, writeFile } from './utils.js';
import type { ProgressInfo } from './types.js';

/**
 * Remove ALL content between specified markers (including the markers themselves)
 */
function removeContentBetweenMarkers(content: string, startMarker: string, endMarker: string): string {
    let result = content;
    let startIndex = result.indexOf(startMarker);
    
    while (startIndex !== -1) {
        const endIndex = result.indexOf(endMarker, startIndex + startMarker.length);
        
        if (endIndex === -1) {
            // No matching end marker found, break
            break;
        }
        
        // Remove content including markers
        const before = result.substring(0, startIndex);
        const after = result.substring(endIndex + endMarker.length);
        result = before.endsWith('\n') && after.startsWith('\n') ?
            before + after.substring(1) : // replace '\n\n' with '\n'
            before + after;
        
        // Look for next occurrence
        startIndex = result.indexOf(startMarker, startIndex);
    }
    
    return result;
}

/**
 * Process README.src.md to create filtered versions
 */
export async function processSourceReadme(
    onProgress?: (info: ProgressInfo) => void
): Promise<{ githubContent: string; greasyforkContent: string }> {
    const projectRoot = getProjectRoot();
    const sourceFilePath = join(projectRoot, 'README.src.md');
    
    onProgress?.({
        current: 1,
        total: 5,
        message: 'Reading source README file',
        filePath: sourceFilePath
    });
    
    // Read source file
    const sourceContent = await readFile(sourceFilePath);
    
    onProgress?.({
        current: 2,
        total: 5,
        message: 'Processing GitHub version (removing ALL GreasyFork sections)'
    });
    
    // Create GitHub version: remove ALL <!-- Greasyfork --> sections
    const githubContent = removeContentBetweenMarkers(
        sourceContent,
        '<!-- Greasyfork -->',
        '<!-- /Greasyfork -->'
    );
    
    onProgress?.({
        current: 3,
        total: 5,
        message: 'Processing GreasyFork version (removing ALL GitHub sections)'
    });
    
    // Create GreasyFork version: remove ALL <!-- Github --> sections
    const greasyforkContent = removeContentBetweenMarkers(
        sourceContent,
        '<!-- Github -->',
        '<!-- /Github -->'
    );
    
    onProgress?.({
        current: 4,
        total: 5,
        message: 'Validating processed content'
    });
    
    // Validate that we have content
    if (!githubContent.trim()) {
        throw new Error('GitHub version content is empty after processing');
    }
    
    if (!greasyforkContent.trim()) {
        throw new Error('GreasyFork version content is empty after processing');
    }
    
    // Count removed sections for logging
    const greasyforkSectionsRemoved = (sourceContent.match(/<!-- Greasyfork -->/g) || []).length;
    const githubSectionsRemoved = (sourceContent.match(/<!-- Github -->/g) || []).length;
    
    console.log(`   Removed ${greasyforkSectionsRemoved} GreasyFork section(s) from GitHub version`);
    console.log(`   Removed ${githubSectionsRemoved} GitHub section(s) from GreasyFork version`);
    
    onProgress?.({
        current: 5,
        total: 5,
        message: 'Source file processing completed'
    });
    
    return { githubContent, greasyforkContent };
}

/**
 * Save processed content to files
 */
export async function saveProcessedContent(
    githubContent: string,
    greasyforkContent: string,
    sourceLang: string,
    onProgress?: (info: ProgressInfo) => void
): Promise<void> {
    const projectRoot = getProjectRoot();
    
    // Save GitHub version
    const githubFilePath = join(projectRoot, 'readme', `README.${sourceLang}.md`);
    onProgress?.({
        current: 1,
        total: 2,
        message: `Saving GitHub version (${sourceLang})`,
        filePath: githubFilePath
    });
    await writeFile(githubFilePath, githubContent);
    
    // Save GreasyFork version
    const greasyforkFilePath = join(projectRoot, 'readme', 'greasyfork', `README.${sourceLang}.md`);
    onProgress?.({
        current: 2,
        total: 2,
        message: `Saving GreasyFork version (${sourceLang})`,
        filePath: greasyforkFilePath
    });
    await writeFile(greasyforkFilePath, greasyforkContent);
}

/**
 * Copy English README to root README.md
 */
export async function copyEnglishReadme(onProgress?: (info: ProgressInfo) => void): Promise<void> {
    const projectRoot = getProjectRoot();
    const sourcePath = join(projectRoot, 'readme', 'README.en.md');
    const destPath = join(projectRoot, 'README.md');
    
    onProgress?.({
        current: 1,
        total: 1,
        message: 'Copying English README to root',
        filePath: destPath
    });
    
    await writeFile(destPath, await readFile(sourcePath));
}