import { envConfigs } from '@/config';
import { AIMediaType } from '@/extensions/ai';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask, NewAITask } from '@/shared/models/ai_task';
import { getRemainingCredits } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

export async function POST(request: Request) {
  try {
    let { provider, mediaType, model, prompt, options, scene } =
      await request.json();

    if (!provider || !mediaType || !model) {
      throw new Error('invalid params');
    }

    if (!prompt && !options) {
      throw new Error('prompt or options is required');
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

    // get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // todo: get cost credits from settings
    let costCredits = 2;

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
      // generate video
      if (scene === 'text-to-video') {
        costCredits = 1;
      } else if (scene === 'image-to-video') {
        costCredits = 1;
      } else if (scene === 'video-to-video') {
        costCredits = 1;
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

    // check credits
    const remainingCredits = await getRemainingCredits(user.id);
    if (remainingCredits < costCredits) {
      throw new Error('insufficient credits');
    }

    // Validate video settings for free users (only 3 free credits)
    if (mediaType === AIMediaType.VIDEO && options) {
      const resolution = options.resolution;
      const duration = options.duration;
      const ratio = options.ratio;

      // Free users (with only 3 credits) can only use 480p
      if (remainingCredits <= 3) {
        if (resolution && resolution !== '480p') {
          throw new Error('Free users can only use 480p resolution. Please purchase credits to unlock 720p and 1080p.');
        }
      }

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
    };


    // generate content
    const result = await aiProvider.generate({ params });
    if (!result?.taskId) {
      throw new Error(
        `ai generate failed, mediaType: ${mediaType}, provider: ${provider}, model: ${model}`
      );
    }

    // create ai task
    // If user_feeling is provided in options, save it to prompt field for history display
    let taskPrompt = prompt;
    if (options && options.user_feeling) {
      taskPrompt = options.user_feeling;
    }

    const newAITask: NewAITask = {
      id: getUuid(),
      userId: user.id,
      mediaType,
      provider,
      model,
      prompt: taskPrompt, // Use user_feeling as prompt if available
      scene,
      options: options ? JSON.stringify(options) : null,
      status: result.taskStatus,
      costCredits,
      taskId: result.taskId,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
    };
    await createAITask(newAITask);

    return respData(newAITask);
  } catch (e: any) {
    console.log('generate failed', e);
    return respErr(e.message);
  }
}
