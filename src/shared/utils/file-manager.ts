import { promises as fs } from 'fs';
import path from 'path';

/**
 * File manager utility for AI video generation
 * Manages files in public/video/{date}/{taskId} structure
 */

/**
 * Get the work directory for a specific task
 * Format: public/video/YYYYMMDD/{taskId}
 */
export function getTaskWorkDir(taskId: string): string {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const publicDir = path.join(process.cwd(), 'public', 'video', dateStr, taskId);
    return publicDir;
}

/**
 * Get the public URL path for a task file
 * Format: /video/YYYYMMDD/{taskId}/{filename}
 */
export function getTaskPublicUrl(taskId: string, filename: string): string {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    return `/video/${dateStr}/${taskId}/${filename}`;
}

/**
 * Ensure the work directory exists, create if not
 */
export async function ensureTaskWorkDir(taskId: string): Promise<string> {
    const workDir = getTaskWorkDir(taskId);

    try {
        await fs.access(workDir);
    } catch {
        // Directory doesn't exist, create it
        await fs.mkdir(workDir, { recursive: true });
        console.log(`[FileManager] Created work directory: ${workDir}`);
    }

    return workDir;
}

/**
 * Save a buffer to the task work directory
 */
export async function saveTaskFile(
    taskId: string,
    filename: string,
    buffer: Buffer
): Promise<string> {
    const workDir = await ensureTaskWorkDir(taskId);
    const filePath = path.join(workDir, filename);

    await fs.writeFile(filePath, buffer);
    console.log(`[FileManager] Saved file: ${filePath}`);

    return getTaskPublicUrl(taskId, filename);
}

/**
 * Save multiple buffers to the task work directory
 */
export async function saveTaskFiles(
    taskId: string,
    files: Array<{ filename: string; buffer: Buffer }>
): Promise<string[]> {
    const workDir = await ensureTaskWorkDir(taskId);
    const urls: string[] = [];

    for (const file of files) {
        const filePath = path.join(workDir, file.filename);
        await fs.writeFile(filePath, file.buffer);
        urls.push(getTaskPublicUrl(taskId, file.filename));
    }

    console.log(`[FileManager] Saved ${files.length} files to ${workDir}`);
    return urls;
}

/**
 * Check if a file exists in the task work directory
 */
export async function taskFileExists(taskId: string, filename: string): Promise<boolean> {
    const workDir = getTaskWorkDir(taskId);
    const filePath = path.join(workDir, filename);

    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get the absolute path for a task file
 */
export function getTaskFilePath(taskId: string, filename: string): string {
    const workDir = getTaskWorkDir(taskId);
    return path.join(workDir, filename);
}

/**
 * Save a generic file to public/pic directory (similar to upload-image route)
 */
export async function savePublicFile(file: File): Promise<string> {
    const { md5 } = await import('@/shared/lib/hash');

    // Get current date in YYYYMMDD format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateFolder = `${year}${month}${day}`;

    // Ensure public/pic/{date} directory exists
    const picDir = path.join(process.cwd(), 'public', 'pic', dateFolder);
    try {
        await fs.mkdir(picDir, { recursive: true });
    } catch (err) {
        console.error('[FileManager] Failed to create pic directory:', err);
    }

    // Determine extension
    const nameParts = file.name.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop() : 'bin';

    // Convert file to buffer and hash
    const arrayBuffer = await file.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    const digest = md5(body);

    const filename = `${digest}.${ext}`;
    const filePath = path.join(picDir, filename);

    // Save file if not exists
    try {
        await fs.access(filePath);
        // File exists, skip write
    } catch {
        await fs.writeFile(filePath, body);
        console.log('[FileManager] Saved public file:', filePath);
    }

    return `/pic/${dateFolder}/${filename}`;
}
