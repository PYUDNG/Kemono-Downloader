import { IFeatureNotSupportedError } from "../interface/error";
import { ProviderType } from "../base/task";

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
