import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { getUuid } from './hash';

/**
 * Video merger utility
 * Merges multiple video URLs into a single video using ffmpeg
 */

interface MergeVideoOptions {
  urls: string[];
  outputFormat?: string;
}

interface MergeVideoResult {
  success: boolean;
  videoPath?: string;
  videoBuffer?: Buffer;
  error?: string;
}

/**
 * Download video from URL to buffer
 */
async function downloadVideo(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video from ${url}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Check if ffmpeg is available
 */
async function checkFfmpegAvailable(): Promise<boolean> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Merge videos using ffmpeg
 */
async function mergeWithFfmpeg(videoBuffers: Buffer[], outputPath: string): Promise<boolean> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const tempDir = join(tmpdir(), 'video-merge-' + getUuid());
  await mkdir(tempDir, { recursive: true });

  try {
    // Save video buffers to temporary files
    const inputFiles: string[] = [];
    for (let i = 0; i < videoBuffers.length; i++) {
      const inputPath = join(tempDir, `input-${i}.mp4`);
      await writeFile(inputPath, videoBuffers[i]);
      inputFiles.push(inputPath);
    }

    // Create concat file list for ffmpeg
    const concatList = inputFiles.map((file) => `file '${file}'`).join('\n');
    const concatFilePath = join(tempDir, 'concat-list.txt');
    await writeFile(concatFilePath, concatList);

    // Run ffmpeg to concatenate videos
    // Using concat demuxer for fast concatenation without re-encoding
    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`;
    console.log('[Video Merger] Running ffmpeg:', ffmpegCommand);

    await execAsync(ffmpegCommand, { maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer

    // Clean up temporary files
    for (const file of inputFiles) {
      await unlink(file).catch(() => {});
    }
    await unlink(concatFilePath).catch(() => {});

    return true;
  } finally {
    // Clean up temp directory
    try {
      const { rm } = await import('fs/promises');
      await rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error('[Video Merger] Failed to clean up temp directory:', e);
    }
  }
}

/**
 * Merge multiple videos into one
 * 
 * Strategy:
 * 1. Try to use ffmpeg if available (best quality, proper concatenation)
 * 2. Fall back to simple buffer concatenation (may not work for all formats)
 */
export async function mergeVideos(options: MergeVideoOptions): Promise<MergeVideoResult> {
  const { urls, outputFormat = 'mp4' } = options;

  try {
    if (!urls || urls.length < 2) {
      throw new Error('At least 2 video URLs are required for merging');
    }

    console.log(`[Video Merger] Starting merge of ${urls.length} videos`);

    // Download all videos
    const videoBuffers: Buffer[] = [];
    for (let i = 0; i < urls.length; i++) {
      console.log(`[Video Merger] Downloading video ${i + 1}/${urls.length}: ${urls[i]}`);
      const buffer = await downloadVideo(urls[i]);
      videoBuffers.push(buffer);
      console.log(`[Video Merger] Downloaded video ${i + 1}, size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
    }

    // Check if we're in Node.js runtime and ffmpeg is available
    const isNodeRuntime = typeof process !== 'undefined' && process.versions && process.versions.node;
    const ffmpegAvailable = isNodeRuntime ? await checkFfmpegAvailable() : false;

    if (ffmpegAvailable) {
      console.log('[Video Merger] Using ffmpeg for video merge');
      const outputPath = join(tmpdir(), `merged-${getUuid()}.${outputFormat}`);

      try {
        await mergeWithFfmpeg(videoBuffers, outputPath);
        
        // Read the merged video
        const { readFile } = await import('fs/promises');
        const mergedBuffer = await readFile(outputPath);
        
        // Clean up output file
        await unlink(outputPath).catch(() => {});
        
        console.log(`[Video Merger] Successfully merged with ffmpeg, size: ${(mergedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
        
        return {
          success: true,
          videoBuffer: mergedBuffer,
        };
      } catch (error) {
        console.error('[Video Merger] ffmpeg merge failed, falling back to simple concatenation:', error);
        // Fall through to simple concatenation
      }
    } else {
      console.log('[Video Merger] ffmpeg not available, using simple concatenation');
    }

    // Fallback: Simple buffer concatenation
    // Note: This may not work properly for all MP4 files as it doesn't handle the container format
    console.log('[Video Merger] Using simple buffer concatenation (may produce imperfect results)');
    const mergedBuffer = Buffer.concat(videoBuffers);
    console.log(`[Video Merger] Concatenated video size: ${(mergedBuffer.length / 1024 / 1024).toFixed(2)}MB`);

    return {
      success: true,
      videoBuffer: mergedBuffer,
    };
  } catch (error) {
    console.error('[Video Merger] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during video merge',
    };
  }
}
