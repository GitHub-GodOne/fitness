'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, PlayCircle } from 'lucide-react';
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
  onSubmit,
}: {
  locale: string;
  userId: string;
  selectableTasks: SelectableTask[];
  categories: CategoryOption[];
  onSubmit: (data: FormData, passby: { userId: string; locale: string }) => Promise<SubmitResult>;
}) {
  const isZh = locale === 'zh';
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
      toast.error(isZh ? '请先完整填写投稿信息' : 'Please complete the submission form');
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
      const res = await onSubmit(formData, { userId, locale });

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
      toast.error(error?.message || (isZh ? '投稿失败' : 'Submission failed'));
    } finally {
      setLoading(false);
    }
  }

  function renderPreviewBody() {
    if (!selectedTask) {
      return (
        <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {isZh ? '请选择一个视频后再预览。' : 'Select a video to preview it.'}
        </div>
      );
    }

    return (
      <>
        <div className="overflow-hidden rounded-3xl border bg-black">
          <video
            key={selectedTask.id}
            controls
            preload="metadata"
            poster={coverUrl || selectedTask.coverUrl || undefined}
            src={selectedTask.videoUrl}
            className="aspect-[9/16] w-full object-cover"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PlayCircle className="size-4" />
            <span>{isZh ? '当前选中视频' : 'Selected video'}</span>
          </div>
          <h3 className="text-xl font-semibold">{selectedTask.title}</h3>
          {selectedTask.description ? (
            <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.9fr)]"
    >
      <div className="space-y-6 rounded-3xl border bg-card p-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">
            {isZh ? '投稿信息' : 'Submission Details'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isZh
              ? '选择一个成功生成的视频，右侧会实时预览。你可以修改标题、描述和封面。'
              : 'Select a successful generated video. The preview updates instantly on the right.'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="source_task_id">{isZh ? '选择视频' : 'Select Video'}</Label>
          <Select value={sourceTaskId} onValueChange={setSourceTaskId}>
            <SelectTrigger id="source_task_id" className="w-full bg-background">
              <SelectValue placeholder={isZh ? '请选择视频' : 'Choose a video'} />
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

        <div className="xl:hidden">
          <Collapsible open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
            <div className="rounded-3xl border bg-card/60">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                >
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">
                      {isZh ? '视频预览' : 'Video Preview'}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isZh
                        ? '确认当前选中的视频内容是否正确。'
                        : 'Confirm that the selected video is the one you want to submit.'}
                    </p>
                  </div>
                  <ChevronDown
                    className={`size-5 shrink-0 transition-transform ${
                      mobilePreviewOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4 px-4 pb-4">
                {renderPreviewBody()}
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_id">{isZh ? '分类' : 'Category'}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category_id" className="w-full bg-background">
              <SelectValue placeholder={isZh ? '请选择分类' : 'Choose a category'} />
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

        <div className="space-y-2">
          <Label htmlFor="title">{isZh ? '标题' : 'Title'}</Label>
          <Input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isZh ? '输入投稿标题' : 'Enter a title'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{isZh ? '描述' : 'Description'}</Label>
          <Textarea
            id="description"
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={isZh ? '输入投稿描述' : 'Describe this video'}
          />
        </div>

        <div className="space-y-3">
          <Label>{isZh ? '封面图' : 'Cover Image'}</Label>
          <ImageUploader
            allowMultiple={false}
            maxImages={1}
            defaultPreviews={coverUrl ? [coverUrl] : []}
            onChange={(items) => {
              const nextCoverUrl =
                items.find((item) => item.status === 'uploaded' && item.url)?.url || '';
              setCoverUrl(nextCoverUrl);
            }}
          />
          <p className="text-xs text-muted-foreground">
            {isZh
              ? '不上传时会优先使用视频任务自带的封面。'
              : 'If you skip this, the original task cover will be used when available.'}
          </p>
        </div>

        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="animate-spin" /> : null}
          {isZh ? '提交审核' : 'Submit for Review'}
        </Button>
      </div>

      <div className="hidden space-y-4 rounded-3xl border bg-card p-6 xl:block">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">{isZh ? '视频预览' : 'Video Preview'}</h2>
          <p className="text-sm text-muted-foreground">
            {isZh
              ? '确认当前选中的视频内容是否正确。'
              : 'Confirm that the selected video is the one you want to submit.'}
          </p>
        </div>

        {renderPreviewBody()}
      </div>
    </form>
  );
}
