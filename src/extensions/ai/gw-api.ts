import { replaceR2Url } from "@/shared/lib/url";
import { addTextToImage } from "@/shared/lib/image-text";
import sharp from "sharp";
import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
} from "./types";
import { getEmailService } from "@/shared/services/email";
import { db } from "@/core/db";
import { eq } from "drizzle-orm";
import { user } from "@/config/db/schema";
import { envConfigs } from "@/config";
import { jsonrepair } from "jsonrepair";

/**
 * GW API configs for Scripture Picture provider
 */
export interface GWAPIConfigs extends AIConfigs {
  apiKey: string;
  customStorage?: boolean;
  baseUrl?: string;
  visionModel?: string;
  imageModel?: string;
  ttsModel?: string;
  visionApiUrl?: string;
  imageApiUrl?: string;
  ttsApiUrl?: string;
}

/**
 * GW Task Step enum - defines each step in the video generation workflow
 */
export enum GWTaskStep {
  PENDING = "pending",
  ANALYZING = "analyzing",
  GENERATING_IMAGES = "generating_images",
  SAVING_ORIGINAL_IMAGES = "saving_original_images",
  ADDING_TEXT_OVERLAY = "adding_text_overlay",
  GENERATING_AUDIO = "generating_audio",
  MERGING_VIDEO = "merging_video",
  UPLOADING_TO_R2 = "uploading_to_r2",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * GW Task Progress info stored in taskInfo
 */
export interface GWTaskProgress {
  currentStep: GWTaskStep;
  stepMessage: string;
  progress: number; // 0-100
  startedAt: string;
  updatedAt: string;
}

/**
 * Scene in the 3-Act narrative
 */
interface SceneData {
  act: number;
  voiceover_text: string;
  camera_motion: string;
}

/**
 * Image-to-Text response format (3-Act structure)
 */
interface ImageToTextResponse {
  project_title: string;
  background_music_mood: string;
  scenes: SceneData[];
  verse_reference: string;
  metadata: {
    estimated_duration: string;
  };
}

/**
 * GW API Scripture Picture Provider
 * Workflow: Image+Text -> Analysis -> Generate 3 Images -> Add Text Overlay -> Generate Audio -> Merge Video
 */
export class GWAPIProvider implements AIProvider {
  readonly name = "gw-api";
  configs: GWAPIConfigs;

  private baseUrl: string;
  private visionModel: string;
  private imageModel: string;
  private ttsModel: string;
  private visionApiUrl: string;
  private imageApiUrl: string;
  private ttsApiUrl: string;

  constructor(configs: GWAPIConfigs) {
    this.configs = configs;
    this.baseUrl = configs.baseUrl || "https://ai.comfly.chat";
    this.visionModel = configs.visionModel || "gpt-4o-2024-08-06";
    this.imageModel = configs.imageModel || "dall-e-3";
    this.ttsModel = configs.ttsModel || "tts-1";
    this.visionApiUrl =
      configs.visionApiUrl || `${this.baseUrl}/v1/chat/completions`;
    this.imageApiUrl =
      configs.imageApiUrl || `${this.baseUrl}/v1/chat/completions`;
    this.ttsApiUrl = configs.ttsApiUrl || `${this.baseUrl}/v1/audio/speech`;
  }

  /**
   * Fetch with retry mechanism
   * Retries up to maxRetries times with exponential backoff
   * @param url - URL to fetch
   * @param options - Fetch options
   * @param maxRetries - Maximum number of retries (default: 3)
   * @param retryDelay - Base delay in ms for exponential backoff (default: 1000)
   * @returns Promise<Response>
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
          `[GW-API Fetch] Attempt ${attempt}/${maxRetries} for ${url}`,
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
          `[GW-API Fetch] Attempt ${attempt}/${maxRetries} failed:`,
          error.message,
        );

        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const waitTime = retryDelay * attempt; // Exponential backoff: 1s, 2s, 3s
          console.log(`[GW-API Fetch] Waiting ${waitTime}ms before retry...`);
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
   * Get date string for R2 path (YYYYMMDD format)
   * This ensures R2 paths match public folder structure for easier management
   */
  private getDateString(): string {
    const today = new Date();
    return today.toISOString().split("T")[0].replace(/-/g, "");
  }

  /**
   * Get R2 key path for a file (matches public folder structure: video/YYYYMMDD/taskId/filename)
   */
  private getR2Key(taskId: string, filename: string): string {
    const dateStr = this.getDateString();
    return `video/${dateStr}/${taskId}/${filename}`;
  }

  /**
   * Convert image URL to base64
   */
  private async convertImageToBase64(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith("data:image/")) {
      return imageUrl;
    }

    try {
      let fetchUrl = imageUrl;

      // Handle relative URLs (local files) - always use localhost for server-side access
      if (imageUrl.startsWith("/")) {
        const port = process.env.PORT || 3000;
        fetchUrl = `http://localhost:${port}${imageUrl}`;
      }
      console.log("[GW-API] Fetching image:", fetchUrl);
      const response = await this.fetchWithRetry(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      let contentType = response.headers.get("content-type") || "image/png";

      if (!contentType.startsWith("image/")) {
        const urlLower = imageUrl.toLowerCase();
        if (urlLower.includes(".jpg") || urlLower.includes(".jpeg")) {
          contentType = "image/jpeg";
        } else if (urlLower.includes(".png")) {
          contentType = "image/png";
        } else {
          contentType = "image/png";
        }
      }

      const base64 = buffer.toString("base64");
      return `data:${contentType};base64,${base64}`;
    } catch (error: any) {
      console.error("[GW-API] Failed to convert image to base64:", error);
      throw new Error(`Failed to convert image to base64: ${error.message}`);
    }
  }

