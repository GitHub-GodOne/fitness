import { getUuid } from '@/shared/lib/hash';
import { replaceR2Url } from '@/shared/lib/url';
import sharp from 'sharp';
import { saveFiles } from '.';
import {
    AIConfigs,
    AIFile,
    AIGenerateParams,
    AIMediaType,
    AIProvider,
    AITaskResult,
    AITaskStatus,
    AIVideo,
} from './types';

/**
 * Volcano Engine configs for SP (Scripture Picture) provider
 */
export interface VolcanoSPConfigs extends AIConfigs {
    apiKey: string;
    customStorage?: boolean;
}

/**
 * Image-to-Text response format
 */
interface ImageToTextResponse {
    analysis: {
        emotion: string;
        visual_summary: string;
    };
    biblical_context: {
        scene: string;
        reasoning: string;
    };
    image_generation_prompt: string;
    audio_script: string;
    verse_reference: string;
}

/**
 * Scripture Picture Provider
 * Workflow: Image+Text -> Analysis -> Generate 3 Images -> Add Text Overlay -> Generate 3 Audios -> Merge Video
 */
export class VolcanoSPProvider implements AIProvider {
    readonly name = 'sp';
    configs: VolcanoSPConfigs;
    private baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';

    constructor(configs: VolcanoSPConfigs) {
        this.configs = configs;
    }

    /**
     * Convert relative URL to absolute public URL
     * For server-side access (like image-to-image API), use localhost to avoid SSL issues
     */
    private toAbsoluteUrl(url: string): string {
        // Already absolute URL
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        // Already base64 data URL
        if (url.startsWith('data:')) {
            return url;
        }

        // Convert relative URL to absolute
        if (url.startsWith('/')) {
            // For server-side internal access, always use localhost to avoid SSL issues
            const port = process.env.PORT || 3000;
            const baseUrl = `http://localhost:${port}`;
            return `${baseUrl}${url}`;
        }

        return url;
    }

