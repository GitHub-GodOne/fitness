/**
 * URL utility functions for handling relative and absolute URLs
 */

/**
 * Convert relative URL to absolute public URL
 * For server-side access, use localhost to avoid SSL issues
 * For client-side or external access, use the public domain
 * 
 * @param url - The URL to convert (can be relative or absolute)
 * @param options - Configuration options
 * @returns Absolute URL
 * 
 * @example
 * // Server-side internal access
 * toAbsoluteUrl('/pic/image.jpg') 
 * // => 'http://localhost:3000/pic/image.jpg'
 * 
 * // Client-side or external access
 * toAbsoluteUrl('/pic/image.jpg', { usePublicDomain: true })
 * // => 'https://fearnotforiamwithyou.com/pic/image.jpg'
 */
export function toAbsoluteUrl(
    url: string,
    options: {
        usePublicDomain?: boolean;
        port?: number;
    } = {}
): string {
    // Already absolute URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Already base64 data URL
    if (url.startsWith('data:')) {
        return url;
    }

    // Convert relative URL to absolute
    if (url.startsWith('/')) {
        const { usePublicDomain = false, port = process.env.PORT || 3000 } = options;

        let baseUrl: string;

        if (usePublicDomain) {
            // Use public domain for external access
            // ALWAYS use window.location.origin on client-side for actual domain
            if (typeof window !== 'undefined') {
                baseUrl = window.location.origin;
            } else {
                // Server-side: try environment variables, fallback to localhost
                const envUrl = process.env.NEXTAUTH_URL ||
                    process.env.NEXT_PUBLIC_SITE_URL ||
                    process.env.NEXT_PUBLIC_APP_URL;
                // Remove trailing slash from env URL if present
                baseUrl = envUrl ? envUrl.replace(/\/$/, '') : `http://localhost:${port}`;
            }
        } else {
            // Use localhost for server-side internal access (avoid SSL issues)
            baseUrl = `http://localhost:${port}`;
        }

        // Remove trailing slash from baseUrl if exists
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        return `${cleanBaseUrl}${url}`;
    }

    return url;
}

/**
 * Check if a URL is relative
 */
export function isRelativeUrl(url: string): boolean {
    return url.startsWith('/') && !url.startsWith('//');
}

/**
 * Check if a URL is absolute
 */
export function isAbsoluteUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

/**
 * Check if a URL is a data URL (base64)
 */
export function isDataUrl(url: string): boolean {
    return url.startsWith('data:');
}

/**
 * Get the public domain from environment variables
 */
export function getPublicDomain(): string {
    return (
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        `http://localhost:${process.env.PORT || 3000}`
    );
}
