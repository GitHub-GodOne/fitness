import { envConfigs } from '@/config';

/**
 * Replace R2 storage URL with custom CDN domain
 * Extracts path after '/{bucket_name}/' and prepends the CDN domain
 * 
 * @param originalUrl - The original R2 storage URL
 * @returns Replaced URL with CDN domain or original URL if no match
 * 
 * @example
 * replaceR2Url('https://r2.cloudflarestorage.com/bucket/fearnot/uploads/video.mp4')
 * // Returns: 'https://public.pikju.top/uploads/video.mp4'
 */
export function replaceR2Url(originalUrl: string | undefined | null): string {
    // Return empty string if input is invalid
    if (!originalUrl || typeof originalUrl !== 'string') {
        return '';
    }

    // Get bucket name from config
    const bucketName = envConfigs.r2_bucket_name;
    const bucketPath = `/${bucketName}/`;

    // Look for '/{bucket_name}/' in the URL
    const bucketIndex = originalUrl.indexOf(bucketPath);
    console.log('replaceR2Url------------->originalUrl', originalUrl);
    console.log('replaceR2Url------------->bucketPath', bucketPath);
    console.log('replaceR2Url------------->bucketIndex', bucketIndex);
    // If bucket path is found, extract path after it and use CDN domain
    if (bucketIndex !== -1) {
        const pathAfterBucket = originalUrl.substring(
            bucketIndex + bucketPath.length
        );
        const cdnDomain = envConfigs.cdn_domain.replace(/\/$/, ''); // Remove trailing slash
        return `${cdnDomain}/${pathAfterBucket}`;
    }

    // Return original URL if bucket path not found
    return originalUrl;
}

/**
 * Replace R2 storage URLs in an array
 * 
 * @param urls - Array of URLs to replace
 * @returns Array with replaced URLs
 */
export function replaceR2Urls(urls: (string | undefined | null)[]): string[] {
    return urls.map(replaceR2Url);
}

/**
 * Replace R2 storage URLs in an object's properties
 * 
 * @param obj - Object with URL properties
 * @param urlKeys - Array of property keys that contain URLs
 * @returns New object with replaced URLs
 * 
 * @example
 * replaceR2UrlsInObject({ video: 'r2-url', image: 'r2-url' }, ['video', 'image'])
 */
export function replaceR2UrlsInObject<T extends Record<string, any>>(
    obj: T,
    urlKeys: (keyof T)[]
): T {
    const result = { ...obj };

    for (const key of urlKeys) {
        if (typeof result[key] === 'string') {
            result[key] = replaceR2Url(result[key] as string) as T[typeof key];
        }
    }

    return result;
}
