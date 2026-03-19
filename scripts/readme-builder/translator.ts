import axios from 'axios';
import { getApiEndpoint } from './config.js';
import { validateAiResponse, sleep } from './utils.js';
import type { Config, TranslationRequest, TranslationResult, ProgressInfo } from './types.js';

/**
 * Create system prompt for translation
 */
function createSystemPrompt(sourceLang: string, targetLang: string): string {
    return `You are a professional technical documentation translator. Translate the following markdown content from ${sourceLang} to ${targetLang}.

IMPORTANT RULES:
1. Preserve ALL markdown formatting, including:
   - Headers (#, ##, ###)
   - Code blocks (\`\`\`language)
   - Inline code (\`code\`)
   - Links ([text](url))
   - Images (![alt](url))
   - Lists (*, -, 1., 2.)
   - Tables (| Header |)
   - Blockquotes (>)
   - Horizontal rules (---, ***)

2. Preserve ALL placeholders and variables:
   - \${VARIABLE_NAME} or {variable_name} should remain unchanged
   - URLs should remain unchanged
   - File paths should remain unchanged
   - Code examples should remain unchanged (only translate comments if they exist)

3. Preserve ALL special formatting:
   - Emojis and icons (🎨, 📥, ⚙️, etc.)
   - Badges and shields (![badge](url))
   - License identifiers (GPL-3.0, MIT, etc.)
   - Version numbers (v1.0.0, 2.3.4, etc.)
   - Technical terms (Vue, TypeScript, npm, etc.)

4. Translation style:
   - Maintain technical accuracy
   - Use natural, fluent language
   - Keep the same tone and formality level
   - Translate user-facing text naturally
   - Keep code comments in English if they are in English

5. Output format:
   - Return ONLY the translated text
   - No additional explanations
   - No "Here is the translation:" prefix
   - No markdown code blocks around the output

The content is technical documentation for a software project.`;
}

/**
 * Split text into optimal chunks for translation
 */
