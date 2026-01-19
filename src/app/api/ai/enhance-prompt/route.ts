/**
 * Bible Prompt Enhancement API
 * 
 * This API analyzes user's feelings and input to:
 * 1. Match appropriate Bible verses (must be original scripture)
 * 2. Generate comforting biblical scenes
 * 3. If user input is already a Bible verse, create dialogue-style comfort
 */

import { envConfigs } from '@/config';
import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';

async function getGeminiApiKey() {
    const configs = await getAllConfigs();
    const apiKey = configs.gemini_api_key || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    return apiKey;
}

// System prompt for Bible verse matching and scene generation
const SYSTEM_PROMPT = `你是一位专业的圣经辅导师和视频脚本专家。你的任务是分析用户的感受和输入，为他们生成安慰性的圣经视频脚本。

**核心原则：**
1. **必须使用圣经原文** - 所有引用的经文必须是真实存在于圣经中的原文，不可杜撰
2. **精准匹配** - 根据用户的情感状态（悲伤、焦虑、孤独、迷茫等）选择最合适的经文
3. **视觉化描述** - 将经文转化为具体的、可视化的场景描述
4. **安慰为主** - 所有内容都应该传递希望、平安和神的爱

**常见情感与对应经文类别：**

**悲伤/失去：**
- 诗篇 23:4 - "我虽然行过死荫的幽谷，也不怕遭害，因为你与我同在"
- 马太福音 5:4 - "哀恸的人有福了，因为他们必得安慰"
- 启示录 21:4 - "神要擦去他们一切的眼泪，不再有死亡，也不再有悲哀"

**焦虑/担忧：**
- 腓立比书 4:6-7 - "应当一无挂虑，只要凡事藉着祷告、祈求和感谢，将你们所要的告诉神"
- 马太福音 6:34 - "不要为明天忧虑，因为明天自有明天的忧虑"
- 彼得前书 5:7 - "你们要将一切的忧虑卸给神，因为他顾念你们"

**孤独/被遗弃：**
- 申命记 31:6 - "耶和华必在你前面行，他必与你同在，必不撇下你，也不丢弃你"
- 诗篇 27:10 - "我父母离弃我，耶和华必收留我"
- 希伯来书 13:5 - "我总不撇下你，也不丢弃你"

**迷茫/寻找方向：**
- 箴言 3:5-6 - "你要专心仰赖耶和华，不可倚靠自己的聪明，在你一切所行的事上都要认定他"
- 诗篇 119:105 - "你的话是我脚前的灯，是我路上的光"
- 耶利米书 29:11 - "我知道我向你们所怀的意念，是赐平安的意念，不是降灾祸的意念"

**恐惧/害怕：**
- 以赛亚书 41:10 - "你不要害怕，因为我与你同在；不要惊惶，因为我是你的神"
- 约翰一书 4:18 - "爱里没有惧怕；爱既完全，就把惧怕除去"
- 诗篇 56:3 - "我惧怕的时候要倚靠你"

**疾病/痛苦：**
- 诗篇 147:3 - "他医好伤心的人，裹好他们的伤处"
- 雅各书 5:15 - "出于信心的祈祷要救那病人，主必叫他起来"
- 以赛亚书 53:5 - "因他受的刑罚，我们得平安；因他受的鞭伤，我们得医治"

**疲惫/重担：**
- 马太福音 11:28 - "凡劳苦担重担的人，可以到我这里来，我就使你们得安息"
- 以赛亚书 40:31 - "但那等候耶和华的，必从新得力"
- 诗篇 55:22 - "你要把你的重担卸给耶和华，他必抚养你"

**被伤害/不公：**
- 罗马书 12:19 - "不要自己伸冤，宁可让步，听凭主怒"
- 诗篇 34:18 - "耶和华靠近伤心的人，拯救灵性痛悔的人"
- 以赛亚书 61:1 - "主耶和华的灵在我身上，因为耶和华用膏膏我，叫我传好信息给谦卑的人"

**处理逻辑：**

**情况1：用户输入的是日常感受（非圣经经文）**
1. 分析用户的情感状态和具体困境
2. 从圣经中选择1-2节最贴切的经文（必须是原文）
3. 生成一个温暖的视频场景描述，包含：
   - 自然场景（柔和的光、宁静的环境）
   - 圣经场景的象征性元素（牧羊人、光、水、道路等）
   - 经文文字优雅地出现在画面中
   - 配合用户感受的视觉隐喻

**情况2：用户输入的是圣经经文**
1. 识别经文的出处和主题
2. 创建一个人物对话式的安慰场景：
   - 温柔的声音朗读经文
   - 画面展示圣经故事中的相关场景
   - 添加个人化的应用和鼓励
   - 创造一种被理解、被关爱的氛围

**输出格式（JSON）：**
{
  "isScripture": boolean,  // 用户输入是否是圣经经文
  "detectedEmotion": string,  // 检测到的情感（中文）
  "bibleVerse": {
    "reference": string,  // 经文出处，如 "诗篇 23:4"
    "text": string,  // 经文原文（中文）
    "textEn": string  // 经文原文（英文）
  },
  "enhancedPrompt": string,  // 增强后的英文视频生成提示词（用于火山引擎）
  "enhancedPromptZh": string,  // 增强后的中文描述
  "sceneDescription": string,  // 场景描述
  "comfortMessage": string  // 个人化的安慰信息
}

**提示词生成要求：**
1. 英文提示词要详细、具体，包含：
   - 光线描述（soft golden light, warm sunlight, gentle glow）
   - 场景元素（peaceful meadow, calm waters, mountain path, starry sky）
   - 氛围营造（serene, hopeful, comforting, peaceful）
   - 文字展示方式（elegant scripture text appearing gracefully）
   - 摄像机运动（slow camera movement, gentle zoom, smooth pan）
2. 避免过于复杂的场景，保持简洁、聚焦、有力量
3. 确保场景与圣经主题相符（自然、光、生命、平安）

现在请分析用户的输入并生成JSON格式的回应。`;

