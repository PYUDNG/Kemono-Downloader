import type { Config } from './types.js';

/**
 * Load and validate configuration from openai.config.ts
 */
export async function loadConfig(): Promise<Config> {
    try {
        // Dynamic import of config file
        const configModule = await import('./openai.config.ts');
        const config = configModule.default;
        
        // Validate required fields
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
        
        // Ensure base URL doesn't end with slash
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
 * Get API endpoint for chat completions
 */
export function getApiEndpoint(config: Config): string {
    return `${config.base}/chat/completions`;
}