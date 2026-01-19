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
     * Image-to-Text Chat Completion (图生文)
     * Convenience method for image-to-text vision chat
     * 
     * @param imageUrl - Image URL to analyze
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

        // Add multimodal user message (image + text)
        messages.push({
            role: 'user',
            content: [
                {
                    type: 'image_url',
                    image_url: {
                        url: imageUrl,
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
        const duration = settings.duration || 12;
        const resolution = settings.resolution || '480p';
        const ratio = settings.ratio || 'adaptive';

        // 🔥 Auto-enhance prompt with Bible verses based on user feeling
        let promptText = params.prompt || '';

        // If user feeling is provided, automatically enhance the prompt
        const userFeeling = settings.user_feeling;
        if (userFeeling && userFeeling.trim()) {
            console.log('[Volcano] Auto-enhancing prompt with Bible verses...', { userFeeling });

            // Define fallback prompt (used when enhancement fails)
            // Note: Biblical elements should be generated by AI, not randomly selected
            const fallbackPrompt = `The person in the image is speaking directly to the viewer with tender expression and comforting voice, sharing words of hope and comfort about ${userFeeling}.`;

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
                    const systemPrompt = `你是一位专业的圣经辅导师和视频脚本专家。你的任务是分析用户的感受，为他们生成安慰性的圣经视频脚本。

                        **核心原则：**
                        1. **必须使用圣经原文** - 所有引用的经文必须是真实存在于圣经中的原文
                        2. **精准匹配** - 根据用户的情感状态选择最合适的经文
                        3. **视觉化描述** - 将经文转化为具体的、可视化的场景描述
                        4. **安慰为主** - 传递希望、平安和神的爱
                        6. **严格时间控制** - 视频最大时长${duration}秒，必须控制话语经文长度以适应时间限制

                        **常见情感与对应经文：**

                        悲伤：诗篇 23:4, 马太福音 5:4, 启示录 21:4
                        焦虑：腓立比书 4:6-7, 马太福音 6:34, 彼得前书 5:7
                        孤独：申命记 31:6, 希伯来书 13:5
                        迷茫：箴言 3:5-6, 诗篇 119:105, 耶利米书 29:11
                        恐惧：以赛亚书 41:10, 诗篇 56:3
                        疾病：诗篇 147:3, 以赛亚书 53:5
                        疲惫：马太福音 11:28, 以赛亚书 40:31
                        伤害：罗马书 12:19, 诗篇 34:18

                        **视频场景要求：**
                        根据用户的图片和文字，选择或者参考以下视频案例：
                        1. 十字架（Cross）
                        核心意义：救赎、牺牲、上帝的爱、战胜死亡与罪恶        
                        关键经文：约翰福音3:16 - "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life."        
                        适用场景：传递救赎信息、安慰苦难者、宣告信仰胜利        
                        视频画面建议：中景镜头（焦距50mm）展现木质十字架立于画面顶部，3500K暖光从十字架后上方照射，形成神圣光晕（透明度40%）；背景为日出或日落天空，云层渐变色彩丰富；搭配管弦乐庄严旋律（音量-18dB），时长4秒，结尾十字架周围浮现微光粒子效果，增强神圣感。      
                        2. 羔羊（Lamb）
                        核心意义：纯洁、牺牲、基督的化身、赎罪祭        
                        关键经文：启示录5:6 - "Then I saw a Lamb, looking as if it had been slain, standing at the center of the throne..."        
                        适用场景：传递纯洁信息、安慰愧疚者、表达对基督的敬拜       
                        视频画面建议：特写镜头（焦距85mm）拍摄洁白羔羊卧于青草地上，柔和散射光（3200K）均匀覆盖，羊毛发丝清晰可见；背景虚化呈现橄榄树与蓝天，叠加淡金色光斑（透明度25%）缓慢飘落；搭配竖琴轻柔弹奏（音量-22dB），时长3.5秒，羔羊眼神温柔望向镜头，增强亲和力。
                        3. 鸽子（Dove）
                        核心意义：圣灵、和平、纯洁、新生命        
                        关键经文：马太福音3:16 - " At that moment heaven was opened, and he saw the Spirit of God descending like a dove and alighting on him."        
                        适用场景：传递和平信息、安慰焦虑者、象征圣灵降临        
                        视频画面建议：慢镜头（0.5倍速）拍摄白色鸽子衔着橄榄枝飞翔，3800K暖白光跟随鸽子移动；搭配长笛独奏（音量-20dB），时长4秒，鸽子飞过画面时留下淡淡光痕（透明度30%），增强神圣感。        
                        4. 方舟（Ark of the Covenant）核心意义：上帝同在、盟约、保护、救赎        
                        关键经文：出埃及记25:22 - "I will meet with you there and talk with you from above the atonement cover, from between the two cherubim that are above the ark of the covenant law."        
                        适用场景：安慰面临灾难者、传递上帝保护的应许、强调信仰根基视频画面建议：低角度拍摄（突出庄严感）金饰方舟置于圣殿中，内部透出柔和金光（3000K），照亮周围环境；背景为深色木质结构，点缀金色装饰；搭配管风琴低沉旋律（音量-20dB），时长3.5秒，方舟顶部天使雕像细节清晰，光影对比柔和。       
                        5. 橄榄枝与鸽子（Olive Branch & Dove）核心意义：和平、希望、上帝的怜悯、灾难后的重建        
                        关键经文：创世记8:11 - "When the dove returned to him in the evening, there in its beak was a freshly plucked olive leaf! Then Noah knew that the water had receded from the earth."        
                        适用场景：安慰战争受害者、鼓励困境中坚持希望、传递和解信息        
                        视频画面建议：特写镜头（焦距100mm微距）拍摄鸽子衔着翠绿橄榄枝，光斑虚化效果；鸽子翅膀缓慢扇动（0.75倍速），橄榄枝叶片细节清晰；搭配长笛与钢琴合奏（音量-22dB，60BPM），时长3秒，结尾画面拉远展现鸽子飞向远方，象征和平传播。        
                        6. 吗哪（Manna）
                        核心意义：上帝的供应、属灵食物、每日的恩典、信仰的滋养
                        关键经文：出埃及记16:15 - "When the Israelites saw it, they said to each other, 'What is it?' For they did not know what it was. Moses said to them, 'It is the bread the Lord has given you to eat.'"        
                        适用场景：安慰经济困难者、鼓励灵性追求、传递上帝信实        
                        视频画面建议：超近景镜头（焦距100mm微距）展现白色吗哪颗粒覆盖，3200K侧光突出质感；背景虚化；搭配竖琴轻柔旋律（音量-24dB），时长3秒，吗哪周围有微光闪烁，增强神圣食物的神秘感。
                        7. 七烛台（Menorah）核心意义：上帝的光、教会、圣灵的恩赐、属灵的智慧        
                        关键经文：启示录1:20 - "The mystery of the seven stars that you saw in my right hand and of the seven golden lampstands is this: The seven stars are the angels of the seven churches, and the seven lampstands are the seven churches."        
                        适用场景：鼓励教会团体、安慰灵性黑暗者、传递智慧启示        
                        视频画面建议：中景镜头（焦距60mm）展现纯金七烛台立于中心，七支蜡烛全部点燃，火焰稳定（3800K）；烛台细节精致，光影对比鲜明；搭配管风琴与小提琴合奏（音量-20dB），时长3.5秒，火焰周围有微弱光晕扩散，增强神圣氛围。        
                        8. 彩虹（Rainbow）核心意义：上帝的应许、怜悯、与人类的盟约、希望        
                        关键经文：创世记9:13 - "I have set my rainbow in the clouds, and it will be the sign of the covenant between me and the earth."        
                        适用场景：安慰经历灾难者、传递上帝信实、鼓励盼望未来        
                        视频画面建议：全景镜头（焦距24mm）展现完整彩虹横跨画面，雨后清新空气感（锐度+5%）；搭配管弦乐渐强旋律（音量从-25dB升至-18dB），时长4秒，彩虹色彩鲜艳饱和，阳光透过云层形成光束效果，增强希望感。
                        9. 牧羊杖（Shepherd's Staff）核心意义：引导、保护、供应、基督作为好牧人        
                        关键经文：诗篇23:4 - "Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me."
                        适用场景：安慰迷路者、鼓励孤独者、传递上帝引导的应许        
                        视频画面建议：特写镜头（焦距85mm）展现木质牧羊杖立于草地，3200K暖光从侧面照射，杖身纹理清晰；背景虚化呈现羊群与远处牧人；搭配大提琴独奏（音量-20dB），时长3秒，杖头悬挂一条羊毛，微风中轻轻飘动，增强牧人关怀的象征意义。        
                        10. 圣杯/圣餐杯（Chalice）
                        核心意义：救赎之血、新约、团契、与基督的联合        
                        关键经文：路加福音22:20 - "In the same way, after the supper he took the cup, saying, 'This cup is the new covenant in my blood, which is poured out for you.'"        
                        适用场景：圣餐礼、安慰苦难者、传递救赎信息、鼓励信徒团契        
                        视频画面建议：特写镜头（焦距100mm微距）展现银色圣杯盛有红酒，3500K暖光从上方照射，杯口形成高光；背景虚化呈现木质餐桌与面包；搭配钢琴与小提琴合奏（音量-22dB），时长3.5秒，杯中红酒轻微晃动，反射光线变化，增强神圣感。
                        11. Isaiah 41:10 - So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.        
                        适用场景：普遍焦虑、迷茫无助，亟需力量支撑时。        
                        视频画面建议：采用特写+慢镜头（0.5倍速），3200K-3500K暖光从上方45°角洒落，光强渐变增强；特写宽厚的手轻轻托举颤抖的人手（手部皮肤质感拉满，光影对比柔和），背景用低透明度（30%）微光晕染前路，搭配小提琴独奏（音量-18dB），时长建议3-4秒，结尾镜头轻微上移聚焦微光。
                        12. Psalm 23:4 - Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.        
                        适用场景：深陷困境、内心孤独，感觉被黑暗环绕时。
                        视频画面建议：跟拍镜头（焦距24-70mm）跟随人物缓慢行走，环境用冷色调（色温2000K），暗部保留细节不黑脸；侧面牧人身影设为50%透明度虚化效果，手持杖梢微光（亮度15%），远处尽头暖光（4000K）逐步扩散，色调从冷到暖过渡时长3秒，搭配低沉大提琴伴奏（音量-20dB），脚步声弱化处理（音量-25dB）。
                        13. John 14:27 - Peace I leave with you; my peace I give you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.        
                        适用场景：内心躁动、被烦心事困扰，渴求心灵平静时。
                        视频画面建议：全景慢镜头（0.75倍速）拍摄微风拂过水面、海面（波纹幅度柔和）或麦田（麦浪起伏频率放缓），画面锐度降低10%增强柔和感；叠加淡金色光晕（透明度20%，直径50px）缓慢浮动，搭配纯钢琴单音弹奏（音量-22dB，节拍60BPM），无人物元素，时长4秒，结尾镜头缓慢拉远放大场景空旷感。
                        14. Deuteronomy 31:6 - Be strong and courageous. Do not be afraid or terrified because of them, for the Lord your God goes with you; he will never leave you nor forsake you.        
                        适用场景：面对挑战、他人施压，缺乏勇气前行时。        
                        视频画面建议：低角度背拍人物（突出人物渺小与前路辽阔），地面影子用侧光（2500K）投射，守护身影影子比人物宽1.5倍、透明度60%，保持同步移动；背景天际线从暗蓝（2000K）渐变为淡橙（3800K），时长3.5秒，搭配管弦乐渐强旋律（音量从-25dB升至-18dB），增强力量感。
                        15. Isaiah 43:2 - When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you. When you walk through the fire, you will not be burned; the flames will not set you ablaze.        
                        适用场景：经历重大试炼、困境缠身，感觉难以承受时。        
                        视频画面建议：中景固定镜头，人物缓步走过浅滩（水深5cm，水花飞溅幅度最小化）与微弱火焰（橙红色，火焰高度30cm，边缘虚化）；周身淡蓝色保护光罩（透明度35%，亮度20%）持续环绕，光罩无明显边界；镜头聚焦人物脚步（对焦清晰，背景轻微虚化），搭配低沉管风琴声（音量-20dB），时长4秒，水火元素不遮挡人物主体。
                        16. Joshua 1:9 - Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.        
                        适用场景：开启新征程、面临未知，内心充满不安时。        
                        视频画面建议：近景特写手持圣经的手（手指动作缓慢，翻页速度0.5倍速），圣经封面质感为皮质哑光；镜头缓慢拉远（焦距从50mm切换至24mm），展现人物站在三叉路口，远方微光（4000K，透明度40%）聚焦成光点指引方向；搭配轻柔管风琴声（音量-23dB），时长3.5秒，结尾镜头定格人物转身朝向微光的瞬间。
                        17. Luke 2:10 - But the angel said to them, “Do not be afraid. I bring you good news that will cause great joy for all the people.”        
                        适用场景：陷入绝望、缺乏盼望，亟需慰藉与喜乐时。        
                        视频画面建议：全景暗调场景（色温1800K，整体亮度降低15%），天使身影位于画面上1/3处，散发柔和白光（透明度50%，亮度30%），光芒以圆形扩散覆盖下方3-4名牧羊人；画面右侧渐显星空（星点密度适中，亮度10%）与远方马槽微光（3500K），搭配空灵女声和声（音量-22dB，无伴奏），时长4秒，天使身影边缘虚化避免突兀。
                        18. Hebrews 13:6 - So we say with confidence, “The Lord is my helper; I will not be afraid. What can mere mortals do to me?”        
                        适用场景：遭遇他人非议、威胁，内心惶恐不安时。        
                        视频画面建议：近景仰拍人物面部（焦距85mm，突出坚定神情，面部光影均匀），镜头快速切换（时长0.3秒）至广阔天空全景；云层从厚重灰云渐散（消散时长2秒），透出暖白光（4200K），文字“耶和华是我的帮助”采用衬线体，淡金色（透明度70%）从下往上渐显；搭配激昂弦乐短句（音量-18dB），时长3秒，结尾镜头定格天空与文字同框画面。
                        19. Isaiah 41:13 - For I am the Lord your God who takes hold of your right hand and says to you, Do not fear; I will help you.        
                        适用场景：极度软弱、无力前行，渴望被扶持时。
                        视频画面建议：超近景特写手部（焦距100mm，微距模式），大手包裹纤细的手，指节用力细节自然，手部光影为暖光（3500K）从侧面照射，突出皮肤纹理与温度感；背景用模糊光斑（淡金色，透明度25%）替代清晰场景，聚焦“扶持”动作；搭配轻柔钢琴连音（音量-24dB），时长3秒，镜头轻微晃动模拟呼吸感增强真实度。
                        20. 1 John 4:18 - There is no fear in love. But perfect love drives out fear, because fear has to do with punishment. The one who fears is not made perfect in love.        
                        适用场景：因愧疚、担忧惩罚而心怀恐惧，渴望被爱接纳时。
                        视频画面建议：中景环绕镜头（缓慢旋转，速度15°/秒），暖光（3800K）如水流般从四周向人物汇聚，光流透明度40%；画面中心浮现爱心轮廓（线条柔和，透明度60%，淡粉色），周围暗色阴影（色温1800K）逐步消退（时长2.5秒）；搭配温柔女声吟唱（音量-23dB，钢琴伴奏），时长4秒，人物姿态放松，双手自然下垂体现被接纳感。        
                        **注意** - 随着上帝的话语，在画面中显示经文文字

                        **时间控制规则（重要！）：**
                        - 视频最大时长：${duration}秒
                        - 正常语速说话：约每秒2-3个英文单词，约每秒1个中文句子
                        - 经文长度限制：
                        * 英文经文：最多${Math.floor(duration * 0.7)}-${Math.floor(duration * 0.8)}个单词（约${Math.floor(duration * 0.7)}-${Math.floor(duration * 0.8)}秒讲述时间）
                        * 中文经文：最多${Math.floor(duration * 0.7)}-${Math.floor(duration * 0.8)}个字（约${Math.floor(duration * 0.7)}-${Math.floor(duration * 0.8)}秒讲述时间）
                        - 如果经文超过长度限制：
                        * 优先选择较短的经文
                        * 如果必须使用长经文，只截取其中最核心、最安慰人心的部分
                        * 或者将长经文拆分，只使用第一部分
                        - 预留时间：为画面转场、人物眼神交流预留${Math.max(2, Math.floor(duration * 0.2))}-${Math.max(4, Math.floor(duration * 0.3))}秒
                        - 例如：腓立比书4:6-7完整太长，可以只用"不要为任何事忧虑"部分

                        **关键描述要素（适配用户上传的图片）：**
                        - 不要指定具体场景（因为图片已有场景）
                        - 不要出现上帝形象

                        **输出JSON格式：**
                        {
                        "bibleVerse": {
                            "reference": "经文出处",
                            "text": "中文经文（控制在${Math.floor(duration * 0.7)}-${Math.floor(duration * 0.8)}字以内，如果原文太长则截取核心部分）",
                            "textEn": "英文经文（控制在${Math.floor(duration * 0.7)}-${Math.floor(duration * 0.8)}个单词以内，如果原文太长则截取核心部分）",
                            "estimatedDuration": "预估讲述时长（秒），例如：${Math.floor(duration * 0.7)}"
                        },
                            "enhancedPrompt": "通用的英文视频生成提示词，重点描述说话，并自然融入1-2个圣经元素，例如：A peaceful, hopeful scene offering spiritual comfort, where if a person appears, they gently speak the Bible words **[完整英文经文]** with a calm, tender expression and comforting voice, and if no person appears, the same words are delivered through a soft, soothing voiceover; a single subtle Christian symbol such as a wooden cross or soft rainbow light blends naturally into the background, with warm lighting and a tranquil, sacred atmosphere throughout.",
                            "sceneDescription": "场景描述（中文）"
                        }

                        **重要提醒：**
                        1. 严格控制经文长度，确保在${duration}秒视频时长内完成讲述
                        2. 优先选择短小精悍、直击人心的经文
                        3. **必须在 enhancedPrompt 中自然融入1-2个圣经符号元素**，作为背景装饰增强属灵氛围

                        **经文长度示例：**
                        ✅ 好的长度："应当一无挂虑，只要凡事借着祷告祈求，和感谢，将你们所要的告诉神。"（约${Math.floor(duration * 0.7)}字，${Math.floor(duration * 0.7)}秒）
                        ❌ 太长："应当一无挂虑，只要凡事借着祷告祈求，和感谢，将你们所要的告诉神。神所赐出人意外的平安，必在基督耶稣里，保守你们的心怀意念。"（${Math.floor(duration * 1.5)}字，超过${duration}秒）

                        现在请分析用户的感受并生成JSON回应。`;

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
                            `用户的感受：${userFeeling}`,
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
                                    content: '我理解了。我会根据用户的感受，精准匹配圣经原文经文，并生成温暖、安慰的视频场景描述，以JSON格式输出。',
                                },
                                {
                                    role: 'user',
                                    content: `用户的感受：${userFeeling}`,
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
                    console.warn('[Volcano] Doubao API key or endpoint not configured, using fallback prompt');
                    // Use simple fallback prompt if API not configured
                    // promptText = fallbackPrompt;
                    throw new Error('API key or endpoint not configured, using fallback prompt');
                }
            } catch (error) {
                console.error('[Volcano] Failed to auto-enhance prompt:', error);
                // Use simple fallback prompt if enhancement fails
                // promptText = fallbackPrompt;
                throw new Error('Failed to auto-enhance prompt');
            }
        }
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

