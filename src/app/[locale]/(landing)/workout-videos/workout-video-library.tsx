'use client';

import { type ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Crown,
  Dumbbell,
  Loader2,
  Search,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { cn } from '@/shared/lib/utils';

interface FitnessObject {
  id: string;
  name: string;
  nameZh?: string | null;
  category: string;
}

interface BodyPart {
  id: string;
  name: string;
  nameZh?: string | null;
}

interface FitnessVideo {
  id: string;
  viewAngle: string;
  viewAngleZh?: string | null;
  videoUrl: string;
}

interface VideoMappingRecord {
  mapping: {
    id: string;
    objectId: string;
    bodyPartId: string;
    isPrimary: boolean;
  };
  object: FitnessObject | null;
  bodyPart: BodyPart | null;
}

interface VideoGroup {
  id: string;
  title: string;
  titleZh?: string | null;
  description?: string | null;
  descriptionZh?: string | null;
  thumbnailUrl?: string | null;
  instructions?: string | null;
  instructionsZh?: string | null;
  accessType: string;
  difficulty: string;
  viewCount: number;
}

interface VideoCatalogEntry {
  videoGroup: VideoGroup;
  videos: FitnessVideo[];
  mappings: VideoMappingRecord[];
}

interface CatalogPayload {
  objects: FitnessObject[];
  bodyParts: BodyPart[];
  videoGroups: VideoCatalogEntry[];
  accessTier: 'free' | 'starter' | 'pro';
  hasActiveSubscription: boolean;
  currentSubscription: {
    planName?: string | null;
    productName?: string | null;
    accessTier: 'free' | 'starter' | 'pro';
  } | null;
}

interface WorkoutVideoLibraryProps {
  locale: string;
  initialData: CatalogPayload;
}

function uniqueLabels(labels: string[]) {
  return Array.from(new Set(labels.filter(Boolean)));
}

export function WorkoutVideoLibrary({
  locale,
  initialData,
}: WorkoutVideoLibraryProps) {
  const t = useTranslations('landing.video_library');
  const [catalog, setCatalog] = useState<CatalogPayload>(initialData);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [selectedBodyPartIds, setSelectedBodyPartIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const didMountRef = useRef(false);

  const isZh = locale.startsWith('zh');

  const objectMap = useMemo(
    () => new Map(catalog.objects.map((item) => [item.id, item])),
    [catalog.objects]
  );
  const bodyPartMap = useMemo(
    () => new Map(catalog.bodyParts.map((item) => [item.id, item])),
    [catalog.bodyParts]
  );

  const selectedFilterChips = useMemo(() => {
    const objectChips = selectedObjectIds
      .map((id) => objectMap.get(id))
      .filter(Boolean)
      .map((item) => ({
        id: item!.id,
        type: 'object' as const,
        label: isZh && item!.nameZh ? item!.nameZh : item!.name,
      }));

    const bodyPartChips = selectedBodyPartIds
      .map((id) => bodyPartMap.get(id))
      .filter(Boolean)
      .map((item) => ({
        id: item!.id,
        type: 'bodyPart' as const,
        label: isZh && item!.nameZh ? item!.nameZh : item!.name,
      }));

    return [...objectChips, ...bodyPartChips];
  }, [bodyPartMap, isZh, objectMap, selectedBodyPartIds, selectedObjectIds]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();

    if (selectedObjectIds.length > 0) {
      params.set('objectIds', selectedObjectIds.join(','));
    }
    if (selectedBodyPartIds.length > 0) {
      params.set('bodyPartIds', selectedBodyPartIds.join(','));
    }
    if (deferredSearch.trim()) {
      params.set('search', deferredSearch.trim());
    }

    setIsLoading(true);
    setError('');

    fetch(`/api/video-library/catalog?${params.toString()}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || result.code !== 0) {
          throw new Error(result.message || 'Failed to fetch catalog');
        }
        setCatalog(result.data as CatalogPayload);
      })
      .catch((fetchError: any) => {
        if (fetchError?.name === 'AbortError') {
          return;
        }
        setError(fetchError?.message || t('errors.fetch_failed'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [deferredSearch, selectedBodyPartIds, selectedObjectIds, t]);

  const toggleSelection = (
    current: string[],
    nextId: string,
    setter: (value: string[]) => void
  ) => {
    if (current.includes(nextId)) {
      setter(current.filter((item) => item !== nextId));
      return;
    }

    setter([...current, nextId]);
  };

  const removeFilterChip = (chip: { id: string; type: 'object' | 'bodyPart' }) => {
    if (chip.type === 'object') {
      setSelectedObjectIds((current) => current.filter((item) => item !== chip.id));
      return;
    }

    setSelectedBodyPartIds((current) => current.filter((item) => item !== chip.id));
  };

  const clearAllFilters = () => {
    setSearch('');
    setSelectedObjectIds([]);
    setSelectedBodyPartIds([]);
  };

  const planName =
    catalog.currentSubscription?.planName ||
    catalog.currentSubscription?.productName ||
    t('plans.guest');
  const resultCountLabel = t('results_count', {
    count: catalog.videoGroups.length,
  });

  return (
    <section className="container pb-8 pt-16 sm:pb-12 md:pt-24">
      <div className="overflow-hidden rounded-[32px] border border-border/70 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.14),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(255,247,237,0.92))] p-6 shadow-sm dark:bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(20,184,166,0.18),_transparent_24%),linear-gradient(135deg,_rgba(22,22,22,0.96),_rgba(34,24,17,0.96))] sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              {t('eyebrow')}
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {t('title')}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                {t('description')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge className="rounded-full px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {t(`access.${catalog.accessTier}`)}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1.5">
                <Crown className="h-3.5 w-3.5" />
                {t(`tier_visibility.${catalog.accessTier}`)}
              </Badge>
            </div>
          </div>

          <Card className="border-white/60 bg-background/80 shadow-none backdrop-blur">
            <CardHeader className="space-y-3 pb-3">
              <CardTitle className="text-base font-semibold">
                {t('current_access')}
              </CardTitle>
              <div className="space-y-2">
                <div className="text-lg font-semibold text-foreground">{planName}</div>
                <p className="text-sm text-muted-foreground">
                  {t('current_access_description', {
                    tier: t(`access.${catalog.accessTier}`),
                  })}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {t('can_view')}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {t(`tier_visibility.${catalog.accessTier}`)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {t('available_now')}
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {resultCountLabel}
                </p>
              </div>
              {catalog.accessTier !== 'pro' ? (
                <Button asChild className="w-full">
                  <Link href="/pricing">{t('upgrade_cta')}</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <Card className="rounded-[28px] border-border/70">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-4 w-4" />
                {t('search_title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('search_placeholder')}
                  className="h-11 rounded-full pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-border/70">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-4 w-4" />
                    {t('selected_title')}
                  </CardTitle>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {selectedFilterChips.length > 0
                      ? t('selected_description')
                      : t('selected_empty')}
                  </p>
                </div>
                {selectedFilterChips.length > 0 || search ? (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
                  >
                    {t('clear_all')}
                  </button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {selectedFilterChips.length > 0 ? (
                selectedFilterChips.map((chip) => (
                  <button
                    key={`${chip.type}-${chip.id}`}
                    type="button"
                    onClick={() => removeFilterChip(chip)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                  >
                    {chip.label}
                    <X className="h-3 w-3" />
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 px-4 py-4 text-sm leading-6 text-muted-foreground">
                  {t('selected_placeholder')}
                </div>
              )}
            </CardContent>
          </Card>

          <FilterGroupCard
            icon={<Dumbbell className="h-4 w-4" />}
            title={t('equipment_title')}
            description={t('equipment_description')}
            items={catalog.objects.map((item) => ({
              id: item.id,
              label: isZh && item.nameZh ? item.nameZh : item.name,
              selected: selectedObjectIds.includes(item.id),
              onClick: () =>
                toggleSelection(selectedObjectIds, item.id, setSelectedObjectIds),
            }))}
          />

          <FilterGroupCard
            icon={<Target className="h-4 w-4" />}
            title={t('body_parts_title')}
            description={t('body_parts_description')}
            items={catalog.bodyParts.map((item) => ({
              id: item.id,
              label: isZh && item.nameZh ? item.nameZh : item.name,
              selected: selectedBodyPartIds.includes(item.id),
              onClick: () =>
                toggleSelection(selectedBodyPartIds, item.id, setSelectedBodyPartIds),
            }))}
          />
        </aside>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {t('results_title')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{resultCountLabel}</p>
            </div>
            {isLoading ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('loading')}
              </div>
            ) : null}
          </div>

          {error ? (
            <Card className="rounded-[28px] border-destructive/40 bg-destructive/5">
              <CardContent className="px-6 py-5 text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          ) : null}

          {catalog.videoGroups.length === 0 ? (
            <Card className="rounded-[28px] border-border/70">
              <CardContent className="flex flex-col items-start gap-4 px-6 py-8">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    {t('empty_title')}
                  </h3>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                    {t('empty_description')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={clearAllFilters}>
                    {t('empty_reset')}
                  </Button>
                  <Button asChild>
                    <Link href="/pricing">{t('upgrade_cta')}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {catalog.videoGroups.map((entry) => (
                <VideoGroupCard
                  key={entry.videoGroup.id}
                  entry={entry}
                  locale={locale}
                  hasActiveSubscription={catalog.hasActiveSubscription}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FilterGroupCard({
  icon,
  title,
  description,
  items,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  items: Array<{
    id: string;
    label: string;
    selected: boolean;
    onClick: () => void;
  }>;
}) {
  return (
    <Card className="rounded-[28px] border-border/70">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="max-h-[260px] overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  item.selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VideoGroupCard({
  entry,
  locale,
  hasActiveSubscription,
}: {
  entry: VideoCatalogEntry;
  locale: string;
  hasActiveSubscription: boolean;
}) {
  const t = useTranslations('landing.video_library');
  const isZh = locale.startsWith('zh');
  const group = entry.videoGroup;
  const title = isZh && group.titleZh ? group.titleZh : group.title;
  const description =
    (isZh && group.descriptionZh ? group.descriptionZh : group.description) ||
    t('card.no_description');
  const instructions =
    (isZh && group.instructionsZh ? group.instructionsZh : group.instructions) || '';

  const objectLabels = uniqueLabels(
    entry.mappings.map((item) =>
      isZh && item.object?.nameZh ? item.object.nameZh : item.object?.name || ''
    )
  );
  const bodyPartLabels = uniqueLabels(
    entry.mappings.map((item) =>
      isZh && item.bodyPart?.nameZh
        ? item.bodyPart.nameZh
        : item.bodyPart?.name || ''
    )
  );
  const visibleVideos = hasActiveSubscription ? entry.videos : entry.videos.slice(0, 1);

  return (
    <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/95">
      <div className="relative">
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          <Badge className="rounded-full px-3 py-1">
            {t(`access.${normalizeAccessType(group.accessType)}`)}
          </Badge>
          <Badge variant="outline" className="rounded-full bg-background/85 px-3 py-1">
            {formatDifficulty(group.difficulty, t)}
          </Badge>
        </div>
        <div className="aspect-[16/10] overflow-hidden bg-muted">
          {group.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,_rgba(249,115,22,0.18),_rgba(20,184,166,0.14))]">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
          )}
        </div>
      </div>

      <CardHeader className="space-y-3 pb-3">
        <div className="space-y-2">
          <CardTitle className="text-xl font-semibold text-foreground">
            {title}
          </CardTitle>
          <p className="text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{t('card.views', { count: group.viewCount })}</span>
          <span>•</span>
          <span>{t('card.video_count', { count: visibleVideos.length })}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <VideoMetadata title={t('card.equipment')} labels={objectLabels} />
        <VideoMetadata title={t('card.body_parts')} labels={bodyPartLabels} />

        {!hasActiveSubscription && entry.videos.length > 1 ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            {t('card.free_angle_limit')}
          </div>
        ) : null}

        {instructions ? (
          <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t('card.instructions')}
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">{instructions}</p>
          </div>
        ) : null}

        {hasActiveSubscription ? (
          <Tabs defaultValue={visibleVideos[0]?.id}>
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/50 p-2">
              {visibleVideos.map((video) => (
                <TabsTrigger
                  key={video.id}
                  value={video.id}
                  className="rounded-full px-3 py-1.5"
                >
                  {isZh && video.viewAngleZh ? video.viewAngleZh : video.viewAngle}
                </TabsTrigger>
              ))}
            </TabsList>
            {visibleVideos.map((video) => (
              <TabsContent key={video.id} value={video.id} className="mt-4">
                <video
                  controls
                  preload="metadata"
                  poster={group.thumbnailUrl || undefined}
                  className="aspect-video w-full rounded-[24px] border border-border/70 bg-black object-cover"
                  src={video.videoUrl}
                />
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <video
            controls
            preload="metadata"
            poster={group.thumbnailUrl || undefined}
            className="aspect-video w-full rounded-[24px] border border-border/70 bg-black object-cover"
            src={visibleVideos[0]?.videoUrl}
          />
        )}
      </CardContent>
    </Card>
  );
}

function VideoMetadata({
  title,
  labels,
}: {
  title: string;
  labels: string[];
}) {
  if (labels.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <Badge key={label} variant="outline" className="rounded-full px-3 py-1">
            {label}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function normalizeAccessType(accessType: string) {
  const normalized = accessType.trim().toLowerCase();

  if (normalized === 'pro' || normalized === 'premium') {
    return 'pro';
  }

  if (normalized === 'starter') {
    return 'starter';
  }

  return 'free';
}

function formatDifficulty(
  difficulty: string,
  t: (key: string, values?: Record<string, string | number>) => string
) {
  const normalized = difficulty.trim().toLowerCase();

  if (
    normalized === 'beginner' ||
    normalized === 'intermediate' ||
    normalized === 'advanced' ||
    normalized === 'universal'
  ) {
    return t(`difficulty.${normalized}`);
  }

  return difficulty;
}
