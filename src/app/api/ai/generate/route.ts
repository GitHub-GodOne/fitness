import { envConfigs } from '@/config';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { withTaskHistoryAccessSnapshot } from '@/shared/lib/history-visibility';
import { respData, respErr } from '@/shared/lib/resp';
import { limitVideoLibraryTaskResultAngles } from '@/shared/lib/video-library-task-result';
import { createAITask, NewAITask, updateAITaskById } from '@/shared/models/ai_task';
import { getRemainingCredits } from '@/shared/models/credit';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { resolveVideoAccessTierFromSubscription } from '@/shared/lib/video-access';
import { getUserInfo } from '@/shared/models/user';
import { listBodyParts } from '@/shared/models/video_library';
import { getAIService } from '@/shared/services/ai';

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    const taskId = getUuid(); // Generate taskId early

    let provider, mediaType, model, prompt, options, scene;

    // Check content type for multipart/form-data
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      // Extract JSON params from 'body' field
      const bodyJson = formData.get('body') as string;
      if (bodyJson) {
        const parsedBody = JSON.parse(bodyJson);
        ({ provider, mediaType, model, prompt, options, scene } = parsedBody);
      }

      // Handle file upload
      const file = formData.get('file') as File;
      if (file && file.size > 0) {
        const { saveTaskFile } = await import('@/shared/utils/file-manager');
        const buffer = Buffer.from(await file.arrayBuffer());

        // Determine extension
        let ext = 'png'; // Default
        const mimeType = file.type;
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') ext = 'jpg';
        else if (mimeType === 'image/png') ext = 'png';
        else {
          // Try to get from filename
          const parts = file.name.split('.');
          if (parts.length > 1) ext = parts.pop() || 'png';
        }

        const filename = `input_image.${ext}`;
        const fileUrl = await saveTaskFile(taskId, filename, buffer);

        // Update options with image input
        if (!options) options = {};
        options.image_input = [fileUrl];
      }
    } else {
      // Standard JSON request
      ({ provider, mediaType, model, prompt, options, scene } =
        await request.json());
    }

    const isAnonymousVideoRequest =
      !user && mediaType === AIMediaType.VIDEO;

    if (!user && !isAnonymousVideoRequest) {
      return respErr('no auth, please sign in');
    }

    if (!mediaType || !model) {
      throw new Error("invalid params");
    }

    if (!prompt && !options) {
      throw new Error("prompt or options is required");
    }

    // Force use Video Library Provider for video generation
    if (mediaType === AIMediaType.VIDEO) {
      provider = "video-library";
      console.log("[AI Generate] Forcing Video Library Provider for video generation");
    }

    if (!provider) {
      throw new Error("invalid params: provider is required");
    }

    const aiService = await getAIService();

    // check generate type
    if (!aiService.getMediaTypes().includes(mediaType)) {
      throw new Error('invalid mediaType');
    }

    // check ai provider
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider) {
      throw new Error('invalid provider');
    }



    // todo: get cost credits from settings
    let costCredits = 2;
    let hasActiveSubscription = false;
    let currentSubscription = null;
    let accessTier = 'free';

    if (mediaType === AIMediaType.IMAGE) {
      // generate image
      if (scene === 'image-to-image') {
        costCredits = 4;
      } else if (scene === 'text-to-image') {
        costCredits = 2;
      } else {
        throw new Error('invalid scene');
      }
    } else if (mediaType === AIMediaType.VIDEO) {
      // generate video by subscription instead of credits
      if (scene === 'text-to-video') {
        costCredits = 0;
      } else if (scene === 'image-to-video') {
        costCredits = 0;
      } else if (scene === 'video-to-video') {
        costCredits = 0;
      } else {
        throw new Error('invalid scene');
      }
    } else if (mediaType === AIMediaType.MUSIC) {
      // generate music
      costCredits = 10;
      scene = 'text-to-music';
    } else {
      throw new Error('invalid mediaType');
    }

    const remainingCredits =
      mediaType === AIMediaType.VIDEO || !user
        ? 0
        : await getRemainingCredits(user.id);
    const effectiveCostCredits = costCredits;

    if (mediaType !== AIMediaType.VIDEO && remainingCredits < costCredits) {
      throw new Error('insufficient credits');
    }

    if (mediaType === AIMediaType.VIDEO) {
      currentSubscription = user
        ? await getCurrentSubscription(user.id)
        : null;
      hasActiveSubscription = Boolean(currentSubscription);
      accessTier = resolveVideoAccessTierFromSubscription(currentSubscription);
      options = withTaskHistoryAccessSnapshot({
        options,
        currentSubscription,
      });

      const selectedBodyParts: string[] = Array.isArray(options?.selected_body_parts)
        ? options.selected_body_parts
            .map((item: unknown) => String(item).trim())
            .filter(Boolean)
        : [];
      if (selectedBodyParts.length === 0) {
        throw new Error('selected_body_parts_required');
      }

      const activeBodyParts = await listBodyParts({
        status: 'active',
        limit: 1000,
      });
      const activeBodyPartNames = new Set(
        activeBodyParts.map((item) => item.name).filter(Boolean),
      );
      const invalidBodyParts = selectedBodyParts.filter(
        (item: string) => !activeBodyPartNames.has(item),
      );
      if (invalidBodyParts.length > 0) {
        throw new Error(
          `inactive_body_parts:${invalidBodyParts.join(',')}`,
        );
      }

      const resolution = options?.resolution;
      const duration = options?.duration;
      const ratio = options?.ratio;

      // Validate duration (1-12 seconds)
      if (duration !== undefined) {
        const durationNum = typeof duration === 'number' ? duration : parseInt(String(duration), 10);
        if (isNaN(durationNum) || durationNum < 1 || durationNum > 12) {
          throw new Error('Duration must be between 1 and 12 seconds.');
        }
      }

      // Validate resolution
      if (resolution && !['480p', '720p', '1080p'].includes(resolution)) {
        throw new Error('Invalid resolution. Must be 480p, 720p, or 1080p.');
      }

      // Validate ratio
      if (ratio && !['16:9', '9:16', '4:3', '1:1', '3:4', '21:9', 'adaptive'].includes(ratio)) {
        throw new Error('Invalid aspect ratio.');
      }
    }

    const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${provider}`;
    const params: any = {
      mediaType,
      model,
      prompt,
      callbackUrl,
      options,
      taskId,
      user,
      remainingCredits,
      hasActiveSubscription,
      currentSubscription,
      accessTier,
    };


    // create ai task
    // If user_feeling is provided in options, save it to prompt field for history display
    let taskPrompt = prompt;
    if (options && options.user_feeling) {
      taskPrompt = options.user_feeling;
    }

    // generate content
    const result = await aiProvider.generate({ params });
    if (!result?.taskId) {
      throw new Error(
        `ai generate failed, mediaType: ${mediaType}, provider: ${provider}, model: ${model}`
      );
    }

    if (!user && mediaType === AIMediaType.VIDEO) {
      const limitedTaskResult =
        provider === 'video-library'
          ? limitVideoLibraryTaskResultAngles(
              result.taskResult ? JSON.stringify(result.taskResult) : null,
              false,
            )
          : result.taskResult
            ? JSON.stringify(result.taskResult)
            : null;

      return respData({
        id: taskId,
        userId: null,
        mediaType,
        provider,
        model,
        prompt: taskPrompt,
        scene,
        options: options ? JSON.stringify(options) : null,
        status: result.taskStatus || AITaskStatus.PENDING,
        taskId: result.taskId,
        taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
        taskResult: limitedTaskResult,
        costCredits: 0,
        creditId: null,
        anonymous: true,
      });
    }

    const newAITask: NewAITask = {
      id: getUuid(),
      userId: user!.id,
      mediaType,
      provider,
      model,
      prompt: taskPrompt, // Use user_feeling as prompt if available
      scene,
      options: options ? JSON.stringify(options) : null,
      status: AITaskStatus.PENDING,
      costCredits: effectiveCostCredits,
      taskId: taskId,

    };
    const createdTask = await createAITask(newAITask);

    const nextStatus = result.taskStatus || AITaskStatus.PENDING;
    const persistedTask =
      nextStatus !== AITaskStatus.PENDING ||
      result.taskInfo ||
      result.taskResult
        ? await updateAITaskById(createdTask.id, {
            status: nextStatus,
            taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
            taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
            creditId: createdTask.creditId,
          })
        : createdTask;

    if (persistedTask.provider === 'video-library') {
      return respData({
        ...persistedTask,
        taskResult:
          limitVideoLibraryTaskResultAngles(
            persistedTask.taskResult,
            Boolean(currentSubscription),
          ) || null,
      });
    }

    return respData(persistedTask);
  } catch (e: any) {
    console.log('generate failed', e);
    return respErr(e.message);
  }
}
