export interface Config {
    key: string;
    base: string;
    model: string;
    source: string;
    target: string[];
}

export interface TranslationRequest {
    text: string;
    sourceLang: string;
    targetLang: string;
    config: Config;
}

export interface TranslationResult {
    success: boolean;
    translatedText?: string;
    error?: string;
}

export interface FileProcessingResult {
    filePath: string;
    success: boolean;
    error?: string;
}

export interface ProgressInfo {
    current: number;
    total: number;
    message: string;
    filePath?: string;
}