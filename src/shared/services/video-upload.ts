import { getUuid } from '@/shared/lib/hash';
import { replaceR2Url } from '@/shared/lib/url';
import { saveFiles } from '@/extensions/ai';
import { updateAITaskById, UpdateAITask } from '@/shared/models/ai_task';
import { AIVideo, AIFile } from '@/extensions/ai/types';

/**
 * Background video upload service
 * Handles async video upload and database update
 * 
 * @param taskId - AI task ID in database
 * @param videos - Video objects to upload
 * @param originalTaskResult - Original task result from API
 */
export async function uploadVideosInBackground({
    taskId,
    videos,
    originalTaskResult,
}: {
    taskId: string;
    videos: AIVideo[];
    originalTaskResult: any;
}): Promise<void> {
    // Fire and forget - don't await, run in background
    (async () => {
        try {
            console.log('[VideoUpload] Starting background upload for task:', taskId);

            if (!videos || videos.length === 0) {
                console.warn('[VideoUpload] No videos to upload for task:', taskId);
                return;
            }

            // Prepare files for upload (filter out videos without URLs)
            const filesToSave: AIFile[] = videos
                .map((video, index) => {
                    if (!video.videoUrl) {
                        return null;
                    }
                    return {
                        url: video.videoUrl,
                        contentType: 'video/mp4',
                        key: `volcano/video/${getUuid()}.mp4`,
                        index: index,
                        type: 'video',
                    } as AIFile;
                })
                .filter((file): file is AIFile => file !== null && file !== undefined);

            // Upload videos to storage
            const uploadedFiles = await saveFiles(filesToSave);

            if (!uploadedFiles || uploadedFiles.length === 0) {
                console.warn('[VideoUpload] Failed to upload videos for task:', taskId);
                // Don't update database if upload failed, keep original URLs
                return;
            }

            // Build updated task result with saved URLs
            const savedVideoUrls: string[] = [];
            uploadedFiles.forEach((file: AIFile) => {
                if (file && file.url && file.index !== undefined) {
                    const video = videos[file.index];
                    if (video) {
                        const replacedUrl = replaceR2Url(file.url);
                        savedVideoUrls.push(replacedUrl);
                        console.log('[VideoUpload] Video uploaded:', {
                            taskId,
                            index: file.index,
                            original: video.videoUrl,
                            saved: replacedUrl,
                        });
                    }
                }
            });

            // Update task result with saved URLs (CDN URLs)
            // Keep original URLs as fallback for History viewing
            // Remove video_upload_pending flag and update with saved URLs
            const { video_upload_pending, ...restTaskResult } = originalTaskResult;
            const updatedTaskResult = {
                ...restTaskResult,
                // CDN URLs (preferred, permanent)
                saved_video_urls: savedVideoUrls,
                saved_video_url: savedVideoUrls[0],
                // Keep original URLs as fallback
                original_video_url: originalTaskResult.original_video_url || originalTaskResult.saved_video_url,
                original_video_urls: originalTaskResult.original_video_urls || originalTaskResult.saved_video_urls,
            };

            // Update database with uploaded video URLs
            const updateAITask: UpdateAITask = {
                taskResult: JSON.stringify(updatedTaskResult),
            };

            await updateAITaskById(taskId, updateAITask);

            console.log('[VideoUpload] Successfully updated task with uploaded videos:', taskId);
        } catch (error) {
            // Log error but don't throw - this is a background task
            console.error('[VideoUpload] Background upload failed for task:', taskId, error);
            // Optionally: Could send notification or retry logic here
        }
    })();
}