    /**
     * Convert image URL to base64
     */
    private async convertImageToBase64(imageUrl: string): Promise<string> {
        if (imageUrl.startsWith('data:image/')) {
            return imageUrl;
        }

        try {
            let fetchUrl = imageUrl;

            // Handle relative URLs (local files) - always use localhost for server-side access
            if (imageUrl.startsWith('/')) {
                const port = process.env.PORT || 3000;
                fetchUrl = `http://localhost:${port}${imageUrl}`;
            }

            const response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            let contentType = response.headers.get('content-type') || 'image/png';

            if (!contentType.startsWith('image/')) {
                const urlLower = imageUrl.toLowerCase();
                if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
                    contentType = 'image/jpeg';
                } else if (urlLower.includes('.png')) {
                    contentType = 'image/png';
                } else {
                    contentType = 'image/png';
                }
            }

            const base64 = buffer.toString('base64');
            return `data:${contentType};base64,${base64}`;
        } catch (error: any) {
            console.error('[SP] Failed to convert image to base64:', error);
            throw new Error(`Failed to convert image to base64: ${error.message}`);
        }
    }

    /**
     * Step 1: Image + Text -> Analysis (图文生文)
     */
    private async analyzeImageAndText(
        imageUrl: string,
        userFeeling: string,
        apiKey: string,
        visionModel: string
    ): Promise<ImageToTextResponse> {
        const systemPrompt = `# ROLE DEFINITION
You are a divine digital companion, a "Visual Theologian" designed to comfort people in distress. Your goal is to analyze user input (image + text), understand their pain, and bridge their reality with a Biblical scene that offers hope and peace.

# TARGET AUDIENCE
Americans seeking spiritual comfort. Use a tone that is compassionate, fatherly, and authoritative yet gentle (like the voice of God or a wise elder).

# TASKS
1. **Analyze:** deeply understand the emotion and context from the user's text and the visual elements of their uploaded image.
2. **Match:** Select a specific Biblical scene or concept that directly addresses their specific struggle (e.g., Fear -> Jesus calming the storm; Loneliness -> The Good Shepherd; Exhaustion -> Elijah under the broom tree).
3. **Draft Image Prompt:** Create a detailed prompt for an image generation AI (like Midjourney/SDXL).
   - **Logic:** Keep the *composition* or *subject* of the user's image but transform the *environment* and *atmosphere* into the chosen Biblical scene.
   - **Style:** Cinematic, Renaissance oil painting style, warm divine lighting, ethereal, 8k resolution, highly detailed.
4. **Select Scripture:** Choose the most comforting Bible verse (NIV or KJV version) fitting the situation.
5. **Draft Audio Script:** Write a short, spoken-word script. It should start with a personalized comforting sentence (calling them "My child") and then read the verse.

# OUTPUT FORMAT (JSON ONLY)
You must output ONLY a valid JSON object with the following structure:
{
  "analysis": {
    "emotion": "String (e.g., Overwhelming Anxiety)",
    "visual_summary": "String (e.g., A chaotic messy desk in a dark room)"
  },
  "biblical_context": {
    "scene": "String (e.g., Jesus walking on water)",
    "reasoning": "String (Why this scene fits the emotion)"
  },
  "image_generation_prompt": "String (The exact prompt for Stable Diffusion/Midjourney. Include style keywords like 'cinematic lighting', 'divine atmosphere', 'oil painting style'.)",
  "audio_script": "String (The text for TTS. E.g., 'My child, do not be afraid... [Verse]')",
  "verse_reference": "String (e.g., Matthew 14:27, NIV)"
}`;

        const base64Image = await this.convertImageToBase64(imageUrl);

        const apiUrl = `${this.baseUrl}/chat/completions`;
        const payload = {
            model: visionModel,
            temperature: 0.7,
            top_p: 0.95,
            max_tokens: 4096,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: base64Image },
                        },
                        {
                            type: 'text',
                            text: `User feelings: ${userFeeling}`,
                        },
                    ],
                },
            ],
        };

        const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`Analysis failed: ${resp.status}, ${errorText}`);
        }

        const data = await resp.json();
        const responseText = data.choices?.[0]?.message?.content || '';

        if (!responseText) {
            throw new Error('Empty response from analysis API');
        }

        // Parse JSON response
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        return JSON.parse(jsonText);
    }

    /**
     * Step 2: Generate 3 images (文生图)
     */
    private async generateImages(
        prompt: string,
        apiKey: string,
        count: number = 3
    ): Promise<string[]> {
        const apiUrl = `${this.baseUrl}/images/generations`;
        const imageUrls: string[] = [];

        for (let i = 0; i < count; i++) {
            const payload = {
                model: 'doubao-seedream-4-5-251128',
                prompt: prompt,
                sequential_image_generation: 'disabled',
                response_format: 'url',
                size: '2K',
                stream: false,
                watermark: false,
            };

            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(payload),
            });

            if (!resp.ok) {
                const errorText = await resp.text();
                throw new Error(`Image generation ${i + 1} failed: ${resp.status}, ${errorText}`);
            }

            const data = await resp.json();
            const imageUrl = data.data?.[0]?.url || data.url;

            if (!imageUrl) {
                throw new Error(`No image URL in response for image ${i + 1}`);
            }

            imageUrls.push(imageUrl);
            console.log(`[SP] Generated image ${i + 1}/${count}:`, imageUrl);
        }

        return imageUrls;
    }

    /**
     * Step 2b: Generate images from reference image (图生图)
     * Generates multiple images in parallel for better performance
     */
    private async generateImagesFromImage(
        prompt: string,
        referenceImageUrl: string,
        apiKey: string,
        count: number = 3
    ): Promise<string[]> {
        const apiUrl = `${this.baseUrl}/images/generations`;

        // Convert relative URL to absolute public URL for external API
        const absoluteImageUrl = this.toAbsoluteUrl(referenceImageUrl);
        console.log('[SP] Reference image URL:', referenceImageUrl, '-> Absolute:', absoluteImageUrl);

        // Create array of promises for parallel generation with retry logic
        const generatePromises = Array.from({ length: count }, async (_, i) => {
            const payload = {
                model: 'doubao-seedream-4-5-251128',
                prompt: prompt,
                image: absoluteImageUrl,
                sequential_image_generation: 'disabled',
                response_format: 'url',
                size: '2K',
                stream: false,
                watermark: false,
            };

            const maxRetries = 3;
            let lastError: Error | null = null;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`[SP] Generating image ${i + 1}/${count}, attempt ${attempt}/${maxRetries}...`);

                    const resp = await fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                        },
                        body: JSON.stringify(payload),
                    });

                    if (!resp.ok) {
                        const errorText = await resp.text();
                        throw new Error(`HTTP ${resp.status}: ${errorText}`);
                    }

                    const data = await resp.json();
                    const imageUrl = data.data?.[0]?.url || data.url;

                    if (!imageUrl) {
                        throw new Error('No image URL in response');
                    }

                    console.log(`[SP] ✓ Generated image from reference ${i + 1}/${count}:`, imageUrl);
                    return imageUrl;

                } catch (error: any) {
                    lastError = error;
                    console.warn(`[SP] ✗ Image ${i + 1}/${count} attempt ${attempt} failed:`, error.message);

                    if (attempt < maxRetries) {
                        const waitTime = attempt * 2000; // 2s, 4s, 6s
                        console.log(`[SP] Retrying in ${waitTime / 1000}s...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }
            }

            throw new Error(`Image-to-image generation ${i + 1} failed after ${maxRetries} attempts: ${lastError?.message}`);
        });

        // Wait for all images to be generated in parallel
        const imageUrls = await Promise.all(generatePromises);
        return imageUrls;
    }

    /**
     * Step 3: Add text overlay to images (图片文字融合)
     */
    private async addTextToImage(
        imageUrl: string,
        text: string
    ): Promise<Buffer> {
        // Download image
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        const image = sharp(imageBuffer);
        const { width, height } = await image.metadata();

        if (!width || !height) {
            throw new Error('Failed to get image dimensions');
        }

        const fontSize = Math.floor(width / 40); // 进一步减小字体大小（从 /30 改为 /40）
        const lineHeight = fontSize * 1.5;
        const sidePadding = width * 0.18; // 增加侧边距（从 0.15 改为 0.18）
        const maxTextWidth = width - sidePadding * 2;

        // Wrap text
        const lines = this.wrapTextSafe(text, maxTextWidth, fontSize);
        const totalHeight = lineHeight * (lines.length - 1);
        const bottomPadding = fontSize * 3; // 增加底部边距（从 2.5 改为 3）
        const startY = height - bottomPadding - totalHeight;

        const tspans = lines
            .map(
                (line, i) =>
                    `<tspan x="${width / 2}" dy="${i === 0 ? 0 : lineHeight}">
                        ${this.escapeXml(line)}
                    </tspan>`
            )
            .join('\n');

        const svg = `
<svg width="${width}" height="${height}">
  <style>
    .text {
      font-family: 'Great Vibes', cursive;
      font-size: ${fontSize}px;
      fill: white;
      text-anchor: middle;
      filter: drop-shadow(0 6px 10px rgba(0,0,0,0.75));
    }
  </style>
  <text x="${width / 2}" y="${startY}" class="text">
    ${tspans}
  </text>
</svg>
`;

        const outputBuffer = await image
            .composite([{ input: Buffer.from(svg) }])
            .png()
            .toBuffer();

        return outputBuffer;
    }

    /**
     * Text wrapping helper
     */
    private wrapTextSafe(text: string, maxWidthPx: number, fontSize: number): string[] {
        const words = text.split(' ');
        const lines: string[] = [];
        const charPx = fontSize * 0.48;
        const maxUnits = maxWidthPx / charPx;
        let line = '';

        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            const units = this.estimateWidthUnits(test);

            if (units <= maxUnits) {
                line = test;
            } else {
                if (line) lines.push(line);
                line = word;
            }
        }

        if (line) lines.push(line);
        return lines;
    }

    /**
     * Estimate text width
     */
    private estimateWidthUnits(text: string): number {
        let w = 0;
        for (const ch of text) {
            if (ch === ' ') w += 0.38;
            else if (/[A-Z]/.test(ch)) w += 0.9;
            else if (/[.,]/.test(ch)) w += 0.28;
            else w += 0.78;
        }
        return w;
    }

    /**
     * Escape XML special characters
     */
    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Step 4: Generate audio (文生音频) - Using Volcano TTS WebSocket API
     * Using the correct protocol implementation from protocols.ts
     */
    private async generateAudio(
        text: string,
        apiKey: string,
        appId: string,
        voiceType: string = 'zh_female_shuangkuaisisi_moon_bigtts'
    ): Promise<Buffer> {
        const WebSocket = require('ws');
        const crypto = require('crypto');
        const { MsgType, ReceiveMessage, FullClientRequest } = require('./protocols');

        // Volcano TTS WebSocket endpoint
        const wsUrl = 'wss://openspeech.bytedance.com/api/v1/tts/ws_binary';

        console.log('[SP TTS] Connecting with credentials:', {
            appId: appId,
            tokenLength: apiKey.length,
            voiceType: voiceType
        });

        const headers = {
            Authorization: `Bearer;${apiKey}`,
        };

        const ws = new WebSocket(wsUrl, {
            headers,
            skipUTF8Validation: true,
        });

        await new Promise((resolve, reject) => {
            ws.on('open', resolve);
            ws.on('error', reject);
        });

        console.log('[SP TTS] WebSocket connected');

        // Build request payload
        const request = {
            app: {
                appid: appId,
                token: apiKey,
                cluster: 'volcano_tts',
            },
            user: {
                uid: crypto.randomUUID(),
            },
            audio: {
                voice_type: voiceType,
                encoding: 'mp3',
            },
            request: {
                reqid: crypto.randomUUID(),
                text: text,
                operation: 'submit',
            },
        };

        // Send request using protocol
        await FullClientRequest(
            ws,
            new TextEncoder().encode(JSON.stringify(request))
        );

        console.log('[SP TTS] Request sent:', { text: text.substring(0, 50) + '...' });

        const totalAudio: Uint8Array[] = [];

        try {
            while (true) {
                const msg = await ReceiveMessage(ws);
                console.log(`[SP TTS] ${msg.toString()}`);

                switch (msg.type) {
                    case MsgType.FrontEndResultServer:
                        break;
                    case MsgType.AudioOnlyServer:
                        totalAudio.push(msg.payload);
                        break;
                    case MsgType.Error:
                        throw new Error(`TTS error: ${new TextDecoder().decode(msg.payload)}`);
                    default:
                        console.warn('[SP TTS] Unknown message type:', msg.type);
                }

                if (
                    msg.type === MsgType.AudioOnlyServer &&
                    msg.sequence !== undefined &&
                    msg.sequence < 0
                ) {
                    console.log('[SP TTS] Received last audio chunk');
                    break;
                }
            }

            if (totalAudio.length === 0) {
                throw new Error('No audio data received');
            }

            const totalLength = totalAudio.reduce((sum, chunk) => sum + chunk.length, 0);
            const audioBuffer = Buffer.alloc(totalLength);
            let offset = 0;
            for (const chunk of totalAudio) {
                audioBuffer.set(chunk, offset);
                offset += chunk.length;
            }

            console.log('[SP TTS] Audio generated:', audioBuffer.length, 'bytes');

            ws.close();
            return audioBuffer;

        } catch (error) {
            ws.close();
            throw error;
        }
    }

    /**
     * Step 5: Merge images and audio into video
     * Combines 3 images with 1 audio, each image displays for equal duration
     * Saves all files to public/video/{date}/{taskId}
     */
    private async mergeToVideo(
        imageBuffers: Buffer[],
        audioBuffer: Buffer,
        taskId: string
    ): Promise<{ videoUrl: string; imageUrls: string[]; audioUrl: string }> {
        const ffmpeg = require('fluent-ffmpeg');
        const fs = require('fs').promises;
        const path = require('path');
        const { getTaskWorkDir, getTaskPublicUrl, ensureTaskWorkDir } = require('@/shared/utils/file-manager');

        // Use task work directory instead of temp directory
        const workDir = await ensureTaskWorkDir(taskId);

        try {
            console.log('[SP Video] Starting video merge process...');
            console.log('[SP Video] Images:', imageBuffers.length, 'Audio: 1');

            // Step 1: Save all images to work directory
            const imagePaths: string[] = [];
            const imageUrls: string[] = [];
            for (let i = 0; i < imageBuffers.length; i++) {
                const filename = `image_${i}.png`;
                const imagePath = path.join(workDir, filename);
                await fs.writeFile(imagePath, imageBuffers[i]);
                imagePaths.push(imagePath);
                imageUrls.push(getTaskPublicUrl(taskId, filename));
                console.log(`[SP Video] Saved image ${i + 1}:`, imagePath);
            }

            // Step 2: Save audio file
            const audioFilename = 'audio.mp3';
            const audioPath = path.join(workDir, audioFilename);
            await fs.writeFile(audioPath, audioBuffer);
            const audioUrl = getTaskPublicUrl(taskId, audioFilename);
            console.log('[SP Video] Saved audio:', audioPath);

            // Step 3: Get audio duration using ffprobe
            const audioDuration = await new Promise<number>((resolve, reject) => {
                ffmpeg.ffprobe(audioPath, (err: Error, metadata: any) => {
                    if (err) {
                        reject(err);
                    } else {
                        const duration = metadata.format.duration;
                        console.log('[SP Video] Audio duration:', duration, 'seconds');
                        resolve(duration);
                    }
                });
            });

            // Calculate duration for each image (equal distribution)
            const imageDuration = audioDuration / imageBuffers.length;
            console.log('[SP Video] Each image duration:', imageDuration, 'seconds');

            // Step 4: Create video segments (each image with calculated duration)
            const segmentPaths: string[] = [];

            for (let i = 0; i < imagePaths.length; i++) {
                const segmentPath = path.join(workDir, `segment_${i}.mp4`);

                await new Promise<void>((resolve, reject) => {
                    ffmpeg()
                        .input(imagePaths[i])
                        .inputOptions(['-loop 1', '-t', imageDuration.toString()]) // Loop image for calculated duration
                        .outputOptions([
                            '-c:v libx264',           // Video codec
                            '-tune stillimage',       // Optimize for still images
                            '-pix_fmt yuv420p',       // Pixel format for compatibility
                            '-r 25',                  // Frame rate
                            '-movflags +faststart'    // Enable fast start for web playback
                        ])
                        .output(segmentPath)
                        .on('start', (cmd: string) => {
                            console.log(`[SP Video] Creating image segment ${i + 1}:`, cmd);
                        })
                        .on('end', () => {
                            console.log(`[SP Video] Image segment ${i + 1} created successfully`);
                            resolve();
                        })
                        .on('error', (err: Error) => {
                            console.error(`[SP Video] Error creating image segment ${i + 1}:`, err);
                            reject(err);
                        })
                        .run();
                });

                segmentPaths.push(segmentPath);
            }

            // Step 5: Create concat file for ffmpeg
            const concatFilePath = path.join(workDir, 'concat.txt');
            const concatContent = segmentPaths
                .map(p => `file '${path.basename(p)}'`)
                .join('\n');
            await fs.writeFile(concatFilePath, concatContent);
            console.log('[SP Video] Concat file created:', concatFilePath);

            // Step 6: Concatenate video segments
            const videoOnlyPath = path.join(workDir, 'video_only.mp4');

            await new Promise<void>((resolve, reject) => {
                ffmpeg()
                    .input(concatFilePath)
                    .inputOptions(['-f concat', '-safe 0'])
                    .outputOptions([
                        '-c copy',                // Copy streams without re-encoding
                        '-movflags +faststart'    // Enable fast start
                    ])
                    .output(videoOnlyPath)
                    .on('start', (cmd: string) => {
                        console.log('[SP Video] Concatenating image segments:', cmd);
                    })
                    .on('end', () => {
                        console.log('[SP Video] Image segments concatenated successfully');
                        resolve();
                    })
                    .on('error', (err: Error) => {
                        console.error('[SP Video] Error concatenating segments:', err);
                        reject(err);
                    })
                    .run();
            });

            // Step 7: Merge video with audio
            const videoFilename = 'final_video.mp4';
            const finalVideoPath = path.join(workDir, videoFilename);

            await new Promise<void>((resolve, reject) => {
                ffmpeg()
                    .input(videoOnlyPath)
                    .input(audioPath)
                    .outputOptions([
                        '-c:v copy',              // Copy video stream
                        '-c:a aac',               // Audio codec
                        '-b:a 192k',              // Audio bitrate
                        '-shortest',              // End when shortest input ends
                        '-movflags +faststart'    // Enable fast start
                    ])
                    .output(finalVideoPath)
                    .on('start', (cmd: string) => {
                        console.log('[SP Video] Merging video with audio:', cmd);
                    })
                    .on('end', () => {
                        console.log('[SP Video] Final video created successfully');
                        resolve();
                    })
                    .on('error', (err: Error) => {
                        console.error('[SP Video] Error merging video with audio:', err);
                        reject(err);
                    })
                    .run();
            });

            // Step 8: Get video public URL
            const videoUrl = getTaskPublicUrl(taskId, videoFilename);
            console.log('[SP Video] Video created:', videoUrl);
            console.log('[SP Video] All files saved to:', workDir);

            return {
                videoUrl,
                imageUrls,
                audioUrl,
            };

        } catch (error) {
            console.error('[SP Video] Video merge failed:', error);
            throw error;
        }
    }

    /**
     * Map status
     */
    private mapStatus(status: string): AITaskStatus {
        switch (status?.toLowerCase()) {
            case 'pending':
            case 'queued':
                return AITaskStatus.PENDING;
            case 'processing':
            case 'running':
                return AITaskStatus.PROCESSING;
            case 'success':
            case 'completed':
            case 'succeeded':
                return AITaskStatus.SUCCESS;
            case 'failed':
            case 'error':
                return AITaskStatus.FAILED;
            case 'canceled':
            case 'cancelled':
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
            throw new Error('userFeeling is required');
        }

        // Get image input
        const imageInput = params.options?.image_input;
        const hasImage = imageInput && Array.isArray(imageInput) && imageInput.length > 0;
        const firstImageUrl = hasImage ? imageInput[0] : null;

        if (!firstImageUrl) {
            throw new Error('Image input is required for SP provider');
        }

        // Generate task ID first
        const taskId = getUuid();

        params.async = true;
        // Check if async mode is enabled
        if (params.async) {
            console.log('[SP] Async mode enabled, scheduling background processing for task:', taskId);

            // Note: The actual AI task record will be created by the API route
            // We add a small delay to ensure the API route creates the record first
            // before background processing starts updating it
            setTimeout(() => {
                this.processVideoInBackground(taskId, params, firstImageUrl, userFeeling).catch((error: any) => {
                    console.error('[SP] Background processing failed for task:', taskId, error);
                });
            }, 100); // 100ms delay to ensure API route creates the record first

            console.log('[SP] Background processing scheduled for task:', taskId);

            // Return immediately with pending status
            return {
                taskStatus: AITaskStatus.PENDING,
                taskId: taskId,
                taskInfo: {
                    status: 'processing',
                },
                taskResult: {
                    message: 'Video generation started in background',
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
        updateDatabase: boolean = true
    ): Promise<AITaskResult> {
        // Import dependencies
        const { getAllConfigs } = await import('@/shared/models/config');
        let updateAITaskByTaskId: any = null;

        if (updateDatabase) {
            const aiTaskModule = await import('@/shared/models/ai_task');
            updateAITaskByTaskId = aiTaskModule.updateAITaskByTaskId;
        }

        // Get API credentials
        const configs = await getAllConfigs();
        const apiKey = configs.volcano_api_key || process.env.VOLCANO_API_KEY || this.configs.apiKey;
        const visionModel = configs.volcano_doubao_vision_endpoint || process.env.VOLCANO_DOUBAO_VISION_ENDPOINT || 'doubao-1-5-vision-pro-32k-250115';
        const appId = configs.volcano_tts_app_id || process.env.VOLCANO_TTS_APP_ID || '';
        const ttsAccessToken = configs.volcano_tts_access_token || process.env.VOLCANO_TTS_ACCESS_TOKEN || apiKey;

        if (!apiKey) {
            throw new Error('Volcano API key is required');
        }

        if (!appId) {
            throw new Error('Volcano TTS App ID is required');
        }

        console.log('[SP] Starting Scripture Picture generation workflow...');

        try {
            // Update status to processing if database update is enabled
            if (updateDatabase && updateAITaskByTaskId) {
                await updateAITaskByTaskId(taskId, {
                    status: AITaskStatus.PROCESSING,
                });
                console.log('[SP] Task', taskId, 'status updated to PROCESSING');
            }
            // Step 1: Analyze image and text
            console.log('[SP] Step 1: Analyzing image and text...');
            const analysis = await this.analyzeImageAndText(
                firstImageUrl,
                userFeeling,
                apiKey,
                visionModel
            );

            console.log('[SP] Analysis complete:', analysis);

            // Save analysis to params.options.final_prompt
            if (!params.options) {
                params.options = {};
            }
            params.options.final_prompt = JSON.stringify(analysis, null, 2);
            params.options.original_prompt = params.prompt || '';
            params.options.user_feeling = userFeeling;

            // Step 2: Generate 3 images from reference image (图生图)
            console.log('[SP] Step 2: Generating 3 images from reference image...');
            const generatedImageUrls = await this.generateImagesFromImage(
                analysis.image_generation_prompt,
                firstImageUrl,
                apiKey,
                3
            );
            console.log('[SP] Images generated from reference:', generatedImageUrls);

            // Step 2.5: Download and save original generated images (without watermark)
            console.log('[SP] Step 2.5: Saving original generated images...');
            const { ensureTaskWorkDir } = await import('@/shared/utils/file-manager');
            const workDir = await ensureTaskWorkDir(taskId);
            const fs = await import('fs/promises');
            const path = await import('path');
            const originalImageUrls: string[] = [];

            for (let i = 0; i < generatedImageUrls.length; i++) {
                const response = await fetch(generatedImageUrls[i]);
                if (!response.ok) {
                    throw new Error(`Failed to download generated image ${i + 1}: ${response.status}`);
                }
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const originalImagePath = path.join(workDir, `original_image_${i}.png`);
                await fs.writeFile(originalImagePath, buffer);
                const publicUrl = originalImagePath.replace(/^.*\/public/, '');
                originalImageUrls.push(publicUrl);
                console.log(`[SP] Original image ${i + 1} saved: ${publicUrl}`);
            }

            // Step 3: Add text overlay to images
            console.log('[SP] Step 3: Adding text overlay to images...');
            const imageBuffers: Buffer[] = [];
            for (let i = 0; i < generatedImageUrls.length; i++) {
                const buffer = await this.addTextToImage(
                    generatedImageUrls[i],
                    analysis.audio_script
                );
                imageBuffers.push(buffer);
                console.log(`[SP] Text added to image ${i + 1}/3`);
            }

            // Step 4: Generate 1 audio
            console.log('[SP] Step 4: Generating audio...');
            // Get voice gender from params (default: female)
            const voiceGender = params.options?.voice_gender || 'female';
            const voiceType = voiceGender === 'male'
                ? 'zh_male_wennuanahu_moon_bigtts'
                : 'zh_female_shuangkuaisisi_moon_bigtts';
            console.log('[SP] Using voice type:', voiceType);

            const audioBuffer = await this.generateAudio(
                analysis.audio_script,
                ttsAccessToken,
                appId,
                voiceType
            );
            console.log('[SP] Audio generated');

            // Step 5: Merge to video and save all files (using taskId from function parameter)
            console.log('[SP] Step 5: Merging 3 images with 1 audio into video...');
            const { videoUrl, imageUrls: savedImageUrls, audioUrl } = await this.mergeToVideo(
                imageBuffers,
                audioBuffer,
                taskId
            );

            // Save analysis to params.options.final_prompt as requested
            if (!params.options) {
                params.options = {};
            }
            params.options.final_prompt = JSON.stringify(analysis);

            console.log('[SP] ✓ Video generation completed successfully');
            console.log('[SP] Video URL:', videoUrl);
            console.log('[SP] Image URLs (with watermark):', savedImageUrls);
            console.log('[SP] Original Image URLs (without watermark):', originalImageUrls);
            console.log('[SP] Audio URL:', audioUrl);

            const result = {
                taskStatus: AITaskStatus.SUCCESS,
                taskId: taskId,
                taskInfo: {
                    images: savedImageUrls.map(url => ({ imageUrl: url })),
                    videos: [{ videoUrl: videoUrl }],
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
                    taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
                    options: params.options ? JSON.stringify(params.options) : null,
                });
                console.log('[SP] Task', taskId, 'status updated to SUCCESS');
            }

            return result;

        } catch (error: any) {
            console.error('[SP] Generation failed:', error);

            // Update database with failure status if enabled
            if (updateDatabase && updateAITaskByTaskId) {
                await updateAITaskByTaskId(taskId, {
                    status: AITaskStatus.FAILED,
                    taskResult: JSON.stringify({
                        error: error.message,
                        stack: error.stack,
                    }),
                });
                console.log('[SP] Task', taskId, 'status updated to FAILED');
            }

            throw new Error(`SP generation failed: ${error.message}`);
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
        userFeeling: string
    ): Promise<void> {
        try {
            console.log('[SP Background] Starting background processing for task:', taskId);

            // Execute video generation with database updates enabled
            await this.processVideoSync(taskId, params, firstImageUrl, userFeeling, true);

            console.log('[SP Background] ✓ Task', taskId, 'completed successfully');
        } catch (error: any) {
            console.error('[SP Background] ✗ Task', taskId, 'failed:', error);
            // Error is already handled in processVideoSync
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
        const { findAITaskByTaskId } = await import('@/shared/models/ai_task');

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

export function createVolcanoSPProvider(configs: VolcanoSPConfigs): VolcanoSPProvider {
    return new VolcanoSPProvider(configs);
}
