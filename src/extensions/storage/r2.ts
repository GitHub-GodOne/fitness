import type {
  StorageConfigs,
  StorageDeleteOptions,
  StorageDirectoryEntry,
  StorageDownloadUploadOptions,
  StorageFileEntry,
  StorageListOptions,
  StorageListResult,
  StorageProvider,
  StorageSignedUploadOptions,
  StorageSignedUploadResult,
  StorageUploadOptions,
  StorageUploadResult,
} from '.';
import { isCloudflareWorker } from '@/shared/lib/env';

/**
 * R2 storage provider configs
 * @docs https://developers.cloudflare.com/r2/
 */
export interface R2Configs extends StorageConfigs {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  uploadPath?: string;
  region?: string;
  endpoint?: string;
  publicDomain?: string;
}

/**
 * R2 storage provider implementation
 * @website https://www.cloudflare.com/products/r2/
 */
export class R2Provider implements StorageProvider {
  readonly name = 'r2';
  configs: R2Configs;

  constructor(configs: R2Configs) {
    this.configs = configs;
  }

  private getUploadPath() {
    let uploadPath = this.configs.uploadPath || 'uploads';
    if (uploadPath.startsWith('/')) {
      uploadPath = uploadPath.slice(1);
    }
    if (uploadPath.endsWith('/')) {
      uploadPath = uploadPath.slice(0, -1);
    }
    return uploadPath;
  }

  private getEndpoint() {
    return (
      this.configs.endpoint ||
      `https://${this.configs.accountId}.r2.cloudflarestorage.com`
    );
  }

  private buildObjectUrl({
    key,
    bucket,
  }: {
    key: string;
    bucket?: string;
  }) {
    const uploadBucket = bucket || this.configs.bucket;
    const uploadPath = this.getUploadPath();
    return `${this.getEndpoint()}/${uploadBucket}/${uploadPath}/${key}`;
  }

  private escapeXml(value: string) {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private getRelativePrefix(prefix: string) {
    const uploadPath = this.getUploadPath();
    const normalizedUploadPath = uploadPath ? `${uploadPath}/` : '';

    if (normalizedUploadPath && prefix.startsWith(normalizedUploadPath)) {
      return prefix.slice(normalizedUploadPath.length);
    }

    return prefix;
  }

  private normalizeListPrefix(prefix?: string) {
    const trimmed = (prefix || '').trim().replace(/^\/+/, '');
    if (!trimmed) {
      return '';
    }

    return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
  }

  private buildObjectUrlFromPublicUrl({
    url,
    bucket,
  }: {
    url: string;
    bucket?: string;
  }) {
    const uploadBucket = bucket || this.configs.bucket;
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/+/, '');
    return `${this.getEndpoint()}/${uploadBucket}/${path}`;
  }

  getPublicUrl = (options: { key: string; bucket?: string }) => {
    const uploadBucket = options.bucket || this.configs.bucket;
    const uploadPath = this.getUploadPath();
    const url = `${this.getEndpoint()}/${uploadBucket}/${uploadPath}/${options.key}`;
    return this.configs.publicDomain
      ? `${this.configs.publicDomain}/${uploadPath}/${options.key}`
      : url;
  };

