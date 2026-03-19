import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskById,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';
import { ensureUploadedVideoThumbnail } from '@/shared/services/video-thumbnail';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';

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

    const result = await aiProvider?.query?.({
      taskId: task.taskId,
      mediaType: task.mediaType,
      model: task.model,
    });

    if (!result?.taskStatus) {
      return respErr('query ai task failed');
    }

    if (
      task.mediaType === AIMediaType.VIDEO &&
      result.taskStatus === AITaskStatus.SUCCESS
    ) {
      const uploadedThumbnailUrl = await ensureUploadedVideoThumbnail({
        taskId: task.id,
        taskInfo: result.taskInfo,
        taskResult: result.taskResult,
      });

      if (uploadedThumbnailUrl) {
        if (Array.isArray(result.taskInfo?.videos)) {
          result.taskInfo.videos = result.taskInfo.videos.map((item, index) =>
            index === 0 && !item?.thumbnailUrl
              ? {
                  ...item,
                  thumbnailUrl: uploadedThumbnailUrl,
                }
              : item,
          );
        }

        result.taskResult = {
          ...(result.taskResult || {}),
          cover_url: result.taskResult?.cover_url || uploadedThumbnailUrl,
          coverUrl: result.taskResult?.coverUrl || uploadedThumbnailUrl,
          poster: result.taskResult?.poster || uploadedThumbnailUrl,
          saved_last_frame_image:
            result.taskResult?.saved_last_frame_image || uploadedThumbnailUrl,
        };
      }
    }

    // update ai task
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
