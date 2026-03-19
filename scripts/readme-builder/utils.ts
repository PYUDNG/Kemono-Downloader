import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs-extra';

/**
 * Get the directory name of the current module
 */
export function getDirname(importMetaUrl: string): string {
    const __filename = fileURLToPath(importMetaUrl);
    return dirname(__filename);
}

/**
 * Get the project root directory
 */
export function getProjectRoot(): string {
    return join(getDirname(import.meta.url), '../../');
}

/**
 * Ensure directory exists
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
}

/**
 * Read file content
 */
export async function readFile(filePath: string): Promise<string> {
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Write file content
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
    try {
        // Ensure directory exists
        const dir = dirname(filePath);
        await ensureDirectory(dir);
        
        await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Copy file
 */
export async function copyFile(source: string, destination: string): Promise<void> {
    try {
        // Ensure destination directory exists
        const destDir = dirname(destination);
        await ensureDirectory(destDir);
        
        await fs.copy(source, destination);
    } catch (error) {
        throw new Error(`Failed to copy file from ${source} to ${destination}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Format progress message
 */
export function formatProgress(current: number, total: number, message: string, filePath?: string): string {
    const percentage = Math.round((current / total) * 100);
    const fileInfo = filePath ? ` [${filePath}]` : '';
    return `[${percentage}%] ${message}${fileInfo}`;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate AI response
 */
export function validateAiResponse(response: any): boolean {
    if (!response || typeof response !== 'object') {
        return false;
    }
    
    if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
        return false;
    }
    
    const choice = response.choices[0];
    if (!choice.message || typeof choice.message !== 'object') {
        return false;
    }
    
    if (!choice.message.content || typeof choice.message.content !== 'string') {
        return false;
    }
    
    return true;
}