import {
  AIManager,
  type ComflyAPIConfigs,
  FalProvider,
  GeminiProvider,
  KieProvider,
  ReplicateProvider,
  VolcanoProvider,
  GWAPIProvider,
  FitnessVideoProvider,
  VideoLibraryProvider,
  ComflyAPIProvider,
} from '@/extensions/ai';
import { Configs, getAllConfigs } from '@/shared/models/config';

/**
 * get ai manager with configs
 */
export function getAIManagerWithConfigs(configs: Configs) {
  const aiManager = new AIManager();

  if (configs.kie_api_key) {
    aiManager.addProvider(
      new KieProvider({
        apiKey: configs.kie_api_key,
        customStorage: configs.kie_custom_storage === 'true',
      })
    );
  }

  if (configs.replicate_api_token) {
    aiManager.addProvider(
      new ReplicateProvider({
        apiToken: configs.replicate_api_token,
        customStorage: configs.replicate_custom_storage === 'true',
      })
    );
  }

  if (configs.fal_api_key) {
    aiManager.addProvider(
      new FalProvider({
        apiKey: configs.fal_api_key,
        customStorage: configs.fal_custom_storage === 'true',
      })
    );
  }

  if (configs.gemini_api_key) {
    aiManager.addProvider(
      new GeminiProvider({
        apiKey: configs.gemini_api_key,
      })
    );
  }

  if (configs.volcano_engine_api_key) {
    aiManager.addProvider(
      new VolcanoProvider({
        apiKey: configs.volcano_engine_api_key,
        customStorage: configs.volcano_custom_storage === 'true',
      })
    );
  }

  // Register GW-API Provider for Scripture Picture video generation
  const comflyApiKey = process.env.COMFLY_API_KEY || configs.COMFLY_API_KEY;
  if (comflyApiKey) {
    aiManager.addProvider(
      new GWAPIProvider({
        apiKey: comflyApiKey,
        customStorage: configs.volcano_custom_storage === 'true',
      })
    );

    // Register Fitness Video Provider for AI fitness workout video generation
    aiManager.addProvider(
      new FitnessVideoProvider({
        apiKey: comflyApiKey,
        customStorage: configs.volcano_custom_storage === 'true',
      })
    );

    // Register Video Library Provider for object recognition + video matching
    aiManager.addProvider(
      new VideoLibraryProvider({
        apiKey: comflyApiKey,
  // Register Comfly-API Provider for Jesus video generation
  const nanoBananaApiKey = process.env.NANO_BANANA_API_KEY || configs.NANO_BANANA_API_KEY;
  const wanxApiKey = process.env.WANX_API_KEY || configs.WANX_API_KEY;
  if (nanoBananaApiKey && wanxApiKey) {
    aiManager.addProvider(
      new ComflyAPIProvider({
        nanoBananaApiKey,
        wanxApiKey,
        imageEditPrompt:
          process.env.COMFLY_IMAGE_EDIT_PROMPT ||
          configs.comfly_image_edit_prompt,
        defaultVideoPrompt:
          process.env.COMFLY_DEFAULT_VIDEO_PROMPT ||
          configs.comfly_default_video_prompt,
        scriptSystemPrompt:
          process.env.COMFLY_SCRIPT_SYSTEM_PROMPT ||
          configs.comfly_script_system_prompt,
        ttsVoice:
          process.env.COMFLY_TTS_VOICE || configs.comfly_tts_voice,
        ttsSpeed:
          process.env.COMFLY_TTS_SPEED || configs.comfly_tts_speed,
        mergeBgmUrl:
          process.env.COMFLY_MERGE_BGM_URL || configs.comfly_merge_bgm_url,
        mergeBgmVolume:
          process.env.COMFLY_MERGE_BGM_VOLUME ||
          configs.comfly_merge_bgm_volume,
        mergeVoiceVolume:
          process.env.COMFLY_MERGE_VOICE_VOLUME ||
          configs.comfly_merge_voice_volume,
        mergeMaxWordsPerLine:
          process.env.COMFLY_MERGE_MAX_WORDS_PER_LINE ||
          configs.comfly_merge_max_words_per_line,
        mergeLongTokenDurS:
          process.env.COMFLY_MERGE_LONG_TOKEN_DUR_S ||
          configs.comfly_merge_long_token_dur_s,
        customStorage: configs.volcano_custom_storage === 'true',
      })
    );
  }

  return aiManager;
}

export function getComflyProviderWithConfigs(configs: Configs) {
  const nanoBananaApiKey =
    process.env.NANO_BANANA_API_KEY || configs.NANO_BANANA_API_KEY;
  const wanxApiKey = process.env.WANX_API_KEY || configs.WANX_API_KEY;

  if (!nanoBananaApiKey || !wanxApiKey) {
    return null;
  }

  const providerConfigs: ComflyAPIConfigs = {
    nanoBananaApiKey,
    wanxApiKey,
    imageEditPrompt:
      process.env.COMFLY_IMAGE_EDIT_PROMPT || configs.comfly_image_edit_prompt,
    defaultVideoPrompt:
      process.env.COMFLY_DEFAULT_VIDEO_PROMPT ||
      configs.comfly_default_video_prompt,
    scriptSystemPrompt:
      process.env.COMFLY_SCRIPT_SYSTEM_PROMPT ||
      configs.comfly_script_system_prompt,
    ttsVoice: process.env.COMFLY_TTS_VOICE || configs.comfly_tts_voice,
    ttsSpeed: process.env.COMFLY_TTS_SPEED || configs.comfly_tts_speed,
    mergeBgmUrl:
      process.env.COMFLY_MERGE_BGM_URL || configs.comfly_merge_bgm_url,
    mergeBgmVolume:
      process.env.COMFLY_MERGE_BGM_VOLUME || configs.comfly_merge_bgm_volume,
    mergeVoiceVolume:
      process.env.COMFLY_MERGE_VOICE_VOLUME ||
      configs.comfly_merge_voice_volume,
    mergeMaxWordsPerLine:
      process.env.COMFLY_MERGE_MAX_WORDS_PER_LINE ||
      configs.comfly_merge_max_words_per_line,
    mergeLongTokenDurS:
      process.env.COMFLY_MERGE_LONG_TOKEN_DUR_S ||
      configs.comfly_merge_long_token_dur_s,
    customStorage: configs.volcano_custom_storage === 'true',
  };

  return new ComflyAPIProvider(providerConfigs);
}

/**
 * global ai service
 */
let aiService: AIManager | null = null;

/**
 * get ai service manager
 */
export async function getAIService(configs?: Configs): Promise<AIManager> {
  if (!configs) {
    configs = await getAllConfigs();
  }
  aiService = getAIManagerWithConfigs(configs);

  return aiService;
}
