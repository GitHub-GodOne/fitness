import { respData, respErr } from '@/shared/lib/resp';
import { listBodyParts } from '@/shared/models/video_library';

export async function GET() {
  try {
    const bodyParts = await listBodyParts({
      status: 'active',
      limit: 1000,
    });

    return respData({
      bodyParts,
    });
  } catch (e: any) {
    console.error('[Video Library Body Parts] GET failed:', e);
    return respErr(e.message || 'Failed to fetch body parts', 500);
  }
}
