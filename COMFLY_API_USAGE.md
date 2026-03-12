# Comfly API Provider Usage Guide

## Overview

The Comfly API Provider integrates multiple AI services to generate Jesus-themed videos from user-uploaded images. The workflow includes:

1. **Image Editing** - Uses nano-banana model to add Jesus figure in oil painting style
2. **Video Generation** - Uses wanx2.1-i2v-turbo model to animate the edited image
3. **Script Generation** - Generates narration text with Bible verses from user feelings
4. **Audio Generation** - Creates voice narration using TTS
5. **Video Merging** - Combines video, audio, and subtitles into final output

## Configuration

```typescript
import { ComflyAPIProvider } from '@/extensions/ai/comfly-api';

const provider = new ComflyAPIProvider({
  nanoBananaApiKey: 'sk-EEjhr6yGwjbWQ29Q2Hc8pp0QFKVd1Z8GJrt5qu5ClhOKz21r',
  wanxApiKey: 'sk-5A02F20faCK8bmkEUiqogt2kd2WSux2oP0tlHPzcx8N0JMbY',
  imageEditBaseUrl: 'https://ai.comfly.chat', // optional
  videoGenBaseUrl: 'https://ai.comfly.chat', // optional
  ttsBaseUrl: 'https://clonevoice.nailai.net', // optional
  videoProcessBaseUrl: 'https://clonevoice.nailai.net', // optional
});
```

## Basic Usage

```typescript
import { AIMediaType } from '@/extensions/ai/types';

// Generate video from uploaded image with auto-generated script
const result = await provider.generate({
  params: {
    taskId: 'unique-task-id',
    mediaType: AIMediaType.VIDEO,
    prompt: '让画面中的图片动起来，重点描述画面中耶稣的祝福动作',
    options: {
      // Required: provide either imageFile or imageUrl
      imageFile: imageBuffer, // Buffer
      // OR
      imageUrl: 'https://example.com/image.jpg',

      // Generate script from user feelings (recommended)
      generateScript: true,
      userFeelings: 'I feel lost and need guidance',

      // Optional: provide custom script text (overrides generateScript)
      scriptText: 'Your custom narration text',

      // Optional: audio settings
      language: 'en', // 'en' or 'zh'

      // Optional: video merge settings
      title: 'Isaiah 41:10',
      titleStart: 0,
      titleEnd: 1000,
      bgmVolume: 3,
      voiceVolume: 1.0,
      maxWordsPerLine: 20,
      longTokenDurS: 0.8,

      // Optional: background music
      bgmFile: bgmBuffer, // Buffer
    },
  },
});

console.log(result.taskInfo?.videos?.[0]?.videoUrl);
```

## Script Generation Feature

When `generateScript: true` is set, the provider will:

1. Analyze the user's emotional input (`userFeelings`)
2. Match an appropriate Bible verse
3. Generate a warm, comforting narration that includes:
   - Acknowledgment of the user's feelings
   - The complete Bible verse text (NIV or ESV)
   - Words of comfort and hope

**Example Script Generation:**

Input:
```typescript
{
  generateScript: true,
  userFeelings: 'I feel anxious and overwhelmed'
}
```

Output narration might be:
```
I see you're carrying a heavy burden... It's okay to feel overwhelmed.
The Bible says in Isaiah 41:10, "So do not fear, for I am with you;
do not be dismayed, for I am your God. I will strengthen you and help you;
I will uphold you with my righteous right hand."
Rest in this promise... You are not alone.
```

## API Methods

### `generate({ params })`

Main method to generate Jesus video from image.

**Parameters:**
- `taskId` (string) - Unique task identifier
- `mediaType` (AIMediaType) - Must be `AIMediaType.VIDEO`
- `prompt` (string) - Video animation prompt (optional, has default)
- `options` (object):
  - `imageFile` (Buffer) - Image file buffer
  - `imageUrl` (string) - Image URL (alternative to imageFile)
  - `generateScript` (boolean) - Generate script from user feelings (recommended)
  - `userFeelings` (string) - User's emotional input for script generation
  - `scriptText` (string) - Custom narration text (overrides generateScript)
  - `language` (string) - Audio language ('en' or 'zh')
  - `title` (string) - Video title overlay
  - `titleStart` (number) - Title start time (ms)
  - `titleEnd` (number) - Title end time (ms)
  - `bgmVolume` (number) - Background music volume
  - `voiceVolume` (number) - Voice narration volume
  - `maxWordsPerLine` (number) - Max words per subtitle line
  - `longTokenDurS` (number) - Long token duration
  - `bgmFile` (Buffer) - Background music file

**Returns:** `AITaskResult` with video URL in `taskInfo.videos[0].videoUrl`

### `query({ taskId })`

Query video generation status (used internally for polling).

**Parameters:**
- `taskId` (string) - Wanx video task ID

**Returns:** `AITaskResult` with current status

## Task Progress Tracking

The provider tracks progress through multiple steps:

```typescript
enum ComflyTaskStep {
  PENDING = "pending",
  EDITING_IMAGE = "editing_image",
  GENERATING_VIDEO = "generating_video",
  POLLING_VIDEO = "polling_video",
  GENERATING_SCRIPT = "generating_script",
  GENERATING_AUDIO = "generating_audio",
  MERGING_VIDEO = "merging_video",
  COMPLETED = "completed",
  FAILED = "failed",
}
```

Access progress info:
```typescript
const progress = result.taskInfo?.progress;
console.log(progress?.currentStep); // Current step
console.log(progress?.progress); // 0-100
console.log(progress?.stepMessage); // Human-readable message
```

## Integration with AIManager

```typescript
import { aiManager } from '@/extensions/ai';
import { ComflyAPIProvider } from '@/extensions/ai/comfly-api';

// Register provider
const comflyProvider = new ComflyAPIProvider({
  nanoBananaApiKey: process.env.NANO_BANANA_API_KEY!,
  wanxApiKey: process.env.WANX_API_KEY!,
});

aiManager.addProvider(comflyProvider);

// Use through manager
const provider = aiManager.getProvider('comfly-api');
const result = await provider?.generate({ params });
```

## Error Handling

All network requests include automatic retry mechanism (3 attempts with exponential backoff):

```typescript
try {
  const result = await provider.generate({ params });

  if (result.taskStatus === AITaskStatus.FAILED) {
    console.error('Generation failed:', result.taskInfo?.errorMessage);
  }
} catch (error) {
  console.error('Error:', error.message);
}
```

## Notes

- Video generation can take 5-10 minutes (polling with 10s intervals)
- nano-banana preserves original faces and figures
- wanx2.1 animates the scene focusing on Jesus's blessing gestures
- Script generation uses Claude Opus 4.6 for high-quality, empathetic narration
- TTS supports English and Chinese languages
- Final video includes subtitles and optional background music
- All API calls include retry mechanism for better reliability