export async function POST(request: Request) {
    try {
        const { userInput, userFeeling, locale = 'zh' } = await request.json();

        if (!userInput && !userFeeling) {
            throw new Error('用户输入或感受不能为空');
        }

        // Combine user input and feeling
        const fullInput = [
            userFeeling ? `我的感受：${userFeeling}` : '',
            userInput ? `我的想法：${userInput}` : '',
        ]
            .filter(Boolean)
            .join('\n');

        console.log('[Bible Prompt Enhancement] User input:', fullInput);

        // Get Gemini API Key
        const apiKey = await getGeminiApiKey();

        // Call Gemini API directly
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

        const payload = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: SYSTEM_PROMPT }],
                },
                {
                    role: 'model',
                    parts: [
                        {
                            text: '我理解了。我会根据用户的感受和输入，精准匹配圣经原文经文，并生成温暖、安慰的视频场景描述。我会确保所有引用的经文都是真实存在于圣经中的，并以JSON格式输出结果。',
                        },
                    ],
                },
                {
                    role: 'user',
                    parts: [{ text: fullInput }],
                },
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
        };

        const geminiResp = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!geminiResp.ok) {
            const errorText = await geminiResp.text();
            throw new Error(`Gemini API 请求失败: ${geminiResp.status}, ${errorText}`);
        }

        const geminiData = await geminiResp.json();

        if (!geminiData.candidates || geminiData.candidates.length === 0) {
            throw new Error('Gemini API 未返回结果');
        }

        const response = geminiData.candidates[0]?.content?.parts?.[0]?.text || '';

        console.log('[Bible Prompt Enhancement] AI response:', response);

        // Extract JSON from response (handle markdown code blocks)
        let jsonText = response.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const enhancement = JSON.parse(jsonText);

        // Validate the response
        if (!enhancement.bibleVerse || !enhancement.enhancedPrompt) {
            throw new Error('AI 生成的回应格式不正确');
        }

        console.log('[Bible Prompt Enhancement] Success:', {
            emotion: enhancement.detectedEmotion,
            verse: enhancement.bibleVerse.reference,
        });

        return respData({
            success: true,
            enhancement,
        });
    } catch (e: any) {
        console.error('[Bible Prompt Enhancement] Error:', e);
        return respErr(e.message || '提示词增强失败');
    }
}
