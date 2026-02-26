/**
 * Chunk loading retry mechanism for Next.js
 * Handles chunk loading failures by retrying or reloading the page
 */

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface ChunkRetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

class ChunkRetryManager {
  private retryCount: Map<string, number> = new Map();
  private config: Required<ChunkRetryConfig>;

  constructor(config: ChunkRetryConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries || MAX_RETRIES,
      retryDelay: config.retryDelay || RETRY_DELAY,
      onRetry: config.onRetry || (() => {}),
      onMaxRetriesReached: config.onMaxRetriesReached || (() => {}),
    };
  }

  /**
   * Check if an error is a chunk loading error
   */
  isChunkError(error: Error): boolean {
    const message = error.message || '';
    const name = error.name || '';
    
    return (
      message.includes('Failed to load chunk') ||
      message.includes('Loading chunk') ||
      message.includes('ChunkLoadError') ||
      name === 'ChunkLoadError' ||
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('Importing a module script failed')
    );
  }

  /**
   * Handle chunk loading error with retry logic
   */
  async handleChunkError(error: Error, chunkId?: string): Promise<void> {
    if (!this.isChunkError(error)) {
      throw error;
    }

    const key = chunkId || 'default';
    const currentRetries = this.retryCount.get(key) || 0;

    console.error(`[ChunkRetry] Chunk loading error detected (attempt ${currentRetries + 1}/${this.config.maxRetries}):`, error.message);

    if (currentRetries >= this.config.maxRetries) {
      console.error('[ChunkRetry] Max retries reached, reloading page...');
      this.config.onMaxRetriesReached(error);
      this.retryCount.delete(key);
      
      // Force reload the page to get fresh chunks
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return;
    }

    this.retryCount.set(key, currentRetries + 1);
    this.config.onRetry(currentRetries + 1, error);

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));

    // Clear the chunk from cache and retry
    if (typeof window !== 'undefined') {
      console.log('[ChunkRetry] Reloading page to fetch fresh chunks...');
      window.location.reload();
    }
  }

  /**
   * Reset retry count for a specific chunk
   */
  resetRetries(chunkId?: string): void {
    const key = chunkId || 'default';
    this.retryCount.delete(key);
  }

  /**
   * Clear all retry counts
   */
  clearAll(): void {
    this.retryCount.clear();
  }
}

// Global instance
export const chunkRetryManager = new ChunkRetryManager();

/**
 * Setup global error handlers for chunk loading errors
 */
export function setupChunkErrorHandlers(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Handle unhandled promise rejections (common for dynamic imports)
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    if (error instanceof Error && chunkRetryManager.isChunkError(error)) {
      console.log('[ChunkRetry] Caught unhandled chunk loading error');
      event.preventDefault();
      chunkRetryManager.handleChunkError(error).catch(console.error);
    }
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    const error = event.error;
    
    if (error instanceof Error && chunkRetryManager.isChunkError(error)) {
      console.log('[ChunkRetry] Caught global chunk loading error');
      event.preventDefault();
      chunkRetryManager.handleChunkError(error).catch(console.error);
    }
  });

  console.log('[ChunkRetry] Global chunk error handlers initialized');
}

/**
 * Wrap a dynamic import with retry logic
 */
export async function importWithRetry<T>(
  importFn: () => Promise<T>,
  chunkId?: string
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (error instanceof Error && chunkRetryManager.isChunkError(error)) {
      await chunkRetryManager.handleChunkError(error, chunkId);
      // After reload, this code won't execute, but TypeScript needs a return
      throw error;
    }
    throw error;
  }
}
