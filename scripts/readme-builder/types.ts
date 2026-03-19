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

// 新的条件标记类型
export interface Condition {
    platform?: 'github' | 'greasyfork';
    language?: string;
}

export interface ConditionNode {
    startIndex: number;
    endIndex: number;
    conditions: Condition;
    children: ConditionNode[];
    content: string;
}