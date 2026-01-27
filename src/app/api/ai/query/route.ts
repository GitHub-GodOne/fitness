import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskById,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';
import { uploadVideosInBackground } from '@/shared/services/video-upload';
import { AITaskStatus, AIMediaType } from '@/extensions/ai';
import { notifyVideoComplete, notifyImageComplete } from '@/shared/services/notification';

// Track ongoing queries to prevent duplicate requests for the same task
const ongoingQueries = new Map<string, Promise<any>>();

export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return respErr('invalid params');
    }

    // Check if there's already an ongoing query for this task
    let ongoingQuery = ongoingQueries.get(taskId);
    if (ongoingQuery) {
      console.log(`[AI Query] Task ${taskId} query already in progress, returning in-progress status`);
      return respErr('task query in progress');
    }

    // Optional: Check authentication only if user is logged in
    // This allows sync-pending-tasks to call this API without auth
    const user = await getUserInfo();
    const task = await findAITaskById(taskId);
    if (!task || !task.taskId) {
      return respErr('task not found');
    }

    // If user is authenticated, verify they own the task
    // If no user, allow query (for internal/sync use)
    if (user && task.userId !== user.id) {
      return respErr('no permission');
    }

    // Double-check after async operations to prevent race conditions
    // Another request might have started querying while we were validating
    ongoingQuery = ongoingQueries.get(taskId);
    if (ongoingQuery) {
      console.log(`[AI Query] Task ${taskId} query already in progress (double-check), returning in-progress status`);
      return respErr('task query in progress');
    }

    // Create a promise for this query
    const queryPromise = (async () => {
      try {
        const aiService = await getAIService();
        const aiProvider = aiService.getProvider(task.provider);
        if (!aiProvider) {
          console.error('[AI Query] Provider not found:', {
            provider: task.provider,
            availableProviders: aiService.getProviderNames(),
          });
          throw new Error(`invalid ai provider: ${task.provider}`);
        }

        // Query task status from provider
        if (!task.taskId) {
          throw new Error('task taskId is required');
        }

        let result: any;
        try {
          result = await aiProvider?.query?.({
            taskId: task.taskId,
            mediaType: task.mediaType,
            model: task.model,
          });
        } catch (error: any) {
          // Handle network errors (ECONNRESET, fetch failed, etc.)
          // Return current task status to prevent frontend errors
          const isNetworkError =
            error?.code === 'ECONNRESET' ||
            error?.message?.includes('fetch failed') ||
            error?.message?.includes('ECONNRESET') ||
            error?.message?.includes('network') ||
            error?.cause?.code === 'ECONNRESET';

          if (isNetworkError) {
            console.warn(`[AI Query] Network error for task ${task.id}, returning current task status:`, error.message);
            // Return current task without updating to prevent frontend errors
            return respData(task);
          }
          // Re-throw non-network errors
          throw error;
        }

        // If task is still processing and this is a user request (not internal sync),
        // delay 10 seconds to reduce frontend polling frequency
        // For internal sync calls (no user), return immediately
        if (user && (result?.taskStatus === AITaskStatus.PENDING || result?.taskStatus === AITaskStatus.PROCESSING)) {
          // Wait 10 seconds before returning to avoid frontend polling too frequently
          await new Promise(resolve => setTimeout(resolve, 10000));
        }

        if (!result?.taskStatus) {
          throw new Error('query ai task failed');
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

        // update ai task with current result (before background upload completes)
        const updateAITask: UpdateAITask = {
          status: result.taskStatus,
          taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
          taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
          creditId: task.creditId, // credit consumption record id
        };

        const statusChanged = updateAITask.status !== task.status;
        const isNowSuccess = updateAITask.status === AITaskStatus.SUCCESS;

        // Update if taskInfo or taskResult changed
        if (
          updateAITask.taskInfo !== task.taskInfo ||
          updateAITask.taskResult !== task.taskResult ||
          statusChanged
        ) {
          await updateAITaskById(task.id, updateAITask);
        }

        // Send notification when task completes successfully
        if (statusChanged && isNowSuccess && task.userId) {
          try {
            if (task.mediaType === AIMediaType.VIDEO) {
              const videoUrl = result.taskResult?.video || result.taskInfo?.videos?.[0];
              if (videoUrl) {
                await notifyVideoComplete({
                  userId: task.userId,
                  taskId: task.id,
                  videoUrl,
                  prompt: task.prompt || undefined,
                });
              }
            } else if (task.mediaType === AIMediaType.IMAGE) {
              const imageUrl = result.taskResult?.image || result.taskInfo?.images?.[0];
              if (imageUrl) {
                await notifyImageComplete({
                  userId: task.userId,
                  taskId: task.id,
                  imageUrl,
                  prompt: task.prompt || undefined,
                });
              }
            }
          } catch (notifyError) {
            console.error('[AI Query] Failed to send notification:', notifyError);
          }
        }

        task.status = updateAITask.status || '';
        task.taskInfo = updateAITask.taskInfo || null;
        task.taskResult = updateAITask.taskResult || null;

        return respData(task);
      } catch (error: any) {
        console.log('[AI Query] Query failed:', error);
        return respErr(error.message || 'query ai task failed');
      } finally {
        // Remove from ongoing queries when done
        ongoingQueries.delete(taskId);
      }
    })();

    // Store the promise IMMEDIATELY after creating it (before await)
    // This prevents race conditions where another request might pass the check
    // before this promise is stored
    ongoingQueries.set(taskId, queryPromise);

    // Wait for the query to complete and return the result
    return await queryPromise;
  } catch (e: any) {
    console.log('[AI Query] Request failed:', e);
    return respErr(e.message || 'query ai task failed');
  }
}
