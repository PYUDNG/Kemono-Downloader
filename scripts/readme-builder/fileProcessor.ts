import { join } from 'path';
import { getProjectRoot, readFile, writeFile } from './utils.js';
import type { ProgressInfo, Condition, ConditionNode } from './types.js';

/**
 * 解析条件标记
 * 格式: condition:platform=github language=en
 */
function parseCondition(conditionStr: string): Condition {
    const condition: Condition = {};
    const parts = conditionStr.split(' ');
    
    for (const part of parts) {
        if (part.includes('=')) {
            const [key, value] = part.split('=');
            if (key === 'platform') {
                if (value === 'github' || value === 'greasyfork') {
                    condition.platform = value;
                }
            } else if (key === 'language') {
                condition.language = value;
            }
        }
    }
    
    return condition;
}

/**
 * 检查内容是否满足条件
 */
function checkCondition(_content: string, condition: Condition, platform: string, language: string): boolean {
    if (condition.platform && condition.platform !== platform) {
        return false;
    }
    if (condition.language && condition.language !== language) {
        return false;
    }
    return true;
}

/**
 * 解析条件标记树
 */
function parseConditionTree(content: string): ConditionNode[] {
    const nodes: ConditionNode[] = [];
    const stack: ConditionNode[] = [];
    const startRegex = /<!--\s*condition:([^>]+)\s*-->/g;
    const endRegex = /<!--\s*\/condition\s*-->/g;
    
    let match;
    
    while ((match = startRegex.exec(content)) !== null) {
        const startIndex = match.index;
        const conditionStr = match[1].trim();
        const conditions = parseCondition(conditionStr);
        
        const node: ConditionNode = {
            startIndex,
            endIndex: -1, // 稍后设置
            conditions,
            children: [],
            content: ''
        };
        
        // 查找对应的结束标记
        endRegex.lastIndex = startIndex + match[0].length;
        const endMatch = endRegex.exec(content);
        
        if (endMatch) {
            node.endIndex = endMatch.index + endMatch[0].length;
            
            // 设置节点内容（不包括标记本身）
            const contentStart = startIndex + match[0].length;
            const contentEnd = endMatch.index;
            node.content = content.substring(contentStart, contentEnd);
            
            // 处理嵌套关系
            while (stack.length > 0) {
                const parent = stack[stack.length - 1];
                if (node.startIndex < parent.endIndex && node.endIndex <= parent.endIndex) {
                    // 当前节点是父节点的子节点
                    parent.children.push(node);
                    break;
                } else {
                    // 当前节点不是父节点的子节点，弹出父节点
                    stack.pop();
                }
            }
            
            // 如果栈为空，说明是顶级节点
            if (stack.length === 0) {
                nodes.push(node);
            }
            
            // 将当前节点压入栈
            stack.push(node);
        }
    }
    
    return nodes;
}

/**
 * 根据条件过滤内容，正确处理换行符
 */
