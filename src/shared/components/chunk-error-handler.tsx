'use client';

import { useEffect } from 'react';
import { setupChunkErrorHandlers } from '@/shared/lib/chunk-retry';

/**
 * Client component to setup global chunk error handlers
 * Should be included in the root layout
 */
export function ChunkErrorHandler() {
  useEffect(() => {
    setupChunkErrorHandlers();
  }, []);

  return null;
}
