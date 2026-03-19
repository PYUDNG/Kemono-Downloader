import { Config } from './types.js';

export async function loadConfig(): Promise<Config> {
    try {
        // 动态导入配置文件
        const configModule = await import('./openai.config.js');
        const config = configModule.default;
        
        // 验证必填字段
        if (!config.key) {
            throw new Error('API key is required in openai.config.ts');
        }
        
        if (!config.base) {
            throw new Error('Base URL is required in openai.config.ts');
        }
        
        if (!config.model) {
            throw new Error('Model is required in openai.config.ts');
        }
        
        if (!config.source) {
            throw new Error('Source language is required in openai.config.ts');
        }
        
        if (!config.target || !Array.isArray(config.target) || config.target.length === 0) {
            throw new Error('Target languages array is required in openai.config.ts');
        }
        
        // 确保基础URL不以斜杠结尾
        const baseUrl = config.base.endsWith('/') ? config.base.slice(0, -1) : config.base;
        
        return {
            key: config.key,
            base: baseUrl,
            model: config.model,
            source: config.source,
            target: config.target
        };
    } catch (error) {
        if (error instanceof Error && error.message.includes('Cannot find module')) {
            throw new Error(
                'Configuration file not found. Please create openai.config.ts based on openai.config.ts.template'
            );
        }
        throw error;
    }
}

/**
 * 获取API端点
 */
export function getApiEndpoint(config: Config): string {
    return `${config.base}/chat/completions`;
}