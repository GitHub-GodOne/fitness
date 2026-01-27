import { getUuid } from '@/shared/lib/hash';
import { replaceR2Url } from '@/shared/lib/url';

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
 * Volcano Engine configs
 * @docs https://www.volcengine.com/
 */
export interface VolcanoConfigs extends AIConfigs {
    apiKey: string;
    customStorage?: boolean; // use custom storage to save files
}

/**
 * Chat message types for Volcano Doubao API
 */
export interface VolcanoChatMessage {
    role: 'system' | 'user' | 'assistant';
    content?: string; // For text-only messages
    // For multimodal messages (image-to-text)
    // content can be an array with image_url and text objects
    // Example: [{ type: 'image_url', image_url: { url: '...' } }, { type: 'text', text: '...' }]
}

/**
 * Chat completion options
 */
export interface VolcanoChatCompletionOptions {
    model?: string; // Model endpoint ID (default from config)
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    apiKey?: string; // Override default API key
    baseUrl?: string; // Override default base URL
}

/**
 * Volcano Engine provider
 * @docs https://www.volcengine.com/
 */
export class VolcanoProvider implements AIProvider {
    // provider name
    readonly name = 'volcano';
    // provider configs
    configs: VolcanoConfigs;

    // api base url
    private baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';

    // init provider
    constructor(configs: VolcanoConfigs) {
        this.configs = configs;
    }

    /**
     * Universal Chat Completion API
     * Supports both text-to-text and image-to-text (vision) modes
     * 
     * @param messages - Array of chat messages
     * @param options - Chat completion options (model, temperature, etc.)
     * @returns Response text from the API
     */
    async chatCompletion(
        messages: VolcanoChatMessage[],
        options: VolcanoChatCompletionOptions = {}
    ): Promise<string> {
        // Get API credentials
        const { getAllConfigs } = await import('@/shared/models/config');
        const configs = await getAllConfigs();

        const apiKey = options.apiKey || configs.volcano_api_key || process.env.VOLCANO_API_KEY || this.configs.apiKey;
        const model = options.model || configs.volcano_doubao_endpoint || process.env.VOLCANO_DOUBAO_ENDPOINT;
        const baseUrl = options.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';
        const apiUrl = `${baseUrl}/chat/completions`;

        if (!apiKey) {
            throw new Error('Volcano API key is required for chat completion');
        }
        if (!model) {
            throw new Error('Volcano model endpoint is required for chat completion');
        }

        // Build messages array with proper format
        const formattedMessages = messages.map((msg: any) => {
            // If content is a string, use it directly (text-to-text)
            if (typeof msg.content === 'string') {
                return {
                    role: msg.role,
                    content: msg.content,
                };
            }
            // If content is an array (multimodal), ensure proper format
            if (Array.isArray(msg.content)) {
                return {
                    role: msg.role,
                    content: msg.content.map((item: any) => {
                        // Ensure image_url format is correct
                        if (item.type === 'image_url' && item.image_url) {
                            return {
                                type: 'image_url',
                                image_url: {
                                    url: item.image_url.url || item.image_url,
                                },
                            };
                        }
                        // Ensure text format is correct
                        if (item.type === 'text') {
                            return {
                                type: 'text',
                                text: item.text || item.content || '',
                            };
                        }
                        return item;
                    }),
                };
            }
            // Otherwise, return the message as-is
            return msg;
        });

        const payload = {
            model,
            temperature: options.temperature ?? 0.7,
            top_p: options.top_p ?? 0.95,
            max_tokens: options.max_tokens ?? 4096,
            messages: formattedMessages,
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
            throw new Error(`Chat completion failed with status: ${resp.status}, ${errorText}`);
        }

        const data = await resp.json();

        // Check for errors
        if (data.error) {
            throw new Error(data.error.message || `Chat completion error: ${JSON.stringify(data.error)}`);
        }

        // Extract response text
        const responseText = data.choices?.[0]?.message?.content || '';
        if (!responseText) {
            throw new Error('Empty response from chat completion API');
        }

        return responseText;
    }

    /**
     * Text-to-Text Chat Completion (文生文)
     * Convenience method for text-only chat
     * 
     * @param messages - Array of text messages
     * @param options - Chat completion options
     * @returns Response text
     */
    async textToText(
        messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
        options: VolcanoChatCompletionOptions = {}
    ): Promise<string> {
        return this.chatCompletion(messages, options);
    }

    /**
     * Convert image URL to base64 format
     * Downloads the image and converts it to base64 data URL to avoid 403 errors
     * 
     * @param imageUrl - Image URL or base64 data URL
     * @returns Base64 data URL (e.g., "data:image/png;base64,...")
     */
    private async convertImageToBase64(imageUrl: string): Promise<string> {
        // If already a base64 data URL, return as is
        if (imageUrl.startsWith('data:image/')) {
            return imageUrl;
        }

        try {
            // Fetch the image
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }

            // Get image buffer
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Detect content type from response headers or URL
            let contentType = response.headers.get('content-type') || 'image/png';
            if (!contentType.startsWith('image/')) {
                // Fallback: try to detect from URL extension
                const urlLower = imageUrl.toLowerCase();
                if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
                    contentType = 'image/jpeg';
                } else if (urlLower.includes('.png')) {
                    contentType = 'image/png';
                } else if (urlLower.includes('.gif')) {
                    contentType = 'image/gif';
                } else if (urlLower.includes('.webp')) {
                    contentType = 'image/webp';
                } else {
                    contentType = 'image/png'; // Default fallback
                }
            }

