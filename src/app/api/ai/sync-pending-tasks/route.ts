import { respData, respErr } from '@/shared/lib/resp';
import {
    getAITasks,
    UpdateAITask,
    updateAITaskById,
} from '@/shared/models/ai_task';
import { getAIService } from '@/shared/services/ai';
import { uploadVideosInBackground } from '@/shared/services/video-upload';
import { AITaskStatus } from '@/extensions/ai';

/**
 * Sync Pending Tasks API
 * 
 * This API endpoint is designed to be called by a cron job every 10 minutes
 * to check and update the status of pending/processing AI tasks.
 * 
 * This is useful when users close their browser during video generation,
 * as the frontend polling stops, but tasks continue processing on the backend.
 * 
 * Usage:
 * - Vercel Cron: Add to vercel.json crons array
 * - External Cron: Call this endpoint via HTTP request every 10 minutes
 * - Manual: Can be called manually for testing
 * 
 * Security: This endpoint should be protected with a secret token
 * to prevent unauthorized access.
 */
export async function GET(req: Request) {
    try {
        // Optional: Add secret token check for security
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return Response.json({ code: -1, message: 'unauthorized' }, { status: 401 });
        }

        // Find all pending or processing tasks
        const pendingTasks = await getAITasks({
            status: AITaskStatus.PENDING,
            limit: 100, // Process up to 100 tasks per run
        });

        const processingTasks = await getAITasks({
            status: AITaskStatus.PROCESSING,
            limit: 100,
        });

        const allTasks = [...pendingTasks, ...processingTasks];

        if (allTasks.length === 0) {
            return respData({
                message: 'No pending or processing tasks found',
                processed: 0,
                updated: 0,
                failed: 0,
            });
        }

        console.log(`[Sync Pending Tasks] Found ${allTasks.length} tasks to check`);

        const aiService = await getAIService();
        let updatedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        // Process each task
        for (const task of allTasks) {
            try {
                if (!task.taskId || !task.provider) {
                    console.warn(`[Sync Pending Tasks] Task ${task.id} missing taskId or provider, skipping`);
                    continue;
                }

                const aiProvider = aiService.getProvider(task.provider);
                if (!aiProvider) {
                    console.error(`[Sync Pending Tasks] Provider not found for task ${task.id}:`, task.provider);
                    failedCount++;
                    errors.push(`Task ${task.id}: Provider ${task.provider} not found`);
                    continue;
                }

                // Query task status from provider
                const result = await aiProvider?.query?.({
                    taskId: task.taskId,
                    mediaType: task.mediaType,
                    model: task.model,
                });

                if (!result?.taskStatus) {
                    console.warn(`[Sync Pending Tasks] No status returned for task ${task.id}`);
                    continue;
                }

                // Check if status changed
                if (result.taskStatus === task.status &&
                    result.taskInfo === task.taskInfo &&
                    result.taskResult === task.taskResult) {
                    // Status unchanged, skip update
                    continue;
                }

                // Check if video upload should happen in background
                const videos = result.taskInfo?.videos;
                const shouldUploadInBackground =
                    task.provider === 'volcano' &&
                    result.taskStatus === AITaskStatus.SUCCESS &&
                    videos &&
                    Array.isArray(videos) &&
                    videos.length > 0 &&
                    result.taskResult?.video_upload_pending === true;

                // Start background upload if needed (fire and forget)
                if (shouldUploadInBackground && videos) {
                    uploadVideosInBackground({
                        taskId: task.id,
                        videos: videos,
                        originalTaskResult: result.taskResult,
                    });
                }

                // Update task with current result
                const updateAITask: UpdateAITask = {
                    status: result.taskStatus,
                    taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
                    taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
                    creditId: task.creditId, // Preserve credit consumption record id
                };

                await updateAITaskById(task.id, updateAITask);
                updatedCount++;

                console.log(`[Sync Pending Tasks] Updated task ${task.id}: ${task.status} -> ${result.taskStatus}`);
            } catch (error: any) {
                console.error(`[Sync Pending Tasks] Failed to process task ${task.id}:`, error);
                failedCount++;
                errors.push(`Task ${task.id}: ${error.message || 'Unknown error'}`);
            }
        }

        return respData({
            message: `Processed ${allTasks.length} tasks`,
            processed: allTasks.length,
            updated: updatedCount,
            failed: failedCount,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (e: any) {
        console.error('[Sync Pending Tasks] Failed:', e);
        return respErr(e.message || 'Failed to sync pending tasks');
    }
}
