import { NextRequest } from 'next/server';

import { getAuth } from '@/core/auth';
import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { ComflyPromptType } from '@/extensions/ai';
import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';
import { getComflyProviderWithConfigs } from '@/shared/services/ai';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return Response.json(
        { code: -1, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await requirePermission({
      code: PERMISSIONS.SETTINGS_WRITE,
      redirectUrl: '/admin/no-permission',
      locale: 'en',
    });

    const body = await req.json();
    const type = String(body.type || '');
    const input = String(body.input || '');
    const imageUrl = String(body.imageUrl || '');
    const videoUrl = String(body.videoUrl || '');
    const audioUrl = String(body.audioUrl || '');
    const model = body.model ? String(body.model) : undefined;
    const voice = body.voice ? String(body.voice) : undefined;
    const language = body.language ? String(body.language) : undefined;
    const speed =
      typeof body.speed === 'number'
        ? body.speed
        : body.speed
          ? Number(body.speed)
          : undefined;
    const title = body.title ? String(body.title) : undefined;
    const bgmUrl = body.bgmUrl ? String(body.bgmUrl) : undefined;
    const bgmVolume = body.bgmVolume ? String(body.bgmVolume) : undefined;
    const voiceVolume = body.voiceVolume ? String(body.voiceVolume) : undefined;
    const maxWordsPerLine = body.maxWordsPerLine
      ? String(body.maxWordsPerLine)
      : undefined;
    const longTokenDurS = body.longTokenDurS
      ? String(body.longTokenDurS)
      : undefined;
    const execute = body.execute === true;
    const overrides = body.overrides || {};

    if (!Object.values(ComflyPromptType).includes(type as ComflyPromptType)) {
      return respErr('invalid prompt type', 400);
    }

    const baseConfigs = await getAllConfigs();
    const configs = {
      ...baseConfigs,
      ...(overrides.comfly_image_edit_prompt
        ? { comfly_image_edit_prompt: String(overrides.comfly_image_edit_prompt) }
        : {}),
      ...(overrides.comfly_default_video_prompt
        ? {
            comfly_default_video_prompt: String(
              overrides.comfly_default_video_prompt
            ),
          }
        : {}),
      ...(overrides.comfly_script_system_prompt
        ? {
            comfly_script_system_prompt: String(
              overrides.comfly_script_system_prompt
            ),
          }
        : {}),
      ...(overrides.comfly_tts_voice
        ? {
            comfly_tts_voice: String(overrides.comfly_tts_voice),
          }
        : {}),
      ...(overrides.comfly_tts_speed
        ? {
            comfly_tts_speed: String(overrides.comfly_tts_speed),
          }
        : {}),
      ...(overrides.comfly_merge_bgm_url
        ? {
            comfly_merge_bgm_url: String(overrides.comfly_merge_bgm_url),
          }
        : {}),
      ...(overrides.comfly_merge_bgm_volume
        ? {
            comfly_merge_bgm_volume: String(overrides.comfly_merge_bgm_volume),
          }
        : {}),
      ...(overrides.comfly_merge_voice_volume
        ? {
            comfly_merge_voice_volume: String(
              overrides.comfly_merge_voice_volume
            ),
          }
        : {}),
      ...(overrides.comfly_merge_max_words_per_line
        ? {
            comfly_merge_max_words_per_line: String(
              overrides.comfly_merge_max_words_per_line
            ),
          }
        : {}),
      ...(overrides.comfly_merge_long_token_dur_s
        ? {
            comfly_merge_long_token_dur_s: String(
              overrides.comfly_merge_long_token_dur_s
            ),
          }
        : {}),
    };
    const provider = getComflyProviderWithConfigs(configs);

    if (!provider) {
      return respErr('comfly provider is not configured', 400);
    }

    const promptType = type as ComflyPromptType;
    const data = execute
      ? await provider.testPrompt({
          type: promptType,
          input,
          imageUrl,
          videoUrl,
          audioUrl,
          model,
          voice,
          language,
          speed: Number.isFinite(speed) ? speed : undefined,
          title,
          bgmUrl,
          bgmVolume,
          voiceVolume,
          maxWordsPerLine,
          longTokenDurS,
        })
      : provider.previewPromptTest({
          type: promptType,
          input,
          imageUrl,
          videoUrl,
          audioUrl,
          model,
          voice,
          language,
          speed: Number.isFinite(speed) ? speed : undefined,
          title,
          bgmUrl,
          bgmVolume,
          voiceVolume,
          maxWordsPerLine,
          longTokenDurS,
        });

    return respData(data);
  } catch (e: any) {
    console.error('[Admin Comfly Prompt Test] Failed:', e);
    return respErr(e.message || 'Failed to test comfly prompt', 500);
  }
}