function splitTextIntoChunks(text: string, maxChunkSize: number = 3000): string[] {
    const chunks: string[] = [];
    
    // Split by major sections (headers starting with # or ##)
    const sections = text.split(/(?=^#{1,2} )/m);
    
    let currentChunk = '';
    
    for (const section of sections) {
        if (!section.trim()) continue;
        
        // If adding this section would exceed max size, save current chunk and start new one
        if (currentChunk.length + section.length > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = section;
        } else {
            // Otherwise, add to current chunk
            currentChunk += section;
        }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim()) {
        chunks.push(currentChunk);
    }
    
    // If any chunk is still too large (e.g., a very long code block), split by paragraphs
    const finalChunks: string[] = [];
    for (const chunk of chunks) {
        if (chunk.length <= maxChunkSize) {
            finalChunks.push(chunk);
        } else {
            // Split by paragraphs for very long sections
            const paragraphs = chunk.split(/\n\n+/);
            let paraChunk = '';
            
            for (const paragraph of paragraphs) {
                if (paraChunk.length + paragraph.length > maxChunkSize && paraChunk.length > 0) {
                    finalChunks.push(paraChunk);
                    paraChunk = paragraph;
                } else {
                    paraChunk += (paraChunk ? '\n\n' : '') + paragraph;
                }
            }
            
            if (paraChunk.trim()) {
                finalChunks.push(paraChunk);
            }
        }
    }
    
    return finalChunks;
}

/**
 * Make API request to AI service
 */
async function makeApiRequest(text: string, systemPrompt: string, config: Config): Promise<TranslationResult> {
    try {
        const endpoint = getApiEndpoint(config);
        
        const response = await axios.post(
            endpoint,
            {
                model: config.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                stream: false,
                temperature: 0.3,
                max_tokens: Math.min(4000, text.length * 2) // Adjust based on content length
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.key}`,
                    'Accept': 'application/json'
                },
                timeout: 120000, // 120 second timeout for longer content
                validateStatus: (status) => status < 500 // Don't reject on 4xx errors
            }
        );
        
        // Check for API errors
        if (response.status !== 200) {
            const errorMessage = response.data?.error?.message || `HTTP ${response.status}`;
            return {
                success: false,
                error: `API Error (${response.status}): ${errorMessage}`
            };
        }
        
        // Validate response structure
        if (!validateAiResponse(response.data)) {
            return {
                success: false,
                error: 'Invalid response format from AI API'
            };
        }
        
        const translatedText = response.data.choices[0].message.content;
        
        return {
            success: true,
            translatedText
        };
        
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                return {
                    success: false,
                    error: 'Request timeout'
                };
            }
            
            const status = error.response?.status;
            const message = error.response?.data?.error?.message || error.message;
            
            return {
                success: false,
                error: `API Error (${status || 'Network'}): ${message}`
            };
        }
        
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Translate a single chunk with retry mechanism
 */
async function translateChunk(
    chunk: string,
    systemPrompt: string,
    config: Config,
    chunkIndex: number,
    totalChunks: number
): Promise<TranslationResult> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`   Translating chunk ${chunkIndex + 1}/${totalChunks} (${chunk.length} chars)...`);
            
            const result = await makeApiRequest(chunk, systemPrompt, config);
            
            if (result.success) {
                console.log(`   ✓ Chunk ${chunkIndex + 1}/${totalChunks} translated successfully`);
                return result;
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            if (attempt < maxRetries) {
                const delay = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
                console.log(`   ⚠️ Chunk ${chunkIndex + 1}/${totalChunks} attempt ${attempt} failed, retrying in ${delay/1000}s...`);
                await sleep(delay);
            }
        }
    }
    
    return {
        success: false,
        error: `Chunk ${chunkIndex + 1}/${totalChunks} failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    };
}

/**
 * Translate text using AI API with parallel processing
 */
export async function translateText(request: TranslationRequest): Promise<TranslationResult> {
    const { text, sourceLang, targetLang, config } = request;
    
    const maxChunkSize = 3000; // characters
    const systemPrompt = createSystemPrompt(sourceLang, targetLang);
    
    if (text.length <= maxChunkSize) {
        // Text is short enough, translate as a whole
        console.log(`   Translating whole text (${text.length} chars)...`);
        return await translateChunk(text, systemPrompt, config, 0, 1);
    }
    
    // Split text into optimal chunks
    const chunks = splitTextIntoChunks(text, maxChunkSize);
    console.log(`   Splitting into ${chunks.length} chunks for parallel translation...`);
    
    // Create translation tasks for each chunk
    const translationTasks = chunks.map((chunk, index) => 
        translateChunk(chunk, systemPrompt, config, index, chunks.length)
    );
    
    // Execute translations in parallel with concurrency limit
    const maxConcurrency = 3; // Limit concurrent requests to avoid rate limiting
    const results: TranslationResult[] = [];
    
    for (let i = 0; i < translationTasks.length; i += maxConcurrency) {
        const batch = translationTasks.slice(i, i + maxConcurrency);
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
        
        // Small delay between batches to be nice to the API
        if (i + maxConcurrency < translationTasks.length) {
            await sleep(1000);
        }
    }
    
    // Check for failures
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
        const errorMessages = failedResults.map(r => r.error).join('; ');
        return {
            success: false,
            error: `Failed to translate ${failedResults.length} chunks: ${errorMessages}`
        };
    }
    
    // Combine all translated chunks
    const translatedText = results.map(r => r.translatedText).join('');
    
    // Basic validation of translated text
    if (!translatedText || translatedText.length < text.length * 0.1) {
        return {
            success: false,
            error: 'Translation result is too short or empty'
        };
    }
    
    return {
        success: true,
        translatedText: translatedText.trim()
    };
}

/**
 * Translate a file to multiple languages with parallel processing
 */
export async function translateFile(
    filePath: string,
    sourceLang: string,
    targetLangs: string[],
    config: Config,
    onProgress?: (info: ProgressInfo) => void
): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
        // Read source file
        const { readFile } = await import('./utils.js');
        const sourceText = await readFile(filePath);
        
        let completed = 0;
        const total = targetLangs.length;
        
        // Translate to each target language in parallel
        const translationPromises = targetLangs.map(async (targetLang) => {
            onProgress?.({
                current: completed + 1,
                total,
                message: `Translating to ${targetLang}`,
                filePath
            });
            
            const result = await translateText({
                text: sourceText,
                sourceLang,
                targetLang,
                config
            });
            
            if (result.success && result.translatedText) {
                // Save translated file
                const { writeFile } = await import('./utils.js');
                const translatedFilePath = filePath.replace(
                    new RegExp(`\\.${sourceLang}\\.md$`),
                    `.${targetLang}.md`
                );
                
                await writeFile(translatedFilePath, result.translatedText);
                
                onProgress?.({
                    current: completed + 1,
                    total,
                    message: `Saved ${targetLang} translation`,
                    filePath: translatedFilePath
                });
                
                return { success: true, targetLang };
            } else {
                const errorMsg = `Failed to translate to ${targetLang}: ${result.error}`;
                errors.push(errorMsg);
                console.error(`   ❌ ${errorMsg}`);
                onProgress?.({
                    current: completed + 1,
                    total,
                    message: `Failed to translate to ${targetLang}`,
                    filePath
                });
                
                return { success: false, targetLang, error: errorMsg };
            }
        });
        
        // Wait for all translations to complete
        const results = await Promise.all(translationPromises);
        
        // Update completed count
        completed = results.length;
        
        return {
            success: errors.length === 0,
            errors
        };
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorMsg = `Failed to process file ${filePath}: ${errorMessage}`;
        errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
        return {
            success: false,
            errors
        };
    }
}