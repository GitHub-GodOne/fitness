import { replaceR2Url } from '@/shared/lib/url';
import {
    AIConfigs,
    AIFile,
    AIGenerateParams,
    AIMediaType,
    AIProvider,
    AITaskResult,
    AITaskStatus,
} from './types';

/**
 * Fitness Video Provider configs
 */
export interface FitnessVideoConfigs extends AIConfigs {
    apiKey: string;
    customStorage?: boolean;
    baseUrl?: string;
    visionModel?: string;
    videoModel?: string;
    visionApiUrl?: string;
    videoApiUrl?: string;
    r2_bucket_name?: string;
}

/**
 * Fitness Task Step enum - defines each step in the fitness video generation workflow
 */
export enum FitnessTaskStep {
    PENDING = 'pending',
    ANALYZING = 'analyzing',
    GENERATING_SCRIPTS = 'generating_scripts',
    GENERATING_VIDEO_1 = 'generating_video_1',
    GENERATING_VIDEO_2 = 'generating_video_2',
    GENERATING_VIDEO_3 = 'generating_video_3',
    EXTRACTING_LAST_FRAME = 'extracting_last_frame',
    MERGING_VIDEOS = 'merging_videos',
    UPLOADING_TO_R2 = 'uploading_to_r2',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

/**
 * Fitness Task Progress info stored in taskInfo
 */
export interface FitnessTaskProgress {
    currentStep: FitnessTaskStep;
    stepMessage: string;
    progress: number; // 0-100
    startedAt: string;
    updatedAt: string;
}

/**
 * Video segment script for each 8-second clip
 */
interface VideoSegmentScript {
    segmentNumber: number;
    prompt: string; // Full prompt for veo3.1 including voice narration
    narration: string; // The spoken text (must be speakable in ~8 seconds)
    exerciseName: string;
    instructions: string;
}

/**
 * Fitness analysis response from image + text analysis
 */
interface FitnessAnalysisResponse {
    identifiedObjects: string[]; // Objects that can be used for exercise
    targetMuscleGroup: string; // User's selected muscle group
    exercisePlan: {
        totalSegments: number; // Number of video segments (1-3)
        segments: VideoSegmentScript[];
    };
    safetyNotes: string;
}

/**
 * Veo3.1 video generation response
 */
interface Veo31GenerationResponse {
    task_id: string;
}

/**
 * Veo3.1 video query response
 */
interface Veo31QueryResponse {
    data: {
        output: string;
    };
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'SUCCESS' | 'FAILURE';
    video_url?: string;
    error?: string;
}

/**
 * Fitness Video Provider
 * Workflow: 
 * 1. Image + Target Muscle -> Analysis (identify objects, generate exercise scripts)
 * 2. Generate Video 1 with veo3.1 (8s, with voice narration)
 * 3. Extract last frame from Video 1
 * 4. Generate Video 2 using last frame (8s, with voice narration)
 * 5. Extract last frame from Video 2
 * 6. Generate Video 3 using last frame (8s, with voice narration)
 * 7. Merge all videos into final video
 */
export class FitnessVideoProvider implements AIProvider {
    readonly name = 'fitness-video';
    configs: FitnessVideoConfigs;

    private baseUrl: string;
    private visionModel: string;
    private videoModel: string;
    private visionApiUrl: string;
    private videoApiUrl: string;

    constructor(configs: FitnessVideoConfigs) {
        this.configs = configs;
        this.baseUrl = configs.baseUrl || 'https://ai.comfly.chat';
        this.visionModel = configs.visionModel || 'gemini-3-flash-preview';
        this.videoModel = configs.videoModel || 'veo3.1-fast';
        this.visionApiUrl = configs.visionApiUrl || `${this.baseUrl}/v1/chat/completions`;
        this.videoApiUrl = configs.videoApiUrl || `${this.baseUrl}/v2/videos/generations`;
    }

    /**
     * Fetch with retry logic for handling timeout errors
     * @param timeoutMs - Optional timeout in milliseconds (default: 60000 for regular requests, use higher for large files)
     */
    private async fetchWithRetry(
        url: string,
        options: RequestInit,
        maxRetries: number = 3,
        retryDelayMs: number = 2000,
        timeoutMs: number = 60000
    ): Promise<Response> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                console.log('fetchWithRetry error', error);
                lastError = error instanceof Error ? error : new Error(String(error));
                const errorMessage = lastError.message || '';
                const causeString = lastError.cause?.toString() || '';

                const isRetryableError =
                    errorMessage.includes('fetch failed') ||
                    errorMessage.includes('terminated') ||
                    errorMessage.includes('aborted') ||
                    causeString.includes('TIMEOUT') ||
                    causeString.includes('UND_ERR_HEADERS_TIMEOUT') ||
                    causeString.includes('UND_ERR_BODY_TIMEOUT') ||
                    causeString.includes('ECONNRESET') ||
                    causeString.includes('ETIMEDOUT');