            // Convert to base64
            const base64 = buffer.toString('base64');
            return `data:${contentType};base64,${base64}`;
        } catch (error: any) {
            console.error('[Volcano] Failed to convert image to base64:', error);
            throw new Error(`Failed to convert image to base64: ${error.message}`);
        }
    }

    /**
     * Image-to-Text Chat Completion (图生文)
     * Convenience method for image-to-text vision chat
     * 
     * @param imageUrl - Image URL or base64 data URL to analyze
     * @param textPrompt - Text prompt/question about the image
     * @param systemPrompt - Optional system prompt
     * @param options - Chat completion options (must use vision model like doubao-1-5-vision-pro-32k-250115)
     * @returns Response text describing the image
     */
    async imageToText(
        imageUrl: string,
        textPrompt: string,
        systemPrompt?: string,
        options: VolcanoChatCompletionOptions = {}
    ): Promise<string> {
        const messages: VolcanoChatMessage[] = [];

        // Add system prompt if provided
        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt,
            });
        }

        // Convert image URL to base64 format to avoid 403 errors
        const base64ImageUrl = await this.convertImageToBase64(imageUrl);
        // console.log('base64ImageUrl', base64ImageUrl);
        // Add multimodal user message (image + text)
        messages.push({
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: {
                        url: base64ImageUrl, // Use base64 format instead of URL
                    },
                },
                {
                    type: 'text',
                    text: textPrompt,
                },
            ],
        } as any); // Use 'as any' because TypeScript doesn't fully support multimodal content typing

        return this.chatCompletion(messages, options);
    }

    // map status
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

    async generateVideo({
        params,
    }: {
        params: AIGenerateParams;
    }): Promise<AITaskResult> {
        const apiUrl = `${this.baseUrl}/contents/generations/tasks`;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.configs.apiKey}`,
        };

        if (!params.model) {
            throw new Error('model is required');
        }

        // build content array
        const content: any[] = [];

        // Extract settings from options
        const settings = params.options || {};
        // const duration = settings.duration || 12;
        // const resolution = settings.resolution || '480p';
        // const ratio = settings.ratio || 'adaptive';
        const duration = 12;
        const resolution = '480p';
        const ratio = 'adaptive';
        // 🔥 Auto-enhance prompt with Bible verses based on user feeling
        let promptText = params.prompt || '';

        // If user feeling is provided, automatically enhance the prompt
        const userFeeling = settings.user_feeling;
        if (userFeeling && userFeeling.trim()) {
            console.log('[Volcano] Auto-enhancing prompt with Bible verses...', { userFeeling });

            // Define fallback prompt (used when enhancement fails)
            // Note: Biblical elements should be generated by AI, not randomly selected
            // const fallbackPrompt = `The person in the image is speaking directly to the viewer with tender expression and comforting voice, sharing words of hope and comfort about ${userFeeling}.`;

            try {
                // Call Volcano Doubao API for enhancement
                const { getAllConfigs } = await import('@/shared/models/config');
                const configs = await getAllConfigs();

                // Get API credentials
                let enhanceApiKey = configs.volcano_api_key || process.env.VOLCANO_API_KEY || this.configs.apiKey;
                const doubaoEndpoint = configs.volcano_doubao_endpoint || process.env.VOLCANO_DOUBAO_ENDPOINT;
                // Vision model for image-to-text (图生文)
                const doubaoVisionEndpoint = configs.volcano_doubao_vision_endpoint || process.env.VOLCANO_DOUBAO_VISION_ENDPOINT || 'doubao-1-5-vision-pro-32k-250115';

                if (enhanceApiKey && doubaoEndpoint) {
                    // Use the new chatCompletion method for text-to-text
                    const systemPrompt = `You are a professional and experienced biblical counselor and video script expert with deep knowledge and research of the Bible. Your task is to analyze the user's feelings and generate comforting biblical video scripts for them.

                        **Core Principles:**
                        1. **Must use original Bible text (absolutely no modifications allowed)** - All quoted scriptures must be complete original English text that truly exists in the Bible, absolutely no violations of the following rules are allowed:
                           - Cannot modify, abbreviate, rewrite, add, or delete scripture content
                           - Cannot splice or combine scripture fragments yourself
                           - Cannot add or delete any words
                        2. **Precise Matching** - Select the most appropriate scripture based on the user's emotional state
                        3. **Visual Description** - Transform scriptures into specific, visualizable scene descriptions
                        4. **Comfort First** - Convey hope, peace, and God's love
                        5. **Strict Time Control** - Maximum video duration is ${duration} seconds, Bible scripture reading must occupy ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} seconds (80-90% of the time), scene transitions reserve at most 1-2 seconds
                        6. **Scripture Reading Requirements** - The scripture being read must be read in English, not Chinese. The scripture must use the original Bible text, not translated versions. The output must completely quote the original Bible text based on the user's input for matching.
                        7. If the scripture is too long, only complete sentences or paragraphs can be selected, cannot extract fragments yourself
                        8. What the person says must be complete scripture content, and the scripture content should occupy about 80% of the video duration. They can speak while switching scenes, and background music can be added appropriately
                        9. The video doesn't necessarily need to feature people reading from a book; feel free to improvise. It could be people speaking English passages to each other, or users can simply repeat phrases from the English text. Please use your imagination based on the images.
                        
                        **Common Emotions and Corresponding Scriptures:**

                        Sadness: Psalm 23:4, Matthew 5:4, Revelation 21:4
                        Anxiety: Philippians 4:6-7, Matthew 6:34, 1 Peter 5:7
                        Loneliness: Deuteronomy 31:6, Hebrews 13:5
                        Confusion: Proverbs 3:5-6, Psalm 119:105, Jeremiah 29:11
                        Fear: Isaiah 41:10, Psalm 56:3
                        Illness: Psalm 147:3, Isaiah 53:5
                        Exhaustion: Matthew 11:28, Isaiah 40:31
                        Hurt: Romans 12:19, Psalm 34:18

                        **Video Scene Requirements:**
                        Based on the user's image and text, select or reference the following video examples. **Important: Must evenly select different biblical elements, avoid frequently using the same element (such as rainbow). Try to have equal probability of appearance for the objects below**
                        
                        1. Cross
                        Core Meaning: Redemption, sacrifice, God's love, victory over death and sin        
                        Key Scripture: John 3:16 - "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."        
                        Applicable Scenarios: Conveying redemption message, comforting the suffering, declaring faith victory        
                        Video Scene Suggestion: Medium shot (50mm focal length) showing a wooden cross standing at the top of the frame, 3500K warm light shining from behind and above the cross, forming a divine halo (40% opacity); background is sunrise or sunset sky with rich gradient cloud colors; paired with solemn orchestral melody (volume -18dB), duration 4 seconds, ending with subtle light particles appearing around the cross, enhancing the divine feeling.      
                        2. Lamb
                        Core Meaning: Purity, sacrifice, embodiment of Christ, sin offering        
                        Key Scripture: Revelation 5:6 - "Then I saw a Lamb, looking as if it had been slain, standing at the center of the throne..."        
                        Applicable Scenarios: Conveying purity message, comforting the guilty, expressing worship of Christ       
                        Video Scene Suggestion: Close-up shot (85mm focal length) of a white lamb lying on green grass, soft diffused light (3200K) evenly covering, wool fibers clearly visible; background blurred showing olive trees and blue sky, with light golden light spots (25% opacity) slowly falling; paired with gentle harp playing (volume -22dB), duration 3.5 seconds, lamb's gentle eyes looking at the camera, enhancing affinity.
                        3. Dove
                        Core Meaning: Holy Spirit, peace, purity, new life        
                        Key Scripture: Matthew 3:16 - "At that moment heaven was opened, and he saw the Spirit of God descending like a dove and alighting on him."        
                        Applicable Scenarios: Conveying peace message, comforting the anxious, symbolizing the descent of the Holy Spirit        
                        Video Scene Suggestion: Slow motion (0.5x speed) of a white dove carrying an olive branch flying, 3800K warm white light following the dove's movement; paired with solo flute (volume -20dB), duration 4 seconds, dove leaves a faint light trail (30% opacity) as it passes through the frame, enhancing the divine feeling.        
                        4. Ark of the Covenant
                        Core Meaning: God's presence, covenant, protection, redemption        
                        Key Scripture: Exodus 25:22 - "I will meet with you there and talk with you from above the atonement cover, from between the two cherubim that are above the ark of the covenant law."        
                        Applicable Scenarios: Comforting those facing disaster, conveying God's promise of protection, emphasizing faith foundation
                        Video Scene Suggestion: Low-angle shot (emphasizing solemnity) of a golden ark placed in the temple, soft golden light (3000K) emanating from inside, illuminating the surroundings; background is dark wooden structure with golden decorations; paired with deep organ melody (volume -20dB), duration 3.5 seconds, angel statue details on top of the ark are clear, light and shadow contrast is soft.       
                        5. Olive Branch & Dove
                        Core Meaning: Peace, hope, God's mercy, rebuilding after disaster        
                        Key Scripture: Genesis 8:11 - "When the dove returned to him in the evening, there in its beak was a freshly plucked olive leaf! Then Noah knew that the water had receded from the earth."        
                        Applicable Scenarios: Comforting war victims, encouraging hope in adversity, conveying reconciliation message        
                        Video Scene Suggestion: Close-up shot (100mm macro focal length) of a dove carrying a green olive branch, bokeh light spot effect; dove's wings slowly flapping (0.75x speed), olive branch leaf details clear; paired with flute and piano duet (volume -22dB, 60BPM), duration 3 seconds, ending with the frame pulling back showing the dove flying into the distance, symbolizing the spread of peace.        
                        6. Manna
                        Core Meaning: God's provision, spiritual food, daily grace, nourishment of faith
                        Key Scripture: Exodus 16:15 - "When the Israelites saw it, they said to each other, 'What is it?' For they did not know what it was. Moses said to them, 'It is the bread the Lord has given you to eat.'"        
                        Applicable Scenarios: Comforting those in economic difficulty, encouraging spiritual pursuit, conveying God's faithfulness        
                        Video Scene Suggestion: Ultra-close shot (100mm macro focal length) showing white manna particles covering, 3200K side light emphasizing texture; background blurred; paired with gentle harp melody (volume -24dB), duration 3 seconds, subtle light flickering around the manna, enhancing the mystery of the sacred food.
                        7. Menorah
                        Core Meaning: God's light, church, gifts of the Holy Spirit, spiritual wisdom        
                        Key Scripture: Revelation 1:20 - "The mystery of the seven stars that you saw in my right hand and of the seven golden lampstands is this: The seven stars are the angels of the seven churches, and the seven lampstands are the seven churches."        
                        Applicable Scenarios: Encouraging church communities, comforting those in spiritual darkness, conveying wisdom revelation        
                        Video Scene Suggestion: Medium shot (60mm focal length) showing a pure gold menorah standing in the center, all seven candles lit with stable flames (3800K); menorah details are exquisite, light and shadow contrast is sharp; paired with organ and violin duet (volume -20dB), duration 3.5 seconds, subtle halo diffusing around the flames, enhancing the divine atmosphere.        
                        8. Rainbow - **Use with caution, avoid frequent appearance**
                        Core Meaning: God's promise, mercy, covenant with humanity, hope        
                        Key Scripture: Genesis 9:13 - "I have set my rainbow in the clouds, and it will be the sign of the covenant between me and the earth."        
                        Applicable Scenarios: Comforting those who have experienced disaster, conveying God's faithfulness, encouraging hope for the future (use only in very appropriate situations)        
                        Video Scene Suggestion: Panoramic shot (24mm focal length) showing a complete rainbow spanning the frame, fresh post-rain air feeling (sharpness +5%); paired with orchestral crescendo melody (volume from -25dB rising to -18dB), duration 4 seconds, rainbow colors are vibrant and saturated, sunlight through clouds forms beam effects, enhancing the feeling of hope.
                        9. Shepherd's Staff
                        Core Meaning: Guidance, protection, provision, Christ as the good shepherd        
                        Key Scripture: Psalm 23:4 - "Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me."
                        Applicable Scenarios: Comforting the lost, encouraging the lonely, conveying God's promise of guidance        
                        Video Scene Suggestion: Close-up shot (85mm focal length) showing a wooden shepherd's staff standing on grass, 3200K warm light from the side, staff texture clearly visible; background blurred showing sheep and distant shepherd; paired with solo cello (volume -20dB), duration 3 seconds, a piece of wool hanging from the staff head gently swaying in the breeze, enhancing the symbolic meaning of shepherd's care.        
                        10. Chalice
                        Core Meaning: Redeeming blood, new covenant, fellowship, union with Christ        
                        Key Scripture: Luke 22:20 - "In the same way, after the supper he took the cup, saying, 'This cup is the new covenant in my blood, which is poured out for you.'"        
                        Applicable Scenarios: Communion, comforting the suffering, conveying redemption message, encouraging believer fellowship        
                        Video Scene Suggestion: Close-up shot (100mm macro focal length) showing a silver chalice containing red wine, 3500K warm light from above, rim forming highlights; background blurred showing wooden table and bread; paired with piano and violin duet (volume -22dB), duration 3.5 seconds, red wine in the cup slightly swaying, reflected light changing, enhancing the divine feeling.
                        11. Isaiah 41:10 - So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.        
                        Applicable Scenarios: General anxiety, confusion and helplessness, urgently needing strength support.        
                        Video Scene Suggestion: Use close-up + slow motion (0.5x speed), 3200K-3500K warm light falling from 45° angle above, light intensity gradually increasing; close-up of a broad hand gently supporting a trembling hand (hand skin texture maximized, soft light and shadow contrast), background with low opacity (30%) subtle light halo dyeing the path ahead, paired with solo violin (volume -18dB), duration suggested 3-4 seconds, ending with camera slightly moving up focusing on the subtle light.
                        12. Psalm 23:4 - Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.        
                        Applicable Scenarios: Deep in trouble, inner loneliness, feeling surrounded by darkness.
                        Video Scene Suggestion: Tracking shot (24-70mm focal length) following a person slowly walking, environment in cool tones (2000K color temperature), dark areas retain details without black faces; side shepherd figure set to 50% opacity blur effect, staff tip with subtle light (15% brightness), distant end warm light (4000K) gradually spreading, tone transition from cool to warm over 3 seconds, paired with deep cello accompaniment (volume -20dB), footsteps softened (volume -25dB).
                        13. John 14:27 - Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.        
                        Applicable Scenarios: Inner restlessness, troubled by worries, craving inner peace.
                        Video Scene Suggestion: Panoramic slow motion (0.75x speed) shooting gentle breeze over water surface, sea surface (soft wave amplitude) or wheat field (wheat wave frequency slowed), frame sharpness reduced by 10% to enhance softness; overlay light golden halo (20% opacity, 50px diameter) slowly floating, paired with pure piano single note playing (volume -22dB, 60BPM tempo), no human elements, duration 4 seconds, ending with camera slowly pulling back amplifying the scene's emptiness.
                        14. Deuteronomy 31:6 - Be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; he will never leave you nor forsake you.        
                        Applicable Scenarios: Facing challenges, pressure from others, lacking courage to move forward.        
                        Video Scene Suggestion: Low-angle back shot of person (emphasizing person's smallness and vastness of path ahead), ground shadow cast with side light (2500K), guardian figure shadow 1.5x wider than person, 60% opacity, moving synchronously; background skyline transitioning from dark blue (2000K) to light orange (3800K), duration 3.5 seconds, paired with orchestral crescendo melody (volume from -25dB rising to -18dB), enhancing the feeling of strength.
                        15. Isaiah 43:2 - When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you. When you walk through the fire, you will not be burned; the flames will not set you ablaze.        
                        Applicable Scenarios: Experiencing major trials, trapped in difficulties, feeling unbearable.        
                        Video Scene Suggestion: Medium fixed shot, person slowly walking through shallow water (5cm depth, minimized splash amplitude) and weak flames (orange-red, 30cm flame height, edge blurred); light blue protective light shield (35% opacity, 20% brightness) continuously surrounding the body, shield with no obvious boundaries; camera focusing on person's footsteps (clear focus, background slightly blurred), paired with deep organ sound (volume -20dB), duration 4 seconds, water and fire elements not blocking the person's main body.
                        16. Joshua 1:9 - Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.        
                        Applicable Scenarios: Starting a new journey, facing the unknown, heart full of unease.        
                        Video Scene Suggestion: Close-up of hand holding Bible (finger movements slow, page turning speed 0.5x), Bible cover texture is matte leather; camera slowly pulling back (focal length switching from 50mm to 24mm), showing person standing at a crossroads, distant subtle light (4000K, 40% opacity) focusing into a light point guiding direction; paired with gentle organ sound (volume -23dB), duration 3.5 seconds, ending with camera freezing the moment person turns toward the subtle light.
                        17. Luke 2:10 - But the angel said to them, "Do not be afraid. I bring you good news that will cause great joy for all the people."        
                        Applicable Scenarios: Falling into despair, lacking hope, urgently needing comfort and joy.        
                        Video Scene Suggestion: Panoramic dark scene (1800K color temperature, overall brightness reduced by 15%), angel figure located at upper 1/3 of frame, emitting soft white light (50% opacity, 30% brightness), light spreading in circular pattern covering 3-4 shepherds below; right side of frame gradually showing starry sky (moderate star density, 10% brightness) and distant manger subtle light (3500K), paired with ethereal female voice harmony (volume -22dB, no accompaniment), duration 4 seconds, angel figure edges blurred to avoid abruptness.
                        18. Hebrews 13:6 - So we say with confidence, "The Lord is my helper; I will not be afraid. What can mere mortals do to me?"        
                        Applicable Scenarios: Encountering others' criticism, threats, inner fear and unease.        
                        Video Scene Suggestion: Close-up low-angle shot of person's face (85mm focal length, emphasizing determined expression, even facial lighting), camera quickly switching (0.3 seconds duration) to vast sky panorama; clouds gradually dispersing from thick gray clouds (2 seconds dispersion time), revealing warm white light (4200K), text "The Lord is my helper" in serif font, light golden (70% opacity) gradually appearing from bottom to top; paired with passionate string music phrase (volume -18dB), duration 3 seconds, ending with camera freezing the frame with sky and text together.
                        19. Isaiah 41:13 - For I am the Lord your God who takes hold of your right hand and says to you, Do not fear; I will help you.        
                        Applicable Scenarios: Extremely weak, unable to move forward, longing to be supported.
                        Video Scene Suggestion: Ultra-close hand close-up (100mm focal length, macro mode), large hand wrapping slender hand, finger joint force details natural, hand lighting is warm light (3500K) from side, emphasizing skin texture and temperature feeling; background replaced with blurred light spots (light golden, 25% opacity) instead of clear scene, focusing on the "support" action; paired with gentle piano legato (volume -24dB), duration 3 seconds, camera slightly shaking to simulate breathing feeling enhancing realism.
                        20. 1 John 4:18 - There is no fear in love. But perfect love drives out fear, because fear has to do with punishment. The one who fears is not made perfect in love.        
                        Applicable Scenarios: Fearful due to guilt, worry about punishment, longing to be accepted by love.
                        Video Scene Suggestion: Medium orbiting shot (slowly rotating, 15°/second speed), warm light (3800K) flowing like water from all sides converging toward the person, light flow 40% opacity; heart outline appearing at frame center (soft lines, 60% opacity, light pink), surrounding dark shadows (1800K color temperature) gradually fading (2.5 seconds duration); paired with gentle female voice singing (volume -23dB, piano accompaniment), duration 4 seconds, person's posture relaxed, hands naturally hanging down showing acceptance feeling.        
                        **Note** - As God's word is spoken, display scripture text in the frame

                        **Time Control Rules (Important!):**
                        - Maximum video duration: ${duration} seconds
                        - Normal speaking speed: approximately 2-3 English words per second, approximately 1-2 Chinese characters per second
                        - **Reading Time Requirements (Core!):**
                        * Bible scripture reading must occupy ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} seconds (80-90% of video duration)
                        * English scripture: at least ${Math.floor(duration * 0.8 * 2)}-${Math.floor(duration * 0.9 * 2)} words (approximately ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} seconds reading time)
                        * Chinese scripture: at least ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} characters (approximately ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} seconds reading time)
                        - Reserved time: Reserve at most 1-2 seconds for scene transitions and person's eye contact (not exceeding 10-20% of total video duration)
                        - **Scripture Selection Principles:**
                        * Prioritize complete scriptures of appropriate length (${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} characters/words)
                        * If scripture is too long, only complete sentences or paragraphs can be selected, cannot extract fragments yourself
                        * If no appropriately long scripture is found, longer complete scriptures can be selected, but must be completely quoted, cannot be modified
                        - **Example (12-second video):**
                        * ✅ Good length: "Do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand." (approximately 24-27 words, 9-10 seconds reading)
                        * ❌ Too short: "Do not fear." (only 3 words, 2 seconds reading, does not meet requirements)
                        * ❌ Not allowed: "Do not fear, for I am with you... I will help you." (self-extracted fragment, not allowed)

                        **Key Description Elements (Adapted to user-uploaded images):**
                        - Do not specify specific scenes (because the image already has a scene)
                        - Do not show God's image
                        - Output must completely quote original Bible text based on user's input for matching

                        **Output JSON Format:**
                        {
                        "bibleVerse": {
                            "reference": "Scripture reference (must be accurate)",
                            "text": "Chinese scripture (must be complete original Bible text, at least ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} characters, ensuring reading time reaches ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} seconds, absolutely no modification, abbreviation, or extraction allowed)",
                            "textEn": "English scripture (must be complete original Bible text, at least ${Math.floor(duration * 0.8 * 2)}-${Math.floor(duration * 0.9 * 2)} words, ensuring reading time reaches ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} seconds, absolutely no modification, abbreviation, or extraction allowed)",
                            "estimatedDuration": "Estimated reading duration (seconds), must reach ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} seconds"
                        },
                            "enhancedPrompt": "General English video generation prompt, reading time must occupy ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} seconds, and naturally incorporate 1-2 biblical elements (prioritize Cross, Lamb, Dove, Ark, Olive Branch, Manna, Menorah, Shepherd's Staff, Chalice, etc., use Rainbow with caution), prompt should be as detailed as possible, camera transitions, scene transitions, biblical element description positions and other information should be described thoroughly",
                            "sceneDescription": "Scene description (Chinese)"
                        }

                        **Important Reminders:**
                        1. **Reading time must reach ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} seconds (80-90% of video duration)**, this is the core requirement
                        2. **Must use complete original Bible text**, absolutely no modification, abbreviation, extraction, or splicing of scriptures allowed
                        3. **Must naturally incorporate 1-2 biblical symbol elements in enhancedPrompt**, prioritize Cross, Lamb, Dove, Ark, Olive Branch, Manna, Menorah, Shepherd's Staff, Chalice, etc., use Rainbow with caution, avoid frequently using the same element
                        4. If no appropriately long complete scripture is found, longer complete scriptures can be selected, but must be completely quoted, cannot be modified

                        **Scripture Length Examples (12-second video):**
                        ✅ Good length: "Do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand." (approximately 24-27 words, 9-10 seconds reading, meets requirements)
                        ❌ Too short: "Do not fear." (only 3 words, 2 seconds reading, does not meet requirements, must increase scripture length)
                        ❌ Not allowed: "Do not fear, for I am with you... I will help you." (self-extracted fragment, not allowed, must use complete scripture)
                        ✅ If must use long scripture: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus." (complete quote, even if exceeding ${duration} seconds is acceptable, but reading time must reach ${Math.floor(duration * 0.8)}-${Math.floor(duration * 0.9)} seconds), approximately reading proportion is about 80%-90%

                        Now please analyze the user's feelings and generate a JSON response.`;

                    // Check if user uploaded an image - use imageToText if available, otherwise use textToText
                    const imageInput = params.options?.image_input;
                    const hasImage = imageInput && Array.isArray(imageInput) && imageInput.length > 0;
                    const firstImageUrl = hasImage ? imageInput[0] : null;

                    let responseText: string;

                    if (hasImage && firstImageUrl) {
                        // Use imageToText (图生文) when user uploaded an image
                        // Must use vision model for image-to-text
                        console.log('[Volcano] Using image-to-text enhancement with user image:', firstImageUrl);
                        responseText = await this.imageToText(
                            firstImageUrl,
                            `User feelings: ${userFeeling}`,
                            systemPrompt,
                            {
                                model: doubaoVisionEndpoint, // Use vision model for image-to-text
                                apiKey: enhanceApiKey,
                                temperature: 0.7,
                                top_p: 0.95,
                                max_tokens: 4096,
                            }
                        );
                    } else {
                        // Use textToText (文生文) when no image is provided
                        console.log('[Volcano] Using text-to-text enhancement');
                        responseText = await this.textToText(
                            [
                                {
                                    role: 'system',
                                    content: systemPrompt,
                                },
                                {
                                    role: 'assistant',
                                    content: `I understand. I will accurately match the original Bible verses based on the user's experience and generate warm and comforting video scene descriptions, outputting them in JSON format.`,
                                },
                                {
                                    role: 'user',
                                    content: `User feelings:${userFeeling}`,
                                },
                            ],
                            {
                                model: doubaoEndpoint,
                                apiKey: enhanceApiKey,
                                temperature: 0.7,
                                top_p: 0.95,
                                max_tokens: 4096,
                            }
                        );
                    }

                    try {

                        // Extract JSON from response
                        let jsonText = responseText.trim();
                        if (jsonText.startsWith('```json')) {
                            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                        } else if (jsonText.startsWith('```')) {
                            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
                        }

                        const enhancement = JSON.parse(jsonText);

                        if (enhancement.enhancedPrompt) {
                            promptText = enhancement.enhancedPrompt;
                            console.log('[Volcano] Prompt enhanced successfully:', {
                                verse: enhancement.bibleVerse?.reference,
                                enhancedPrompt: promptText,
                                promptLength: promptText.length,
                            });
                        } else {
                            console.warn('[Volcano] Enhancement response missing enhancedPrompt, using fallback');
                            throw new Error('Enhancement response missing enhancedPrompt, using fallback');
                        }
                    } catch (parseError) {
                        console.warn('[Volcano] Failed to parse enhancement response:', parseError);
                        // Use simple fallback prompt if parsing fails
                        // promptText = fallbackPrompt;
                        throw new Error('Failed to parse enhancement response');
                    }
                } else {
                    console.warn('[Volcano] Doubao API key or endpoint not configured, using user feeling as prompt');
                    // Use user feeling as prompt if API not configured
                    promptText = `A comforting biblical scene about: ${userFeeling}. Soft golden light, peaceful atmosphere, hopeful mood.`;
                }
            } catch (error) {
                console.error('[Volcano] Failed to auto-enhance prompt:', error);
                // Use user feeling as prompt if enhancement fails
                promptText = `A comforting biblical scene about: ${userFeeling}. Soft golden light, peaceful atmosphere, hopeful mood.`;
                console.warn('[Volcano] Using fallback prompt:', promptText);
            }
        }
        else {
            throw new Error('userFeeling is required');
        }

        promptText += " Subtitles cannot be generated on the screen, and speaking must be in English. ";
        // Add parameters from settings, only if not already in prompt
        if (!promptText.includes('--duration')) {
            promptText += ` --duration ${duration}`;
        }
        if (!promptText.includes('--resolution')) {
            promptText += ` --resolution ${resolution}`;
        }
        if (!promptText.includes('--ratio')) {
            promptText += ` --ratio ${ratio}`;
        }
        if (!promptText.includes('--camerafixed')) {
            promptText += ' --camerafixed false';
        }
        if (!promptText.includes('--watermark')) {
            promptText += ' --watermark false';
        }

        // Save final promptText to params.options for debugging and troubleshooting
        if (!params.options) {
            params.options = {};
        }
        params.options.final_prompt = promptText;
        params.options.original_prompt = params.prompt || '';
        params.options.user_feeling = settings.user_feeling || '';

        content.push({
            type: 'text',
            text: promptText,
        });

        // add image if provided (image-to-video)
        if (params.options?.image_input && Array.isArray(params.options.image_input)) {
            params.options.image_input.forEach((imageUrl: string) => {
                content.push({
                    type: 'image_url',
                    image_url: {
                        url: imageUrl,
                    },
                });
            });
        }

        // Get generate_audio from options, default to true for backward compatibility
        const generateAudio = params.options?.generate_audio !== undefined
            ? params.options.generate_audio
            : true;

        const payload = {
            model: params.model,
            content: content,
            generate_audio: generateAudio,
            return_last_frame: true,
        };
        console.log('volcano input', apiUrl, payload);
        const resp = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`request failed with status: ${resp.status}, ${errorText}`);
        }

        const data = await resp.json();

        // Check for error in response
        if (data.error || data.code) {
            throw new Error(
                data.error?.message || data.message || `generate video failed: ${JSON.stringify(data)}`
            );
        }

        // Extract task ID from response
        // Response format may vary, try common fields
        const taskId =
            data.task_id || data.taskId || data.id || data.request_id || data.requestId;

        if (!taskId) {
            throw new Error(`generate video failed: no taskId in response: ${JSON.stringify(data)}`);
        }

        return {
            taskStatus: AITaskStatus.PENDING,
            taskId: String(taskId),
            taskInfo: {},
            taskResult: {
                ...data,
                enhanced_prompt: promptText, // 保存增强后的提示词
                original_prompt: params.prompt, // 保存原始提示词
                user_feeling: userFeeling, // 保存用户感受
            },
        };
    }

    // generate task
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

    async queryVideo({ taskId }: { taskId: string }): Promise<AITaskResult> {
        const apiUrl = `${this.baseUrl}/contents/generations/tasks/${taskId}`;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.configs.apiKey}`,
        };

        const resp = await fetch(apiUrl, {
            method: 'GET',
            headers,
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`request failed with status: ${resp.status}, ${errorText}`);
        }

        const data = await resp.json();
        console.log('volcano query', apiUrl, data);
        // Check for error in response
        if (data.error || (data.code && data.code !== 200)) {
            throw new Error(
                data.error?.message || data.message || `query failed: ${JSON.stringify(data)}`
            );
        }

        const status = data.status || data.state || 'pending';
        const taskStatus = this.mapStatus(status);

        let videos: AIVideo[] | undefined = undefined;

        // Extract video URL from response
        // Priority order: content.video_url > result.video_url > data.video_url > other fields
        if (data.content && data.content.video_url) {
            // Volcano Engine response format: { content: { video_url: "..." } }
            videos = [
                {
                    id: '',
                    createTime: new Date(),
                    videoUrl: data.content.video_url,
                    thumbnailUrl: data.content.thumbnail_url || data.content.image_url,
                },
            ];
        } else if (data.result) {
            const result = data.result;
            if (result.video_url || result.videoUrl) {
                videos = [
                    {
                        id: '',
                        createTime: new Date(),
                        videoUrl: result.video_url || result.videoUrl,
                        thumbnailUrl: result.thumbnail_url || result.thumbnailUrl || result.image_url,
                    },
                ];
            } else if (result.videos && Array.isArray(result.videos)) {
                videos = result.videos.map((video: any) => ({
                    id: '',
                    createTime: new Date(),
                    videoUrl: video.url || video.video_url || video.videoUrl,
                    thumbnailUrl: video.thumbnail || video.thumbnail_url || video.thumbnailUrl,
                }));
            } else if (result.output) {
                // Try output field
                const output = result.output;
                if (typeof output === 'string') {
                    videos = [
                        {
                            id: '',
                            createTime: new Date(),
                            videoUrl: output,
                        },
                    ];
                } else if (Array.isArray(output)) {
                    videos = output
                        .map((item: any) => {
                            const url = typeof item === 'string' ? item : item.url || item.video_url || item.videoUrl;
                            return url
                                ? {
                                    id: '',
                                    createTime: new Date(),
                                    videoUrl: url,
                                }
                                : null;
                        })
                        .filter((v: any) => v !== null) as AIVideo[];
                }
            }
        } else if (data.video_url || data.videoUrl) {
            videos = [
                {
                    id: '',
                    createTime: new Date(),
                    videoUrl: data.video_url || data.videoUrl,
                    thumbnailUrl: data.thumbnail_url || data.thumbnailUrl || data.image_url,
                },
            ];
        } else if (data.videos && Array.isArray(data.videos)) {
            videos = data.videos.map((video: any) => ({
                id: '',
                createTime: new Date(),
                videoUrl: typeof video === 'string' ? video : video.url || video.video_url || video.videoUrl,
                thumbnailUrl: video.thumbnail || video.thumbnail_url || video.thumbnailUrl,
            }));
        } else if (data.output) {
            // Try output field at root level
            const output = data.output;
            if (typeof output === 'string') {
                videos = [
                    {
                        id: '',
                        createTime: new Date(),
                        videoUrl: output,
                    },
                ];
            } else if (Array.isArray(output)) {
                videos = output
                    .map((item: any) => {
                        const url = typeof item === 'string' ? item : item.url || item.video_url || item.videoUrl;
                        return url
                            ? {
                                id: '',
                                createTime: new Date(),
                                videoUrl: url,
                            }
                            : null;
                    })
                    .filter((v: any) => v !== null) as AIVideo[];
            }
        }

        // Extract last frame image if available
        let lastFrameImage: string | null = null;
        if (data.result?.last_frame_url || data.last_frame_url) {
            lastFrameImage = data.result?.last_frame_url || data.last_frame_url;
        }

        // Build task result with original video URLs (upload will happen in background)
        const taskResult: any = {
            ...data,
        };
        if (lastFrameImage) {
            taskResult.last_frame_url = lastFrameImage;
        }

        // Save original video URLs from API response for History viewing
        // Priority: content.video_url > result.video_url > data.video_url
        let originalVideoUrl: string | null = null;
        if (data.content?.video_url) {
            originalVideoUrl = data.content.video_url;
        } else if (data.result?.video_url || data.result?.videoUrl) {
            originalVideoUrl = data.result.video_url || data.result.videoUrl;
        } else if (data.video_url || data.videoUrl) {
            originalVideoUrl = data.video_url || data.videoUrl;
        }

        // Add original video URLs to taskResult for immediate frontend display and History
        // Background upload will update these URLs later (replacing with CDN URLs)
        if (videos && videos.length > 0) {
            const originalVideoUrls = videos.map(v => v.videoUrl).filter(Boolean);
            // Use original API video URL if available (more reliable for History)
            const primaryUrl = originalVideoUrl || originalVideoUrls[0];

            taskResult.saved_video_url = primaryUrl; // Use original API URL for immediate display
            taskResult.saved_video_urls = originalVideoUrls;
            taskResult.original_video_url = originalVideoUrl; // Store original API URL separately
            taskResult.original_video_urls = originalVideoUrls; // Store original URLs array
            // Mark that upload is pending
            taskResult.video_upload_pending = true;
        } else if (originalVideoUrl) {
            // Even if videos array is empty, save original URL if available
            taskResult.saved_video_url = originalVideoUrl;
            taskResult.saved_video_urls = [originalVideoUrl];
            taskResult.original_video_url = originalVideoUrl;
            taskResult.original_video_urls = [originalVideoUrl];
        }

        return {
            taskId,
            taskStatus,
            taskInfo: {
                videos,
                status: status,
                errorCode: data.error?.code || data.error_code,
                errorMessage: data.error?.message || data.error_message,
                createTime: data.create_time ? new Date(data.create_time) : new Date(),
            },
            taskResult,
        };
    }

    // query task
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

export function createVolcanoProvider(configs: VolcanoConfigs): VolcanoProvider {
    return new VolcanoProvider(configs);
}

