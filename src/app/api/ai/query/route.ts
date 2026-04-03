import { getAllConfigs } from '@/shared/models/config';
import { respData, respErr } from '@/shared/lib/resp';
import { canViewFullHistoryForTask } from '@/shared/lib/history-visibility';
import {
  hydrateVideoLibraryTaskResult,
  limitVideoLibraryTaskResultAngles,
} from '@/shared/lib/video-library-task-result';
import {
  findAITaskById,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getCurrentSubscription, getSubscriptions } from '@/shared/models/subscription';
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
    const [configs, currentSubscription, subscriptions] = user
      ? await Promise.all([
          getAllConfigs(),
          getCurrentSubscription(user.id),
          getSubscriptions({
            userId: user.id,
            page: 1,
            limit: 200,
          }),
        ])
      : [null, null, []];

    const task = await findAITaskById(taskId);
    if (!task || !task.taskId) {
      return respErr('task not found');
    }

    // Check permission: logged-in users can only see their own tasks.
    // Anonymous users can only see tasks that were created without a userId.
    if (user) {
      if (task.userId !== user.id) {
        return respErr('no permission');
      }
    } else {
      if (task.userId !== null) {
        return respErr('no permission');
      }
    }

    // If task is already completed (SUCCESS or FAILED), return it directly
    // without querying the provider again (prevents overwriting valid results)
    if (task.status === 'success' || task.status === 'failed') {
      if (task.provider === 'video-library' && task.taskResult) {
        const hydratedTaskResult = await hydrateVideoLibraryTaskResult(
          task.taskResult,
        );

        if (hydratedTaskResult !== task.taskResult) {
          await updateAITaskById(task.id, {
            taskResult: hydratedTaskResult,
          });
          task.taskResult = hydratedTaskResult || null;
        }

        task.taskResult =
          limitVideoLibraryTaskResultAngles(
            task.taskResult,
            canViewFullHistoryForTask({
              taskCreatedAt: task.createdAt,
              taskOptions: task.options,
              currentSubscription,
              subscriptions,
              configs,
            }),
          ) || null;
      }

      return respData(task);
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

    if (task.provider === 'video-library') {
      task.taskResult =
        limitVideoLibraryTaskResultAngles(
          task.taskResult,
          canViewFullHistoryForTask({
            taskCreatedAt: task.createdAt,
            taskOptions: task.options,
            currentSubscription,
            subscriptions,
            configs,
          }),
        ) || null;
    }

    return respData(task);
  } catch (e: any) {
    console.log('ai query failed', e);
    return respErr(e.message);
  }
}
