/**
 * Video Library Provider
 * 功能：识别用户上传图片中的物品，并从视频资源库中匹配相关健身视频
 * 
 * 工作流程：
 * 1. 用户上传图片
 * 2. 使用视觉AI识别图片中的物品
 * 3. 根据识别的物品和用户选择的目标肌肉群
 * 4. 从视频资源库中查找匹配的健身视频
 * 5. 返回匹配的视频列表
 */
import { replaceR2Url } from '@/shared/lib/url';
import {
    AIConfigs,
    AIGenerateParams,
    AIMediaType,
    AIProvider,
    AITaskResult,
    AITaskStatus,
} from './types';
import {
    fetchWithRetry,
    convertImageToBase64,
    getR2Key,
} from './utils';

/**
 * Video Library Provider configs
 */
export interface VideoLibraryConfigs extends AIConfigs {
    apiKey: string;
    baseUrl?: string;
    visionModel?: string;
    visionApiUrl?: string;
    r2_bucket_name?: string;
}

/**
 * Task Step enum
 */
export enum VideoLibraryTaskStep {
    PENDING = 'pending',
    ANALYZING = 'analyzing',
    MATCHING_VIDEOS = 'matching_videos',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

/**
 * Task Progress info
 */
export interface VideoLibraryTaskProgress {
    currentStep: VideoLibraryTaskStep;
    stepMessage: string;
    progress: number;
    startedAt: string;
    updatedAt: string;
}

/**
 * Object recognition response
 */
interface ObjectRecognitionResponse {
    matchedObject: string;
}

/**
 * Video Library Provider
 */
export class VideoLibraryProvider implements AIProvider {
    readonly name = 'video-library';
    configs: VideoLibraryConfigs;

    private baseUrl: string;
    private visionModel: string;
    private visionApiUrl: string;

    constructor(configs: VideoLibraryConfigs) {
        this.configs = configs;
        this.baseUrl = configs.baseUrl || 'https://ai.comfly.chat';
        this.visionModel = configs.visionModel || 'gemini-3-flash-preview';
        this.visionApiUrl = configs.visionApiUrl || `${this.baseUrl}/v1/chat/completions`;
    }