                if (isRetryableError && attempt < maxRetries) {
                    const delay = retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
                    console.warn(`[Fitness] Fetch attempt ${attempt} failed (${errorMessage}), retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                continue;
            }
        }

        throw lastError || new Error('Fetch failed after retries');
    }

    /**
 * Download file with retry logic - includes both fetch and body reading
 * This handles Body Timeout errors that occur during arrayBuffer() reading
 */
    private async downloadWithRetry(
        url: string,
        maxRetries: number = 3,
        retryDelayMs: number = 5000,
        timeoutMs: number = 300000
    ): Promise<Buffer> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Fitness] Download attempt ${attempt}/${maxRetries} for ${url.substring(0, 80)}...`);

                // Create AbortController for timeout (covers both fetch and body reading)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

                const response = await fetch(url, { signal: controller.signal });

                if (!response.ok) {
                    clearTimeout(timeoutId);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Read body - this is where Body Timeout usually occurs
                const arrayBuffer = await response.arrayBuffer();
                clearTimeout(timeoutId);

                console.log(`[Fitness] Download successful, size: ${arrayBuffer.byteLength} bytes`);
                return Buffer.from(arrayBuffer);

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                const errorMessage = lastError.message || '';
                const causeString = lastError.cause?.toString() || '';

                console.warn(`[Fitness] Download attempt ${attempt} failed: ${errorMessage}`);
                if (lastError.cause) {
                    console.warn(`[Fitness] Cause: ${causeString}`);
                }

                const isRetryableError =
                    errorMessage.includes('fetch failed') ||
                    errorMessage.includes('terminated') ||
                    errorMessage.includes('aborted') ||
                    causeString.includes('TIMEOUT') ||
                    causeString.includes('UND_ERR_HEADERS_TIMEOUT') ||
                    causeString.includes('UND_ERR_BODY_TIMEOUT') ||
                    causeString.includes('ECONNRESET') ||
                    causeString.includes('ETIMEDOUT');

                if (isRetryableError && attempt < maxRetries) {
                    const delay = retryDelayMs * Math.pow(2, attempt - 1);
                    console.warn(`[Fitness] Retrying download in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
        }

        throw lastError || new Error('Download failed after retries');
    }

    /**
     * Get date string for R2 path (YYYYMMDD format)
     */
    private getDateString(): string {
        const today = new Date();
        return today.toISOString().split('T')[0].replace(/-/g, '');
    }

    /**
     * Get R2 key path for a file
     */
    private getR2Key(taskId: string, filename: string): string {
        const dateStr = this.getDateString();
        return `video/${dateStr}/${taskId}/${filename}`;
    }

    /**
     * Step 1: Analyze image and generate exercise scripts
     * Identifies objects in the image and creates video prompts for each segment
     */
    private async analyzeImageAndGenerateScripts(
        imageUrl: string,
        targetMuscleGroup: string,
        apiKey: string,
        aspectRatio: string = '9:16'
    ): Promise<FitnessAnalysisResponse> {
        const fitnessAnalysisSchema = {
            name: "fitness_analysis_response",
            strict: true,
            schema: {
                type: "object",
                required: ["identifiedObjects", "targetMuscleGroup", "exercisePlan", "safetyNotes"],
                properties: {
                    identifiedObjects: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of objects identified in the image that can be used for exercise"
                    },
                    targetMuscleGroup: {
                        type: "string",
                        description: "The muscle group the user wants to train"
                    },
                    exercisePlan: {
                        type: "object",
                        required: ["totalSegments", "segments"],
                        properties: {
                            totalSegments: {
                                type: "number",
                                description: "Number of video segments (1-3)"
                            },
                            segments: {
                                type: "array",
                                items: {
                                    type: "object",
                                    required: ["segmentNumber", "prompt", "narration", "exerciseName", "instructions"],
                                    properties: {
                                        segmentNumber: { type: "number" },
                                        prompt: { type: "string" },
                                        narration: { type: "string" },
                                        exerciseName: { type: "string" },
                                        instructions: { type: "string" }
                                    },
                                    additionalProperties: false
                                }
                            }
                        },
                        additionalProperties: false
                    },
                    safetyNotes: {
                        type: "string",
                        description: "Safety tips for the exercises"
                    }
                },
                additionalProperties: false
            }
        };
        const systemPrompt = `
# ROLE DEFINITION
You are "Coach Alex", a professional AI fitness trainer who demonstrates exercises on screen with correct, continuous movement.
Coach Alex must be actively performing the exercise in almost all segments.

# CRITICAL DEMONSTRATION RULE (HIGHEST PRIORITY)
- In 90% of cases, BOTH Segment 1 and Segment 2 MUST show Coach Alex actively moving
- Static standing, posing, or talking without movement is NOT allowed
- Segment 1 may include setup, but MUST involve visible motion (adjusting stance, initiating first repetition)
- Segment 2 must always demonstrate the main exercise movement

# COST CONTROL RULE
- Each exercise MUST use no more than 2 segments total
- Prefer 1 segment when possible
- Use 2 segments only if it improves clarity of movement demonstration

# TEACHING CONSTRAINTS (STRICT)
- Coach Alex must demonstrate while speaking
- No introduction, motivation, or conclusion
- Narration must ONLY describe:
  - What Coach Alex is physically doing
  - How the body is moving or positioned during the exercise
- Every spoken cue must correspond to a visible movement or posture

# VOICE REQUIREMENTS
- Language: English
- Voice style: Calm, clear, instructional
- Speaking pace: Natural while moving
- Narration duration: MUST fit within 8 seconds (15–20 words max)
- Tone: Neutral and professional

# BODY DESCRIPTION PRECISION RULE (CRITICAL)
All body movement and posture descriptions MUST be:
- Anatomically explicit
- Directionally clear
- Free of ambiguous or interpretive language

Avoid vague terms such as:
- "engage", "activate", "tighten", "keep", "maintain", "proper", "slight", "natural"

Use precise, observable descriptions instead:
- Joint angles or relative positions (e.g., "knees bent to roughly 90 degrees")
- Clear directions (forward, backward, upward, downward)
- Fixed reference points (hips level with knees, shoulders stacked over wrists)
- Explicit movement paths (lower hips straight down, press arms upward until elbows extend)

If a posture or movement cannot be clearly seen on screen, DO NOT describe it.


# OBJECT CONSISTENCY RULE (CRITICAL)
- Coach Alex may ONLY use objects that are clearly visible in the analyzed image
- Do NOT introduce, generate, or imply any fitness equipment or tools that are not present in the image
- Hands must remain empty unless holding a clearly visible object from the environment
- Do NOT add dumbbells, resistance bands, kettlebells, bars, mats, or any gym equipment unless explicitly visible
- If no suitable object is visible, the exercise MUST be performed as a bodyweight movement


# TASKS
1. **Analyze Image**
   Identify usable objects in the environment that can safely support the exercise.

2. **Create Exercise Plan**
   Based on the target muscle group "${targetMuscleGroup}", create 1 or 2 segments:
   - Segment 1: Initiate the exercise with motion (setup + beginning of first repetition)
   - Segment 2 (if used): Full demonstration of the main movement with key form cues
   - Never create a segment with no physical movement

3. **Generate Video Prompts**
   For each segment, generate a veo3.1-compatible prompt that includes:
   - Coach Alex visibly performing the movement throughout the clip
   - Precise descriptions of joint movement and body position
   - Environment and objects from the user’s photo
   - Camera framing that clearly shows the moving joints
   - Required narration format

# PROMPT FORMAT FOR EACH SEGMENT (MANDATORY)
Each segment prompt MUST follow this exact format:

"[Detailed visual description of Coach Alex actively moving, including exact joint positions, movement direction, environment, and camera angle]. 
Voice: Narrated by 'Coach Alex', calm, clear. Language: English. 
Coach Alex says: '[Exact, observable movement and posture cues only — max 20 words]'"

# MOVEMENT DESCRIPTION GUIDELINES
- Describe joints and limbs explicitly (hips, knees, ankles, shoulders, elbows, wrists)
- Use concrete action verbs: hinge, bend, extend, lower, press, rotate
- Describe movement paths and end positions
- Avoid metaphorical or internal cues
- Assume the viewer is copying the movement exactly as shown

# ASPECT RATIO
The video will be generated in ${aspectRatio} format.
Describe camera framing to ensure continuous movement and joint positions are clearly visible throughout the clip.
`;

        const payload = {
            model: this.visionModel,
            response_format: {
                type: "json_schema",
                json_schema: fitnessAnalysisSchema
            },
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Please analyze this image and create an exercise plan for training my ${targetMuscleGroup}. Identify objects I can use for exercise and generate video prompts with narration.`
                        },
                        {
                            type: "image_url",
                            image_url: imageUrl
                        }
                    ]
                }
            ],
        };