function filterContentByCondition(content: string, platform: string, language: string): string {
    const nodes = parseConditionTree(content);
    
    // 如果没有条件标记，直接返回原内容
    if (nodes.length === 0) {
        return content;
    }
    
    // 递归处理节点
    function processNode(node: ConditionNode, parentContent: string): {
        content: string;
        keepLeadingNewline: boolean;
        keepTrailingNewline: boolean;
    } {
        // 检查节点条件
        const shouldInclude = checkCondition(node.content, node.conditions, platform, language);
        
        // 处理子节点
        let processedContent = '';
        
        if (node.children.length > 0) {
            // 按顺序处理子节点
            let currentPos = 0;
            
            for (const child of node.children) {
                // 添加子节点前的内容
                const beforeChild = node.content.substring(currentPos, child.startIndex - node.startIndex);
                processedContent += beforeChild;
                
                // 处理子节点
                const childResult = processNode(child, node.content);
                processedContent += childResult.content;
                
                // 更新位置
                currentPos = child.endIndex - node.startIndex;
            }
            
            // 添加最后一个子节点后的内容
            const afterLastChild = node.content.substring(currentPos);
            processedContent += afterLastChild;
        } else {
            // 没有子节点，直接使用节点内容
            processedContent = node.content;
        }
        
        // 分析节点在父内容中的位置
        const nodeStartInParent = node.startIndex;
        const nodeEndInParent = node.endIndex;
        
        // 检查节点前是否有换行符
        let hasLeadingNewline = false;
        if (nodeStartInParent > 0) {
            // 检查前一个字符是否是换行符
            if (parentContent.charAt(nodeStartInParent - 1) === '\n') {
                hasLeadingNewline = true;
            }
            // 检查前一个字符是否是回车换行符
            if (nodeStartInParent > 1 && parentContent.substring(nodeStartInParent - 2, nodeStartInParent) === '\r\n') {
                hasLeadingNewline = true;
            }
        }
        
        // 检查节点后是否有换行符
        let hasTrailingNewline = false;
        if (nodeEndInParent < parentContent.length) {
            // 检查后一个字符是否是换行符
            if (parentContent.charAt(nodeEndInParent) === '\n') {
                hasTrailingNewline = true;
            }
            // 检查是否是回车换行符的开始
            if (nodeEndInParent < parentContent.length - 1 && parentContent.substring(nodeEndInParent, nodeEndInParent + 2) === '\r\n') {
                hasTrailingNewline = true;
            }
        }
        
        if (shouldInclude) {
            // 节点应该被包含
            // 检查处理后的内容是否为空或只有空白
            const isEmpty = processedContent.trim().length === 0;
            
            return {
                content: processedContent,
                keepLeadingNewline: hasLeadingNewline && !isEmpty,
                keepTrailingNewline: hasTrailingNewline && !isEmpty
            };
        } else {
            // 节点不应该被包含
            // 处理换行符逻辑
            if (hasLeadingNewline && hasTrailingNewline) {
                // 前后都有换行符
                // 如果内容为空，移除整个空行
                if (processedContent.trim().length === 0) {
                    return {
                        content: '',
                        keepLeadingNewline: false,
                        keepTrailingNewline: false
                    };
                }
                // 否则保留前导换行符
                return {
                    content: '',
                    keepLeadingNewline: true,
                    keepTrailingNewline: false
                };
            } else if (hasLeadingNewline) {
                // 只有前导换行符
                return {
                    content: '',
                    keepLeadingNewline: true,
                    keepTrailingNewline: false
                };
            } else if (hasTrailingNewline) {
                // 只有后随换行符
                return {
                    content: '',
                    keepLeadingNewline: false,
                    keepTrailingNewline: true
                };
            } else {
                // 没有换行符
                return {
                    content: '',
                    keepLeadingNewline: false,
                    keepTrailingNewline: false
                };
            }
        }
    }
    
    // 构建结果
    let result = '';
    let lastIndex = 0;
    
    // 处理所有顶级节点
    for (const node of nodes) {
        // 添加节点前的内容
        const beforeNode = content.substring(lastIndex, node.startIndex);
        result += beforeNode;
        
        // 处理节点
        const nodeResult = processNode(node, content);
        
        // 处理前导换行符
        if (nodeResult.keepLeadingNewline) {
            // 确保结果以换行符结尾
            if (!result.endsWith('\n')) {
                result += '\n';
            }
        }
        
        // 添加节点内容
        result += nodeResult.content;
        
        // 处理后随换行符
        if (nodeResult.keepTrailingNewline) {
            result += '\n';
        }
        
        lastIndex = node.endIndex;
    }
    
    // 添加最后的内容
    result += content.substring(lastIndex);
    
    // 清理多余的空行（3个或更多换行符替换为2个）
    result = result.replace(/\n{3,}/g, '\n\n');
    
    return result;
}

/**
 * 处理源README文件，生成特定平台和语言的版本
 */
export async function processSourceReadme(
    platform: string,
    language: string,
    onProgress?: (info: ProgressInfo) => void
): Promise<string> {
    const projectRoot = getProjectRoot();
    const sourceFilePath = join(projectRoot, 'README.src.md');
    
    onProgress?.({
        current: 1,
        total: 3,
        message: `Reading source README for ${platform}/${language}`,
        filePath: sourceFilePath
    });
    
    // 读取源文件
    const sourceContent = await readFile(sourceFilePath);
    
    onProgress?.({
        current: 2,
        total: 3,
        message: `Filtering content for ${platform}/${language}`
    });
    
    // 根据条件和语言过滤内容
    const filteredContent = filterContentByCondition(sourceContent, platform, language);
    
    onProgress?.({
        current: 3,
        total: 3,
        message: `Content filtered for ${platform}/${language}`
    });
    
    // 验证内容
    if (!filteredContent.trim()) {
        throw new Error(`Filtered content is empty for ${platform}/${language}`);
    }
    
    return filteredContent;
}

/**
 * 保存处理后的内容到文件
 */
export async function saveProcessedContent(
    content: string,
    platform: string,
    language: string,
    onProgress?: (info: ProgressInfo) => void
): Promise<void> {
    const projectRoot = getProjectRoot();
    
    let filePath: string;
    if (platform === 'github') {
        filePath = join(projectRoot, 'readme', `README.${language}.md`);
    } else if (platform === 'greasyfork') {
        filePath = join(projectRoot, 'readme', 'greasyfork', `README.${language}.md`);
    } else {
        throw new Error(`Unknown platform: ${platform}`);
    }
    
    onProgress?.({
        current: 1,
        total: 1,
        message: `Saving ${platform}/${language} version`,
        filePath
    });
    
    await writeFile(filePath, content);
}

/**
 * 复制英文README到根目录
 */
export async function copyEnglishReadmeToRoot(
    platform: string = 'github',
    onProgress?: (info: ProgressInfo) => void
): Promise<void> {
    const projectRoot = getProjectRoot();
    
    let sourcePath: string;
    if (platform === 'github') {
        sourcePath = join(projectRoot, 'readme', 'README.en.md');
    } else {
        sourcePath = join(projectRoot, 'readme', 'greasyfork', 'README.en.md');
    }
    
    const destPath = join(projectRoot, 'README.md');
    
    onProgress?.({
        current: 1,
        total: 1,
        message: `Copying ${platform} English README to root`,
        filePath: destPath
    });
    
    const content = await readFile(sourcePath);
    await writeFile(destPath, content);
}