  private normalizeUploadError(error: unknown, timeoutMs: number) {
    const errorCode =
      (error as { code?: string; cause?: { code?: string } })?.cause?.code ||
      (error as { code?: string })?.code;

    if (
      errorCode === 'UND_ERR_HEADERS_TIMEOUT' ||
      errorCode === 'R2_UPLOAD_TIMEOUT' ||
      errorCode === 'ETIMEDOUT'
    ) {
      const timeoutSeconds = Math.ceil(timeoutMs / 1000);
      return new Error(
        `Upload timed out after ${timeoutSeconds}s while waiting for R2 response`
      );
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(String(error));
  }

  private async fetchSignedRequest({
    client,
    request,
    timeoutMs,
  }: {
    client: { sign: (input: Request) => Promise<Request> };
    request: Request;
    timeoutMs: number;
  }) {
    const signedRequest = await client.sign(request);

    if (isCloudflareWorker) {
      return fetch(signedRequest);
    }

    const targetUrl = new URL(signedRequest.url);
    const transport =
      targetUrl.protocol === 'http:'
        ? (require('node:http') as typeof import('node:http'))
        : (require('node:https') as typeof import('node:https'));
    const body = Buffer.from(await signedRequest.arrayBuffer());
    const headers = Object.fromEntries(signedRequest.headers.entries());

    return await new Promise<Response>((resolve, reject) => {
      const req = transport.request(
        targetUrl,
        {
          method: signedRequest.method,
          headers,
        },
        (res) => {
          const chunks: Buffer[] = [];

          res.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          res.on('end', () => {
            const responseBody = Buffer.concat(chunks);
            const responseHeaders: [string, string][] = Object.entries(
              res.headers
            ).flatMap(([key, value]) => {
              if (Array.isArray(value)) {
                return value.map((item): [string, string] => [key, item]);
              }
              return value ? [[key, value]] : [];
            });

            resolve(
              new Response(responseBody, {
                status: res.statusCode || 500,
                statusText: res.statusMessage || '',
                headers: new Headers(responseHeaders),
              })
            );
          });
        }
      );

      req.on('error', reject);
      req.setTimeout(timeoutMs, () => {
        const timeoutError = new Error('R2 upload request timed out') as Error & {
          code?: string;
        };
        timeoutError.code = 'R2_UPLOAD_TIMEOUT';
        req.destroy(timeoutError);
      });
      req.write(body);
      req.end();
    });
  }

  exists = async (options: { key: string; bucket?: string }) => {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) return false;
      const uploadPath = this.getUploadPath();
      const url = `${this.getEndpoint()}/${uploadBucket}/${uploadPath}/${options.key}`;

      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const response = await client.fetch(
        new Request(url, {
          method: 'HEAD',
        })
      );

      return response.ok;
    } catch {
      return false;
    }
  };

  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) {
        return {
          success: false,
          error: 'Bucket is required',
          provider: this.name,
        };
      }

      const bodyArray =
        options.body instanceof Buffer
          ? new Uint8Array(options.body)
          : options.body;

      const uploadPath = this.getUploadPath();

      // R2 endpoint format: https://<accountId>.r2.cloudflarestorage.com
      // Use custom endpoint if provided, otherwise use default
      const url = `${this.getEndpoint()}/${uploadBucket}/${uploadPath}/${options.key}`;

      const { AwsClient } = await import('aws4fetch');

      // R2 uses "auto" as region for S3 API compatibility
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const headers: Record<string, string> = {
        'Content-Type': options.contentType || 'application/octet-stream',
        'Content-Disposition': options.disposition || 'inline',
        'Content-Length': bodyArray.length.toString(),
      };

      console.log('[R2 Provider] Uploading file:', {
        key: options.key,
        size: bodyArray.length,
        sizeInMB: (bodyArray.length / 1024 / 1024).toFixed(2),
        contentType: options.contentType,
      });

      let response;
      let lastError;
      const sizeInMb = bodyArray.length / 1024 / 1024;
      const requestTimeoutMs = Math.min(
        options.timeoutMs ?? Math.max(120_000, Math.ceil(sizeInMb * 4_000)),
        10 * 60 * 1000
      );
      const maxRetries = options.maxRetries ?? 2;
      const retryDelayMs = options.retryDelayMs ?? 1_000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 1) {
            console.log(`[R2 Provider] Retry attempt ${attempt}/${maxRetries} for ${options.key}...`);
            // Add a small delay between retries
            await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt));
          }

          // Re-create request for each attempt to avoid "body used" issues if possible
          // Note: bodyArray is Uint8Array matching R2 expectations so it should be replayable
          const request = new Request(url, {
            method: 'PUT',
            headers,
            body: bodyArray as any,
          });

          response = await this.fetchSignedRequest({
            client,
            request,
            timeoutMs: requestTimeoutMs,
          });

          if (response.ok) {
            break; // Success, exit loop
          } else {
            const errorText = await response.text().catch(() => 'Unable to read error response');
            lastError = new Error(`Upload failed: ${response.statusText} (${response.status}) - ${errorText}`);
            console.error(`[R2 Provider] Attempt ${attempt} failed:`, lastError.message);
          }
        } catch (fetchError) {
          lastError = this.normalizeUploadError(fetchError, requestTimeoutMs);
          console.error(`[R2 Provider] Attempt ${attempt} fetch error:`, lastError);
        }
      }

      if (!response || !response.ok) {
        return {
          success: false,
          error: lastError ? (lastError instanceof Error ? lastError.message : String(lastError)) : 'Upload failed after retries',
          provider: this.name,
        };
      }

      console.log('[R2 Provider] Upload successful:', options.key);

      const publicUrl =
        this.getPublicUrl({ key: options.key, bucket: uploadBucket }) || url;

      return {
        success: true,
        location: url,
        bucket: uploadBucket,
        uploadPath: uploadPath,
        key: options.key,
        filename: options.key.split('/').pop(),
        url: publicUrl,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async createSignedUpload(
    options: StorageSignedUploadOptions
  ): Promise<StorageSignedUploadResult> {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) {
        return {
          success: false,
          error: 'Bucket is required',
          provider: this.name,
        };
      }

      const uploadPath = this.getUploadPath();
      const url = `${this.getEndpoint()}/${uploadBucket}/${uploadPath}/${options.key}`;
      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const signedRequest = await client.sign(url, {
        method: 'PUT',
        headers: {
          'Content-Type': options.contentType || 'application/octet-stream',
          'Content-Disposition': options.disposition || 'inline',
        },
        aws: {
          signQuery: true,
          allHeaders: true,
        },
      });

      const publicUrl =
        this.getPublicUrl({ key: options.key, bucket: uploadBucket }) || url;

      return {
        success: true,
        provider: this.name,
        method: 'PUT',
        url: signedRequest.url,
        key: options.key,
        bucket: uploadBucket,
        uploadPath,
        filename: options.key.split('/').pop(),
        publicUrl,
        headers: Object.fromEntries(signedRequest.headers.entries()),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async deleteFile(options: StorageDeleteOptions): Promise<{
    success: boolean;
    error?: string;
    provider: string;
  }> {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) {
        return {
          success: false,
          error: 'Bucket is required',
          provider: this.name,
        };
      }

      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const candidateUrls = [
        options.url
          ? this.buildObjectUrlFromPublicUrl({
              url: options.url,
              bucket: uploadBucket,
            })
          : null,
        this.buildObjectUrl({
          key: options.key,
          bucket: uploadBucket,
        }),
        `${this.getEndpoint()}/${uploadBucket}/${options.key}`,
      ].filter(Boolean) as string[];

      let deleted = false;
      let lastError = '';

      for (const candidateUrl of candidateUrls) {
        const deleteResponse = await client.fetch(
          new Request(candidateUrl, {
            method: 'DELETE',
          })
        );

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse
            .text()
            .catch(() => 'Unable to read error response');
          lastError = `Delete failed: ${deleteResponse.statusText} (${deleteResponse.status}) - ${errorText}`;
          continue;
        }

        const verifyResponse = await client.fetch(
          new Request(candidateUrl, {
            method: 'HEAD',
          })
        );

        if (!verifyResponse.ok) {
          deleted = true;
          break;
        }

        lastError = `Object still exists after delete verification for ${candidateUrl}`;
      }

      if (!deleted) {
        return {
          success: false,
          error: lastError || 'Delete verification failed',
          provider: this.name,
        };
      }

      return {
        success: true,
        provider: this.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }

  async listFiles(options: StorageListOptions): Promise<StorageListResult> {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) {
        return {
          success: false,
          error: 'Bucket is required',
          provider: this.name,
          prefix: options.prefix || '',
          directories: [],
          files: [],
        };
      }

      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region || 'auto',
      });

      const currentPrefix = this.normalizeListPrefix(options.prefix);
      const uploadPath = this.getUploadPath();
      const fullPrefix = currentPrefix ? `${uploadPath}/${currentPrefix}` : `${uploadPath}/`;
      const maxKeys = String(options.limit || 200);

      const url = new URL(`${this.getEndpoint()}/${uploadBucket}`);
      url.searchParams.set('list-type', '2');
      url.searchParams.set('delimiter', '/');
      url.searchParams.set('prefix', fullPrefix);
      url.searchParams.set('max-keys', maxKeys);

      const response = await client.fetch(
        new Request(url.toString(), {
          method: 'GET',
        })
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error response');
        return {
          success: false,
          error: `List failed: ${response.statusText} (${response.status}) - ${errorText}`,
          provider: this.name,
          prefix: currentPrefix,
          directories: [],
          files: [],
        };
      }

      const xml = await response.text();
      const directories: StorageDirectoryEntry[] = [];
      const files: StorageFileEntry[] = [];

      const commonPrefixMatches = xml.matchAll(/<CommonPrefixes>\s*<Prefix>([\s\S]*?)<\/Prefix>\s*<\/CommonPrefixes>/g);
      for (const match of commonPrefixMatches) {
        const fullDirPrefix = this.escapeXml(match[1] || '');
        const relativePrefix = this.getRelativePrefix(fullDirPrefix).replace(/\/$/, '');
        const name = relativePrefix.split('/').filter(Boolean).pop();
        if (!name) {
          continue;
        }

        directories.push({
          name,
          prefix: relativePrefix,
        });
      }

      const contentMatches = xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g);
      for (const match of contentMatches) {
        const block = match[1] || '';
        const keyMatch = block.match(/<Key>([\s\S]*?)<\/Key>/);
        if (!keyMatch) {
          continue;
        }

        const fullKey = this.escapeXml(keyMatch[1]);
        if (fullKey === fullPrefix || fullKey.endsWith('/')) {
          continue;
        }

        const relativeKey = this.getRelativePrefix(fullKey);
        if (!relativeKey) {
          continue;
        }

        const name = relativeKey.split('/').pop() || relativeKey;
        if (name === '.keep') {
          continue;
        }
        const size = Number((block.match(/<Size>([\s\S]*?)<\/Size>/)?.[1] || '0').trim());
        const lastModified = this.escapeXml(
          block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1] || ''
        );

        files.push({
          key: relativeKey,
          name,
          url: this.getPublicUrl({ key: relativeKey, bucket: uploadBucket }),
          size: Number.isFinite(size) ? size : 0,
          lastModified: lastModified || undefined,
        });
      }

      return {
        success: true,
        provider: this.name,
        prefix: currentPrefix.replace(/\/$/, ''),
        directories,
        files,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
        prefix: options.prefix || '',
        directories: [],
        files: [],
      };
    }
  }

  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const response = await fetch(options.url);
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error! status: ${response.status}`,
          provider: this.name,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'No body in response',
          provider: this.name,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const body = new Uint8Array(arrayBuffer);

      return this.uploadFile({
        body,
        key: options.key,
        bucket: options.bucket,
        contentType: options.contentType,
        disposition: options.disposition,
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider: this.name,
      };
    }
  }
}

/**
 * Create R2 provider with configs
 */
export function createR2Provider(configs: R2Configs): R2Provider {
  return new R2Provider(configs);
}
