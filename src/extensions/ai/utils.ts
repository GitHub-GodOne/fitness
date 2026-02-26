/**
 * Shared utilities for AI providers
 * Common functions used across fitness-video-provider, gw-api, sp, and video-library-provider
 */

/**
 * Get date string for R2 path (YYYYMMDD format)
 * This ensures R2 paths match public folder structure for easier management
 */
export function getDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0].replace(/-/g, '');
}

/**
 * Get R2 key path for a file (matches public folder structure: video/YYYYMMDD/taskId/filename)
 */
export function getR2Key(taskId: string, filename: string): string {
    const dateStr = getDateString();
    return `video/${dateStr}/${taskId}/${filename}`;
}

/**
 * Check if an error is retryable (network errors, timeouts, etc.)
 */
export function isRetryableError(error: Error): boolean {
    const errorMessage = error.message || '';
    const causeString = error.cause?.toString() || '';
    
    return (
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('terminated') ||
        errorMessage.includes('aborted') ||
        causeString.includes('TIMEOUT') ||
        causeString.includes('UND_ERR_HEADERS_TIMEOUT') ||
        causeString.includes('UND_ERR_BODY_TIMEOUT') ||
        causeString.includes('ECONNRESET') ||
        causeString.includes('ETIMEDOUT')
    );
}

/**
 * Fetch with retry logic for handling timeout errors
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param retryDelayMs - Initial retry delay in ms (default: 2000)
 * @param timeoutMs - Request timeout in ms (default: 60000)
 * @param logPrefix - Prefix for log messages (default: '[AI]')
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3,
    retryDelayMs: number = 2000,
    timeoutMs: number = 60000,
    logPrefix: string = '[AI]'
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.log(`${logPrefix} fetchWithRetry error`, error);
            lastError = error instanceof Error ? error : new Error(String(error));

            if (isRetryableError(lastError) && attempt < maxRetries) {
                const delay = retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
                console.warn(`${logPrefix} Fetch attempt ${attempt} failed (${lastError.message}), retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            continue;
        }
    }

    throw lastError || new Error('Fetch failed after retries');
}

/**
 * Download file with retry logic - includes both fetch and body reading
 * This handles Body Timeout errors that occur during arrayBuffer() reading
 * @param url - The URL to download from
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param retryDelayMs - Initial retry delay in ms (default: 5000)
 * @param timeoutMs - Request timeout in ms (default: 300000 = 5 minutes)
 * @param logPrefix - Prefix for log messages (default: '[AI]')
 */
export async function downloadWithRetry(
    url: string,
    maxRetries: number = 3,
    retryDelayMs: number = 5000,
    timeoutMs: number = 300000,
    logPrefix: string = '[AI]'
): Promise<Buffer> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`${logPrefix} Download attempt ${attempt}/${maxRetries} for ${url.substring(0, 80)}...`);

            // Create AbortController for timeout (covers both fetch and body reading)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const response = await fetch(url, { signal: controller.signal });

            if (!response.ok) {
                clearTimeout(timeoutId);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Read body - this is where Body Timeout usually occurs
            const arrayBuffer = await response.arrayBuffer();
            clearTimeout(timeoutId);

            console.log(`${logPrefix} Download successful, size: ${arrayBuffer.byteLength} bytes`);
            return Buffer.from(arrayBuffer);

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(`${logPrefix} Download attempt ${attempt} failed: ${lastError.message}`);
            if (lastError.cause) {
                console.warn(`${logPrefix} Cause: ${lastError.cause?.toString()}`);
            }

            if (isRetryableError(lastError) && attempt < maxRetries) {
                const delay = retryDelayMs * Math.pow(2, attempt - 1);
                console.warn(`${logPrefix} Retrying download in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
        }
    }

    throw lastError || new Error('Download failed after retries');
}

/**
 * Convert image URL to base64 data URL
 * Handles both remote URLs and local paths
 * @param imageUrl - The image URL or path
 * @param logPrefix - Prefix for log messages (default: '[AI]')
 */
export async function convertImageToBase64(
    imageUrl: string,
    logPrefix: string = '[AI]'
): Promise<string> {
    if (imageUrl.startsWith('data:image/')) {
        return imageUrl;
    }

    try {
        let fetchUrl = imageUrl;

        // Handle relative URLs (local files) - always use localhost for server-side access
        if (imageUrl.startsWith('/')) {
            const port = process.env.PORT || 3000;
            fetchUrl = `http://localhost:${port}${imageUrl}`;
        }
        console.log(`${logPrefix} Fetching image:`, fetchUrl);
        const response = await fetch(fetchUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let contentType = response.headers.get('content-type') || 'image/png';

        if (!contentType.startsWith('image/')) {
            const urlLower = imageUrl.toLowerCase();
            if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
                contentType = 'image/jpeg';
            } else if (urlLower.includes('.png')) {
                contentType = 'image/png';
            } else {
                contentType = 'image/png';
            }
        }

        const base64 = buffer.toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch (error: any) {
        console.error(`${logPrefix} Failed to convert image to base64:`, error);
        throw new Error(`Failed to convert image to base64: ${error.message}`);
    }
}

/**
 * Get content type from URL
 */
export function getContentTypeFromUrl(url: string): string {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
        return 'image/jpeg';
    } else if (urlLower.includes('.png')) {
        return 'image/png';
    } else if (urlLower.includes('.gif')) {
        return 'image/gif';
    } else if (urlLower.includes('.webp')) {
        return 'image/webp';
    } else if (urlLower.includes('.mp4')) {
        return 'video/mp4';
    } else if (urlLower.includes('.webm')) {
        return 'video/webm';
    }
    return 'application/octet-stream';
}

/**
 * Delay execution for a specified time
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
