import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
} from "./types";
import { replaceR2Url } from "@/shared/lib/url";
import { getEmailService } from "@/shared/services/email";
import { db } from "@/core/db";
import { user } from "@/config/db/schema";
import { eq } from "drizzle-orm";

/**
 * Comfly API configs for Jesus Video provider
 */
export interface ComflyAPIConfigs extends AIConfigs {
  nanoBananaApiKey: string;
  wanxApiKey: string;
  ttsBaseUrl?: string;
  videoProcessBaseUrl?: string;
  imageEditBaseUrl?: string;
  videoGenBaseUrl?: string;
  imageEditPrompt?: string;
  defaultVideoPrompt?: string;
  scriptSystemPrompt?: string;
  ttsVoice?: string;
  ttsSpeed?: string | number;
  mergeBgmUrl?: string;
  mergeBgmVolume?: string | number;
  mergeVoiceVolume?: string | number;
  mergeMaxWordsPerLine?: string | number;
  mergeLongTokenDurS?: string | number;
  mergeSubtitleFontsize?: string | number;
  mergeSubtitleMarginv?: string | number;
  mergeSubtitleY?: string | number;
  mergeTitleFontsize?: string | number;
  mergeTitleX?: string | number;
  mergeTitleY?: string | number;
  customStorage?: boolean;
  r2_bucket_name?: string;
  // Fallback models
  fallbackImageModels?: string[]; // e.g., ["nano-banana", "gpt-image-1"]
  fallbackVideoModels?: string[]; // e.g., ["wanx2.1-i2v-turbo", "wanx2.0-i2v"]
  fallbackTTSModels?: string[]; // e.g., ["default", "gpt-4o-mini-tts"]
}

export const DEFAULT_COMFLY_IMAGE_EDIT_PROMPT = `
Please preserve the original image intact.

All figures, faces, and identification information must not be altered.

Do not remove or replace any figures.

The image should depict the gentle yet dignified image of Jesus Christ, interacting with people in a compassionate and caring manner. The image of Jesus should be painted in an oil painting style, naturally integrated into the composition. If figures appear in the image, they should be people caring for the subjects. Followers may be present around Jesus. Added objects should be rendered as solid objects in the oil painting style; they should not be transparent or appear to pass through objects, maintaining physical contact. Avoid depicting ethereal objects,Jesus must not be depicted within a frame or displayed in an image; anything added to the image must not be a frame or similar element.
`.trim();

export const DEFAULT_COMFLY_VIDEO_PROMPT = `让画面中的图片动起来,画面中不要再引入其他的人物，重点描述画面中耶稣的祝福动作，安慰，或者是拥抱图片中的实体人物动作，和他周围信徒的表情、动作的变化。图片动起来的时候不能透明或不能穿透物体，物体之间的接触要保持物理接触，不能描绘虚幻缥缈的物体，人物或者是物体之间接触了不能相互穿透。`;

export const DEFAULT_COMFLY_SCRIPT_SYSTEM_PROMPT = `
# Role
You are "The Comforter," an empathetic AI scriptwriter designed to create healing narration for American users facing emotional distress.

# Input
- \`User_Feeling\`: User's emotional state (e.g., "Lonely", "Anxious", "Heartbroken").

# Task
Generate a structured JSON object containing:
1. A matching Bible verse reference
2. The complete verse text (New International Version or English Standard Version)
3. A short narration that incorporates the verse naturally

# Content Guidelines
- **Tone:** Warm, intimate, slow-paced, non-judgmental. Like a wise friend whispering in a quiet room.
- **Language:** Natural American English. Avoid archaic "Thee/Thou." Use soothing words like "Breathe," "Rest," "Stillness," "Presence."
- **Narration Structure:**
  1. Acknowledge the feeling (1-2 sentences)
  2. Introduce the Bible verse naturally (include the complete verse text)
  3. Offer comfort and hope (1-2 sentences)
- **Mark pauses** in narration with "..." for natural breathing room.
- **Length:** Keep total narration under 100 words for a short video.

# Output Format (JSON Only)
{
  "verse_reference": "Book Chapter:Verse (e.g. Isaiah 41:10)",
  "verse_text": "The complete verse text from the Bible",
  "narration": "The complete narration script that includes the verse naturally"
}
`.trim();

export const DEFAULT_COMFLY_TTS_VOICE = "output.wav";
export const DEFAULT_COMFLY_TTS_SPEED = "1";
export const DEFAULT_COMFLY_MERGE_BGM_URL =
  "https://clonevoice.nailai.net/static/ttslist/music.mp3";
export const DEFAULT_COMFLY_MERGE_BGM_VOLUME = "3";
export const DEFAULT_COMFLY_MERGE_VOICE_VOLUME = "1.0";
export const DEFAULT_COMFLY_MERGE_MAX_WORDS_PER_LINE = "20";
export const DEFAULT_COMFLY_MERGE_LONG_TOKEN_DUR_S = "0.8";
export const DEFAULT_COMFLY_MERGE_SUBTITLE_FONTSIZE = "100";
export const DEFAULT_COMFLY_MERGE_SUBTITLE_MARGINV = "100";
export const DEFAULT_COMFLY_MERGE_SUBTITLE_Y = "0";
export const DEFAULT_COMFLY_MERGE_TITLE_FONTSIZE = "80";
export const DEFAULT_COMFLY_MERGE_TITLE_X = "540";
export const DEFAULT_COMFLY_MERGE_TITLE_Y = "300";

export enum ComflyPromptType {
  IMAGE_EDIT = "image_edit",
  VIDEO = "video",
  SCRIPT = "script",
  AUDIO = "audio",
  MERGE_VIDEO = "merge_video",
}

export interface ResolvedComflyPrompts {
  imageEditPrompt: string;
  defaultVideoPrompt: string;
  scriptSystemPrompt: string;
}

export interface ComflyScriptGenerationResult {
  verse_reference: string;
  verse_text: string;
  narration: string;
}

export interface ComflyPromptPreviewResult {
  type: ComflyPromptType;
  prompt: string;
  payload: Record<string, any>;
  request?: {
    url: string;
    method: string;
    headers?: Record<string, string>;
  };
  supportsExecution: boolean;
}

export interface ComflyPromptTestResult extends ComflyPromptPreviewResult {
  executed: boolean;
  result?: any;
}

export interface ComflyTestRequestOptions {
  type: ComflyPromptType;
  input?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  model?: string;
  voice?: string;
  language?: string;
  speed?: number;
  title?: string;
  bgmUrl?: string;
  bgmVolume?: string;
  voiceVolume?: string;
  maxWordsPerLine?: string;
  longTokenDurS?: string;
  subtitleFontsize?: string;
  subtitleMarginv?: string;
  subtitleY?: string;
  titleFontsize?: string;
  titleX?: string;
  titleY?: string;
}

const DEFAULT_COMFLY_SCRIPT_SCHEMA = {
  name: "video_script_response",
  strict: true,
  schema: {
    type: "object",
    required: ["verse_reference", "verse_text", "narration"],
    properties: {
      verse_reference: { type: "string" },
      verse_text: { type: "string" },
      narration: { type: "string" },
    },
    additionalProperties: false,
  },
} as const;

export function resolveComflyPrompts(
  configs: Partial<
    Pick<
      ComflyAPIConfigs,
      "imageEditPrompt" | "defaultVideoPrompt" | "scriptSystemPrompt"
    >
  > = {},
): ResolvedComflyPrompts {
  return {
    imageEditPrompt:
      configs.imageEditPrompt?.trim() || DEFAULT_COMFLY_IMAGE_EDIT_PROMPT,
    defaultVideoPrompt:
      configs.defaultVideoPrompt?.trim() || DEFAULT_COMFLY_VIDEO_PROMPT,
    scriptSystemPrompt:
      configs.scriptSystemPrompt?.trim() || DEFAULT_COMFLY_SCRIPT_SYSTEM_PROMPT,
  };
}

export function buildComflyImageEditPayload({ prompt }: { prompt: string }) {
  return {
    model: "nano-banana",
    prompt,
    response_format: "url",
    aspect_ratio: "",
  };
}

export function buildComflyImageEditRequest({
  baseUrl,
  apiKey,
  prompt,
  image,
}: {
  baseUrl: string;
  apiKey: string;
  prompt: string;
  image?: Blob;
}) {
  const payload = buildComflyImageEditPayload({ prompt });
  const formData = new FormData();
  formData.append("model", payload.model);
  formData.append("prompt", payload.prompt);
  if (image) {
    formData.append("image", image, "input_image.jpg");
  }
  formData.append("response_format", payload.response_format);
  formData.append("aspect_ratio", payload.aspect_ratio);

  return {
    url: `${baseUrl}/v1/images/edits`,
    payload,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    } satisfies RequestInit,
  };
}

export function buildComflyVideoGenerationPayload({
  prompt,
  imageUrl,
  model = "wanx2.1-i2v-turbo",
}: {
  prompt: string;
  imageUrl: string;
  model?: string;
}) {
  return {
    prompt,
    watermark: false,
    images: [imageUrl],
    model,
  };
}

export function buildComflyVideoGenerationRequest({
  baseUrl,
  apiKey,
  prompt,
  imageUrl,
  model = "wanx2.1-i2v-turbo",
}: {
  baseUrl: string;
  apiKey: string;
  prompt: string;
  imageUrl: string;
  model?: string;
}) {
  const payload = buildComflyVideoGenerationPayload({
    prompt,
    imageUrl,
    model,
  });

  return {
    url: `${baseUrl}/v2/videos/generations`,
    payload,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    } satisfies RequestInit,
  };
}

export function buildComflyScriptGenerationPayload({
  systemPrompt,
  userFeelings,
  model = "gpt-4o-2024-08-06",
}: {
  systemPrompt: string;
  userFeelings: string;
  model?: string;
}) {
  return {
    model,
    response_format: {
      type: "json_schema",
      json_schema: DEFAULT_COMFLY_SCRIPT_SCHEMA,
    },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userFeelings,
      },
    ],
  };
}

export function buildComflyScriptGenerationRequest({
  baseUrl,
  apiKey,
  systemPrompt,
  userFeelings,
  model = "gpt-4o-2024-08-06",
}: {
  baseUrl: string;
  apiKey: string;
  systemPrompt: string;
  userFeelings: string;
  model?: string;
}) {
  const payload = buildComflyScriptGenerationPayload({
    systemPrompt,
    userFeelings,
    model,
  });

  return {
    url: `${baseUrl}/v1/chat/completions`,
    payload,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    } satisfies RequestInit,
  };
}

export function buildComflyAudioGenerationPayload({
  text,
  language = "en",
  speed = 1,
  voice = DEFAULT_COMFLY_TTS_VOICE,
  model = "default",
}: {
  text: string;
  language?: string;
  speed?: number;
  voice?: string;
  model?: string;
}) {
  return {
    voice,
    model,
    text,
    language,
    speed: String(speed),
  };
}

