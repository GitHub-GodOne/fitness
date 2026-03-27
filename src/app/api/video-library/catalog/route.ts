import { resolveVideoAccessTierFromSubscription } from '@/shared/lib/video-access';
import { respData, respErr } from '@/shared/lib/resp';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import {
  listAccessibleFitnessVideoCatalog,
  listBodyParts,
  listFitnessObjects,
} from '@/shared/models/video_library';

export const dynamic = 'force-dynamic';

function parseCsvParam(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(req: Request) {
  try {
    const user = await getUserInfo();
    const currentSubscription = user
      ? await getCurrentSubscription(user.id)
      : null;
    const accessTier = resolveVideoAccessTierFromSubscription(currentSubscription);

    const { searchParams } = new URL(req.url);
    const objectIds = parseCsvParam(searchParams.get('objectIds'));
    const bodyPartIds = parseCsvParam(searchParams.get('bodyPartIds'));
    const videoGroupIds = parseCsvParam(searchParams.get('videoGroupIds'));
    const search = searchParams.get('search')?.trim() || undefined;
    const limit = Math.min(
      Math.max(Number.parseInt(searchParams.get('limit') || '48', 10) || 48, 1),
      96
    );

    const [objects, bodyParts, videoGroups] = await Promise.all([
      listFitnessObjects({
        status: 'active',
        limit: 1000,
      }),
      listBodyParts({
        status: 'active',
        limit: 1000,
      }),
      listAccessibleFitnessVideoCatalog({
        accessType: accessTier,
        objectIds,
        bodyPartIds,
        videoGroupIds,
        search,
        limit,
      }),
    ]);

    return respData({
      objects,
      bodyParts,
      videoGroups,
      accessTier,
      hasActiveSubscription: Boolean(currentSubscription),
      currentSubscription: currentSubscription
        ? {
            planName: currentSubscription.planName,
            productName: currentSubscription.productName,
            accessTier,
          }
        : null,
    });
  } catch (e: any) {
    console.error('[Video Library Catalog] GET failed:', e);
    return respErr(e.message || 'Failed to fetch video library catalog', 500);
  }
}
