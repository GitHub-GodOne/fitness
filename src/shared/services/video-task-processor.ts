import { AIProvider, AIGenerateParams, AITaskStatus } from '@/extensions/ai';
import { saveTaskFile, saveTaskFiles } from '@/shared/utils/file-manager';
import { updateAITaskById } from '@/shared/models/ai_task';

/**
 * Background video task processor
 * Handles async video generation and updates task status
 */

interface VideoTaskContext {
    taskId: string;
    provider: AIProvider;
    params: AIGenerateParams;
}

/**
 * Process video generation task in background
 * Updates task status and saves results to database
 */
export async function processVideoTask(context: VideoTaskContext): Promise<void> {
    const { taskId, provider, params } = context;

    try {
        console.log(`[VideoTask] Starting background processing for task ${taskId}`);

        // Update status to processing
        await updateAITaskById(taskId, {
            status: AITaskStatus.PROCESSING,
        });

        // Generate video (this will save files to public/video/{date}/{taskId})
        const result = await provider.generate({ params });

        if (!result?.taskId) {
            throw new Error('Video generation failed: no result returned');
        }

        // Update task with success status and results
        await updateAITaskById(taskId, {
            status: AITaskStatus.SUCCESS,
            taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
            taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
        });

        console.log(`[VideoTask] ✓ Task ${taskId} completed successfully`);

    } catch (error: any) {
        console.error(`[VideoTask] ✗ Task ${taskId} failed:`, error);

        // Update task with failure status and error message
        await updateAITaskById(taskId, {
            status: AITaskStatus.FAILED,
            taskResult: JSON.stringify({
                error: error.message,
                stack: error.stack,
            }),
        });
    }
}

/**
 * Start video task processing in background (fire and forget)
 */
export function startVideoTaskProcessing(context: VideoTaskContext): void {
    // Run in background without blocking
    processVideoTask(context).catch((error) => {
        console.error(`[VideoTask] Unhandled error in background task ${context.taskId}:`, error);
    });
}
