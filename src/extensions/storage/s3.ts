import type {
  StorageConfigs,
  StorageDeleteOptions,
  StorageDownloadUploadOptions,
  StorageProvider,
  StorageSignedUploadOptions,
  StorageSignedUploadResult,
  StorageUploadOptions,
  StorageUploadResult,
} from '.';

/**
 * S3 storage provider configs
 * @docs https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
 */
export interface S3Configs extends StorageConfigs {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicDomain?: string;
}

/**
 * S3 storage provider implementation
 * @website https://aws.amazon.com/s3/
 */
export class S3Provider implements StorageProvider {
  readonly name = 's3';
  configs: S3Configs;

  constructor(configs: S3Configs) {
    this.configs = configs;
  }

  getPublicUrl = (options: { key: string; bucket?: string }) => {
    const uploadBucket = options.bucket || this.configs.bucket;
    const url = `${this.configs.endpoint}/${uploadBucket}/${options.key}`;
    return this.configs.publicDomain
      ? `${this.configs.publicDomain}/${options.key}`
      : url;
  };

  private buildObjectUrl({
    key,
    bucket,
  }: {
    key: string;
    bucket?: string;
  }) {
    const uploadBucket = bucket || this.configs.bucket;
    return `${this.configs.endpoint}/${uploadBucket}/${key}`;
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
    return `${this.configs.endpoint}/${uploadBucket}/${path}`;
  }

  exists = async (options: { key: string; bucket?: string }) => {
    try {
      const uploadBucket = options.bucket || this.configs.bucket;
      if (!uploadBucket) return false;

      const url = `${this.configs.endpoint}/${uploadBucket}/${options.key}`;
      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region,
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

      const url = `${this.configs.endpoint}/${uploadBucket}/${options.key}`;

      const { AwsClient } = await import('aws4fetch');

      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region,
      });

      const headers: Record<string, string> = {
        'Content-Type': options.contentType || 'application/octet-stream',
        'Content-Disposition': options.disposition || 'inline',
        'Content-Length': bodyArray.length.toString(),
      };

      const request = new Request(url, {
        method: 'PUT',
        headers,
        body: bodyArray as any,
      });

      const response = await client.fetch(request);

      if (!response.ok) {
        return {
          success: false,
          error: `Upload failed: ${response.statusText}`,
          provider: this.name,
        };
      }

      const publicUrl =
        this.getPublicUrl({ key: options.key, bucket: uploadBucket }) || url;

      return {
        success: true,
        location: url,
        bucket: uploadBucket,
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

      const url = `${this.configs.endpoint}/${uploadBucket}/${options.key}`;
      const { AwsClient } = await import('aws4fetch');
      const client = new AwsClient({
        accessKeyId: this.configs.accessKeyId,
        secretAccessKey: this.configs.secretAccessKey,
        region: this.configs.region,
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
        region: this.configs.region,
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
 * Create S3 provider with configs
 */
export function createS3Provider(configs: S3Configs): S3Provider {
  return new S3Provider(configs);
}