  /**
   * Step 1: Image + Text -> Analysis (图文生文)
   * Using gpt-5.2 model
   */
  private async analyzeImageAndText(
    imageUrl: string,
    userFeeling: string,
    apiKey: string,
    visionModel: string,
    taskId: string,
  ): Promise<ImageToTextResponse> {
    const visualTheologySchema = {
      name: "visual_theology_response",
      strict: true,
      schema: {
        type: "object",
        required: [
          "project_title",
          "background_music_mood",
          "scenes",
          "verse_reference",
          "metadata",
        ],
        properties: {
          project_title: { type: "string" },
          background_music_mood: { type: "string" },
          scenes: {
            type: "array",
            items: {
              type: "object",
              required: ["act", "voiceover_text", "camera_motion"],
              properties: {
                act: { type: "number" },
                voiceover_text: { type: "string" },
                camera_motion: { type: "string" },
              },
              additionalProperties: false,
            },
          },
          verse_reference: { type: "string" },
          metadata: {
            type: "object",
            required: ["estimated_duration"],
            properties: {
              estimated_duration: { type: "string" },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    };

    const systemPrompt = `
# Role
You are "The Comforter," an empathetic AI Director designed to create a short, healing video for American users facing emotional distress. You control the Script (TTS) and the Camera Movement (Motion). Images will be generated separately.

# Input
- \`User_Feeling\`: User's emotional state (e.g., "Lonely", "Anxious", "Heartbroken").

# Task
Generate a structured JSON object containing a 3-Act narrative. Each act produces one scene with its own voiceover.

# 3-Act Structure Guidelines
1. **Act 1: The Mirror (Validation)** - Reflect the user's current reality.
   - *Motion:* Usually a slow Zoom In (to focus on the feeling).
   - *Voiceover:* Acknowledge the pain. Start with "I see..." or "It's okay to feel..."
2. **Act Two: Transition (Hope)** - Introduce changes in light or perspective.
   - *Dynamics:* Pan the camera left or right or slowly pull back (to widen the perspective).
   - *Narration:* Transition to hope. Naturally incorporate a comforting Bible verse (New International Version or English Standard Version). Do not add any Bible quotations to this section; only include the complete verse.
3. **Act 3: The Promise (Peace)** - The divine answer.
   - *Motion:* Static or very subtle float (to represent stability).
   - *Voiceover:* A short, closing benediction of peace.

# Content Guidelines
- **Tone:** Warm, intimate, slow-paced, non-judgmental. Like a wise friend whispering in a quiet room.
- **Language:** Natural American English. Avoid archaic "Thee/Thou." Use soothing words like "Breathe," "Rest," "Stillness," "Presence."
- **Each voiceover_text** should be a complete, self-contained narration segment for that scene. The video will hold each image on screen until its voiceover finishes, then transition to the next scene.
- **Mark pauses** in voiceover_text with "..." for natural breathing room.

# Output Format (JSON Only)
{
  "project_title": "Short title for internal logging",
  "background_music_mood": "e.g., Melancholic Piano, Ethereal Pad, Warm Acoustic",
  "scenes": [
    {
      "act": 1,
      "voiceover_text": "First part of the script. Acknowledge the pain.",
      "camera_motion": "ZOOM_IN"
    },
    {
      "act": 2,
      "voiceover_text": "Second part of the script. The transition with Bible verse.",
      "camera_motion": "PAN_RIGHT"
    },
    {
      "act": 3,
      "voiceover_text": "Third part. The closing benediction.",
      "camera_motion": "ZOOM_OUT"
    }
  ],
  "verse_reference": "Book Chapter:Verse (e.g. Psalm 34:18)",
  "metadata": {
    "estimated_duration": "30 seconds"
  }
}
    `;

    // Convert image URL to base64 for vision API
    // console.log('[GW-API] Converting image to base64:', imageUrl);
    // const base64Image = await this.convertImageToBase64(imageUrl);
    console.log(
      "[GW-API] Analyzing image:",
      imageUrl,
      apiKey,
      visionModel,
      taskId,
    );

    const payload = {
      model: this.visionModel,
      response_format: {
        type: "json_schema",
        json_schema: visualTheologySchema,
      },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userFeeling,
            },
            {
              type: "image_url",
              image_url: imageUrl,
            },
          ],
        },
      ],
    };

    const resp = await this.fetchWithRetry(this.visionApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Analysis failed: ${resp.status}, ${errorText}`);
    }
    const data = await resp.json();
    console.log("[SP] Analysis response:", data, " taskId: ", taskId);
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error("No choices returned");
    }

    if (choice.finish_reason !== "stop") {
      throw new Error(`Generation aborted: ${choice.finish_reason}`);
    }
    const responseText = choice.message?.content || "";

    if (!responseText) {
      console.error(
        "[GW-API] Empty response content. Full choice:",
        JSON.stringify(choice),
      );
      throw new Error(
        `Analysis returned empty content. finish_reason: ${choice.finish_reason}, refusal: ${choice.message?.refusal || "none"}`,
      );
    }

    try {
      console.log("[GW-API] Response text:", responseText);
      return JSON.parse(responseText);
    } catch {
      console.warn("[GW-API] JSON.parse failed, attempting jsonrepair...");
      try {
        const repaired = jsonrepair(responseText);
        return JSON.parse(repaired);
      } catch (repairError) {
        console.error("[GW-API] jsonrepair also failed:", repairError);
        throw new Error(
          `Failed to parse analysis response: ${repairError instanceof Error ? repairError.message : "Invalid JSON"}`,
        );
      }
    }
  }

  /**
   * Step 2: Generate 3 images (文生图)
   * Using gemini-3-pro-image-preview model
   */
  private async generateImages(
    prompt: string,
    apiKey: string,
    count: number = 3,
  ): Promise<string[]> {
    const apiUrl = `${this.baseUrl}/images/generations`;
    const imageUrls: string[] = [];

    for (let i = 0; i < count; i++) {
      const payload = {
        model: "gemini-3-pro-image-preview",
        prompt: prompt,
        sequential_image_generation: "disabled",
        response_format: "url",
        size: "2K",
        stream: false,
        watermark: false,
      };

      const resp = await this.fetchWithRetry(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(
          `Image generation ${i + 1} failed: ${resp.status}, ${errorText}`,
        );
      }

      const data = await resp.json();
      const imageUrl = data.data?.[0]?.url || data.url;

      if (!imageUrl) {
        throw new Error(`No image URL in response for image ${i + 1}`);
      }

      imageUrls.push(imageUrl);
      console.log(`[GW-API] Generated image ${i + 1}/${count}:`, imageUrl);
    }

    return imageUrls;
  }

  /**
   * Step 2b: Generate images from reference image (图生图)
   * Using gemini-3-pro-image-preview model with FormData
   * Generates multiple images in parallel for better performance
   */
  private async generateImagesFromImage(
    prompt: string,
    referenceImageUrl: string,
    apiKey: string,
    count: number = 3,
  ): Promise<string[]> {
    // Download reference image as blob
    console.log("[GW-API] Downloading reference image:", referenceImageUrl);
    let fetchUrl = referenceImageUrl;
    if (referenceImageUrl.startsWith("/")) {
      const port = process.env.PORT || 3000;
      fetchUrl = `http://localhost:${port}${referenceImageUrl}`;
    }

    const imageResponse = await this.fetchWithRetry(fetchUrl);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to download reference image: ${imageResponse.status}`,
      );
    }
    const imageBlob = await imageResponse.blob();

    // Create array of promises for parallel generation with retry logic
    const generatePromises = Array.from({ length: count }, async (_, i) => {
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `[GW-API] Generating image ${i + 1}/${count}, attempt ${attempt}/${maxRetries}...`,
          );

          // Create FormData for each request
          const formData = new FormData();
          formData.append("model", this.imageModel);
          formData.append("prompt", prompt);
          formData.append("image", imageBlob, "reference.png");
          formData.append("response_format", "url");
          formData.append("image_size", "4K");

          const resp = await this.fetchWithRetry(this.imageApiUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            body: formData,
          });

          if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${errorText}`);
          }

          const data = await resp.json();
          const imageUrl = data.data?.[0]?.url || data.url;

          if (!imageUrl) {
            throw new Error("No image URL in response");
          }

