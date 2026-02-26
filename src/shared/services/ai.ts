import {
  AIManager,
  FalProvider,
  GeminiProvider,
  KieProvider,
  ReplicateProvider,
  VolcanoProvider,
  GWAPIProvider,
  FitnessVideoProvider,
  VideoLibraryProvider,
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
        customStorage: configs.volcano_custom_storage === 'true',
      })
    );
  }

  return aiManager;
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