export function buildComflyAudioGenerationRequest({
  baseUrl,
  text,
  language = "en",
  speed = 1,
  voice = DEFAULT_COMFLY_TTS_VOICE,
  model = "default",
}: {
  baseUrl: string;
  text: string;
  language?: string;
  speed?: number;
  voice?: string;
  model?: string;
}) {
  const payload = buildComflyAudioGenerationPayload({
    text,
    language,
    speed,
    voice,
    model,
  });

  const body = new URLSearchParams();
  body.append("voice", payload.voice);
  body.append("model", payload.model);
  body.append("text", payload.text);
  body.append("language", payload.language);
  body.append("speed", payload.speed);

  return {
    url: `${baseUrl}/tts_async`,
    payload,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: body.toString(),
    } satisfies RequestInit,
  };
}

export function buildComflyVideoMergePayload({
  videoUrl,
  audioUrl,
  textContent,
  language = "en",
  bgmVolume = "4",
  voiceVolume = "1.0",
  maxWordsPerLine = "20",
  longTokenDurS = "0.8",
  subtitleFontsize = DEFAULT_COMFLY_MERGE_SUBTITLE_FONTSIZE,
  subtitleMarginv = DEFAULT_COMFLY_MERGE_SUBTITLE_MARGINV,
  subtitleY = DEFAULT_COMFLY_MERGE_SUBTITLE_Y,
  titleFontsize = DEFAULT_COMFLY_MERGE_TITLE_FONTSIZE,
  titleX = DEFAULT_COMFLY_MERGE_TITLE_X,
  titleY = DEFAULT_COMFLY_MERGE_TITLE_Y,
  title = "",
  titleStart = "0",
  titleEnd = "1000",
  bgmUrl = DEFAULT_COMFLY_MERGE_BGM_URL,
}: {
  videoUrl: string;
  audioUrl: string;
  textContent: string;
  language?: string;
  bgmVolume?: string;
  voiceVolume?: string;
  maxWordsPerLine?: string;
  longTokenDurS?: string;
  subtitleFontsize?: string;
  subtitleMarginv?: string;
  subtitleY?: string;
  titleFontsize?: string;
  titleX?: string;
  titleY?: string;
  title?: string;
  titleStart?: string;
  titleEnd?: string;
  bgmUrl?: string;
}) {
  return {
    video_url: videoUrl,
    audio_url: audioUrl,
    text_content: textContent,
    language,
    bgm_volume: bgmVolume,
    voice_volume: voiceVolume,
    max_words_per_line: maxWordsPerLine,
    long_token_dur_s: longTokenDurS,
    subtitle_fontsize: subtitleFontsize,
    subtitle_marginv: subtitleMarginv,
    subtitle_y: subtitleY,
    title_fontsize: titleFontsize,
    title_x: titleX,
    title_y: titleY,
    title,
    title_start: titleStart,
    title_end: titleEnd,
    bgm_url: bgmUrl,
  };
}

export function buildComflyVideoMergeRequest({
  baseUrl,
  videoUrl,
  audioUrl,
  textContent,
  language = "en",
  title = "",
  bgmUrl = DEFAULT_COMFLY_MERGE_BGM_URL,
  bgmVolume = DEFAULT_COMFLY_MERGE_BGM_VOLUME,
  voiceVolume = DEFAULT_COMFLY_MERGE_VOICE_VOLUME,
  maxWordsPerLine = DEFAULT_COMFLY_MERGE_MAX_WORDS_PER_LINE,
  longTokenDurS = DEFAULT_COMFLY_MERGE_LONG_TOKEN_DUR_S,
  subtitleFontsize = DEFAULT_COMFLY_MERGE_SUBTITLE_FONTSIZE,
  subtitleMarginv = DEFAULT_COMFLY_MERGE_SUBTITLE_MARGINV,
  subtitleY = DEFAULT_COMFLY_MERGE_SUBTITLE_Y,
  titleFontsize = DEFAULT_COMFLY_MERGE_TITLE_FONTSIZE,
  titleX = DEFAULT_COMFLY_MERGE_TITLE_X,
  titleY = DEFAULT_COMFLY_MERGE_TITLE_Y,
  titleStart = "0",
  titleEnd = "1000",
}: {
  baseUrl: string;
  videoUrl: string;
  audioUrl: string;
  textContent: string;
  language?: string;
  title?: string;
  bgmUrl?: string;
  bgmVolume?: string;
  voiceVolume?: string;
  maxWordsPerLine?: string;
  longTokenDurS?: string;
  subtitleFontsize?: string;
  subtitleMarginv?: string;
  subtitleY?: string;
  titleFontsize?: string;
  titleX?: string;
  titleY?: string;
  titleStart?: string;
  titleEnd?: string;
}) {
  const payload = buildComflyVideoMergePayload({
    videoUrl,
    audioUrl,
    textContent,
    language,
    title,
    bgmUrl,
    bgmVolume,
    voiceVolume,
    maxWordsPerLine,
    longTokenDurS,
    subtitleFontsize,
    subtitleMarginv,
    subtitleY,
    titleFontsize,
    titleX,
    titleY,
    titleStart,
    titleEnd,
  });

  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value) {
      formData.append(key, value);
    }
  });

  return {
    url: `${baseUrl}/process_video_async`,
    payload,
    init: {
      method: "POST",
      body: formData,
    } satisfies RequestInit,
  };
}

export function previewComflyPromptTest({
  configs,
  type,
  input = "",
  imageUrl = "",
  videoUrl = "",
  audioUrl = "",
  model,
  voice,
  language = "en",
  speed = 1,
  title = "",
  bgmUrl,
  bgmVolume,
  voiceVolume,
  maxWordsPerLine,
  longTokenDurS,
  subtitleFontsize,
  subtitleMarginv,
  subtitleY,
  titleFontsize,
  titleX,
  titleY,
}: {
  configs?: Partial<ComflyAPIConfigs>;
  type: ComflyPromptType;
  input?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  model?: string;
  voice?: string;
  language?: string;
  speed?: number;
  title?: string;
  bgmUrl?: string;
  bgmVolume?: string;
  voiceVolume?: string;
  maxWordsPerLine?: string;
  longTokenDurS?: string;
  subtitleFontsize?: string;
  subtitleMarginv?: string;
  subtitleY?: string;
  titleFontsize?: string;
  titleX?: string;
  titleY?: string;
}): ComflyPromptPreviewResult {
  const prompts = resolveComflyPrompts(configs);
  const imageEditBaseUrl =
    configs?.imageEditBaseUrl || "https://ai.comfly.chat";
  const videoGenBaseUrl = configs?.videoGenBaseUrl || "https://ai.comfly.chat";
  const ttsBaseUrl = configs?.ttsBaseUrl || "https://clonevoice.nailai.net";
  const videoProcessBaseUrl =
    configs?.videoProcessBaseUrl || "https://clonevoice.nailai.net";

  switch (type) {
    case ComflyPromptType.IMAGE_EDIT:
      const imageEditPrompt = prompts.imageEditPrompt;
      return {
        type,
        prompt: imageEditPrompt,
        payload: buildComflyImageEditPayload({
          prompt: imageEditPrompt,
        }),
        request: configs?.nanoBananaApiKey
          ? {
              url: buildComflyImageEditRequest({
                baseUrl: imageEditBaseUrl,
                apiKey: configs.nanoBananaApiKey,
                prompt: imageEditPrompt,
              }).url,
              method: "POST",
              headers: {
                Authorization: "Bearer ***",
              },
            }
          : undefined,
        supportsExecution: Boolean(imageUrl),
      };
    case ComflyPromptType.VIDEO:
      const videoPrompt = input?.trim() || prompts.defaultVideoPrompt;
      return {
        type,
        prompt: videoPrompt,
        payload: buildComflyVideoGenerationPayload({
          prompt: videoPrompt,
          imageUrl: imageUrl || "https://example.com/input-image.jpg",
          model,
        }),
        request: configs?.wanxApiKey
          ? {
              url: buildComflyVideoGenerationRequest({
                baseUrl: videoGenBaseUrl,
                apiKey: configs.wanxApiKey,
                prompt: videoPrompt,
                imageUrl: imageUrl || "https://example.com/input-image.jpg",
                model,
              }).url,
              method: "POST",
              headers: {
                Authorization: "Bearer ***",
                "Content-Type": "application/json",
              },
            }
          : undefined,
        supportsExecution: false,
      };
    case ComflyPromptType.SCRIPT:
      const systemPrompt = prompts.scriptSystemPrompt;
      return {
        type: ComflyPromptType.SCRIPT,
        prompt: systemPrompt,
        payload: buildComflyScriptGenerationPayload({
          systemPrompt,
          userFeelings: input,
          model,
        }),
        request: configs?.nanoBananaApiKey
          ? {
              url: buildComflyScriptGenerationRequest({
                baseUrl: imageEditBaseUrl,
                apiKey: configs.nanoBananaApiKey,
                systemPrompt,
                userFeelings: input,
                model,
              }).url,
              method: "POST",
              headers: {
                Authorization: "Bearer ***",
                "Content-Type": "application/json",
              },
            }
          : undefined,
        supportsExecution: true,
      };
    case ComflyPromptType.AUDIO:
      return {
        type,
        prompt: input,
        payload: buildComflyAudioGenerationPayload({
          text: input,
          language,
          speed,
          voice: voice || configs?.ttsVoice || DEFAULT_COMFLY_TTS_VOICE,
          model: model || configs?.fallbackTTSModels?.[0] || "default",
        }),
        request: input?.trim()
          ? {
              url: buildComflyAudioGenerationRequest({
                baseUrl: ttsBaseUrl,
                text: input,
                language,
                speed,
                voice: voice || configs?.ttsVoice || DEFAULT_COMFLY_TTS_VOICE,
                model: model || configs?.fallbackTTSModels?.[0] || "default",
              }).url,
              method: "POST",
              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded; charset=UTF-8",
              },
            }
          : undefined,
        supportsExecution: Boolean(input?.trim()),
      };
    case ComflyPromptType.MERGE_VIDEO:
      return {
        type,
        prompt: input,
        payload: buildComflyVideoMergePayload({
          videoUrl: videoUrl || "https://example.com/video.mp4",
          audioUrl: audioUrl || "https://example.com/audio.wav",
          textContent: input || "Sample subtitle text",
          language,
          title,
          bgmUrl:
            bgmUrl || configs?.mergeBgmUrl || DEFAULT_COMFLY_MERGE_BGM_URL,
          bgmVolume:
            bgmVolume ||
            String(configs?.mergeBgmVolume || DEFAULT_COMFLY_MERGE_BGM_VOLUME),
          voiceVolume:
            voiceVolume ||
            String(
              configs?.mergeVoiceVolume || DEFAULT_COMFLY_MERGE_VOICE_VOLUME,
            ),
          maxWordsPerLine:
            maxWordsPerLine ||
            String(
              configs?.mergeMaxWordsPerLine ||
                DEFAULT_COMFLY_MERGE_MAX_WORDS_PER_LINE,
            ),
          longTokenDurS:
            longTokenDurS ||
            String(
              configs?.mergeLongTokenDurS ||
                DEFAULT_COMFLY_MERGE_LONG_TOKEN_DUR_S,
            ),
          subtitleFontsize:
            subtitleFontsize ||
            String(
              configs?.mergeSubtitleFontsize ||
                DEFAULT_COMFLY_MERGE_SUBTITLE_FONTSIZE,
            ),
          subtitleMarginv:
            subtitleMarginv ||
            String(
              configs?.mergeSubtitleMarginv ||
                DEFAULT_COMFLY_MERGE_SUBTITLE_MARGINV,
            ),
          subtitleY:
            subtitleY ||
            String(configs?.mergeSubtitleY || DEFAULT_COMFLY_MERGE_SUBTITLE_Y),
          titleFontsize:
            titleFontsize ||
            String(
              configs?.mergeTitleFontsize ||
                DEFAULT_COMFLY_MERGE_TITLE_FONTSIZE,
            ),
          titleX:
            titleX ||
            String(configs?.mergeTitleX || DEFAULT_COMFLY_MERGE_TITLE_X),
          titleY:
            titleY ||
            String(configs?.mergeTitleY || DEFAULT_COMFLY_MERGE_TITLE_Y),
        }),
        request:
          videoUrl?.trim() && audioUrl?.trim()
            ? {
                url: buildComflyVideoMergeRequest({
                  baseUrl: videoProcessBaseUrl,
                  videoUrl: videoUrl || "https://example.com/video.mp4",
                  audioUrl: audioUrl || "https://example.com/audio.wav",
                  textContent: input || "Sample subtitle text",
                  language,
                  title,
                  bgmUrl:
                    bgmUrl ||
                    configs?.mergeBgmUrl ||
                    DEFAULT_COMFLY_MERGE_BGM_URL,
                  bgmVolume:
                    bgmVolume ||
                    String(
                      configs?.mergeBgmVolume ||
                        DEFAULT_COMFLY_MERGE_BGM_VOLUME,
                    ),
                  voiceVolume:
                    voiceVolume ||
                    String(
                      configs?.mergeVoiceVolume ||
                        DEFAULT_COMFLY_MERGE_VOICE_VOLUME,
                    ),
                  maxWordsPerLine:
                    maxWordsPerLine ||
                    String(
                      configs?.mergeMaxWordsPerLine ||
                        DEFAULT_COMFLY_MERGE_MAX_WORDS_PER_LINE,
                    ),
                  longTokenDurS:
                    longTokenDurS ||
                    String(
                      configs?.mergeLongTokenDurS ||
                        DEFAULT_COMFLY_MERGE_LONG_TOKEN_DUR_S,
                    ),
                  subtitleFontsize:
                    subtitleFontsize ||
                    String(
                      configs?.mergeSubtitleFontsize ||
                        DEFAULT_COMFLY_MERGE_SUBTITLE_FONTSIZE,
                    ),
                  subtitleMarginv:
                    subtitleMarginv ||
                    String(
                      configs?.mergeSubtitleMarginv ||
                        DEFAULT_COMFLY_MERGE_SUBTITLE_MARGINV,
                    ),
                  subtitleY:
                    subtitleY ||
                    String(
                      configs?.mergeSubtitleY ||
                        DEFAULT_COMFLY_MERGE_SUBTITLE_Y,
                    ),
                  titleFontsize:
                    titleFontsize ||
                    String(
                      configs?.mergeTitleFontsize ||
                        DEFAULT_COMFLY_MERGE_TITLE_FONTSIZE,
                    ),
                  titleX:
                    titleX ||
                    String(
                      configs?.mergeTitleX || DEFAULT_COMFLY_MERGE_TITLE_X,
                    ),
                  titleY:
                    titleY ||
                    String(
                      configs?.mergeTitleY || DEFAULT_COMFLY_MERGE_TITLE_Y,
                    ),
                }).url,
                method: "POST",
              }
            : undefined,
        supportsExecution: Boolean(
          input?.trim() && videoUrl?.trim() && audioUrl?.trim(),
        ),
      };
    default:
      return {
        type: ComflyPromptType.SCRIPT,
        prompt: prompts.scriptSystemPrompt,
        payload: buildComflyScriptGenerationPayload({
          systemPrompt: prompts.scriptSystemPrompt,
          userFeelings: input,
          model,
        }),
        supportsExecution: true,
      };
  }
}