          console.log(
            `[GW-API] ✓ Generated image from reference ${i + 1}/${count}:`,
            imageUrl,
          );
          return imageUrl;
        } catch (error: any) {
          lastError = error;
          console.warn(
            `[GW-API] ✗ Image ${i + 1}/${count} attempt ${attempt} failed:`,
            error.message,
          );

          if (attempt < maxRetries) {
            const waitTime = attempt * 2000; // 2s, 4s, 6s
            console.log(`[GW-API] Retrying in ${waitTime / 1000}s...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      }

      throw new Error(
        `Image-to-image generation ${i + 1} failed after ${maxRetries} attempts: ${lastError?.message}`,
      );
    });

    // Wait for all images to be generated in parallel
    const imageUrls = await Promise.all(generatePromises);
    return imageUrls;
  }

  /**
   * Generate images from reference image and text prompt using gemini-2.5-flash-image
   * Uses messages format (like chat completion API)
   * @param imageUrl - Reference image URL
   * @param textPrompt - Text prompt for image generation
   * @param apiKey - API key
   * @param count - Number of images to generate (default: 1)
   * @returns Array of generated image URLs
   */
  async generateImageFromImageAndText(
    imageUrl: string,
    apiKey: string,
    count: number = 3,
  ): Promise<string[]> {
    console.log(
      `[GW-API] Generating ${count} image(s) from image and text with gemini-2.5-flash-image...`,
    );
    console.log("[GW-API] Reference image:", imageUrl);

    const imageUrls: string[] = [];
    const textPrompt = `
      You are a visual theologian focused on comfort, not fear or spectacle.

      The uploaded image is the absolute source of truth.
      Preserve the original composition, environment, perspective, and realism.
      Do NOT replace the setting or alter existing elements.

      You MUST introduce a single, fully visible divine figure representing God.

      ### Divine figure requirements (MANDATORY):

      - The figure must be a FULL-BODY human-like form.
      - The figure must be clearly MALE.
      - The figure must appear mature, fatherly, and gentle.
      - The figure must be clothed in simple, flowing garments
        (robes or modest clothing), soft in texture, not ornate or intimidating.
      - The appearance must be warm, compassionate, and approachable —
        never frightening, uncanny, or ghost-like.

      This is NOT an abstract spirit.
      This is a recognizable, embodied representation of God,
      as commonly imagined in American Christian faith,
      but infused with sacred presence.

      ### Interaction:

      - If a human is present in the image:
        the divine figure must be shown actively comforting them,
        such as:
        placing a hand on the shoulder or head,
        gently embracing,
        or standing close in protective reassurance.

      The posture and facial expression should clearly convey care, peace, and love.

      ### Placement logic:

      - Indoors:
        the divine figure should stand or sit naturally beside the person,
        integrated into the scene as a quiet companion.

      - Outdoors with visible sky:
        the divine figure may appear slightly elevated or oriented from above,
        but still fully visible and connected to the person,
        expressing watchful care rather than distance.

      ### Sacred visual elements (ALLOWED, NOT EXCESSIVE):

      - Soft holy light
      - Warm, diffused glow
      - Gentle illumination around the divine figure
      - Subtle sacred atmosphere

      No horror.
      No darkness.
      No ambiguity.
      No partial body.
      No disembodied hands.

      The final image should feel like the same moment,
      now clearly accompanied by a loving, fatherly God —
      a presence of comfort, not awe or fear.


      `;
    // Generate images sequentially
    for (let i = 0; i < count; i++) {
      console.log(`[GW-API] Generating image ${i + 1}/${count}...`);

      const payload = {
        model: "gemini-2.5-flash-image",
        stream: false,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: textPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
      };

      const resp = await this.fetchWithRetry(this.visionApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(
          `Image generation ${i + 1}/${count} failed: ${resp.status}, ${errorText}`,
        );
      }

      const data = await resp.json();
      let generatedImageUrl =
        data.data?.[0]?.url || data.url || data.choices?.[0]?.message?.content;

      if (!generatedImageUrl) {
        console.error("[GW-API] No image URL in response:", data);
        throw new Error(`No image URL in response for image ${i + 1}/${count}`);
      }

      // Extract image URL from markdown format if needed
      // Format: ![image](https://files.closeai.fans/...)
      if (
        typeof generatedImageUrl === "string" &&
        generatedImageUrl.includes("![image](")
      ) {
        const match = generatedImageUrl.match(
          /!\[image\]\((https?:\/\/[^\)]+)\)/,
        );
        if (match && match[1]) {
          generatedImageUrl = match[1];
          console.log(
            `[GW-API] Extracted image URL from markdown: ${generatedImageUrl}`,
          );
        }
      }

      // Validate that the result is actually a URL, not an AI text response
      if (
        typeof generatedImageUrl === "string" &&
        !generatedImageUrl.startsWith("http://") &&
        !generatedImageUrl.startsWith("https://") &&
        !generatedImageUrl.startsWith("data:")
      ) {
        console.error(
          `[GW-API] Model returned text instead of image URL for image ${i + 1}/${count}:`,
          generatedImageUrl.substring(0, 200),
        );
        throw new Error(
          `Model did not generate an image for image ${i + 1}/${count}, returned text response instead`,
        );
      }

      imageUrls.push(generatedImageUrl);
      console.log(
        `[GW-API] Image ${i + 1}/${count} generated:`,
        generatedImageUrl,
      );
    }

    return imageUrls;
  }

  /**
   * Generate 3 images with fixed prompts using /v1/images/edits API
   * Sequential: Image 1 from firstImageUrl, Image 2 from Image 1 output, Image 3 from firstImageUrl
   */
  async generateImagesWithFixedPrompts(
    firstImageUrl: string,
    apiKey: string,
  ): Promise<string[]> {
    const editApiUrl = `${this.baseUrl}/v1/images/edits`;

    const PROMPT_1 = `Core Objective:
    High-definition picture quality, Photorealistic cinematic image. Preserve the original image composition, camera angle, subject position, and environment. Do NOT alter the main subject or scene structure.
    The Sacred Integration (Randomly select 1-2 from the list below):
    [ELEMENT 1: The Cross] - Silhouette at the horizon during golden hour, divine god rays, cinematic lighting.
    [ELEMENT 2: The Lamb] - Innocent lamb in soft focus, macro wool details, warm peaceful sunlight.
    [ELEMENT 3: The Dove] - Slow motion flight, white feathers with an ethereal glow in a clear sky.
    [ELEMENT 4: The Ark] - Gold textures, dim temple lighting, sacred dust motes dancing in light.
    [ELEMENT 5: Olive Branch] - Fresh green tones with morning dew, macro shot of life returning.
    [ELEMENT 6: Manna] - Crystalline textures on the ground, morning frost look with magical sparkles.
    [ELEMENT 7: Menorah/Candle] - Warm candlelight, bokeh background, stable flame, light/dark contrast.
    [ELEMENT 8: Shepherd’s Staff] - Natural wood texture resting against an object, warm afternoon light.
    [ELEMENT 9: The Chalice] - Silver/Gold reflection, deep red liquid, sacramental atmosphere, soft shadows.
    [ELEMENT 10: The Hand (Abstract)] - Subtle sun flare in the shape of a reaching light, POV support.
    Execution Rules:
    Subtlety: The chosen symbol appears naturally within the scene, as if it has always been there.
    Scale: The symbol is subtle and respectful, never dominating the image or the subject.
    Lighting: Lighting interacts realistically with the environment—soft divine light, gentle god rays, or warm highlights.
    Mood: Divine presence, protection, and gentle reassurance. The atmosphere is sacred, quiet, and reverent.
    Constraints: No human divine figures. No dramatic miracles. No scene transformation.`;

    const PROMPT_2 = `High-definition picture quality,A deity, perhaps a god, dressed in a flowing white robe with long, flowing white hair and beard, quietly appears in the painting, blending seamlessly into the composition without disrupting the original elements. The surrounding white clouds are full and abundant, creating a sense of soaring through the mist, seemingly offering blessing or guidance. The composition emphasizes the connection between humanity and divinity, suggesting the coexistence of gods and humans.`;

    const PROMPT_3 = `High-definition picture quality,Photorealistic cinematic peaceful image, 16:9 aspect ratio.
The scene transforms into a calm, open, and hopeful environment.
Soft golden sunlight, clear sky, balanced exposure.
Nature elements such as horizon, mountains, water, or open landscape.
No divine figure visible.
Atmosphere feels safe, stable, and complete.
Mood: peace, trust, renewal, divine promise fulfilled.
A sense of rest and future hope.
If the original image already contains figures, those figures should be filled with the joy of receiving divine grace; if the original image does not contain figures, the scene depicted should be prosperous and thriving.`;

    // Helper: download image URL as Blob
    const downloadImageAsBlob = async (url: string): Promise<Blob> => {
      let fetchUrl = url;
      if (url.startsWith("/")) {
        const port = process.env.PORT || 3000;
        fetchUrl = `http://localhost:${port}${url}`;
      }
      const response = await this.fetchWithRetry(fetchUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }
      return response.blob();
    };

    // Helper: call /v1/images/edits with FormData
    const editImage = async (
      imageBlob: Blob,
      prompt: string,
    ): Promise<string> => {
      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("prompt", prompt);
      formData.append("model", "gpt-image-1");

      const resp = await this.fetchWithRetry(editApiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Image edit failed: ${resp.status}, ${errorText}`);
      }

      const data = await resp.json();
      const imageUrl = data.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL in edit response");
      }
      return imageUrl;
    };

    console.log(
      "[GW-API] Generating 3 images with fixed prompts (1+3 parallel, then 2)...",
    );

    // Download the user's original image
    console.log("[GW-API] Downloading original image:", firstImageUrl);
    const originalBlob = await downloadImageAsBlob(firstImageUrl);

    // Image 1 and Image 3 both depend only on originalBlob — run in parallel
    console.log(
      "[GW-API] Generating image 1/3 (Divine Presence) and image 3/3 (Promise & Peace) in parallel...",
    );
    const [image1Url, image3Url] = await Promise.all([
      editImage(originalBlob, PROMPT_1),
      editImage(originalBlob, PROMPT_3),
    ]);
    console.log("[GW-API] Image 1/3 generated:", image1Url);
    console.log("[GW-API] Image 3/3 generated:", image3Url);

    // Image 2 depends on Image 1 output — must wait
    console.log("[GW-API] Downloading image 1 output for image 2 input...");
    const image1Blob = await downloadImageAsBlob(image1Url);
    console.log(
      "[GW-API] Generating image 2/3 (God's Comfort) from image 1 output...",
    );
    const image2Url = await editImage(image1Blob, PROMPT_2);
    console.log("[GW-API] Image 2/3 generated:", image2Url);

    return [image1Url, image2Url, image3Url];
  }

  /**
   * Step 4: Generate audio (文生音频) - Using TTS models with fallback and retry
   * Using REST API /v1/audio/speech endpoint
   * Fallback order: gpt-4o-mini-tts -> tts-1-1106 -> tts-1-hd-1106 -> tts-1-hd
   * Each model will be retried up to 3 times before falling back to the next model
   */
  private async generateAudio(
    text: string,
    apiKey: string,
    voiceType: string = "alloy",
  ): Promise<Buffer> {
    const ttsModels = [
      this.ttsModel,
      "gpt-4o-mini-tts",
      "tts-1-1106",
      "tts-1-hd-1106",
      "tts-1-hd",
    ];
    const maxRetries = 3;

    console.log(
      "[GW-API TTS] Starting TTS generation with fallback chain:",
      ttsModels,
    );
    console.log("[GW-API TTS] Voice type:", voiceType);
    console.log("[GW-API TTS] Text length:", text.length);

    let lastError: Error | null = null;

    // Try each model in the fallback chain
    for (const model of ttsModels) {
      console.log(`[GW-API TTS] Attempting with model: ${model}`);

      // Retry up to maxRetries times for each model
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(
            `[GW-API TTS] Model: ${model}, Attempt: ${attempt}/${maxRetries}`,
          );

          const payload = {
            model: model,
            input: text,
            voice: voiceType,
          };

          const resp = await this.fetchWithRetry(this.ttsApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
          });

          if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`TTS API error: ${resp.status}, ${errorText}`);
          }

          // Response should be audio/mpeg binary data
          const arrayBuffer = await resp.arrayBuffer();
          const audioBuffer = Buffer.from(arrayBuffer);

          console.log(
            `[GW-API TTS] ✅ Success with model ${model} on attempt ${attempt}`,
          );
          console.log(
            "[GW-API TTS] Audio generated:",
            audioBuffer.length,
            "bytes",
          );

          return audioBuffer;
        } catch (error: any) {
          lastError = error;
          console.error(
            `[GW-API TTS] ❌ Failed with model ${model}, attempt ${attempt}/${maxRetries}:`,
            error.message,
          );

          // If this is not the last attempt for this model, wait before retrying
          if (attempt < maxRetries) {
            const waitTime = attempt * 1000; // Exponential backoff: 1s, 2s, 3s
            console.log(`[GW-API TTS] Waiting ${waitTime}ms before retry...`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      }

      // All retries failed for this model, try next model
      console.log(
        `[GW-API TTS] All ${maxRetries} attempts failed for model ${model}, trying next model...`,
      );
    }

    // All models and retries exhausted
    throw new Error(
      `TTS generation failed after trying all models (${ttsModels.join(", ")}) with ${maxRetries} retries each. Last error: ${lastError?.message}`,
    );
  }

  /**
   * Step 5: Merge images and audio into video
   * Each image is paired with its own audio — the image stays on screen
   * until its corresponding voiceover finishes, then transitions to the next scene.
   */
  private async mergeToVideo(
    imageBuffers: Buffer[],
    audioBuffers: Buffer[],
    taskId: string,
    customStorage?: boolean,
  ): Promise<{ videoUrl: string; imageUrls: string[]; audioUrl: string }> {
    const ffmpeg = require("fluent-ffmpeg");
    const fs = require("fs").promises;
    const path = require("path");
    const {
      getTaskWorkDir,
      getTaskPublicUrl,
      ensureTaskWorkDir,
    } = require("@/shared/utils/file-manager");

    const workDir = await ensureTaskWorkDir(taskId);

    try {
      console.log("[GW-API Video] Starting video merge process...");
      console.log(
        "[GW-API Video] Number of image buffers:",
        imageBuffers.length,
      );
      console.log(
        "[GW-API Video] Number of audio buffers:",
        audioBuffers.length,
      );

      // Step 1: Save all images to work directory
      const imagePaths: string[] = [];
      const imageUrls: string[] = [];
      for (let i = 0; i < imageBuffers.length; i++) {
        const filename = `image_${i}.png`;
        const imagePath = path.join(workDir, filename);
        await fs.writeFile(imagePath, imageBuffers[i]);
        imagePaths.push(imagePath);
        imageUrls.push(getTaskPublicUrl(taskId, filename));
        console.log(
          `[GW-API Video] Saved image ${i + 1}/${imageBuffers.length}:`,
          imagePath,
        );
      }

      // Step 2: Save each audio file and get its duration
      const audioPaths: string[] = [];
      const audioDurations: number[] = [];
      for (let i = 0; i < audioBuffers.length; i++) {
        const audioFilename = `audio_${i}.mp3`;
        const audioPath = path.join(workDir, audioFilename);
        await fs.writeFile(audioPath, audioBuffers[i]);
        audioPaths.push(audioPath);

        const duration = await new Promise<number>((resolve, reject) => {
          ffmpeg.ffprobe(audioPath, (err: Error, metadata: any) => {
            if (err) reject(err);
            else resolve(metadata.format.duration);
          });
        });
        audioDurations.push(duration);
        console.log(
          `[GW-API Video] Audio ${i + 1} saved: ${audioPath}, duration: ${duration}s`,
        );
      }

      // Combined audio URL (we'll concat them for the result)
      const combinedAudioFilename = "audio.mp3";
      const combinedAudioPath = path.join(workDir, combinedAudioFilename);
      const audioUrl = getTaskPublicUrl(taskId, combinedAudioFilename);

      // Step 3: Create video segments — each image paired with its own audio
      const segmentPaths: string[] = [];

      for (let i = 0; i < imagePaths.length; i++) {
        const segmentPath = path.join(workDir, `segment_${i}.mp4`);
        const duration = audioDurations[i] || 5;

        await new Promise<void>((resolve, reject) => {
          ffmpeg()
            .input(imagePaths[i])
            .inputOptions(["-loop 1", "-t", duration.toString()])
            .input(audioPaths[i])
            .outputOptions([
              "-c:v libx264",
              "-tune stillimage",
              "-c:a aac",
              "-b:a 192k",
              "-pix_fmt yuv420p",
              "-r 25",
              "-shortest",
              "-movflags +faststart",
            ])
            .output(segmentPath)
            .on("start", (cmd: string) => {
              console.log(
                `[GW-API Video] Creating segment ${i + 1} (image+audio, ${duration}s):`,
                cmd,
              );
            })
            .on("end", () => {
              console.log(
                `[GW-API Video] Segment ${i + 1} created successfully`,
              );
              resolve();
            })
            .on("error", (err: Error) => {
              console.error(
                `[GW-API Video] Error creating segment ${i + 1}:`,
                err,
              );
              reject(err);
            })
            .run();
        });

        segmentPaths.push(segmentPath);
      }

      // Step 4: Create concat file for ffmpeg
      const concatFilePath = path.join(workDir, "concat.txt");
      const concatContent = segmentPaths
        .map((p) => `file '${path.basename(p)}'`)
        .join("\n");
      await fs.writeFile(concatFilePath, concatContent);
      console.log("[GW-API Video] Concat file created:", concatFilePath);

      // Step 5: Concatenate segments into final video (each segment already has audio)
      const videoFilename = "final_video.mp4";
      const finalVideoPath = path.join(workDir, videoFilename);

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(concatFilePath)
          .inputOptions(["-f concat", "-safe 0"])
          .outputOptions(["-c copy", "-movflags +faststart"])
          .output(finalVideoPath)
          .on("start", (cmd: string) => {
            console.log("[GW-API Video] Concatenating segments:", cmd);
          })
          .on("end", () => {
            console.log("[GW-API Video] Final video created successfully");
            resolve();
          })
          .on("error", (err: Error) => {
            console.error("[GW-API Video] Error concatenating segments:", err);
            reject(err);
          })
          .run();
      });

      // Step 6: Also concat audio files for separate audio URL
      const audioConcatPath = path.join(workDir, "audio_concat.txt");
      const audioConcatContent = audioPaths
        .map((p) => `file '${path.basename(p)}'`)
        .join("\n");
      await fs.writeFile(audioConcatPath, audioConcatContent);

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(audioConcatPath)
          .inputOptions(["-f concat", "-safe 0"])
          .outputOptions(["-c copy"])
          .output(combinedAudioPath)
          .on("end", () => {
            console.log("[GW-API Video] Combined audio created");
            resolve();
          })
          .on("error", (err: Error) => {
            console.error("[GW-API Video] Error combining audio:", err);
            reject(err);
          })
          .run();
      });

      // Step 7: Return public URLs
      const finalVideoUrl = getTaskPublicUrl(taskId, videoFilename);

      console.log("[GW-API Video] Video created:", finalVideoUrl);
      console.log("[GW-API Video] All files saved to:", workDir);

      return {
        videoUrl: finalVideoUrl,
        imageUrls: imageUrls,
        audioUrl: audioUrl,
      };
    } catch (error) {
      console.error("[GW-API Video] Video merge failed:", error);
      throw error;
    }
  }

  /**
   * Map status
   */
  private mapStatus(status: string): AITaskStatus {
    switch (status?.toLowerCase()) {
      case "pending":
      case "queued":
        return AITaskStatus.PENDING;
      case "processing":
      case "running":
        return AITaskStatus.PROCESSING;
      case "success":
      case "completed":
      case "succeeded":
        return AITaskStatus.SUCCESS;
      case "failed":
      case "error":
        return AITaskStatus.FAILED;
      case "canceled":
      case "cancelled":
        return AITaskStatus.CANCELED;
      default:
        return AITaskStatus.PENDING;
    }
  }

  /**
   * Main generation workflow
   */
  async generateVideo({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    const settings = params.options || {};
    const userFeeling = settings.user_feeling;

    if (!userFeeling || !userFeeling.trim()) {
      throw new Error("userFeeling is required");
    }

    // Get image input
    const imageInput = params.options?.image_input;
    const hasImage =
      imageInput && Array.isArray(imageInput) && imageInput.length > 0;
    const firstImageUrl = hasImage ? imageInput[0] : null;
    // const firstImageUrl = "https://public.pikju.top/uploads/video/20260125/66dbabf2-6b97-4b60-b254-6759a7c6f891/input_image.jpg";

    if (!firstImageUrl) {
      throw new Error("Image input is required for GW-API provider");
    }

    // Generate task ID first
    const taskId = params.taskId;

    params.async = true;
    // Check if async mode is enabled
    if (params.async) {
      console.log(
        "[GW-API] Async mode enabled, scheduling background processing for task:",
        taskId,
      );

      this.processVideoInBackground(
        taskId,
        params,
        firstImageUrl,
        userFeeling,
      ).catch((error: any) => {
        console.error(
          "[GW-API] Background processing failed for task:",
          taskId,
          error,
        );
      });

      console.log("[GW-API] Background processing scheduled for task:", taskId);

      // Return immediately with pending status
      return {
        taskStatus: AITaskStatus.PENDING,
        taskId: taskId,
        taskInfo: {
          status: "processing",
        },
        taskResult: {
          message: "Video generation started in background",
          user_feeling: userFeeling,
        },
      };
    }

    // Synchronous mode - process immediately
    return this.processVideoSync(taskId, params, firstImageUrl, userFeeling);
  }

  /**
   * Process video generation synchronously
   * @param updateDatabase - If true, updates AI task status in database
   */
  private async processVideoSync(
    taskId: string,
    params: AIGenerateParams,
    firstImageUrl: string,
    userFeeling: string,
    updateDatabase: boolean = true,
  ): Promise<AITaskResult> {
    // Import dependencies
    // const { getAllConfigs } = await import('@/shared/models/config');
    let updateAITaskByTaskId: any = null;

    if (updateDatabase) {
      const aiTaskModule = await import("@/shared/models/ai_task");
      updateAITaskByTaskId = aiTaskModule.updateAITaskByTaskId;
    }

    // Get API credentials
    // const configs = await getAllConfigs();
    const apiKey = this.configs.apiKey;
    const visionModel = this.visionModel;

    if (!apiKey) {
      throw new Error("GW API key is required");
    }

    console.log("[GW-API] Starting Scripture Picture generation workflow...");

    // Track task start time
    const taskStartedAt = new Date().toISOString();

    // Helper function to update task progress
    const updateProgress = async (
      step: GWTaskStep,
      message: string,
      progress: number,
      additionalInfo?: any,
    ) => {
      if (!updateDatabase || !updateAITaskByTaskId) return;

      const progressInfo: GWTaskProgress = {
        currentStep: step,
        stepMessage: message,
        progress,
        startedAt: taskStartedAt,
        updatedAt: new Date().toISOString(),
      };

      const taskInfo = {
        progress: progressInfo,
        ...additionalInfo,
      };

      await updateAITaskByTaskId(taskId, {
        status:
          step === GWTaskStep.COMPLETED
            ? AITaskStatus.SUCCESS
            : AITaskStatus.PROCESSING,
        taskInfo: JSON.stringify(taskInfo),
      });
      console.log(`[GW-API Progress] ${step}: ${message} (${progress}%)`);
    };

    try {
      // Prepare work directory and save input image
      const { ensureTaskWorkDir, getTaskPublicUrl } = await import(
        "@/shared/utils/file-manager"
      );
      const workDir = await ensureTaskWorkDir(taskId);
      const fs = await import("fs/promises");
      const path = await import("path");

      // Save input image if it's a URL (http or relative)
      if (firstImageUrl) {
        try {
          console.log("[GW-API] Saving input image to task directory...");
          let fetchUrl = firstImageUrl;
          // Handle relative URLs
          if (firstImageUrl.startsWith("/")) {
            const port = process.env.PORT || 3000;
            fetchUrl = `http://localhost:${port}${firstImageUrl}`;

            // Check if the file is already in the task directory to avoid re-downloading
            if (
              firstImageUrl.includes(taskId) &&
              firstImageUrl.includes("input_image")
            ) {
              console.log(
                "[GW-API] Input image already in task directory, skipping download:",
                firstImageUrl,
              );
              fetchUrl = "";
            }
          } else if (!firstImageUrl.startsWith("http")) {
            console.warn(
              "[GW-API] Input image URL format not supported for saving:",
              firstImageUrl.substring(0, 50),
            );
            fetchUrl = "";
          }

          if (fetchUrl) {
            const response = await this.fetchWithRetry(fetchUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              let contentType = response.headers.get("content-type") || "";
              let ext = "png";
              if (contentType.includes("jpeg") || contentType.includes("jpg")) {
                ext = "jpg";
              } else if (
                firstImageUrl.toLowerCase().endsWith(".jpg") ||
                firstImageUrl.toLowerCase().endsWith(".jpeg")
              ) {
                ext = "jpg";
              }

              const inputFilename = `input_image.${ext}`;
              const inputImagePath = path.join(workDir, inputFilename);
              await fs.writeFile(inputImagePath, buffer);
              console.log("[GW-API] Input image saved:", inputImagePath);
            } else {
              console.warn(
                `[GW-API] Failed to fetch input image: ${response.status}`,
              );
            }
          }
        } catch (error) {
          console.warn("[GW-API] Failed to save input image locally:", error);
        }
      }
      console.log("[GW-API] Input image saved: ", firstImageUrl);
      const appUrl = (envConfigs.app_url || "http://localhost:3000").replace(
        /\/+$/,
        "",
      );
      firstImageUrl = appUrl + firstImageUrl;
      // firstImageUrl =
      //   "https://public.pikju.top/uploads/video/20260208/cf6ca8f3-58a7-456d-abbf-695a358be927/input_image.jpg";
      // Update status to processing with initial progress
      await updateProgress(
        GWTaskStep.ANALYZING,
        "Analyzing image and text...",
        5,
      );
      // throw new Error('Input image is required for GW-API provider');
      // Step 1: Analyze image and text using gpt-5.2
      console.log("[GW-API] Step 1: Analyzing image and text with gpt-5.2...");
      const analysis = await this.analyzeImageAndText(
        firstImageUrl,
        userFeeling,
        apiKey,
        visionModel,
        taskId,
      );

      console.log("[GW-API] Analysis complete:", analysis);

      // Save analysis to params.options.final_prompt
      if (!params.options) {
        params.options = {};
      }
      params.options.final_prompt = JSON.stringify(analysis, null, 2);
      params.options.original_prompt = params.prompt || "";
      params.options.user_feeling = userFeeling;

      // Update progress after analysis
      await updateProgress(
        GWTaskStep.GENERATING_IMAGES,
        "Generating 3 images from reference...",
        15,
      );

      // Step 2: Generate 3 images with fixed prompts using gpt-image-1
      console.log(
        "[GW-API] Step 2: Generating 3 images with fixed prompts via /v1/images/edits...",
      );
      const scenes = analysis.scenes || [];
      if (scenes.length === 0) {
        throw new Error("No scenes returned from analysis");
      }
      const generatedImageUrls = await this.generateImagesWithFixedPrompts(
        firstImageUrl,
        apiKey,
      );
      console.log(
        "[GW-API] Images generated with fixed prompts:",
        generatedImageUrls,
      );

      // Update progress after image generation
      await updateProgress(
        GWTaskStep.SAVING_ORIGINAL_IMAGES,
        "Saving original generated images...",
        35,
      );

      // Step 2.5: Download and save original generated images (without watermark)
      console.log("[GW-API] Step 2.5: Saving original generated images...");
      const originalImageUrls: string[] = [];

      // Use public folder storage first
      console.log("[GW-API] Using public folder storage for original images");

      for (let i = 0; i < generatedImageUrls.length; i++) {
        const response = await this.fetchWithRetry(generatedImageUrls[i]);
        if (!response.ok) {
          throw new Error(
            `Failed to download generated image ${i + 1}: ${response.status}`,
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const filename = `original_image_${i}.png`;
        const originalImagePath = path.join(workDir, filename);
        await fs.writeFile(originalImagePath, buffer);
        const publicUrl = getTaskPublicUrl(taskId, filename);
        originalImageUrls.push(publicUrl);
        console.log(`[GW-API] Original image ${i + 1} saved: ${publicUrl}`);
      }

      // Update progress after saving original images
      await updateProgress(
        GWTaskStep.ADDING_TEXT_OVERLAY,
        "Adding text overlay to images...",
        50,
      );

      // Step 3: Add text overlay to images (each scene gets its own voiceover text)
      console.log("[GW-API] Step 3: Adding text overlay to images...");
      console.log(
        "[GW-API] Number of generated images:",
        generatedImageUrls.length,
      );
      console.log("[GW-API] Generated image URLs:", generatedImageUrls);
      const imageBuffers: Buffer[] = [];
      for (let i = 0; i < generatedImageUrls.length; i++) {
        const sceneText = scenes[i]?.voiceover_text || "";
        console.log(
          `[GW-API] Processing image ${i + 1}/${generatedImageUrls.length}: ${generatedImageUrls[i]}`,
        );
        const buffer = await addTextToImage(generatedImageUrls[i], sceneText);
        imageBuffers.push(buffer);
        console.log(
          `[GW-API] Text added to image ${i + 1}/${generatedImageUrls.length}, buffer size: ${buffer.length} bytes`,
        );
      }
      console.log("[GW-API] Total image buffers created:", imageBuffers.length);

      // Update progress after text overlay
      await updateProgress(
        GWTaskStep.GENERATING_AUDIO,
        "Generating audio from script...",
        60,
      );

      // Step 4: Generate audio for each scene (one audio per scene)
      console.log("[GW-API] Step 4: Generating audio for each scene...");
      // Get voice gender from params (default: alloy)
      // Available voices: alloy, echo, fable, onyx, nova, shimmer
      const voiceGender = "male"; //params.options?.voice_gender || "female";
      const voiceType = voiceGender === "male" ? "onyx" : "shimmer";
      console.log("[GW-API] Using voice type:", voiceType);

      const audioBuffers: Buffer[] = [];
      for (let i = 0; i < scenes.length; i++) {
        const sceneText = scenes[i].voiceover_text;
        console.log(
          `[GW-API] Generating audio for scene ${i + 1}/${scenes.length}: "${sceneText.substring(0, 50)}..."`,
        );
        const buf = await this.generateAudio(sceneText, apiKey, voiceType);
        audioBuffers.push(buf);
        console.log(
          `[GW-API] Audio for scene ${i + 1} generated, size: ${buf.length} bytes`,
        );
      }
      console.log("[GW-API] All scene audios generated:", audioBuffers.length);

      // Update progress after audio generation
      await updateProgress(
        GWTaskStep.MERGING_VIDEO,
        "Merging images and audio into video...",
        75,
      );

      // Step 5: Merge to video — each image paired with its own audio
      console.log(
        "[GW-API] Step 5: Merging 3 images with 3 audios into video...",
      );
      const {
        videoUrl,
        imageUrls: savedImageUrls,
        audioUrl,
      } = await this.mergeToVideo(
        imageBuffers,
        audioBuffers,
        taskId,
        this.configs.customStorage,
      );

      // Save analysis to params.options.final_prompt as requested
      if (!params.options) {
        params.options = {};
      }
      params.options.final_prompt = JSON.stringify(analysis);

      console.log("[GW-API] ✓ Video generation completed successfully");
      console.log("[GW-API] Video URL:", videoUrl);
      console.log("[GW-API] Image URLs (with watermark):", savedImageUrls);
      console.log(
        "[GW-API] Original Image URLs (without watermark):",
        originalImageUrls,
      );
      console.log("[GW-API] Audio URL:", audioUrl);

      const result = {
        taskStatus: AITaskStatus.SUCCESS,
        taskId: taskId,
        taskInfo: {
          images: savedImageUrls.map((url) => ({ imageUrl: url })),
          videos: [{ videoUrl: videoUrl }],
          progress: {
            currentStep: GWTaskStep.COMPLETED,
            stepMessage: "Video generation completed successfully",
            progress: 100,
            startedAt: taskStartedAt,
            updatedAt: new Date().toISOString(),
          } as GWTaskProgress,
        },
        taskResult: {
          analysis: analysis,
          video_url: videoUrl,
          image_urls: savedImageUrls,
          original_image_urls: originalImageUrls,
          audio_url: audioUrl,
          enhanced_prompt: JSON.stringify(analysis),
          original_prompt: params.prompt,
          user_feeling: userFeeling,
        },
      };

      // Update database with success status if enabled
      if (updateDatabase && updateAITaskByTaskId) {
        await updateAITaskByTaskId(taskId, {
          status: AITaskStatus.SUCCESS,
          taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
          taskResult: result.taskResult
            ? JSON.stringify(result.taskResult)
            : null,
          options: params.options ? JSON.stringify(params.options) : null,
        });
        console.log("[GW-API] Task", taskId, "status updated to SUCCESS");
        try {
          // Trigger background upload if custom storage is enabled
          if (this.configs.customStorage) {
            console.log("[GW-API] Triggering background upload to R2...");
            // Fire and forget - do not await
            this.uploadTaskFilesToR2(taskId, result).catch((err) => {
              console.error("[GW-API] Background upload failed:", err);
            });
          }
        } catch (err) {
          console.error("[GW-API] Background upload failed:", err);
        }
      }

      return result;
    } catch (error: any) {
      console.error(
        "[GW-API] Generation failed:",
        error,
        updateDatabase,
        updateAITaskByTaskId,
      );
      console.log("[GW-API] Task", taskId, "status updated to FAILED");
      // Update database with failure status if enabled
      if (updateDatabase && updateAITaskByTaskId) {
        // 获取任务记录以获取 creditId，用于积分返还
        const { findAITaskByTaskId } = await import("@/shared/models/ai_task");
        const task = await findAITaskByTaskId(taskId);
        const creditId = task?.creditId || null;

        console.log("[GW-API] Found task for refund, creditId:", creditId);

        await updateAITaskByTaskId(taskId, {
          status: AITaskStatus.FAILED,
          creditId: creditId,
          taskResult: JSON.stringify({
            error: error.message,
            stack: error.stack,
          }),
        });
        console.log(
          "[GW-API] Task",
          taskId,
          "status updated to FAILED with credit refund",
        );
      }

      throw new Error(`GW-API generation failed: ${error.message}`);
    }
  }

  /**
   * Process video generation in background
   * Calls processVideoSync with database update enabled
   */
  private async processVideoInBackground(
    taskId: string,
    params: AIGenerateParams,
    firstImageUrl: string,
    userFeeling: string,
  ): Promise<void> {
    try {
      console.log(
        "[GW-API Background] Starting background processing for task:",
        taskId,
      );

      // Execute video generation with database updates enabled
      await this.processVideoSync(
        taskId,
        params,
        firstImageUrl,
        userFeeling,
        true,
      );

      console.log(
        "[GW-API Background] ✓ Task",
        taskId,
        "completed successfully",
      );
    } catch (error: any) {
      console.error("[GW-API Background] ✗ Task", taskId, "failed:", error);
      // Error is already handled in processVideoSync
    }
  }

  /**
   * Upload task files to R2 in background
   */
  private async uploadTaskFilesToR2(
    taskId: string,
    result: AITaskResult,
  ): Promise<void> {
    try {
      console.log(
        `[GW-API Background Upload] Starting upload for task ${taskId}`,
      );

      // Import only needed modules
      const { updateAITaskByTaskId } = await import("@/shared/models/ai_task");
      const { getTaskWorkDir } = await import("@/shared/utils/file-manager");
      const fs = await import("fs/promises");
      const path = await import("path");

      const workDir = getTaskWorkDir(taskId);

      const files = await fs.readdir(workDir);
      const filesToUpload: AIFile[] = [];

      // Helper to get file content and create AIFile object
      const processFile = async (
        filename: string,
        contentType: string,
        key: string,
        index?: number,
      ) => {
        const filePath = path.join(workDir, filename);

        const { getStorageService } = await import("@/shared/services/storage");
        const storageService = await getStorageService();

        const fileBuffer = await fs.readFile(filePath);

        const uploadResult = await storageService.uploadFile({
          body: fileBuffer,
          key: key,
          contentType: contentType,
          bucket: this.configs.r2_bucket_name,
        });

        if (uploadResult.success && (uploadResult.url || uploadResult.key)) {
          const finalUrl = uploadResult.url || uploadResult.location || "";
          return {
            filename,
            url: replaceR2Url(finalUrl),
            key,
          };
        }

        // Fallback to local public URL if upload failed after all retries
        console.warn(
          `[GW-API Background Upload] R2 upload failed for ${filename} after retries. Falling back to local public URL.`,
        );
        const { getTaskPublicUrl } = await import(
          "@/shared/utils/file-manager"
        );
        return {
          filename,
          url: getTaskPublicUrl(taskId, filename),
          key,
        };
      };

      const uploadedAssets: Record<string, string> = {};
      const uploadedImages: string[] = [];
      const uploadedOriginalImages: string[] = [];

      // Process files
      for (const file of files) {
        let contentType = "application/octet-stream";
        let key = "";

        if (file === "final_video.mp4") {
          contentType = "video/mp4";
          key = this.getR2Key(taskId, file);
          const uploaded = await processFile(file, contentType, key);
          if (uploaded) uploadedAssets["video_url"] = uploaded.url;
        } else if (file === "video_only.mp4") {
          contentType = "video/mp4";
          key = this.getR2Key(taskId, file);
          const uploaded = await processFile(file, contentType, key);
          if (uploaded) uploadedAssets["video_only_url"] = uploaded.url;
        } else if (file === "audio.mp3") {
          contentType = "audio/mpeg";
          key = this.getR2Key(taskId, file);
          const uploaded = await processFile(file, contentType, key);
          if (uploaded) uploadedAssets["audio_url"] = uploaded.url;
        } else if (file.startsWith("input_image.")) {
          contentType = file.endsWith(".jpg") ? "image/jpeg" : "image/png";
          key = this.getR2Key(taskId, file);
          const uploaded = await processFile(file, contentType, key);
          if (uploaded) uploadedAssets["input_image_url"] = uploaded.url;
        } else if (file.startsWith("image_") && file.endsWith(".png")) {
          contentType = "image/png";
          key = this.getR2Key(taskId, file);
          const uploaded = await processFile(file, contentType, key);
          if (uploaded) {
            const match = file.match(/image_(\d+)\.png/);
            if (match) {
              const idx = parseInt(match[1]);
              uploadedImages[idx] = uploaded.url;
            }
          }
        } else if (
          file.startsWith("original_image_") &&
          file.endsWith(".png")
        ) {
          contentType = "image/png";
          key = this.getR2Key(taskId, file);
          const uploaded = await processFile(file, contentType, key);
          if (uploaded) {
            const match = file.match(/original_image_(\d+)\.png/);
            if (match) {
              const idx = parseInt(match[1]);
              uploadedOriginalImages[idx] = uploaded.url;
            }
          }
        }
      }

      // Filter out empty slots if any
      const finalImageUrls = uploadedImages.filter((u) => u);
      const finalOriginalImageUrls = uploadedOriginalImages.filter((u) => u);

      console.log(
        `[GW-API Background Upload] Uploaded ${Object.keys(uploadedAssets).length + finalImageUrls.length + finalOriginalImageUrls.length} files`,
      );

      // Update database with new URLs
      if (Object.keys(uploadedAssets).length > 0) {
        const currentTaskResult =
          typeof result.taskResult === "string"
            ? JSON.parse(result.taskResult)
            : result.taskResult;
        const currentTaskInfo = result.taskInfo || {};

        const updatedTaskResult = {
          ...currentTaskResult,
          video_url: uploadedAssets["video_url"] || currentTaskResult.video_url,
          video_only_url:
            uploadedAssets["video_only_url"] ||
            currentTaskResult.video_only_url,
          audio_url: uploadedAssets["audio_url"] || currentTaskResult.audio_url,
          image_urls:
            finalImageUrls.length > 0
              ? finalImageUrls
              : currentTaskResult.image_urls,
          original_image_urls:
            finalOriginalImageUrls.length > 0
              ? finalOriginalImageUrls
              : currentTaskResult.original_image_urls,
          input_image_url:
            uploadedAssets["input_image_url"] ||
            currentTaskResult.input_image_url,
          saved_video_url: uploadedAssets["video_url"],
          saved_video_urls: uploadedAssets["video_url"]
            ? [uploadedAssets["video_url"]]
            : undefined,
        };

        const updatedTaskInfo = {
          ...currentTaskInfo,
          images: finalImageUrls.map((url) => ({ imageUrl: url })),
          videos: uploadedAssets["video_url"]
            ? [{ videoUrl: uploadedAssets["video_url"] }]
            : currentTaskInfo.videos,
          inputImageUrl: uploadedAssets["input_image_url"],
          progress: {
            ...(currentTaskInfo.progress || {}),
            currentStep: GWTaskStep.COMPLETED,
            stepMessage: "Video generation and upload completed",
            updatedAt: new Date().toISOString(),
          },
        };

        await updateAITaskByTaskId(taskId, {
          taskResult: JSON.stringify(updatedTaskResult),
          taskInfo: JSON.stringify(updatedTaskInfo),
        });

        console.log(
          `[GW-API Background Upload] Task ${taskId} updated with CDN URLs`,
        );

        // Send email notification to user
        try {
          const { findAITaskByTaskId } = await import(
            "@/shared/models/ai_task"
          );
          const task = await findAITaskByTaskId(taskId);
          if (task?.userId) {
            // Send in-app notification
            try {
              const { notifyVideoComplete } = await import(
                "@/shared/services/notification"
              );
              await notifyVideoComplete({
                userId: task.userId,
                taskId,
                videoUrl: uploadedAssets["video_url"] || "",
              });
            } catch (notifyError) {
              console.error(
                "[GW-API Background Upload] Failed to send in-app notification:",
                notifyError,
              );
            }

            const [userData] = await db()
              .select({ name: user.name, email: user.email })
              .from(user)
              .where(eq(user.id, task.userId));

            if (userData?.email) {
              const emailService = await getEmailService();
              const videoUrl = uploadedAssets["video_url"];

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
          <a href="${videoUrl}" class="video-link" target="_blank">Watch Your Video 📺</a>
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

Watch your video here: ${videoUrl}

Feel free to share this blessing with your loved ones!

🙏 May God's peace be with you always
fearnotforiamwithyou.com`.trim(),
              });
              console.log(
                `[GW-API Background Upload] Email sent to ${userData.email}`,
              );
            }
          }
        } catch (emailError) {
          console.error(
            "[GW-API Background Upload] Failed to send email:",
            emailError,
          );
        }
      }
    } catch (error) {
      console.error(
        `[GW-API Background Upload] Failed for task ${taskId}:`,
        error,
      );
    }
  }

  /**
   * Generate task
   */
  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    if (params.mediaType !== AIMediaType.VIDEO) {
      throw new Error(`mediaType not supported: ${params.mediaType}`);
    }

    return this.generateVideo({ params });
  }

  /**
   * Query video task status from database
   */
  async queryVideo({ taskId }: { taskId: string }): Promise<AITaskResult> {
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
    const taskStatus = this.mapStatus(task.status);

    return {
      taskId: task.taskId || taskId,
      taskStatus,
      taskInfo,
      taskResult,
    };
  }

  /**
   * Query task
   */
  async query({
    taskId,
    mediaType,
  }: {
    taskId: string;
    mediaType?: string;
  }): Promise<AITaskResult> {
    if (mediaType === AIMediaType.VIDEO) {
      return this.queryVideo({ taskId });
    }

    throw new Error(`mediaType not supported: ${mediaType}`);
  }
}

export function createGWAPIProvider(configs: GWAPIConfigs): GWAPIProvider {
  return new GWAPIProvider(configs);
}
