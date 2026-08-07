import { ProviderType } from "./provider.js";

/**
 * 功能不受支持错误接口
 */
export interface IFeatureNotSupportedError {
    /**
     * 错误描述
     */
    description: string;

    /**
     * 不支持的provider
     */
    provider: ProviderType;
}

export class FeatureNotSupportedError extends Error implements IFeatureNotSupportedError {
    public description: string;
    public provider: ProviderType;

    constructor(description: string, provider: ProviderType) {
        super(`Feature not supported by provider ${provider}: ${description}`);
        this.description = description;
        this.provider = provider;
        this.name = 'FeatureNotSupportedError';
    }
}