    /**
     * Step 1: Analyze image and identify the best matching object from database
     */
    private async analyzeImage(
        imageUrl: string,
        apiKey: string
    ): Promise<ObjectRecognitionResponse> {
        // Fetch available objects from database, sorted by priority desc
        const { listFitnessObjects } = await import('@/shared/models/video_library');
        const dbObjects = await listFitnessObjects({ status: 'active', limit: 1000 });
        dbObjects.sort((a, b) => ((b as any).priority ?? 0) - ((a as any).priority ?? 0));
        const objectNamesList = dbObjects.map(obj => obj.name).join(', ');

        const objectRecognitionSchema = {
            name: "object_recognition_response",
            strict: true,
            schema: {
                type: "object",
                required: ["matchedObject"],
                properties: {
                    matchedObject: {
                        type: "string",
                        description: `The single best-matching object name from the database list. Must be EXACTLY one of: ${objectNamesList}, or "Universal" if none match.`
                    }
                },
                additionalProperties: false
            }
        };

        const systemPrompt = `You are an object recognition specialist for a fitness app.

Your ONLY task: look at the image and find which ONE object from the database list below is present in the image.

STRICT RULES:
1. You MUST return EXACTLY one object name from the database list below — character-for-character, case-sensitive.
2. The list is ordered by priority (highest first). If multiple objects are visible, pick the one that appears FIRST in the list.
3. If NONE of the objects in the list are visible in the image, return "Universal".
4. Do NOT invent names. Do NOT modify names. Copy the name exactly as written.

Database objects (ordered by priority):
${objectNamesList}

Output: a single JSON with "matchedObject" set to the exact name from the list, or "Universal".`;

        // Convert to base64 if needed
        let imageContent: any;
        if (imageUrl.startsWith('data:image/')) {
            imageContent = { type: "image_url", image_url: { url: imageUrl } };
        } else if (imageUrl.startsWith('http')) {
            imageContent = { type: "image_url", image_url: imageUrl };
        } else {
            const base64Image = await convertImageToBase64(imageUrl, '[VideoLibrary]');
            imageContent = { type: "image_url", image_url: { url: base64Image } };
        }

        const payload = {
            model: this.visionModel,
            response_format: {
                type: "json_schema",
                json_schema: objectRecognitionSchema
            },
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Identify the object in this image that matches one from the database list." },
                        imageContent
                    ]
                }
            ],
        };

        const response = await fetchWithRetry(
            this.visionApiUrl,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(payload),
            },
            3, 2000, 60000, '[VideoLibrary]'
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Object recognition failed: ${response.status}, ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];

        if (!choice || choice.finish_reason !== 'stop') {
            throw new Error(`Generation aborted: ${choice?.finish_reason || 'no response'}`);
        }

        const responseText = choice.message?.content || '';
        try {
            const parsed = JSON.parse(responseText);
            const matchedObject = parsed.matchedObject || 'Universal';

            // Validate: must exactly match a DB object name, otherwise fallback
            const isValid = dbObjects.some(obj => obj.name === matchedObject);
            return { matchedObject: isValid ? matchedObject : 'Universal' };
        } catch (error) {
            console.error('[VideoLibrary] Failed to parse JSON response:', responseText);
            throw new Error(`Failed to parse recognition response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
        }
    }

    /**
     * Generate - Main entry point
     */
    async generate({
        params,
    }: {
        params: AIGenerateParams;
    }): Promise<AITaskResult> {
        const { prompt, options, taskId: paramTaskId } = params;
        const taskId = paramTaskId || `vl-${Date.now()}`;
        const targetMuscleGroup = (options as any)?.target_muscle_group || (options as any)?.user_feeling || prompt || 'full_body';
        const apiKey = this.configs.apiKey;

        // Split comma-separated body parts into array
        const bodyPartsList = targetMuscleGroup.split(',').map((s: string) => s.trim()).filter(Boolean);

        console.log(`[VideoLibrary] Starting task ${taskId}`);
        console.log(`[VideoLibrary] Target muscle groups: ${bodyPartsList.join(', ')}`);

        // Get image URL from options (optional)
        // The generate route saves uploaded files to options.image_input as string[]
        const imageInputUrls = (options as any)?.image_input as string[] | undefined;
        const imageUrl = imageInputUrls?.[0];

        // Extract gender, age group, and difficulty from options for filtering
        const userGender = (options as any)?.voice_gender || 'unisex';
        const userAgeGroup = (options as any)?.age_group || 'all';
        // Map frontend difficulty (easy/medium/hard) to DB values (beginner/intermediate/advanced)
        const difficultyMap: Record<string, string> = {
            'easy': 'beginner',
            'medium': 'intermediate',
            'hard': 'advanced',
        };
        const rawDifficulty = (options as any)?.difficulty || undefined;
        const userDifficulty = rawDifficulty ? (difficultyMap[rawDifficulty] || rawDifficulty) : undefined;

        console.log(`[VideoLibrary] Gender: ${userGender}, Age group: ${userAgeGroup}, Difficulty: ${userDifficulty}`);

        try {
            let videosForResult: any[];

            if (imageUrl) {
                // Path A: Image analysis → object matching → video matching
                console.log('[VideoLibrary] Analyzing image...');
                const recognitionResult = await this.analyzeImage(
                    imageUrl,
                    apiKey
                );

                const matchedObject = recognitionResult.matchedObject;
                console.log(`[VideoLibrary] AI matched object: ${matchedObject}`);

                const { findVideosByObjectAndBodyParts, getVideosByBodyPart } = await import('@/shared/models/video_library');

                const allVideos: any[] = [];
                const seenVideoIds = new Set<string>();

                // Try object + body parts matching (prioritizes videos covering most body parts)
                if (matchedObject !== 'Universal') {
                    console.log(`[VideoLibrary] Searching for videos: object="${matchedObject}", bodyParts=${JSON.stringify(bodyPartsList)}`);
                    const matchedVideos = await findVideosByObjectAndBodyParts(
                        matchedObject, bodyPartsList,
                        { limit: 10, difficulty: userDifficulty, gender: userGender, accessType: 'free', ageGroup: userAgeGroup }
                    );
                    for (const mv of matchedVideos) {
                        if (!seenVideoIds.has(mv.video.id)) {
                            seenVideoIds.add(mv.video.id);
                            allVideos.push({
                                id: mv.video.id, title: mv.video.title, titleZh: mv.video.titleZh,
                                videoUrl: mv.video.videoUrl, thumbnailUrl: mv.video.thumbnailUrl,
                                duration: mv.video.duration, difficulty: mv.video.difficulty,
                                instructions: mv.video.instructions, matchedObject: mv.object?.name,
                                matchedBpCount: mv.matchedBpCount,
                            });
                        }
                    }
                }

                // Fallback: fill remaining slots with generic body part videos
                if (allVideos.length < 10) {
                    for (const bp of bodyPartsList) {
                        if (allVideos.length >= 10) break;
                        const genericVideos = await getVideosByBodyPart(bp, {
                            limit: 10 - allVideos.length, difficulty: userDifficulty, gender: userGender, accessType: 'free', ageGroup: userAgeGroup
                        });
                        for (const video of genericVideos) {
                            if (!seenVideoIds.has(video.id)) {
                                seenVideoIds.add(video.id);
                                allVideos.push({
                                    id: video.id, title: video.title, titleZh: video.titleZh,
                                    videoUrl: video.videoUrl, thumbnailUrl: video.thumbnailUrl,
                                    duration: video.duration, difficulty: video.difficulty,
                                    instructions: video.instructions, matchedObject: null,
                                    matchedBpCount: 0,
                                });
                            }
                        }
                    }
                }

                videosForResult = allVideos.slice(0, 10);

                if (videosForResult.length === 0) {
                    throw new Error('No matching videos found for the identified object and selected body parts. Please try different options.');
                }

                const taskResult = {
                    matchedObject,
                    matchedBodyParts: bodyPartsList,
                    matchedVideos: videosForResult,
                    targetMuscleGroup,
                };

                console.log(`[VideoLibrary] Found ${videosForResult.length} videos`);

                return {
                    taskId,
                    taskStatus: AITaskStatus.SUCCESS,
                    taskInfo: {
                        status: 'completed',
                        progress: {
                            currentStep: VideoLibraryTaskStep.COMPLETED,
                            stepMessage: 'Video matching completed',
                            progress: 100,
                        },
                    },
                    taskResult,
                };
            } else {
                // Path B: No image — match videos by body parts
                console.log('[VideoLibrary] No image provided, matching by body parts...');
                const { getVideosByBodyPart } = await import('@/shared/models/video_library');

                const allVideos: any[] = [];
                const seenVideoIds = new Set<string>();

                for (const bp of bodyPartsList) {
                    console.log(`[VideoLibrary] Query params: bodyPart="${bp}", gender="${userGender}", ageGroup="${userAgeGroup}", difficulty="${userDifficulty}", accessType="free"`);
                    const genericVideos = await getVideosByBodyPart(bp, {
                        limit: 10, difficulty: userDifficulty, gender: userGender, accessType: 'free', ageGroup: userAgeGroup
                    });

                    for (const video of genericVideos) {
                        if (!seenVideoIds.has(video.id)) {
                            seenVideoIds.add(video.id);
                            allVideos.push({
                                id: video.id,
                                title: video.title,
                                titleZh: video.titleZh,
                                videoUrl: video.videoUrl,
                                thumbnailUrl: video.thumbnailUrl,
                                duration: video.duration,
                                difficulty: video.difficulty,
                                instructions: video.instructions,
                                matchedObject: null,
                            });
                        }
                    }
                }

                videosForResult = allVideos.slice(0, 10);
                console.log(`[VideoLibrary] Found ${videosForResult.length} videos for body parts: ${bodyPartsList.join(', ')}`);

                if (videosForResult.length === 0) {
                    throw new Error('No matching videos found for the selected body parts. Please try different options.');
                }

                const taskResult = {
                    matchedObject: null,
                    matchedBodyParts: bodyPartsList,
                    matchedVideos: videosForResult,
                    targetMuscleGroup,
                };

                return {
                    taskId,
                    taskStatus: AITaskStatus.SUCCESS,
                    taskInfo: {
                        status: 'completed',
                        progress: {
                            currentStep: VideoLibraryTaskStep.COMPLETED,
                            stepMessage: 'Video matching completed',
                            progress: 100,
                        },
                    },
                    taskResult,
                };
            }
        } catch (error: any) {
            console.error('[VideoLibrary] Task failed:', error);
            return {
                taskId,
                taskStatus: AITaskStatus.FAILED,
                taskInfo: {
                    status: 'failed',
                    errorMessage: error.message,
                    progress: {
                        currentStep: VideoLibraryTaskStep.FAILED,
                        stepMessage: error.message,
                        progress: 0,
                    },
                },
                taskResult: {
                    error: error.message,
                    stack: error.stack,
                },
            };
        }
    }

    /**
     * Query - Check task status (not needed for sync operations)
     */
    async query({
        taskId,
    }: {
        taskId: string;
        mediaType?: string;
        model?: string;
    }): Promise<AITaskResult> {
        // This provider operates synchronously, so query just returns completed
        return {
            taskId,
            taskStatus: AITaskStatus.SUCCESS,
            taskInfo: { status: 'completed' },
            taskResult: {},
        };
    }
}

export function createVideoLibraryProvider(configs: VideoLibraryConfigs): VideoLibraryProvider {
    return new VideoLibraryProvider(configs);
}
