'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, PlayCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { ImageUploader } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';

type SelectableTask = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  coverUrl: string;
};

type CategoryOption = {
  id: string;
  title: string;
};

type SubmitResult =
  | {
      status: 'success' | 'error';
      message: string;
      redirect_url?: string;
    }
  | undefined
  | void;

export type { SubmitResult };

export function ShowcaseSubmitForm({
  locale,
  userId,
  selectableTasks,
  categories,
  submitAction,
}: {
  locale: string;
  userId: string;
  selectableTasks: SelectableTask[];
  categories: CategoryOption[];
  submitAction: (data: FormData, passby: { userId: string; locale: string }) => Promise<SubmitResult>;
}) {
  const t = useTranslations('pages.showcases.page.submit.form');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sourceTaskId, setSourceTaskId] = useState(selectableTasks[0]?.id || '');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [title, setTitle] = useState(selectableTasks[0]?.title || '');
  const [description, setDescription] = useState(selectableTasks[0]?.description || '');
  const [coverUrl, setCoverUrl] = useState(selectableTasks[0]?.coverUrl || '');
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(true);

  const selectedTask = useMemo(
    () => selectableTasks.find((item) => item.id === sourceTaskId) || selectableTasks[0],
    [selectableTasks, sourceTaskId]
  );

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    setTitle(selectedTask.title || '');
    setDescription(selectedTask.description || '');
    setCoverUrl(selectedTask.coverUrl || '');
  }, [selectedTask]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!sourceTaskId || !categoryId || !title.trim()) {
      toast.error(t('validationError'));
      return;
    }

    const formData = new FormData();
    formData.append('source_task_id', sourceTaskId);
    formData.append('category_id', categoryId);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('cover_url', coverUrl);

    try {
      setLoading(true);
      const res = await submitAction(formData, { userId, locale });

      if (!res) {
        throw new Error('No response received from server');
      }

      if (res.status === 'success') {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }

      if (res.redirect_url) {
        router.push(res.redirect_url as any);
      }
    } catch (error: any) {
      toast.error(error?.message || t('submitError'));
    } finally {
      setLoading(false);
    }
  }

  function renderPreviewBody() {
    if (!selectedTask) {
      return (
        <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {t('previewEmpty')}
        </div>
      );
    }

    return (
      <>
        <div className="min-w-0 overflow-hidden rounded-2xl border bg-black sm:rounded-3xl">
          <video
            key={selectedTask.id}
            controls
            preload="metadata"
            poster={coverUrl || selectedTask.coverUrl || undefined}
            src={selectedTask.videoUrl}
            className="aspect-[9/16] max-h-[58svh] w-full object-contain sm:max-h-none"
          />
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <PlayCircle className="size-4" />
            <span>{t('previewLabel')}</span>
          </div>
          <h3 className="break-words text-lg font-semibold text-foreground sm:text-xl">
            {selectedTask.title}
          </h3>
          {selectedTask.description ? (
            <p className="break-words text-sm text-muted-foreground">
              {selectedTask.description}
            </p>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid min-w-0 gap-5 overflow-x-hidden sm:gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.92fr)] xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.9fr)]"
    >
      <div className="min-w-0 space-y-4 rounded-2xl border bg-card p-4 sm:space-y-5 sm:rounded-3xl sm:p-5 lg:p-6">
        <div className="space-y-1.5 sm:space-y-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">{t('panelTitle')}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{t('panelDescription')}</p>
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="source_task_id" className="text-foreground">{t('sourceTaskId')}</Label>
          <Select value={sourceTaskId} onValueChange={setSourceTaskId}>
            <SelectTrigger id="source_task_id" className="w-full min-w-0 bg-background">
              <SelectValue placeholder={t('sourceTaskPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {selectableTasks.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 lg:hidden">
          <Collapsible open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
            <div className="rounded-2xl border bg-card/60 sm:rounded-3xl">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 w-full items-center justify-between gap-4 px-4 py-3.5 text-left sm:px-5 sm:py-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="break-words text-base font-semibold text-foreground sm:text-lg">
                      {t('mobilePreviewTitle')}
                    </div>
                    <p className="break-words text-xs text-muted-foreground sm:text-sm">
                      {t('mobilePreviewDescription')}
                    </p>
                  </div>
                  <ChevronDown
                    className={`size-5 shrink-0 transition-transform ${
                      mobilePreviewOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="min-w-0 space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
                {renderPreviewBody()}
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="category_id" className="text-foreground">{t('categoryId')}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category_id" className="w-full min-w-0 bg-background">
              <SelectValue placeholder={t('categoryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="title" className="text-foreground">{t('title')}</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('titlePlaceholder')}
          />
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="description" className="text-foreground">{t('description')}</Label>
          <Textarea
            id="description"
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('descriptionPlaceholder')}
          />
        </div>

        <div className="min-w-0 space-y-3 overflow-x-hidden">
          <Label className="text-foreground">{t('coverImage')}</Label>
          <ImageUploader
            className="min-w-0 overflow-x-hidden"
            allowMultiple={false}
            maxImages={1}
            defaultPreviews={coverUrl ? [coverUrl] : []}
            onChange={(items) => {
              const nextCoverUrl =
                items.find((item) => item.status === 'uploaded' && item.url)?.url || '';
              setCoverUrl(nextCoverUrl);
            }}
          />
          <p className="text-xs text-muted-foreground">{t('coverImageHint')}</p>
        </div>

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="animate-spin" /> : null}
          {t('submit')}
        </Button>
      </div>

      <div className="hidden min-w-0 space-y-4 rounded-3xl border bg-card p-5 lg:block xl:p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground xl:text-2xl">{t('mobilePreviewTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('mobilePreviewDescription')}</p>
        </div>

        {renderPreviewBody()}
      </div>
    </form>
  );
}