        console.log('[Fitness] Analyzing image and generating scripts...');
        const resp = await this.fetchWithRetry(this.visionApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        }, 3, 3000);

        if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`Analysis failed: ${resp.status}, ${errorText}`);
        }

        const data = await resp.json();
        const choice = data.choices?.[0];

        if (!choice) {
            throw new Error("No choices returned from analysis");
        }

        if (choice.finish_reason !== 'stop') {
            throw new Error(`Generation aborted: ${choice.finish_reason}`);
        }

        const responseText = choice.message?.content || '';

        try {
            console.log('[Fitness] Analysis response:', responseText);
            return JSON.parse(responseText);
        } catch (error) {
            console.error('[Fitness] Failed to parse JSON response:', data);
            throw new Error(`Failed to parse analysis response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
        }
    }

    /**
     * Step 2: Generate video using Veo3.1 API
     * Synchronous - waits for video to complete
     * If generation fails, will retry up to maxGenerationRetries times
     */
    private async generateVideoWithVeo31(
        prompt: string,
        imageUrl: string,
        apiKey: string,
        aspectRatio: string = '9:16',
        segmentNumber: number
    ): Promise<{ videoUrl: string; taskId: string; createResponse: Veo31GenerationResponse; queryResponse: Veo31QueryResponse }> {
        console.log(`[Fitness] Generating video segment ${segmentNumber} with Veo3.1...`);
        console.log(`[Fitness] Prompt: ${prompt.substring(0, 100)}...`);
        console.log(`[Fitness] Image URL: ${imageUrl}`);

        // const image = await this.convertImageToBase64(imageUrl);
        // console.log(`[Fitness] Image base64 length: ${image.length}`);

        const createPayload = {
            prompt: prompt,
            model: this.videoModel,
            enhance_prompt: true,
            images: [imageUrl],
            aspect_ratio: aspectRatio
        };

        const maxGenerationRetries = 3; // Max times to retry the entire generation process
        const maxWaitTime = 10 * 60 * 1000; // 10 minutes max per attempt
        const pollInterval = 20000; // 20 seconds

        for (let generationAttempt = 1; generationAttempt <= maxGenerationRetries; generationAttempt++) {
            console.log(`[Fitness] Generation attempt ${generationAttempt}/${maxGenerationRetries} for segment ${segmentNumber}`);

            // Step 1: Create video generation task with retry
            let createData: Veo31GenerationResponse | null = null;
            let createError: Error | null = null;


            try {
                const createResp = await this.fetchWithRetry(this.videoApiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify(createPayload),
                }, 3, 3000);

                if (!createResp.ok) {
                    const errorText = await createResp.text();
                    createError = new Error(`Video generation failed: ${createResp.status}, ${errorText}`);
                    console.warn(`[Fitness] Create failed: ${createError.message}`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                createData = await createResp.json();
            } catch (e) {
                createError = e instanceof Error ? e : new Error(String(e));
                console.warn(`[Fitness] Create failed: ${createError.message}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }


            if (!createData) {
                console.error(`[Fitness] Failed to create video task after 3 attempts`);
                if (generationAttempt < maxGenerationRetries) {
                    console.log(`[Fitness] Will retry entire generation process...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }
                throw createError || new Error('Video generation failed after all attempts');
            }

            const videoTaskId = createData.task_id;
            if (!videoTaskId) {
                console.error(`[Fitness] No task_id returned from video generation`);
                if (generationAttempt < maxGenerationRetries) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    continue;
                }
                throw new Error('No task_id returned from video generation');
            }

            console.log(`[Fitness] Video task created: ${videoTaskId}`);

            // Step 2: Poll for video completion
            const startTime = Date.now();
            let queryFailCount = 0;
            const maxQueryFails = 5;

            while (Date.now() - startTime < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));

                try {
                    const queryResp = await this.fetchWithRetry(`${this.videoApiUrl}/${videoTaskId}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                        },
                    }, 3, 3000);

                    if (!queryResp.ok) {
                        queryFailCount++;
                        console.warn(`[Fitness] Query failed: ${queryResp.status} (fail count: ${queryFailCount}/${maxQueryFails})`);
                        if (queryFailCount >= maxQueryFails) {
                            console.error(`[Fitness] Too many query failures, will retry generation`);
                            break;
                        }
                        continue;
                    }

                    queryFailCount = 0; // Reset on success
                    const queryData: Veo31QueryResponse = await queryResp.json();
                    console.log(`[Fitness] Video ${segmentNumber} status: ${queryData.status}`);

                    if (queryData.status === 'SUCCESS' && queryData.data?.output) {
                        console.log(`[Fitness] Video ${segmentNumber} completed: ${queryData.data?.output}`);
                        return {
                            videoUrl: queryData.data.output,
                            taskId: videoTaskId,
                            createResponse: createData,
                            queryResponse: queryData,
                        };
                    }

                    if (queryData.status === 'FAILURE') {
                        console.error(`[Fitness] Video generation failed: ${queryData.error || 'Unknown error'}`);
                        break; // Break to retry generation
                    }
                } catch (e) {
                    queryFailCount++;
                    console.warn(`[Fitness] Query exception: ${e instanceof Error ? e.message : e} (fail count: ${queryFailCount}/${maxQueryFails})`);
                    if (queryFailCount >= maxQueryFails) {
                        console.error(`[Fitness] Too many query failures, will retry generation`);
                        break;
                    }
                    continue;
                }
            }

            // If we reach here, either timed out or failed - retry if attempts remaining
            if (generationAttempt < maxGenerationRetries) {
                console.log(`[Fitness] Generation attempt ${generationAttempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }
        }

        throw new Error(`Video generation failed after ${maxGenerationRetries} attempts`);
    }

    /**
     * Step 3: Extract last frame from video
     * Uses ffmpeg to get the last frame as an image, then uploads to R2
     */
    private async extractLastFrame(
        videoUrl: string,
        taskId: string,
        segmentNumber: number
    ): Promise<string> {
        const ffmpeg = require('fluent-ffmpeg');
        const fs = require('fs').promises;
        const path = require('path');
        const { ensureTaskWorkDir } = require('@/shared/utils/file-manager');
        const { getStorageService } = await import('@/shared/services/storage');

        const workDir = await ensureTaskWorkDir(taskId);

        // Download video first (use longer timeout for large video files - 5 minutes)
        console.log(`[Fitness] Downloading video ${segmentNumber} for frame extraction...`);
        const videoBuffer = await this.downloadWithRetry(videoUrl, 3, 5000, 300000);
        const tempVideoPath = path.join(workDir, `segment_${segmentNumber}.mp4`);
        await fs.writeFile(tempVideoPath, videoBuffer);

        // Extract last frame
        const lastFramePath = path.join(workDir, `last_frame_${segmentNumber}.jpg`);

        await new Promise<void>((resolve, reject) => {
            ffmpeg(tempVideoPath)
                .inputOptions(['-sseof', '-0.1']) // Input option: seek to 0.1 seconds before end
                .outputOptions([
                    '-frames:v', '1',
                    '-q:v', '2'
                ])
                .output(lastFramePath)
                .on('end', () => {
                    console.log(`[Fitness] Last frame extracted: ${lastFramePath}`);
                    resolve();
                })
                .on('error', (err: Error) => {
                    console.error(`[Fitness] Frame extraction failed:`, err);
                    reject(err);
                })
                .run();
        });

        // Read the extracted frame and upload to R2
        const frameBuffer = await fs.readFile(lastFramePath);
        const storageService = await getStorageService();

        const r2Key = `fitness/${taskId}/last_frame_${segmentNumber}.jpg`;
        const uploadResult = await storageService.uploadFile({
            body: frameBuffer,
            key: r2Key,
            contentType: 'image/jpeg',
        });
        if (uploadResult.success && (uploadResult.url || uploadResult.key)) {
            return replaceR2Url(uploadResult.url || uploadResult.location || '');
        }
        else {
            throw new Error(`Failed to upload frame to R2: ${uploadResult.error}`);
        }
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
            console.log('[SP] Fetching image:', fetchUrl);
            const response = await this.fetchWithRetry(fetchUrl, {}, 3, 3000);
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
     * Step 4: Merge multiple videos into one
     */
    private async mergeVideos(
        videoUrls: string[],
        taskId: string
    ): Promise<{ videoUrl: string; segmentUrls: string[] }> {
        const ffmpeg = require('fluent-ffmpeg');
        const fs = require('fs').promises;
        const path = require('path');
        const { ensureTaskWorkDir, getTaskPublicUrl } = require('@/shared/utils/file-manager');

        const workDir = await ensureTaskWorkDir(taskId);
        const segmentPaths: string[] = [];
        const savedSegmentUrls: string[] = [];

        console.log(`[Fitness] Merging ${videoUrls.length} video segments...`);

        // Download all videos (use longer timeout for large video files - 5 minutes)
        for (let i = 0; i < videoUrls.length; i++) {
            console.log(`[Fitness] Downloading segment ${i + 1}...`);
            // ok
            // const response = await this.fetchWithRetry(videoUrls[i], {}, 3, 5000, 300000);
            // if (!response.ok) {
            //     throw new Error(`Failed to download video segment ${i + 1}: ${response.status}`);
            // }

            // const buffer = Buffer.from(await response.arrayBuffer());
            const segmentPath = path.join(workDir, `segment_${i + 1}.mp4`);
            if (fs.existsSync(segmentPath)) {
                console.log("文件存在, 跳过下载！！！");
                continue;
            } else {
                console.log("文件不存在");
            }
            const buffer = await this.downloadWithRetry(videoUrls[i], 3, 5000, 300000);

            await fs.writeFile(segmentPath, buffer);
            segmentPaths.push(segmentPath);
            savedSegmentUrls.push(getTaskPublicUrl(taskId, `segment_${i + 1}.mp4`));
        }

        // If only one video, just return it
        if (segmentPaths.length === 1) {
            const finalPath = path.join(workDir, 'final_video.mp4');
            await fs.copyFile(segmentPaths[0], finalPath);
            return {
                videoUrl: getTaskPublicUrl(taskId, 'final_video.mp4'),
                segmentUrls: savedSegmentUrls
            };
        }

        // Create concat file
        const concatFilePath = path.join(workDir, 'concat.txt');
        const concatContent = segmentPaths
            .map(p => `file '${path.basename(p)}'`)
            .join('\n');
        await fs.writeFile(concatFilePath, concatContent);

        // Merge videos
        const finalVideoPath = path.join(workDir, 'final_video.mp4');

        await new Promise<void>((resolve, reject) => {
            ffmpeg()
                .input(concatFilePath)
                .inputOptions(['-f', 'concat', '-safe', '0'])
                .outputOptions([
                    '-c', 'copy',
                    '-movflags', '+faststart'
                ])
                .output(finalVideoPath)
                .on('start', (cmd: string) => {
                    console.log('[Fitness] Merging videos:', cmd);
                })
                .on('end', () => {
                    console.log('[Fitness] Videos merged successfully');
                    resolve();
                })
                .on('error', (err: Error) => {
                    console.error('[Fitness] Video merge failed:', err);
                    reject(err);
                })
                .run();
        });

        return {
            videoUrl: getTaskPublicUrl(taskId, 'final_video.mp4'),
            segmentUrls: savedSegmentUrls
        };
    }

    /**
     * Map status string to AITaskStatus
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
     * Main video generation workflow
     */
    async generateVideo({
        params,
    }: {
        params: AIGenerateParams;
    }): Promise<AITaskResult> {
        const settings = params.options || {};
        const targetMuscleGroup = settings.target_muscle_group;
        const aspectRatio = settings.aspect_ratio || '9:16';

        if (!targetMuscleGroup || !targetMuscleGroup.trim()) {
            throw new Error('target_muscle_group is required');
        }

        // Get image input
        const imageInput = params.options?.image_input;
        const hasImage = imageInput && Array.isArray(imageInput) && imageInput.length > 0;
        const firstImageUrl = hasImage ? imageInput[0] : null;

        if (!firstImageUrl) {
            throw new Error('Image input is required for Fitness Video provider');
        }

        const taskId = params.taskId;

        // Always use async mode for video generation
        params.async = true;

        console.log('[Fitness] Async mode enabled, scheduling background processing for task:', taskId);

        this.processVideoInBackground(taskId, params, firstImageUrl, targetMuscleGroup, aspectRatio).catch((error: any) => {
            console.error('[Fitness] Background processing failed for task:', taskId, error);
        });

        // Return immediately with pending status
        return {
            taskStatus: AITaskStatus.PENDING,
            taskId: taskId,
            taskInfo: {
                status: 'processing',
            },
            taskResult: {
                message: 'Fitness video generation started in background',
                target_muscle_group: targetMuscleGroup,
                aspect_ratio: aspectRatio,
            },
        };
    }

    /**
     * Process video generation synchronously (called in background)
     */
    private async processVideoSync(
        taskId: string,
        params: AIGenerateParams,
        firstImageUrl: string,
        targetMuscleGroup: string,
        aspectRatio: string,
        updateDatabase: boolean = true
    ): Promise<AITaskResult> {
        let updateAITaskByTaskId: any = null;

        if (updateDatabase) {
            const aiTaskModule = await import('@/shared/models/ai_task');
            updateAITaskByTaskId = aiTaskModule.updateAITaskByTaskId;
        }

        const apiKey = this.configs.apiKey;

        if (!apiKey) {
            throw new Error('API key is required');
        }

        console.log('[Fitness] Starting Fitness Video generation workflow...');

        const taskStartedAt = new Date().toISOString();

        // Helper function to update task progress
        const updateProgress = async (
            step: FitnessTaskStep,
            message: string,
            progress: number,
            additionalInfo?: any
        ) => {
            if (!updateDatabase || !updateAITaskByTaskId) return;

            const progressInfo: FitnessTaskProgress = {
                currentStep: step,
                stepMessage: message,
                progress,
                startedAt: taskStartedAt,
                updatedAt: new Date().toISOString(),
            };

            const taskInfo = {
                current_step: step, // For frontend history table display
                step: step,
                progress: progressInfo,
                ...additionalInfo,
            };

            await updateAITaskByTaskId(taskId, {
                status: step === FitnessTaskStep.COMPLETED ? AITaskStatus.SUCCESS : AITaskStatus.PROCESSING,
                taskInfo: JSON.stringify(taskInfo),
            });
            console.log(`[Fitness Progress] ${step}: ${message} (${progress}%)`);
        };

        try {

            // Prepare work directory
            const { ensureTaskWorkDir, getTaskPublicUrl } = await import('@/shared/utils/file-manager');
            const workDir = await ensureTaskWorkDir(taskId);
            const fs = await import('fs/promises');
            const path = await import('path');

            // Upload input image to R2 and get public URL
            let absoluteImageUrl = firstImageUrl
            const { getStorageService } = await import('@/shared/services/storage');
            const storageService = await getStorageService();

            if (firstImageUrl && !firstImageUrl.startsWith('http')) {
                // Handle relative URLs - download and upload to R2
                const port = process.env.PORT || 3000;
                const fetchUrl = firstImageUrl.startsWith('/')
                    ? `http://localhost:${port}${firstImageUrl}`
                    : firstImageUrl;

                try {
                    const response = await this.fetchWithRetry(fetchUrl, {}, 3, 3000);
                    if (response.ok) {
                        const buffer = Buffer.from(await response.arrayBuffer());
                        const ext = firstImageUrl.toLowerCase().includes('.jpg') ? 'jpg' : 'png';

                        // Save locally for backup
                        await fs.writeFile(path.join(workDir, `input_image.${ext}`), buffer);

                        // Upload to R2
                        const r2Key = `fitness/${taskId}/input_image.${ext}`;
                        const uploadResult = await storageService.uploadFile({
                            body: buffer,
                            key: r2Key,
                            contentType: ext === 'jpg' ? 'image/jpeg' : 'image/png',
                        });

                        if (uploadResult.success && (uploadResult.url || uploadResult.location)) {
                            absoluteImageUrl = replaceR2Url(uploadResult.url || uploadResult.location || '');
                            console.log(`[Fitness] Input image uploaded to R2: ${absoluteImageUrl}`);
                        }
                    }
                } catch (error) {
                    console.warn('[Fitness] Failed to upload input image to R2:', error);
                }
            } else if (firstImageUrl.startsWith('http')) {
                // Already an HTTP URL, download and re-upload to R2 for consistency
                try {
                    const response = await this.fetchWithRetry(firstImageUrl, {}, 3, 3000);
                    if (response.ok) {
                        const buffer = Buffer.from(await response.arrayBuffer());
                        const contentType = response.headers.get('content-type') || 'image/jpeg';
                        const ext = contentType.includes('png') ? 'png' : 'jpg';

                        // Upload to R2
                        const r2Key = `fitness/${taskId}/input_image.${ext}`;
                        const uploadResult = await storageService.uploadFile({
                            body: buffer,
                            key: r2Key,
                            contentType: contentType,
                        });

                        if (uploadResult.success && (uploadResult.url || uploadResult.location)) {
                            absoluteImageUrl = replaceR2Url(uploadResult.url || uploadResult.location || '');
                            console.log(`[Fitness] Input image re-uploaded to R2: ${absoluteImageUrl}`);
                        }
                    }
                } catch (error) {
                    console.warn('[Fitness] Failed to re-upload input image to R2, using original URL:', error);
                    // Keep the original URL if re-upload fails
                }
            }

            // Step 1: Analyze image and generate scripts
            await updateProgress(FitnessTaskStep.ANALYZING, 'Analyzing your environment...', 5);
            console.log('[Fitness] absoluteImageUrl...', absoluteImageUrl);
            const analysis = await this.analyzeImageAndGenerateScripts(
                absoluteImageUrl,
                targetMuscleGroup,
                apiKey,
                aspectRatio
            );

            console.log('[Fitness] Analysis complete:', JSON.stringify(analysis, null, 2));

            // Save analysis to params
            if (!params.options) params.options = {};
            params.options.analysis = analysis;

            const segments = analysis.exercisePlan.segments;
            const totalSegments = segments.length;

            // Step 2: Generate videos sequentially
            const generatedVideoUrls: string[] = [];
            let currentImageUrl = absoluteImageUrl;
            // let currentImageUrl = "https://public.pikju.top/uploads/fitness/efd2452e-33de-4609-8a59-4a9b127e9d25/input_image.jpg";

            for (let i = 0; i < totalSegments; i++) {
                const segment = segments[i];
                const stepEnum = i === 0 ? FitnessTaskStep.GENERATING_VIDEO_1
                    : i === 1 ? FitnessTaskStep.GENERATING_VIDEO_2
                        : FitnessTaskStep.GENERATING_VIDEO_3;

                const progressBase = 10 + (i * 25);
                await updateProgress(
                    stepEnum,
                    `Generating video segment ${i + 1}/${totalSegments}...`,
                    progressBase
                );

                // Generate video with current image
                const videoResult = await this.generateVideoWithVeo31(
                    segment.prompt,
                    currentImageUrl,
                    apiKey,
                    aspectRatio,
                    i + 1
                );

                generatedVideoUrls.push(videoResult.videoUrl);

                // Save video generation response to options
                if (!params.options.videoGenerations) {
                    params.options.videoGenerations = [];
                }
                params.options.videoGenerations.push({
                    segmentNumber: i + 1,
                    taskId: videoResult.taskId,
                    videoUrl: videoResult.videoUrl,
                    createResponse: videoResult.createResponse,
                    queryResponse: videoResult.queryResponse,
                    generatedAt: new Date().toISOString(),
                });

                // Update database with current options
                if (updateDatabase && updateAITaskByTaskId) {
                    await updateAITaskByTaskId(taskId, {
                        options: JSON.stringify(params.options),
                    });
                    console.log(`[Fitness] Saved video generation ${i + 1} to options`);
                }

                // Extract last frame for next segment (if not the last segment)
                if (i < totalSegments - 1) {
                    await updateProgress(
                        FitnessTaskStep.EXTRACTING_LAST_FRAME,
                        `Extracting frame for next segment...`,
                        progressBase + 20
                    );

                    const lastFrameUrl = await this.extractLastFrame(videoResult.videoUrl, taskId, i + 1);

                    currentImageUrl = lastFrameUrl;
                }
            }

            // Step 3: Merge videos
            await updateProgress(FitnessTaskStep.MERGING_VIDEOS, 'Merging video segments...', 85);

            const { videoUrl: finalVideoUrl, segmentUrls } = await this.mergeVideos(
                generatedVideoUrls,
                taskId
            );

            console.log('[Fitness] ✓ Video generation completed successfully');
            console.log('[Fitness] Final video URL:', finalVideoUrl);

            const result = {
                taskStatus: AITaskStatus.SUCCESS,
                taskId: taskId,
                taskInfo: {
                    videos: [{ videoUrl: finalVideoUrl }],
                    progress: {
                        currentStep: FitnessTaskStep.COMPLETED,
                        stepMessage: 'Fitness video generation completed successfully',
                        progress: 100,
                        startedAt: taskStartedAt,
                        updatedAt: new Date().toISOString(),
                    } as FitnessTaskProgress,
                },
                taskResult: {
                    analysis: analysis,
                    video_url: finalVideoUrl,
                    segment_urls: segmentUrls,
                    target_muscle_group: targetMuscleGroup,
                    aspect_ratio: aspectRatio,
                    identified_objects: analysis.identifiedObjects,
                    safety_notes: analysis.safetyNotes,
                },
            };

            // Update database with success status
            if (updateDatabase && updateAITaskByTaskId) {
                await updateAITaskByTaskId(taskId, {
                    status: AITaskStatus.SUCCESS,
                    taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
                    taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
                    options: params.options ? JSON.stringify(params.options) : null,
                });
                console.log('[Fitness] Task', taskId, 'status updated to SUCCESS');

                // Trigger background upload if custom storage is enabled
                if (this.configs.customStorage) {
                    this.uploadTaskFilesToR2(taskId, result).catch(err => {
                        console.error('[Fitness] Background upload failed:', err);
                    });
                }
            }

            return result;

        } catch (error: any) {
            console.error('[Fitness] Generation failed:', error);

            if (updateDatabase && updateAITaskByTaskId) {
                const { findAITaskByTaskId } = await import('@/shared/models/ai_task');
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
                console.log('[Fitness] Task', taskId, 'status updated to FAILED with credit refund');
            }

            throw new Error(`Fitness video generation failed: ${error.message}`);
        }
    }

    /**
     * Process video generation in background
     */
    private async processVideoInBackground(
        taskId: string,
        params: AIGenerateParams,
        firstImageUrl: string,
        targetMuscleGroup: string,
        aspectRatio: string
    ): Promise<void> {
        try {
            console.log('[Fitness Background] Starting background processing for task:', taskId);
            await this.processVideoSync(taskId, params, firstImageUrl, targetMuscleGroup, aspectRatio, true);
            console.log('[Fitness Background] ✓ Task', taskId, 'completed successfully');
        } catch (error: any) {
            console.error('[Fitness Background] ✗ Task', taskId, 'failed:', error);
        }
    }

    /**
     * Upload task files to R2 in background
     */
    private async uploadTaskFilesToR2(taskId: string, result: AITaskResult): Promise<void> {
        try {
            console.log(`[Fitness Background Upload] Starting upload for task ${taskId}`);

            const { updateAITaskByTaskId } = await import('@/shared/models/ai_task');
            const { getTaskWorkDir } = await import('@/shared/utils/file-manager');
            const fs = await import('fs/promises');
            const path = await import('path');

            const workDir = getTaskWorkDir(taskId);
            const files = await fs.readdir(workDir);
            const uploadedAssets: Record<string, string> = {};

            const processFile = async (filename: string, contentType: string, key: string) => {
                const filePath = path.join(workDir, filename);
                const { getStorageService } = await import('@/shared/services/storage');
                const storageService = await getStorageService();
                const fileBuffer = await fs.readFile(filePath);

                const uploadResult = await storageService.uploadFile({
                    body: fileBuffer,
                    key: key,
                    contentType: contentType,
                    bucket: this.configs.r2_bucket_name
                });

                if (uploadResult.success && (uploadResult.url || uploadResult.key)) {
                    return replaceR2Url(uploadResult.url || uploadResult.location || '');
                }

                const { getTaskPublicUrl } = await import('@/shared/utils/file-manager');
                return getTaskPublicUrl(taskId, filename);
            };

            for (const file of files) {
                let contentType = 'application/octet-stream';
                let key = '';

                if (file === 'final_video.mp4') {
                    contentType = 'video/mp4';
                    key = this.getR2Key(taskId, file);
                    uploadedAssets['video_url'] = await processFile(file, contentType, key);
                } else if (file.startsWith('segment_') && file.endsWith('.mp4')) {
                    contentType = 'video/mp4';
                    key = this.getR2Key(taskId, file);
                    await processFile(file, contentType, key);
                } else if (file.startsWith('input_image.')) {
                    contentType = file.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
                    key = this.getR2Key(taskId, file);
                    uploadedAssets['input_image_url'] = await processFile(file, contentType, key);
                } else if (file.startsWith('last_frame_') && file.endsWith('.jpg')) {
                    contentType = 'image/jpeg';
                    key = this.getR2Key(taskId, file);
                    await processFile(file, contentType, key);
                }
            }

            if (Object.keys(uploadedAssets).length > 0) {
                const currentTaskResult = typeof result.taskResult === 'string'
                    ? JSON.parse(result.taskResult)
                    : result.taskResult;

                const updatedTaskResult = {
                    ...currentTaskResult,
                    video_url: uploadedAssets['video_url'] || currentTaskResult.video_url,
                    input_image_url: uploadedAssets['input_image_url'] || currentTaskResult.input_image_url,
                };

                await updateAITaskByTaskId(taskId, {
                    taskResult: JSON.stringify(updatedTaskResult),
                });

                console.log(`[Fitness Background Upload] Task ${taskId} updated with CDN URLs`);
            }

        } catch (error) {
            console.error(`[Fitness Background Upload] Failed for task ${taskId}:`, error);
        }
    }

    /**
     * Generate task entry point
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

        const task = await findAITaskByTaskId(taskId);

        if (!task) {
            throw new Error(`Task not found: ${taskId}`);
        }

        const taskInfo = task.taskInfo ? JSON.parse(task.taskInfo) : {};
        const taskResult = task.taskResult ? JSON.parse(task.taskResult) : {};
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

export function createFitnessVideoProvider(configs: FitnessVideoConfigs): FitnessVideoProvider {
    return new FitnessVideoProvider(configs);
}
