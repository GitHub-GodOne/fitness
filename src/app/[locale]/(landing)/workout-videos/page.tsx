import { setRequestLocale } from 'next-intl/server';

import {
  getCustomHtmlPageOverrideMetadata,
  renderCustomHtmlPageOverride,
} from '@/shared/lib/custom-html-page-override';
import { getMetadata } from '@/shared/lib/seo';
import { resolveVideoAccessTierFromSubscription } from '@/shared/lib/video-access';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import {
  listAccessibleFitnessVideoCatalog,
  listBodyParts,
  listFitnessObjects,
} from '@/shared/models/video_library';

import { WorkoutVideoLibrary } from './workout-video-library';

export const dynamic = 'force-dynamic';

const getDefaultMetadata = getMetadata({
  metadataKey: 'landing.video_library.metadata',
  canonicalUrl: '/workout-videos',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const customHtmlMetadata = await getCustomHtmlPageOverrideMetadata({
    slug: 'workout-videos',
    locale,
    canonicalPath: '/workout-videos',
  });

  return customHtmlMetadata ?? getDefaultMetadata({ params });
}

export default async function WorkoutVideosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const customHtmlPage = await renderCustomHtmlPageOverride({
    slug: 'workout-videos',
    locale,
  });

  if (customHtmlPage) {
    return customHtmlPage;
  }

  const user = await getUserInfo();
  const currentSubscription = user
    ? await getCurrentSubscription(user.id)
    : null;
  const accessTier = resolveVideoAccessTierFromSubscription(currentSubscription);

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
      limit: 48,
    }),
  ]);

  return (
    <WorkoutVideoLibrary
      locale={locale}
      initialData={{
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
      }}
    />
  );
}