/**
 * Comfly Task Step enum
 */
export enum ComflyTaskStep {
  PENDING = "pending",
  EDITING_IMAGE = "editing_image",
  GENERATING_VIDEO = "generating_video",
  POLLING_VIDEO = "polling_video",
  GENERATING_AUDIO = "generating_audio",
  GENERATING_SCRIPT = "generating_script",
  MERGING_VIDEO = "merging_video",
  UPLOADING_TO_R2 = "uploading_to_r2",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * Comfly Task Progress
 */
export interface ComflyTaskProgress {
  currentStep: ComflyTaskStep;
  stepMessage: string;
  progress: number;
  startedAt: string;
  updatedAt: string;
}

/**
 * Nano-Banana Image Edit Response
 */
interface NanoBananaResponse {
  created: number;
  data: Array<{
    revised_prompt: string;
    url: string;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Wanx Video Generation Response
 */
interface WanxVideoResponse {
  task_id: string;
}

/**
 * Wanx Video Query Response
 */
interface WanxVideoQueryResponse {
  task_id: string;
  platform: string;
  action: string;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";
  fail_reason: string;
  submit_time: number;
  start_time: number;
  finish_time: number;
  progress: string;
  data?: {
    actual_prompt: string;
    orig_prompt: string;
    output: string;
  };
  cost: number;
}

/**
 * TTS Response
 */
interface TTSResponse {
  code: number;
  filename: string;
  msg: string;
  name: string;
  url: string;
}

/**
 * TTS Async Task Response
 */
interface TTSAsyncResponse {
  task_id: string;
}

/**
 * TTS Task Status Response
 */
interface TTSTaskStatusResponse {
  code: number;
  status: "pending" | "processing" | "completed" | "failed";
  task_id: string;
  type: string;
  error: string | null;
  result?: {
    code: number;
    filename: string;
    msg: string;
    name: string;
    url: string;
  };
}

/**
 * Video Process Response
 */
interface VideoProcessResponse {
  code: number;
  filename: string;
  msg: string;
  name: string;
  url: string;
}

/**
 * Video Process Async Response
 */
interface VideoProcessAsyncResponse {
  task_id: string;
}

/**
 * Video Process Task Status Response
 */
interface VideoProcessTaskStatusResponse {
  code: number;
  status: "pending" | "processing" | "completed" | "failed";
  task_id: string;
  type: string;
  error: string | null;
  result?: {
    code: number;
    msg: string;
    filename: string;
    url: string;
    is_video: boolean;
  };
}

interface InputImageAsset {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/**
 * Comfly API Provider - Jesus Video Generation
 * Workflow: Upload Image -> Edit with nano-banana -> Generate Video with wanx2.1 -> Generate Audio -> Merge Video
 */
export class ComflyAPIProvider implements AIProvider {
  readonly name = "comfly-api";
  configs: ComflyAPIConfigs;

  private imageEditBaseUrl: string;
  private videoGenBaseUrl: string;
  private ttsBaseUrl: string;
  private videoProcessBaseUrl: string;

  constructor(configs: ComflyAPIConfigs) {
    this.configs = configs;
    this.imageEditBaseUrl =
      configs.imageEditBaseUrl || "https://ai.comfly.chat";
    this.videoGenBaseUrl = configs.videoGenBaseUrl || "https://ai.comfly.chat";
    this.ttsBaseUrl = configs.ttsBaseUrl || "https://clonevoice.nailai.net";
    this.videoProcessBaseUrl =
      configs.videoProcessBaseUrl || "https://clonevoice.nailai.net";
  }

  private getImageEditPrompt() {
    return resolveComflyPrompts(this.configs).imageEditPrompt;
  }

  private isHttpUrl(value: string) {
    return value.startsWith("http://") || value.startsWith("https://");
  }

  private normalizeImageExtension(extension: string) {
    const normalized = extension.toLowerCase().replace(/^\./, "");

    if (normalized === "jpeg") {
      return "jpg";
    }

    if (["jpg", "png", "webp", "gif"].includes(normalized)) {
      return normalized;
    }

    return "png";
  }

  private getImageContentType(extension: string) {
    switch (this.normalizeImageExtension(extension)) {
      case "jpg":
        return "image/jpeg";
      case "webp":
        return "image/webp";
      case "gif":
        return "image/gif";
      default:
        return "image/png";
    }
  }

  private getExtensionFromUrl(url: string) {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
      return this.normalizeImageExtension(match?.[1] || "png");
    } catch {
      const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#].*)?$/);
      return this.normalizeImageExtension(match?.[1] || "png");
    }
  }

  private async loadInputImageAsset(source: string): Promise<InputImageAsset> {
    if (this.isHttpUrl(source)) {
      const response = await this.fetchWithRetry(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch source image: ${response.status}`);
      }

      const contentTypeHeader = response.headers.get("content-type") || "";
      const extensionFromHeader = contentTypeHeader.split("/")[1] || "";
      const extension = extensionFromHeader
        ? this.normalizeImageExtension(extensionFromHeader)
        : this.getExtensionFromUrl(source);

      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        contentType: contentTypeHeader || this.getImageContentType(extension),
        extension,
      };
    }

    const fs = await import("fs/promises");
    const path = await import("path");

    let fullPath = source;
    if (source.startsWith("/")) {
      fullPath = path.join(process.cwd(), "public", source.substring(1));
    }

    const extension = this.normalizeImageExtension(
      path.extname(fullPath).replace(".", "") || "png",
    );

    return {
      buffer: await fs.readFile(fullPath),
      contentType: this.getImageContentType(extension),
      extension,
    };
  }

  private getDefaultVideoPrompt() {
    return resolveComflyPrompts(this.configs).defaultVideoPrompt;
  }

  private getScriptSystemPrompt() {
    return resolveComflyPrompts(this.configs).scriptSystemPrompt;
  }

  private getTTSVoice() {
    return String(this.configs.ttsVoice || DEFAULT_COMFLY_TTS_VOICE);
  }

  private getTTSSpeed() {
    const rawSpeed = this.configs.ttsSpeed;
    const parsedSpeed =
      typeof rawSpeed === "number"
        ? rawSpeed
        : rawSpeed
          ? Number(rawSpeed)
          : Number(DEFAULT_COMFLY_TTS_SPEED);

    return Number.isFinite(parsedSpeed)
      ? parsedSpeed
      : Number(DEFAULT_COMFLY_TTS_SPEED);
  }

  private getMergeBgmUrl() {
    return String(this.configs.mergeBgmUrl || DEFAULT_COMFLY_MERGE_BGM_URL);
  }

  private getMergeBgmVolume() {
    return String(
      this.configs.mergeBgmVolume || DEFAULT_COMFLY_MERGE_BGM_VOLUME,
    );
  }

  private getMergeVoiceVolume() {
    return String(
      this.configs.mergeVoiceVolume || DEFAULT_COMFLY_MERGE_VOICE_VOLUME,
    );
  }

  private getMergeMaxWordsPerLine() {
    return String(
      this.configs.mergeMaxWordsPerLine ||
        DEFAULT_COMFLY_MERGE_MAX_WORDS_PER_LINE,
    );
  }

  private getMergeLongTokenDurS() {
    return String(
      this.configs.mergeLongTokenDurS || DEFAULT_COMFLY_MERGE_LONG_TOKEN_DUR_S,
    );
  }

  private getMergeSubtitleFontsize() {
    return String(
      this.configs.mergeSubtitleFontsize ||
        DEFAULT_COMFLY_MERGE_SUBTITLE_FONTSIZE,
    );
  }

  private getMergeSubtitleMarginv() {
    return String(
      this.configs.mergeSubtitleMarginv ||
        DEFAULT_COMFLY_MERGE_SUBTITLE_MARGINV,
    );
  }

  private getMergeSubtitleY() {
    return String(
      this.configs.mergeSubtitleY || DEFAULT_COMFLY_MERGE_SUBTITLE_Y,
    );
  }

  private getMergeTitleFontsize() {
    return String(
      this.configs.mergeTitleFontsize || DEFAULT_COMFLY_MERGE_TITLE_FONTSIZE,
    );
  }

  private getMergeTitleX() {
    return String(this.configs.mergeTitleX || DEFAULT_COMFLY_MERGE_TITLE_X);
  }

  private getMergeTitleY() {
    return String(this.configs.mergeTitleY || DEFAULT_COMFLY_MERGE_TITLE_Y);
  }

  getResolvedPrompts(): ResolvedComflyPrompts {
    return resolveComflyPrompts(this.configs);
  }

  previewPromptTest({
    type,
    input = "",
    imageUrl = "",
    videoUrl = "",
    audioUrl = "",
    model,
    voice,
    language = "en",
    speed = 1,
    title = "",
    bgmUrl,
    bgmVolume,
    voiceVolume,
    maxWordsPerLine,
    longTokenDurS,
    subtitleFontsize,
    subtitleMarginv,
    subtitleY,
    titleFontsize,
    titleX,
    titleY,
  }: {
    type: ComflyPromptType;
    input?: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    model?: string;
    voice?: string;
    language?: string;
    speed?: number;
    title?: string;
    bgmUrl?: string;
    bgmVolume?: string;
    voiceVolume?: string;
    maxWordsPerLine?: string;
    longTokenDurS?: string;
    subtitleFontsize?: string;
    subtitleMarginv?: string;
    subtitleY?: string;
    titleFontsize?: string;
    titleX?: string;
    titleY?: string;
  }): ComflyPromptPreviewResult {
    return previewComflyPromptTest({
      configs: this.configs,
      type,
      input,
      imageUrl,
      videoUrl,
      audioUrl,
      model,
      voice,
      language,
      speed,
      title,
      bgmUrl,
      bgmVolume,
      voiceVolume,
      maxWordsPerLine,
      longTokenDurS,
      subtitleFontsize,
      subtitleMarginv,
      subtitleY,
      titleFontsize,
      titleX,
      titleY,
    });
  }

  async testPrompt({
    type,
    input = "",
    imageUrl = "",
    videoUrl = "",
    audioUrl = "",
    model,
    voice,
    language = "en",
    speed,
    title = "",
    bgmUrl,
    bgmVolume,
    voiceVolume,
    maxWordsPerLine,
    longTokenDurS,
    subtitleFontsize,
    subtitleMarginv,
    subtitleY,
    titleFontsize,
    titleX,
    titleY,
  }: {
    type: ComflyPromptType;
    input?: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    model?: string;
    voice?: string;
    language?: string;
    speed?: number;
    title?: string;
    bgmUrl?: string;
    bgmVolume?: string;
    voiceVolume?: string;
    maxWordsPerLine?: string;
    longTokenDurS?: string;
    subtitleFontsize?: string;
    subtitleMarginv?: string;
    subtitleY?: string;
    titleFontsize?: string;
    titleX?: string;
    titleY?: string;
  }): Promise<ComflyPromptTestResult> {
    const preview = this.previewPromptTest({
      type,
      input,
      imageUrl,
      videoUrl,
      audioUrl,
      model,
      voice,
      language,
      speed: speed ?? this.getTTSSpeed(),
      title,
      bgmUrl,
      bgmVolume: bgmVolume || this.getMergeBgmVolume(),
      voiceVolume: voiceVolume || this.getMergeVoiceVolume(),
      maxWordsPerLine: maxWordsPerLine || this.getMergeMaxWordsPerLine(),
      longTokenDurS: longTokenDurS || this.getMergeLongTokenDurS(),
      subtitleFontsize: subtitleFontsize || this.getMergeSubtitleFontsize(),
      subtitleMarginv: subtitleMarginv || this.getMergeSubtitleMarginv(),
      subtitleY: subtitleY || this.getMergeSubtitleY(),
      titleFontsize: titleFontsize || this.getMergeTitleFontsize(),
      titleX: titleX || this.getMergeTitleX(),
      titleY: titleY || this.getMergeTitleY(),
    });

    if (type === ComflyPromptType.SCRIPT) {
      const result = await this.generateScriptText(input, model);
      return {
        ...preview,
        executed: true,
        result,
      };
    }

    if (type === ComflyPromptType.IMAGE_EDIT && imageUrl) {
      const result = await this.editImageWithNanoBanana(undefined, imageUrl);
      return {
        ...preview,
        executed: true,
        result: {
          editedImageUrl: result,
        },
      };
    }

    if (type === ComflyPromptType.AUDIO && input.trim()) {
      const generatedAudioUrl = await this.generateAudioTest({
        text: input,
        language,
        speed: speed ?? this.getTTSSpeed(),
        voice: voice || this.getTTSVoice(),
      });
      return {
        ...preview,
        executed: true,
        result: {
          audioUrl: generatedAudioUrl,
        },
      };
    }

    if (
      type === ComflyPromptType.MERGE_VIDEO &&
      input.trim() &&
      videoUrl.trim() &&
      audioUrl.trim()
    ) {
      const finalVideoUrl = await this.mergeVideoTest({
        videoUrl,
        audioUrl,
        textContent: input,
        language,
        title,
        bgmUrl: bgmUrl || this.getMergeBgmUrl(),
        bgmVolume: bgmVolume || this.getMergeBgmVolume(),
        voiceVolume: voiceVolume || this.getMergeVoiceVolume(),
        maxWordsPerLine: maxWordsPerLine || this.getMergeMaxWordsPerLine(),
        longTokenDurS: longTokenDurS || this.getMergeLongTokenDurS(),
        subtitleFontsize: subtitleFontsize || this.getMergeSubtitleFontsize(),
        subtitleMarginv: subtitleMarginv || this.getMergeSubtitleMarginv(),
        subtitleY: subtitleY || this.getMergeSubtitleY(),
        titleFontsize: titleFontsize || this.getMergeTitleFontsize(),
        titleX: titleX || this.getMergeTitleX(),
        titleY: titleY || this.getMergeTitleY(),
      });
      return {
        ...preview,
        executed: true,
        result: {
          finalVideoUrl,
        },
      };
    }

    return {
      ...preview,
      executed: false,
    };
  }

  async generateAudioTest({
    text,
    language = "en",
    speed,
    voice,
  }: {
    text: string;
    language?: string;
    speed?: number;
    voice?: string;
  }) {
    return this.generateAudioAsyncWithRetry(
      text,
      language,
      speed ?? this.getTTSSpeed(),
      3,
      voice || this.getTTSVoice(),
    );
  }

  async mergeVideoTest({
    videoUrl,
    audioUrl,
    textContent,
    language = "en",
    title = "",
    bgmUrl,
    bgmVolume,
    voiceVolume,
    maxWordsPerLine,
    longTokenDurS,
    subtitleFontsize,
    subtitleMarginv,
    subtitleY,
    titleFontsize,
    titleX,
    titleY,
  }: {
    videoUrl: string;
    audioUrl: string;
    textContent: string;
    language?: string;
    title?: string;
    bgmUrl?: string;
    bgmVolume?: string;
    voiceVolume?: string;
    maxWordsPerLine?: string;
    longTokenDurS?: string;
    subtitleFontsize?: string;
    subtitleMarginv?: string;
    subtitleY?: string;
    titleFontsize?: string;
    titleX?: string;
    titleY?: string;
  }) {
    return this.mergeVideoWithAudioAsyncWithRetry(
      videoUrl,
      audioUrl,
      textContent,
      {
        language,
        title,
        bgmUrl: bgmUrl || this.getMergeBgmUrl(),
        bgmVolume: bgmVolume || this.getMergeBgmVolume(),
        voiceVolume: voiceVolume || this.getMergeVoiceVolume(),
        maxWordsPerLine: maxWordsPerLine || this.getMergeMaxWordsPerLine(),
        longTokenDurS: longTokenDurS || this.getMergeLongTokenDurS(),
        subtitleFontsize: subtitleFontsize || this.getMergeSubtitleFontsize(),
        subtitleMarginv: subtitleMarginv || this.getMergeSubtitleMarginv(),
        titleFontsize: titleFontsize || this.getMergeTitleFontsize(),
        titleX: titleX || this.getMergeTitleX(),
        titleY: titleY || this.getMergeTitleY(),
      },
    );
  }

  /**
   * Fetch with retry mechanism
   * Retries up to maxRetries times with exponential backoff
   */
  private async fetchWithRetry(
    url: string,
    options?: RequestInit,
    maxRetries: number = 3,
    retryDelay: number = 1000,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[Comfly-API Fetch] Attempt ${attempt}/${maxRetries} for ${url}`,
        );
        const response = await fetch(url, options);

        // Return response even if not ok, let caller handle status codes
        if (response.ok || attempt === maxRetries) {
          return response;
        }

        // If response is not ok and we have retries left, throw to retry
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error: any) {
        lastError = error;
        console.error(
          `[Comfly-API Fetch] Attempt ${attempt}/${maxRetries} failed:`,
          error.message,
        );

        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = retryDelay * attempt; // Exponential backoff: 1s, 2s, 3s
          console.log(
            `[Comfly-API Fetch] Waiting ${waitTime}ms before retry...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `Fetch failed after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Generate Jesus video from user uploaded image
   */
  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const { taskId, mediaType, prompt, options } = params;

    if (mediaType !== AIMediaType.VIDEO) {
      throw new Error(`Unsupported media type: ${mediaType}`);
    }

    // Check if async mode is enabled params.async
    if (true) {
      console.log(
        "[Comfly-API] Async mode enabled, scheduling background processing for task:",
        taskId,
      );

      // Start background processing (fire and forget)
      this.processVideoInBackground(taskId, params).catch((error: any) => {
        console.error(
          "[Comfly-API] Background processing failed for task:",
          taskId,
          error,
        );
      });

      console.log(
        "[Comfly-API] Background processing scheduled for task:",
        taskId,
      );

      // Return immediately with pending status
      return {
        taskStatus: AITaskStatus.PENDING,
        taskId: taskId,
        taskInfo: {
          status: "processing",
          progress: {
            currentStep: ComflyTaskStep.PENDING,
            stepMessage: "Task queued for processing",
            progress: 0,
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }

    // Synchronous mode - process immediately
    return this.processVideoSync(taskId, params, true);
  }

  /**
   * Process video generation synchronously
   * @param taskId - Task ID
   * @param params - Generation parameters
   * @param updateDatabase - Whether to update database during processing
   */
  private async processVideoSync(
    taskId: string,
    params: AIGenerateParams,
    updateDatabase: boolean = true,
  ): Promise<AITaskResult> {
    const { prompt, options } = params;

    // Helper function to update progress in database
    const updateProgress = async (
      step: ComflyTaskStep,
      message: string,
      progressPercent: number,
    ) => {
      if (!updateDatabase) return;

      try {
        const { updateAITaskByTaskId } =
          await import("@/shared/models/ai_task");
        await updateAITaskByTaskId(taskId, {
          status: AITaskStatus.PROCESSING,
          taskInfo: JSON.stringify({
            progress: {
              currentStep: step,
              stepMessage: message,
              progress: progressPercent,
              startedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      } catch (error) {
        console.error("[Comfly-API] Failed to update progress:", error);
      }
    };

    try {
      const progress: ComflyTaskProgress = {
        currentStep: ComflyTaskStep.PENDING,
        stepMessage: "Starting Jesus video generation",
        progress: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Get image input
      const imageInput = options?.image_input;
      const hasImage =
        imageInput && Array.isArray(imageInput) && imageInput.length > 0;
      const imagePath = hasImage ? imageInput[0] : null;

      if (!imagePath) {
        throw new Error("Image input is required for Comfly-API provider");
      }

      // Step 1: Edit image with nano-banana
      progress.currentStep = ComflyTaskStep.EDITING_IMAGE;
      progress.stepMessage = "Editing image";
      progress.progress = 10;
      progress.updatedAt = new Date().toISOString();
      await updateProgress(
        progress.currentStep,
        progress.stepMessage,
        progress.progress,
      );

      // Read image file if it's a local path
      let imageFile: Buffer | undefined;
      let imageUrl: string | undefined;
      let originalInputImageUrl = imagePath;
      console.log("imagePath:" + imagePath);
      if (this.isHttpUrl(imagePath)) {
        // It's a URL
        imageUrl = imagePath;
      } else {
        // It's a local file path, read it
        const fs = await import("fs/promises");
        const path = await import("path");

        // Convert relative path to absolute path
        // If path starts with /, it's relative to public directory
        let fullPath = imagePath;
        if (imagePath.startsWith("/")) {
          // Remove leading slash and prepend public directory
          fullPath = path.join(process.cwd(), "public", imagePath.substring(1));
        }

        console.log("fullPath:" + fullPath);
        imageFile = await fs.readFile(fullPath);
      }

      const editedImageUrl = await this.editImageWithNanoBananaWithRetry(
        imageFile,
        imageUrl,
      );
      // const editedImageUrl =
      //   "https://webstatic.aiproxy.vip/output/20260305/86320/7e1ca71d-9107-49d3-a698-2ef554c4b761.png";
      console.log("生成图片成功 视频url为------->", editedImageUrl);
      // Step 2: Generate video with wanx2.1
      progress.currentStep = ComflyTaskStep.GENERATING_VIDEO;
      progress.stepMessage = "Generating video";
      progress.progress = 30;
      progress.updatedAt = new Date().toISOString();
      await updateProgress(
        progress.currentStep,
        progress.stepMessage,
        progress.progress,
      );
      const videoUrl = await this.pollVideoGenerationWithRetry(
        editedImageUrl,
        prompt,
      );
      console.log("生成视频成功 视频url为------->", videoUrl);
      // Step 3: Poll video generation status
      progress.currentStep = ComflyTaskStep.POLLING_VIDEO;
      progress.stepMessage = "Waiting for video generation to complete";
      progress.progress = 50;
      progress.updatedAt = new Date().toISOString();
      await updateProgress(
        progress.currentStep,
        progress.stepMessage,
        progress.progress,
      );

      // Step 4: Generate script text (if needed)
      let scriptText = options?.scriptText || prompt;
      let verseReference = options?.title || "";
      let verseText = "";
      let scriptResult: any = null;
      // options?.generateScript
      if (true) {
        progress.currentStep = ComflyTaskStep.GENERATING_SCRIPT;
        progress.stepMessage = "Generating script from user feelings";
        progress.progress = 70;
        progress.updatedAt = new Date().toISOString();
        await updateProgress(
          progress.currentStep,
          progress.stepMessage,
          progress.progress,
        );

        scriptResult = await this.generateScriptText(
          options?.userFeelings || prompt,
        );

        console.log("生成文案成功 文案内容为------->", scriptResult);
        scriptText = scriptResult.narration;
        verseReference = scriptResult.verse_reference;
        verseText = scriptResult.verse_text;
      }

      // Step 5: Generate audio
      progress.currentStep = ComflyTaskStep.GENERATING_AUDIO;
      progress.stepMessage = "Generating audio narration";
      progress.progress = 80;
      progress.updatedAt = new Date().toISOString();
      await updateProgress(
        progress.currentStep,
        progress.stepMessage,
        progress.progress,
      );

      const audioUrl = await this.generateAudioAsyncWithRetry(
        scriptText,
        options?.language || "en",
      );
      console.log("生成音频成功--------->", audioUrl);
      // Step 6: Merge video with audio and subtitles
      progress.currentStep = ComflyTaskStep.MERGING_VIDEO;
      progress.stepMessage = "Merging video with audio and subtitles";
      progress.progress = 90;
      progress.updatedAt = new Date().toISOString();
      await updateProgress(
        progress.currentStep,
        progress.stepMessage,
        progress.progress,
      );

      const finalVideoUrl = await this.mergeVideoWithAudioAsyncWithRetry(
        videoUrl,
        audioUrl,
        scriptText,
        {
          ...options,
          title: verseReference || options?.title,
        },
      );

      // Step 7: Upload to R2 (if customStorage is enabled)
      let uploadedVideoUrl = finalVideoUrl;
      let uploadedEditedImageUrl = editedImageUrl;
      let uploadedOriginalVideoUrl = videoUrl;
      let uploadedAudioUrl = audioUrl;
      let uploadedInputImageUrl = originalInputImageUrl;

      if (this.configs.customStorage) {
        progress.currentStep = ComflyTaskStep.UPLOADING_TO_R2;
        progress.stepMessage = "Uploading files to storage";
        progress.progress = 95;
        progress.updatedAt = new Date().toISOString();
        await updateProgress(
          progress.currentStep,
          progress.stepMessage,
          progress.progress,
        );

        try {
          const uploadResults = await this.uploadFilesToR2(
            taskId,
            finalVideoUrl,
            editedImageUrl,
            videoUrl,
            audioUrl,
            originalInputImageUrl,
          );
          uploadedVideoUrl = uploadResults.finalVideoUrl;
          uploadedEditedImageUrl = uploadResults.editedImageUrl;
          uploadedOriginalVideoUrl = uploadResults.originalVideoUrl;
          uploadedAudioUrl = uploadResults.audioUrl;
          uploadedInputImageUrl = uploadResults.inputImageUrl;
        } catch (uploadError: any) {
          console.warn(
            `[Comfly-API] R2 upload failed, using original URLs: ${uploadError.message}`,
          );
        }
      }

      // Completed
      progress.currentStep = ComflyTaskStep.COMPLETED;
      progress.stepMessage = "Video generation completed";
      progress.progress = 100;
      progress.updatedAt = new Date().toISOString();

      const result: AITaskResult = {
        taskStatus: AITaskStatus.SUCCESS,
        taskId,
        taskInfo: {
          videos: [
            {
              videoUrl: uploadedVideoUrl,
              thumbnailUrl: uploadedEditedImageUrl,
            },
          ],
          inputImageUrl: uploadedInputImageUrl,
          progress,
        },
        taskResult: {
          video_url: uploadedVideoUrl,
          edited_image_url: uploadedEditedImageUrl,
          audio_url: uploadedAudioUrl,
          original_video_url: uploadedOriginalVideoUrl,
          input_image_url: uploadedInputImageUrl,
          original_image_urls: uploadedInputImageUrl
            ? [uploadedInputImageUrl]
            : [],
          verse_reference: verseReference,
          verse_text: verseText,
          narration: scriptText,
          original_prompt: prompt,
          user_feeling: options?.userFeelings || prompt,
        },
      };

      // Update database with final result
      if (updateDatabase) {
        const { updateAITaskByTaskId } =
          await import("@/shared/models/ai_task");
        await updateAITaskByTaskId(taskId, {
          status: AITaskStatus.SUCCESS,
          taskInfo: JSON.stringify(result.taskInfo),
          taskResult: JSON.stringify(result.taskResult),
        });
        console.log("[Comfly-API] Task", taskId, "completed successfully");
      }

      // Send email notification to user
      try {
        const { findAITaskByTaskId } = await import("@/shared/models/ai_task");
        const task = await findAITaskByTaskId(taskId);
        if (task?.userId) {
          // Send in-app notification
          try {
            const { notifyVideoComplete } =
              await import("@/shared/services/notification");
            await notifyVideoComplete({
              userId: task.userId,
              taskId,
              videoUrl: uploadedVideoUrl,
            });
          } catch (notifyError) {
            console.error(
              "[Comfly-API] Failed to send in-app notification:",
              notifyError,
            );
          }

          const [userData] = await db()
            .select({ name: user.name, email: user.email })
            .from(user)
            .where(eq(user.id, task.userId));

          if (userData?.email) {
            const emailService = await getEmailService();

            await emailService.sendEmail({
              to: userData.email,
              subject: "Your Bible Video is Ready! 🕊️",
              html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Your Video is Ready!</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f5; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
      .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
      .header .dove { font-size: 48px; margin-bottom: 10px; }
      .content { padding: 40px 30px; }
      .video-section { text-align: center; margin: 30px 0; }
      .video-link { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; }
      .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
      .footer p { margin: 0; color: #6b7280; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="dove">🕊️</div>
        <h1>Your Blessing is Ready!</h1>
      </div>
      <div class="content">
        <p>Hello ${userData.name || "there"},</p>
        <p>Great news! Your personalized Bible verse video has been successfully generated. 🎉</p>
        <div class="video-section">
          <a href="${uploadedVideoUrl}" class="video-link" target="_blank">Watch Your Video 📺</a>
        </div>
        <p>Feel free to share this blessing with your loved ones!</p>
      </div>
      <div class="footer">
        <p>🙏 May God's peace be with you always</p>
        <p style="margin-top: 10px;"><a href="https://fearnotforiamwithyou.com" style="color: #667eea; text-decoration: none;">fearnotforiamwithyou.com</a></p>
      </div>
    </div>
  </body>
</html>
              `.trim(),
              text: `Your Bible Video is Ready! 🕊️

Hello ${userData.name || "there"},

Great news! Your personalized Bible verse video has been successfully generated.

Watch your video here: ${uploadedVideoUrl}

Feel free to share this blessing with your loved ones!

🙏 May God's peace be with you always
fearnotforiamwithyou.com`.trim(),
            });
            console.log(`[Comfly-API] Email sent to ${userData.email}`);
          }
        }
      } catch (emailError) {
        console.error("[Comfly-API] Failed to send email:", emailError);
      }

      return result;
    } catch (error: any) {
      console.error("[Comfly-API] Generation failed:", error);

      // Update database with failure status if enabled
      if (updateDatabase) {
        try {
          const { updateAITaskByTaskId, findAITaskByTaskId } =
            await import("@/shared/models/ai_task");
          const task = await findAITaskByTaskId(taskId);
          const creditId = task?.creditId || null;

          await updateAITaskByTaskId(taskId, {
            status: AITaskStatus.FAILED,
            creditId: creditId,
            taskResult: JSON.stringify({
              error: error.message,
              stack: error.stack,
            }),
          });
          console.log(
            "[Comfly-API] Task",
            taskId,
            "status updated to FAILED with credit refund",
          );
        } catch (dbError) {
          console.error("[Comfly-API] Failed to update database:", dbError);
        }
      }

      return {
        taskStatus: AITaskStatus.FAILED,
        taskId,
        taskInfo: {
          errorMessage: error.message,
          progress: {
            currentStep: ComflyTaskStep.FAILED,
            stepMessage: `Failed: ${error.message}`,
            progress: 0,
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    }
  }

  /**
   * Process video generation in background
   * Calls processVideoSync with database update enabled
   */
  private async processVideoInBackground(
    taskId: string,
    params: AIGenerateParams,
  ): Promise<void> {
    try {
      console.log(
        "[Comfly-API Background] Starting background processing for task:",
        taskId,
      );

      // Execute video generation with database updates enabled
      await this.processVideoSync(taskId, params, true);

      console.log(
        "[Comfly-API Background] ✓ Task",
        taskId,
        "completed successfully",
      );
    } catch (error: any) {
      console.error("[Comfly-API Background] ✗ Task", taskId, "failed:", error);
      // Error is already handled in processVideoSync
    }
  }

  /**
   * Query task status (for polling)
   */
  async query({ taskId }: { taskId: string }): Promise<AITaskResult> {
    // Query from database instead of wanx API
    const { findAITaskByTaskId } = await import("@/shared/models/ai_task");

    // Query task from database using provider's taskId
    const task = await findAITaskByTaskId(taskId);

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Parse JSON fields
    const taskInfo = task.taskInfo ? JSON.parse(task.taskInfo) : {};
    const taskResult = task.taskResult ? JSON.parse(task.taskResult) : {};

    // Map database status to AITaskStatus
    let taskStatus: AITaskStatus;
    switch (task.status.toLowerCase()) {
      case "pending":
        taskStatus = AITaskStatus.PENDING;
        break;
      case "processing":
      case "running":
        taskStatus = AITaskStatus.PROCESSING;
        break;
      case "success":
      case "completed":
      case "succeeded":
        taskStatus = AITaskStatus.SUCCESS;
        break;
      case "failed":
      case "error":
        taskStatus = AITaskStatus.FAILED;
        break;
      case "canceled":
      case "cancelled":
        taskStatus = AITaskStatus.CANCELED;
        break;
      default:
        taskStatus = AITaskStatus.PENDING;
    }

    return {
      taskId: task.taskId || taskId,
      taskStatus,
      taskInfo,
      taskResult,
    };
  }

  /**
   * Edit image with nano-banana model
   */
  private async editImageWithNanoBanana(
    imageFile?: Buffer | string,
    imageUrl?: string,
  ): Promise<string> {
    const prompt = this.getImageEditPrompt();

    let imageBlob: Blob;

    if (imageFile) {
      // Convert Buffer to Blob
      const buffer = Buffer.isBuffer(imageFile)
        ? imageFile
        : Buffer.from(imageFile);
      imageBlob = new Blob([new Uint8Array(buffer)], { type: "image/jpeg" });
    } else if (imageUrl) {
      // Download image from URL
      const imageResponse = await this.fetchWithRetry(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download image: ${imageResponse.statusText}`,
        );
      }
      imageBlob = await imageResponse.blob();
    } else {
      throw new Error("Either imageFile or imageUrl must be provided");
    }

    const request = buildComflyImageEditRequest({
      baseUrl: this.imageEditBaseUrl,
      apiKey: this.configs.nanoBananaApiKey,
      prompt,
      image: imageBlob,
    });

    const response = await this.fetchWithRetry(request.url, request.init);

    if (!response.ok) {
      throw new Error(`Nano-banana edit failed: ${response.statusText}`);
    }

    const data: NanoBananaResponse = await response.json();
    console.log("NanoBananaResponse:", JSON.stringify(data, null, 2));
    if (!data.data || data.data.length === 0) {
      throw new Error("No image returned from nano-banana");
    }

    return data.data[0].url;
  }

  /**
   * Edit image with NanoBanana with retry logic
   */
  private async editImageWithNanoBananaWithRetry(
    imageFile?: Buffer | string,
    imageUrl?: string,
    maxRetries: number = 3,
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[Comfly-API] NanoBanana image edit attempt ${attempt}/${maxRetries}`,
        );

        const editedImageUrl = await this.editImageWithNanoBanana(
          imageFile,
          imageUrl,
        );

        console.log(
          `[Comfly-API] NanoBanana image edit succeeded on attempt ${attempt}`,
        );
        return editedImageUrl;
      } catch (error: any) {
        lastError = error;
        console.error(
          `[Comfly-API] NanoBanana image edit attempt ${attempt}/${maxRetries} failed:`,
          error.message,
        );

        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = 5000 * attempt; // 5s, 10s, 15s
          console.log(`[Comfly-API] Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    // All retries exhausted
    throw new Error(
      `NanoBanana image edit failed after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Generate video with wanx2.1-i2v-turbo model
   */
  private async generateVideoWithWanx(
    imageUrl: string,
    userPrompt?: string,
  ): Promise<string> {
    const prompt = userPrompt || this.getDefaultVideoPrompt();
    const request = buildComflyVideoGenerationRequest({
      baseUrl: this.videoGenBaseUrl,
      apiKey: this.configs.wanxApiKey,
      prompt,
      imageUrl,
      model: "wanx2.1-i2v-turbo",
    });

    const response = await this.fetchWithRetry(request.url, request.init);

    if (!response.ok) {
      throw new Error(`Wanx video generation failed: ${response.statusText}`);
    }

    const data: WanxVideoResponse = await response.json();
    return data.task_id;
  }

  /**
   * Poll video generation status until completed (with retry on failure)
   */
  private async pollVideoGeneration(
    taskId: string,
    maxAttempts: number = 300,
    intervalMs: number = 20000,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Query video generation status via API
        const response = await this.fetchWithRetry(
          `${this.videoGenBaseUrl}/v2/videos/generations/${taskId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.configs.wanxApiKey}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Query video status failed: ${response.statusText}`);
        }

        const data: WanxVideoQueryResponse = await response.json();
        console.log("WanxVideoQueryResponse:", JSON.stringify(data, null, 2));

        if (data.status === "SUCCESS") {
          const videoUrl = data.data?.output;
          if (!videoUrl) {
            throw new Error("Video URL not found in response");
          }
          return videoUrl;
        }

        if (data.status === "FAILED") {
          throw new Error(data.fail_reason || "Video generation failed");
        }

        // Status is PENDING or PROCESSING, continue polling
      } catch (error: any) {
        console.error(
          `[pollVideoGeneration] Attempt ${i + 1}/${maxAttempts} failed:`,
          error.message,
        );

        // If this is the last attempt, throw the error
        if (i === maxAttempts - 1) {
          throw error;
        }

        // Otherwise, continue to next poll attempt
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error("Video generation timeout");
  }

  /**
   * Poll video generation with retry and model fallback
   */
  private async pollVideoGenerationWithRetry(
    imageUrl: string,
    prompt?: string,
    maxRetries: number = 3,
  ): Promise<string> {
    // Fallback models chain
    const fallbackModels = this.configs.fallbackVideoModels || [
      "wanx2.1-i2v-turbo",
      // "wanx2.0-i2v",
    ];

    let lastError: Error | null = null;

    // Try each model
    for (const model of fallbackModels) {
      console.log(`[Comfly-API] Trying video model: ${model}`);

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `[Comfly-API] Video generation with ${model}, attempt ${attempt}/${maxRetries}`,
          );

          // Submit video generation task with specific model
          const taskId = await this.generateVideoWithWanxModel(
            imageUrl,
            prompt,
            model,
          );
          // const taskId = "0b47c546-c46a-40c0-92fa-a733da82fea9";
          // Poll until completed
          const videoUrl = await this.pollVideoGeneration(taskId);

          console.log(
            `[Comfly-API] Video generation succeeded with ${model} on attempt ${attempt}`,
          );
          return videoUrl;
        } catch (error: any) {
          lastError = error;
          console.error(
            `[Comfly-API] Video generation with ${model} attempt ${attempt}/${maxRetries} failed:`,
            error.message,
          );

          if (attempt < maxRetries) {
            const waitTime = 5000 * attempt; // 5s, 10s, 15s
            console.log(`[Comfly-API] Waiting ${waitTime}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      }

      // If not the last model, log fallback
      if (model !== fallbackModels[fallbackModels.length - 1]) {
        console.log(
          `[Comfly-API] Model ${model} failed after ${maxRetries} attempts, falling back to next model...`,
        );
      }
    }

    throw new Error(
      `Video generation failed after trying all models (${fallbackModels.join(", ")}). Last error: ${lastError?.message}`,
    );
  }

  /**
   * Generate video with specific model
   */
  private async generateVideoWithWanxModel(
    imageUrl: string,
    userPrompt?: string,
    model: string = "wanx2.1-i2v-turbo",
  ): Promise<string> {
    const prompt = userPrompt || this.getDefaultVideoPrompt();
    const payload = buildComflyVideoGenerationPayload({
      prompt,
      imageUrl,
      model,
    });
    const request = buildComflyVideoGenerationRequest({
      baseUrl: this.videoGenBaseUrl,
      apiKey: this.configs.wanxApiKey,
      prompt: payload.prompt,
      imageUrl,
      model,
    });

    const response = await this.fetchWithRetry(request.url, request.init);

    if (!response.ok) {
      throw new Error(`Wanx video generation failed: ${response.statusText}`);
    }

    const data: WanxVideoResponse = await response.json();
    console.log("WanxVideoResponse:", JSON.stringify(data, null, 2));
    return data.task_id;
  }

  /**
   * Generate script text from user feelings (with model fallback)
   */
  private async generateScriptText(
    userFeelings: string,
    overrideModel?: string,
  ): Promise<ComflyScriptGenerationResult> {
    const systemPrompt = this.getScriptSystemPrompt();

    // Fallback models chain
    const fallbackModels = overrideModel
      ? [overrideModel]
      : ["gpt-4o-2024-08-06"];

    let lastError: Error | null = null;

    // Try each model
    for (const model of fallbackModels) {
      try {
        console.log(`[Comfly-API] Trying script generation model: ${model}`);
        const request = buildComflyScriptGenerationRequest({
          baseUrl: this.imageEditBaseUrl,
          apiKey: this.configs.nanoBananaApiKey,
          systemPrompt,
          userFeelings,
          model,
        });
        const resp = await this.fetchWithRetry(request.url, request.init);

        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(
            `Script generation failed: ${resp.status}, ${errorText}`,
          );
        }

        const data = await resp.json();
        console.log("generateScriptText: " + JSON.stringify(data, null, 2));
        const choice = data.choices?.[0];

        if (!choice) {
          throw new Error("No choices returned from script generation");
        }

        if (choice.finish_reason !== "stop") {
          throw new Error(`Generation aborted: ${choice.finish_reason}`);
        }

        const responseText = choice.message?.content || "";

        if (!responseText) {
          throw new Error("Script generation returned empty content");
        }

        const result = JSON.parse(responseText);
        console.log(`[Comfly-API] Script generation succeeded with ${model}`);
        return {
          verse_reference: result.verse_reference,
          verse_text: result.verse_text,
          narration: result.narration,
        };
      } catch (error: any) {
        lastError = error;
        console.error(
          `[Comfly-API] Script generation with ${model} failed:`,
          error.message,
        );

        // If not the last model, log fallback
        if (model !== fallbackModels[fallbackModels.length - 1]) {
          console.log(
            `[Comfly-API] Model ${model} failed, falling back to next model...`,
          );
        }
      }
    }

    // All models failed, return fallback
    console.error(
      `[Comfly-API] All script generation models failed, using fallback`,
    );
    return {
      verse_reference: "Deuteronomy 31:8",
      verse_text:
        '"The LORD himself goes before you and will be with you; he will never leave you nor forsake you. Do not be afraid; do not be discouraged."',
      narration:
        'Even in moments of loneliness, you are not truly alone... The Bible reminds us in Deuteronomy 31:8, "The LORD himself goes before you and will be with you; he will never leave you nor forsake you. Do not be afraid; do not be discouraged."... Let this promise bring you comfort and peace, knowing that His presence surrounds you always.',
    };
  }

  /**
   * Generate audio narration using TTS
   */
  private async generateAudio(
    text: string,
    language: string = "en",
    speed: number = 1,
    voice: string = this.getTTSVoice(),
  ): Promise<string> {
    const request = buildComflyAudioGenerationRequest({
      baseUrl: this.ttsBaseUrl,
      text,
      language,
      speed,
      voice,
      model: "default",
    });

    const response = await this.fetchWithRetry(`${this.ttsBaseUrl}/tts`, {
      method: "POST",
      headers: request.init.headers,
      body: request.init.body,
    });

    if (!response.ok) {
      throw new Error(`TTS generation failed: ${response.statusText}`);
    }

    const data: TTSResponse = await response.json();

    if (data.code !== 0) {
      throw new Error(`TTS failed: ${data.msg}`);
    }

    return data.url;
  }

  /**
   * Generate audio narration using async TTS (recommended)
   */
  private async generateAudioAsync(
    text: string,
    language: string = "en",
    speed: number = 1,
    voice: string = this.getTTSVoice(),
  ): Promise<string> {
    const request = buildComflyAudioGenerationRequest({
      baseUrl: this.ttsBaseUrl,
      text,
      language,
      speed,
      voice,
      model: "default",
    });

    const submitResponse = await this.fetchWithRetry(request.url, request.init);

    if (!submitResponse.ok) {
      throw new Error(`TTS async submit failed: ${submitResponse.statusText}`);
    }

    const submitData: TTSAsyncResponse = await submitResponse.json();
    console.log("submitData:", JSON.stringify(submitData, null, 2));
    const taskId = submitData.task_id;

    console.log(`[Comfly-API] TTS task submitted: ${taskId}`);

    // Step 2: Poll task status
    return await this.pollTTSTaskStatus(taskId);
  }

  /**
   * Poll TTS task status until completed
   */
  private async pollTTSTaskStatus(
    taskId: string,
    maxAttempts: number = 60,
    intervalMs: number = 3000,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const statusResponse = await this.fetchWithRetry(
        `${this.ttsBaseUrl}/task_status/${taskId}`,
      );

      if (!statusResponse.ok) {
        throw new Error(
          `TTS status query failed: ${statusResponse.statusText}`,
        );
      }

      const statusData: TTSTaskStatusResponse = await statusResponse.json();

      console.log(
        `[Comfly-API] TTS task ${taskId} status: ${statusData.status} (attempt ${i + 1}/${maxAttempts})`,
      );

      if (statusData.status === "completed") {
        if (!statusData.result || statusData.result.code !== 0) {
          throw new Error(
            `TTS completed but failed: ${statusData.result?.msg || "Unknown error"}`,
          );
        }
        console.log(`[Comfly-API] TTS completed: ${statusData.result.url}`);
        return statusData.result.url;
      }

      if (statusData.status === "failed") {
        throw new Error(
          `TTS task failed: ${statusData.error || "Unknown error"}`,
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`TTS task timeout after ${maxAttempts} attempts`);
  }

  /**
   * Generate audio with retry and model fallback
   */
  private async generateAudioAsyncWithRetry(
    text: string,
    language: string = "en",
    speed: number = this.getTTSSpeed(),
    maxRetries: number = 3,
    voice: string = this.getTTSVoice(),
  ): Promise<string> {
    // Fallback models chain
    const fallbackModels = this.configs.fallbackTTSModels || ["default"];

    let lastError: Error | null = null;

    // Try each model
    for (const model of fallbackModels) {
      console.log(`[Comfly-API] Trying TTS model: ${model}`);

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `[Comfly-API] TTS generation with ${model}, attempt ${attempt}/${maxRetries}`,
          );

          const request = buildComflyAudioGenerationRequest({
            baseUrl: this.ttsBaseUrl,
            text,
            language,
            speed,
            voice,
            model,
          });

          const submitResponse = await this.fetchWithRetry(
            request.url,
            request.init,
          );

          if (!submitResponse.ok) {
            throw new Error(
              `TTS async submit failed: ${submitResponse.statusText}`,
            );
          }

          const submitData: TTSAsyncResponse = await submitResponse.json();
          const taskId = submitData.task_id;

          console.log(`[Comfly-API] TTS task submitted: ${taskId}`);

          // Poll until completed
          const audioUrl = await this.pollTTSTaskStatus(taskId);

          console.log(
            `[Comfly-API] TTS generation succeeded with ${model} on attempt ${attempt}`,
          );
          return audioUrl;
        } catch (error: any) {
          lastError = error;
          console.error(
            `[Comfly-API] TTS generation with ${model} attempt ${attempt}/${maxRetries} failed:`,
            error.message,
          );

          if (attempt < maxRetries) {
            const waitTime = 3000 * attempt; // 3s, 6s, 9s
            console.log(`[Comfly-API] Waiting ${waitTime}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      }

      // If not the last model, log fallback
      if (model !== fallbackModels[fallbackModels.length - 1]) {
        console.log(
          `[Comfly-API] Model ${model} failed after ${maxRetries} attempts, falling back to next model...`,
        );
      }
    }

    throw new Error(
      `TTS generation failed after trying all models (${fallbackModels.join(", ")}). Last error: ${lastError?.message}`,
    );
  }

  /**
   * Merge video with audio and subtitles
   */
  private async mergeVideoWithAudio(
    videoUrl: string,
    audioUrl: string,
    textContent: string,
    options?: any,
  ): Promise<string> {
    // Download video and audio files
    const videoResponse = await this.fetchWithRetry(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }
    const videoBlob = await videoResponse.blob();

    const audioResponse = await this.fetchWithRetry(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }
    const audioBlob = await audioResponse.blob();

    const formData = new FormData();
    formData.append("video", videoBlob, "video.mp4");
    formData.append("audio", audioBlob, "audio.wav");
    formData.append("text_content", textContent);
    formData.append("language", options?.language || "en");
    formData.append(
      "bgm_volume",
      options?.bgmVolume?.toString() || this.getMergeBgmVolume(),
    );
    formData.append(
      "voice_volume",
      options?.voiceVolume?.toString() || this.getMergeVoiceVolume(),
    );
    formData.append(
      "max_words_per_line",
      options?.maxWordsPerLine?.toString() || this.getMergeMaxWordsPerLine(),
    );
    formData.append(
      "long_token_dur_s",
      options?.longTokenDurS?.toString() || this.getMergeLongTokenDurS(),
    );
    formData.append(
      "subtitle_fontsize",
      options?.subtitleFontsize?.toString() || this.getMergeSubtitleFontsize(),
    );
    formData.append(
      "subtitle_marginv",
      options?.subtitleMarginv?.toString() || this.getMergeSubtitleMarginv(),
    );
    formData.append(
      "subtitle_y",
      options?.subtitleY?.toString() || this.getMergeSubtitleY(),
    );
    formData.append(
      "title_fontsize",
      options?.titleFontsize?.toString() || this.getMergeTitleFontsize(),
    );
    formData.append(
      "title_x",
      options?.titleX?.toString() || this.getMergeTitleX(),
    );
    formData.append(
      "title_y",
      options?.titleY?.toString() || this.getMergeTitleY(),
    );
    formData.append("title", options?.title || "");
    formData.append("title_start", options?.titleStart?.toString() || "0");
    formData.append("title_end", options?.titleEnd?.toString() || "1000");

    // Add BGM if provided
    if (options?.bgmFile) {
      const bgmBlob = new Blob([options.bgmFile], { type: "audio/mpeg" });
      formData.append("bgm", bgmBlob, "music.mp3");
    }

    const response = await this.fetchWithRetry(
      `${this.videoProcessBaseUrl}/process_video`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(`Video merge failed: ${response.statusText}`);
    }

    const data: VideoProcessResponse = await response.json();

    if (data.code !== 0) {
      throw new Error(`Video merge failed: ${data.msg}`);
    }

    return data.url;
  }

  /**
   * Merge video with audio and subtitles (async version, recommended)
   */
  private async mergeVideoWithAudioAsync(
    videoUrl: string,
    audioUrl: string,
    textContent: string,
    options?: any,
  ): Promise<string> {
    const request = buildComflyVideoMergeRequest({
      baseUrl: this.videoProcessBaseUrl,
      videoUrl,
      audioUrl,
      textContent,
      language: options?.language || "en",
      title: options?.title || "",
      bgmUrl: options?.bgmUrl || this.getMergeBgmUrl(),
      bgmVolume: options?.bgmVolume?.toString() || this.getMergeBgmVolume(),
      voiceVolume:
        options?.voiceVolume?.toString() || this.getMergeVoiceVolume(),
      maxWordsPerLine:
        options?.maxWordsPerLine?.toString() || this.getMergeMaxWordsPerLine(),
      longTokenDurS:
        options?.longTokenDurS?.toString() || this.getMergeLongTokenDurS(),
      subtitleFontsize:
        options?.subtitleFontsize?.toString() ||
        this.getMergeSubtitleFontsize(),
      subtitleMarginv:
        options?.subtitleMarginv?.toString() || this.getMergeSubtitleMarginv(),
      subtitleY: options?.subtitleY?.toString() || this.getMergeSubtitleY(),
      titleFontsize:
        options?.titleFontsize?.toString() || this.getMergeTitleFontsize(),
      titleX: options?.titleX?.toString() || this.getMergeTitleX(),
      titleY: options?.titleY?.toString() || this.getMergeTitleY(),
      titleStart: options?.titleStart?.toString() || "0",
      titleEnd: options?.titleEnd?.toString() || "1000",
    });

    const requestFormData = request.init.body as FormData;
    requestFormData.append("loop_video", options?.loopVideo?.toString() || "1");

    const submitResponse = await this.fetchWithRetry(request.url, {
      ...request.init,
      body: requestFormData,
    });

    if (!submitResponse.ok) {
      throw new Error(
        `Video merge async submit failed: ${submitResponse.statusText}`,
      );
    }

    const submitData: VideoProcessAsyncResponse = await submitResponse.json();
    console.log("submitData:", JSON.stringify(submitData, null, 2));
    const taskId = submitData.task_id;

    console.log(`[Comfly-API] Video processing task submitted: ${taskId}`);

    // Step 2: Poll task status
    return await this.pollVideoProcessTaskStatus(taskId);
  }

  /**
   * Poll video processing task status until completed
   */
  private async pollVideoProcessTaskStatus(
    taskId: string,
    maxAttempts: number = 120,
    intervalMs: number = 5000,
  ): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      const statusResponse = await this.fetchWithRetry(
        `${this.videoProcessBaseUrl}/task_status/${taskId}`,
      );

      if (!statusResponse.ok) {
        throw new Error(
          `Video process status query failed: ${statusResponse.statusText}`,
        );
      }

      const statusData: VideoProcessTaskStatusResponse =
        await statusResponse.json();

      console.log(
        `[Comfly-API] Video process task ${taskId} status: ${statusData.status} (attempt ${i + 1}/${maxAttempts})`,
      );

      if (statusData.status === "completed") {
        if (!statusData.result || statusData.result.code !== 0) {
          throw new Error(
            `Video processing completed but failed: ${statusData.result?.msg || "Unknown error"}`,
          );
        }
        console.log(
          `[Comfly-API] Video processing completed: ${statusData.result.url}`,
        );
        return statusData.result.url;
      }

      if (statusData.status === "failed") {
        throw new Error(
          `Video processing task failed: ${statusData.error || "Unknown error"}`,
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `Video processing task timeout after ${maxAttempts} attempts`,
    );
  }

  /**
   * Merge video with audio with retry on failure (wrapper)
   */
  private async mergeVideoWithAudioAsyncWithRetry(
    videoUrl: string,
    audioUrl: string,
    textContent: string,
    options?: any,
    maxRetries: number = 3,
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[Comfly-API] Video merge attempt ${attempt}/${maxRetries}`,
        );

        const request = buildComflyVideoMergeRequest({
          baseUrl: this.videoProcessBaseUrl,
          videoUrl,
          audioUrl,
          textContent,
          language: options?.language || "en",
          title: options?.title || "",
          bgmUrl: options?.bgmUrl || this.getMergeBgmUrl(),
          bgmVolume: options?.bgmVolume?.toString() || this.getMergeBgmVolume(),
          voiceVolume:
            options?.voiceVolume?.toString() || this.getMergeVoiceVolume(),
          maxWordsPerLine:
            options?.maxWordsPerLine?.toString() ||
            this.getMergeMaxWordsPerLine(),
          longTokenDurS:
            options?.longTokenDurS?.toString() || this.getMergeLongTokenDurS(),
          subtitleFontsize:
            options?.subtitleFontsize?.toString() ||
            this.getMergeSubtitleFontsize(),
          subtitleMarginv:
            options?.subtitleMarginv?.toString() ||
            this.getMergeSubtitleMarginv(),
          subtitleY: options?.subtitleY?.toString() || this.getMergeSubtitleY(),
          titleFontsize:
            options?.titleFontsize?.toString() || this.getMergeTitleFontsize(),
          titleX: options?.titleX?.toString() || this.getMergeTitleX(),
          titleY: options?.titleY?.toString() || this.getMergeTitleY(),
          titleStart: options?.titleStart?.toString() || "0",
          titleEnd: options?.titleEnd?.toString() || "1000",
        });

        const submitResponse = await this.fetchWithRetry(
          request.url,
          request.init,
        );

        if (!submitResponse.ok) {
          throw new Error(
            `Video merge async submit failed: ${submitResponse.statusText}`,
          );
        }

        const submitData: VideoProcessAsyncResponse =
          await submitResponse.json();
        console.log("submitData:", JSON.stringify(submitData, null, 2));
        const taskId = submitData.task_id;

        console.log(`[Comfly-API] Video processing task submitted: ${taskId}`);

        // Poll until completed
        const finalVideoUrl = await this.pollVideoProcessTaskStatus(taskId);

        console.log(`[Comfly-API] Video merge succeeded on attempt ${attempt}`);
        return finalVideoUrl;
      } catch (error: any) {
        lastError = error;
        console.error(
          `[Comfly-API] Video merge attempt ${attempt}/${maxRetries} failed:`,
          error.message,
        );

        if (attempt < maxRetries) {
          const waitTime = 5000 * attempt; // 5s, 10s, 15s
          console.log(`[Comfly-API] Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(
      `Video merge failed after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Get R2 storage key for a file
   */
  private getR2Key(taskId: string, filename: string): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const dateStr = `${year}${month}${day}`;
    return `uploads/video/${dateStr}/${taskId}/${filename}`;
  }

  /**
   * Upload files to R2 storage
   */
  private async uploadFilesToR2(
    taskId: string,
    finalVideoUrl: string,
    editedImageUrl: string,
    originalVideoUrl: string,
    audioUrl: string,
    inputImageSource?: string,
  ): Promise<{
    finalVideoUrl: string;
    editedImageUrl: string;
    originalVideoUrl: string;
    audioUrl: string;
    inputImageUrl: string;
  }> {
    console.log(`[Comfly-API] Uploading files to R2 for task ${taskId}`);

    const { getStorageService } = await import("@/shared/services/storage");
    const storageService = await getStorageService();

    let uploadedInputImageUrl = inputImageSource || "";
    if (inputImageSource) {
      try {
        const inputImageAsset =
          await this.loadInputImageAsset(inputImageSource);
        const inputImageKey = this.getR2Key(
          taskId,
          `input_image.${inputImageAsset.extension}`,
        );
        const inputImageUploadResult = await storageService.uploadFile({
          body: inputImageAsset.buffer,
          key: inputImageKey,
          contentType: inputImageAsset.contentType,
          bucket: this.configs.r2_bucket_name,
        });
        if (inputImageUploadResult.success && inputImageUploadResult.url) {
          uploadedInputImageUrl = replaceR2Url(inputImageUploadResult.url);
          console.log(
            `[Comfly-API] Input image uploaded to R2: ${uploadedInputImageUrl}`,
          );
        }
      } catch (error: any) {
        console.warn(
          `[Comfly-API] Failed to upload input image: ${error.message}`,
        );
      }
    }

    // Upload final video (with subtitles)
    let uploadedFinalVideoUrl = finalVideoUrl;
    try {
      const videoResponse = await this.fetchWithRetry(finalVideoUrl);
      if (videoResponse.ok) {
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const videoKey = this.getR2Key(taskId, "final_video.mp4");
        const videoUploadResult = await storageService.uploadFile({
          body: videoBuffer,
          key: videoKey,
          contentType: "video/mp4",
          bucket: this.configs.r2_bucket_name,
        });
        if (videoUploadResult.success && videoUploadResult.url) {
          uploadedFinalVideoUrl = replaceR2Url(videoUploadResult.url);
          console.log(
            `[Comfly-API] Final video uploaded to R2: ${uploadedFinalVideoUrl}`,
          );
        }
      }
    } catch (error: any) {
      console.warn(
        `[Comfly-API] Failed to upload final video: ${error.message}`,
      );
    }

    // Upload edited image (from NanoBanana)
    let uploadedEditedImageUrl = editedImageUrl;
    try {
      const imageResponse = await this.fetchWithRetry(editedImageUrl);
      if (imageResponse.ok) {
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const imageKey = this.getR2Key(taskId, "edited_image.png");
        const imageUploadResult = await storageService.uploadFile({
          body: imageBuffer,
          key: imageKey,
          contentType: "image/png",
          bucket: this.configs.r2_bucket_name,
        });
        if (imageUploadResult.success && imageUploadResult.url) {
          uploadedEditedImageUrl = replaceR2Url(imageUploadResult.url);
          console.log(
            `[Comfly-API] Edited image uploaded to R2: ${uploadedEditedImageUrl}`,
          );
        }
      }
    } catch (error: any) {
      console.warn(
        `[Comfly-API] Failed to upload edited image: ${error.message}`,
      );
    }

    // Upload original video (from Wanx2.1, without subtitles)
    let uploadedOriginalVideoUrl = originalVideoUrl;
    try {
      const originalVideoResponse = await this.fetchWithRetry(originalVideoUrl);
      if (originalVideoResponse.ok) {
        const originalVideoBuffer = Buffer.from(
          await originalVideoResponse.arrayBuffer(),
        );
        const originalVideoKey = this.getR2Key(taskId, "original_video.mp4");
        const originalVideoUploadResult = await storageService.uploadFile({
          body: originalVideoBuffer,
          key: originalVideoKey,
          contentType: "video/mp4",
          bucket: this.configs.r2_bucket_name,
        });
        if (
          originalVideoUploadResult.success &&
          originalVideoUploadResult.url
        ) {
          uploadedOriginalVideoUrl = replaceR2Url(
            originalVideoUploadResult.url,
          );
          console.log(
            `[Comfly-API] Original video uploaded to R2: ${uploadedOriginalVideoUrl}`,
          );
        }
      }
    } catch (error: any) {
      console.warn(
        `[Comfly-API] Failed to upload original video: ${error.message}`,
      );
    }

    // Upload audio
    let uploadedAudioUrl = audioUrl;
    try {
      const audioResponse = await this.fetchWithRetry(audioUrl);
      if (audioResponse.ok) {
        const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        const audioKey = this.getR2Key(taskId, "audio.wav");
        const audioUploadResult = await storageService.uploadFile({
          body: audioBuffer,
          key: audioKey,
          contentType: "audio/wav",
          bucket: this.configs.r2_bucket_name,
        });
        if (audioUploadResult.success && audioUploadResult.url) {
          uploadedAudioUrl = replaceR2Url(audioUploadResult.url);
          console.log(`[Comfly-API] Audio uploaded to R2: ${uploadedAudioUrl}`);
        }
      }
    } catch (error: any) {
      console.warn(`[Comfly-API] Failed to upload audio: ${error.message}`);
    }

    return {
      finalVideoUrl: uploadedFinalVideoUrl,
      editedImageUrl: uploadedEditedImageUrl,
      originalVideoUrl: uploadedOriginalVideoUrl,
      audioUrl: uploadedAudioUrl,
      inputImageUrl: uploadedInputImageUrl,
    };
  }
}
