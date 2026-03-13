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

    const cdnDomain = envConfigs.cdn_domain.replace(/\/$/, '');
    if (!cdnDomain || originalUrl.startsWith(`${cdnDomain}/`)) {
        return originalUrl;
    }

    try {
        const parsed = new URL(originalUrl);
        const pathSegments = parsed.pathname.split('/').filter(Boolean);

        // Standard R2 object URL: /{bucket}/{uploadPath}/{key}
        if (
            parsed.hostname.endsWith('.r2.cloudflarestorage.com') &&
            pathSegments.length >= 2
        ) {
            return `${cdnDomain}/${pathSegments.slice(1).join('/')}`;
        }
    } catch {
        // Fall back to legacy string matching below.
    }

    // Legacy fallback: replace by configured bucket name if the URL is not parseable
    const bucketName = envConfigs.r2_bucket_name;
    const bucketPath = `/${bucketName}/`;
    const bucketIndex = originalUrl.indexOf(bucketPath);
    if (bucketIndex !== -1) {
        const pathAfterBucket = originalUrl.substring(
            bucketIndex + bucketPath.length
        );
        return `${cdnDomain}/${pathAfterBucket}`;
    }

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
