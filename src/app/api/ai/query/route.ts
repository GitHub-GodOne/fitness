import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskById,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';
import { uploadVideosInBackground } from '@/shared/services/video-upload';
import { AITaskStatus } from '@/extensions/ai';

export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return respErr('invalid params');
    }

    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const task = await findAITaskById(taskId);
    if (!task || !task.taskId) {
      return respErr('task not found');
    }

    if (task.userId !== user.id) {
      return respErr('no permission');
    }

    const aiService = await getAIService();
    const aiProvider = aiService.getProvider(task.provider);
    if (!aiProvider) {
      console.error('[AI Query] Provider not found:', {
        provider: task.provider,
        availableProviders: aiService.getProviderNames(),
      });
      return respErr(`invalid ai provider: ${task.provider}`);
    }

    // Query task status from provider
    const result = await aiProvider?.query?.({
      taskId: task.taskId,
      mediaType: task.mediaType,
      model: task.model,
    });

    // If task is still processing, delay 10 seconds to reduce frontend polling frequency
    if (result?.taskStatus === AITaskStatus.PENDING || result?.taskStatus === AITaskStatus.PROCESSING) {
      // Wait 10 seconds before returning to avoid frontend polling too frequently
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    if (!result?.taskStatus) {
      return respErr('query ai task failed');
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
    // Update if taskInfo or taskResult changed
    if (
      updateAITask.taskInfo !== task.taskInfo ||
      updateAITask.taskResult !== task.taskResult ||
      updateAITask.status !== task.status
    ) {
      await updateAITaskById(task.id, updateAITask);
    }

    task.status = updateAITask.status || '';
    task.taskInfo = updateAITask.taskInfo || null;
    task.taskResult = updateAITask.taskResult || null;

    return respData(task);
  } catch (e: any) {
    console.log('ai query failed', e);
    return respErr(e.message);
  }
}
