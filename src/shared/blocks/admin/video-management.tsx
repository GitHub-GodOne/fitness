'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Video, Image, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/components/ui/pagination';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Copy } from '@/shared/blocks/table/copy';
import { ShareButton } from '@/shared/blocks/common/share-button';
import { AITaskStatus } from '@/extensions/ai/types';

interface VideoTask {
  id: string;
  taskId: string | null;
  userId: string;
  prompt: string | null;
  options: string | null;
  status: string;
  taskInfo: string | null;
  taskResult: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface VideoManagementProps {
  initialPage?: number;
  initialLimit?: number;
}

// Extract video URL from task info and result
function extractVideoUrls(result: any): string[] {
  if (!result) {
    return [];
  }

  // check videos array first
  const videos = result.videos;
  if (videos && Array.isArray(videos)) {
    return videos
      .map((item: any) => {
        if (!item) return null;
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          return (
            item.url ?? item.uri ?? item.video ?? item.src ?? item.videoUrl
          );
        }
        return null;
      })
      .filter(Boolean);
  }

  // check content.video_url (Volcano Engine format)
  if (result.content && result.content.video_url && typeof result.content.video_url === 'string') {
    return [result.content.video_url];
  }

  // check saved_video_url (CDN URL)
  if (result.saved_video_url && typeof result.saved_video_url === 'string') {
    return [result.saved_video_url];
  }

  // check saved_video_urls array
  if (result.saved_video_urls && Array.isArray(result.saved_video_urls)) {
    return result.saved_video_urls.filter((url: any) => typeof url === 'string');
  }

  // check original_video_url
  if (result.original_video_url && typeof result.original_video_url === 'string') {
    return [result.original_video_url];
  }

  // check original_video_urls array
  if (result.original_video_urls && Array.isArray(result.original_video_urls)) {
    return result.original_video_urls.filter((url: any) => typeof url === 'string');
  }

  // check output
  const output = result.output ?? result.video ?? result.data;

  if (!output) {
    return [];
  }

  if (typeof output === 'string') {
    return [output];
  }

  if (Array.isArray(output)) {
    return output
      .flatMap((item) => {
        if (!item) return [];
        if (typeof item === 'string') return [item];
        if (typeof item === 'object') {
          const candidate =
            item.url ?? item.uri ?? item.video ?? item.src ?? item.videoUrl;
          return typeof candidate === 'string' ? [candidate] : [];
        }
        return [];
      })
      .filter(Boolean);
  }

  if (typeof output === 'object') {
    const candidate =
      output.url ?? output.uri ?? output.video ?? output.src ?? output.videoUrl;
    if (typeof candidate === 'string') {
      return [candidate];
    }
  }

  return [];
}

function extractVideoUrl(taskInfo: string | null, taskResult: string | null): string | null {
  // Try taskResult first (usually contains the final processed video URL)
  if (taskResult) {
    try {
      const parsed = JSON.parse(taskResult);
      const videoUrls = extractVideoUrls(parsed);
      if (videoUrls.length > 0) {
        return videoUrls[0];
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Fallback to taskInfo
  if (taskInfo) {
    try {
      const parsed = JSON.parse(taskInfo);
      const videoUrls = extractVideoUrls(parsed);
      if (videoUrls.length > 0) {
        return videoUrls[0];
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  return null;
}

function extractLastFrameImage(taskResult: string | null): string | null {
  if (!taskResult) {
    return null;
  }

  try {
    const parsed = JSON.parse(taskResult);

    // Prefer saved CDN URL
    if (parsed.saved_last_frame_url && typeof parsed.saved_last_frame_url === 'string') {
      return parsed.saved_last_frame_url;
    }

    // Volcano Engine format
    if (parsed.content && parsed.content.last_frame_url && typeof parsed.content.last_frame_url === 'string') {
      return parsed.content.last_frame_url;
    }

    // Original last frame url
    if (parsed.original_last_frame_url && typeof parsed.original_last_frame_url === 'string') {
      return parsed.original_last_frame_url;
    }

    // Other fallbacks
    if (parsed.lastFrame) {
      return parsed.lastFrame;
    }
    if (parsed.last_frame) {
      return parsed.last_frame;
    }
    if (parsed.last_frame_url) {
      return parsed.last_frame_url;
    }
  } catch (e) {
    // Ignore parse errors
  }

  return null;
}

export function VideoManagement({
  initialPage = 1,
  initialLimit = 10,
}: VideoManagementProps) {
  const t = useTranslations('admin.videos');
  const tCommon = useTranslations('ai.video.generator');
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [isLoading, setIsLoading] = useState(true);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      params.append('mediaType', 'video');

      const response = await fetch(`/api/admin/ai-tasks?${params.toString()}`);
      const result = await response.json();

      if (result.code === 0) {
        setTasks(result.data.tasks || []);
        setTotal(result.data.total || 0);
      } else {
        toast.error(result.message || 'Failed to load videos');
      }
    } catch (error: any) {
      console.error('[VideoManagement] Failed to fetch tasks:', error);
      toast.error('Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t('fields.order')}</TableHead>
              <TableHead className="max-w-[120px]">{t('fields.task_id')}</TableHead>
              <TableHead>{t('fields.user')}</TableHead>
              <TableHead>{t('fields.prompt')}</TableHead>
              <TableHead className="max-w-xs">{t('fields.final_prompt')}</TableHead>
              <TableHead>{t('fields.status')}</TableHead>
              <TableHead>{t('fields.created')}</TableHead>
              <TableHead className="text-right w-[220px] sm:w-[260px] sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 z-20">
                {t('fields.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {t('no_videos')}
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task, index) => {
                const videoUrl = extractVideoUrl(task.taskInfo, task.taskResult);
                const lastFrameImage = extractLastFrameImage(task.taskResult);
                
                // Parse final_prompt
                let finalPrompt = '';
                try {
                  if (task.options) {
                    const options = JSON.parse(task.options);
                    finalPrompt = options.final_prompt || '';
                  }
                } catch (e) {
                  // Ignore parse errors
                }

                return (
                  <TableRow key={task.id}>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                        {(page - 1) * limit + index + 1}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[120px]">
                      {task.taskId ? (
                        <Copy
                          value={task.taskId}
                          metadata={{ message: tCommon('copied') }}
                          className="cursor-pointer"
                        >
                          <span className="truncate text-xs" title={task.taskId}>
                            {task.taskId}
                          </span>
                        </Copy>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {task.user ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{task.user.name || '-'}</span>
                          <span className="text-xs text-muted-foreground">{task.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {task.prompt ? (
                        <Copy
                          value={task.prompt}
                          metadata={{ message: tCommon('copied') }}
                          className="cursor-pointer"
                        >
                          <span className="truncate" title={task.prompt}>
                            {task.prompt}
                          </span>
                        </Copy>
                      ) : (
                        <span>-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {finalPrompt ? (
                        <Copy
                          value={finalPrompt}
                          metadata={{ message: tCommon('copied') }}
                          className="cursor-pointer"
                        >
                          <span className="truncate text-xs" title={finalPrompt}>
                            {finalPrompt}
                          </span>
                        </Copy>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs ${
                          task.status === AITaskStatus.SUCCESS
                            ? 'text-green-600'
                            : task.status === AITaskStatus.FAILED
                              ? 'text-red-600'
                              : task.status === AITaskStatus.PROCESSING
                                ? 'text-blue-600'
                                : 'text-gray-600'
                        }`}
                      >
                        {task.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.createdAt
                        ? new Date(task.createdAt).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right w-[220px] sm:w-[260px] sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 z-10">
                      <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
                        {videoUrl && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPreviewVideoUrl(videoUrl);
                                setIsPreviewOpen(true);
                              }}
                              title="Preview video"
                              className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                            >
                              <Video className="h-4 w-4" />
                              <span className="hidden sm:inline ml-1">Preview</span>
                            </Button>
                            <ShareButton
                              url={videoUrl}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                            />
                          </>
                        )}
                        {lastFrameImage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              window.open(lastFrameImage, '_blank');
                            }}
                            title="View last frame"
                            className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                          >
                            <Image className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Frame</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {total > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
            </div>
            {Math.ceil(total / limit) > 1 && (
              <div className="flex justify-end">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => {
                          if (page > 1) {
                            setPage((p) => p - 1);
                          }
                        }}
                        className={
                          page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                        }
                      />
                    </PaginationItem>
                    {(() => {
                      const totalPages = Math.ceil(total / limit);
                      const maxPagesToShow = 5;
                      let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2));
                      let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

                      if (endPage - startPage < maxPagesToShow - 1) {
                        startPage = Math.max(1, endPage - maxPagesToShow + 1);
                      }

                      const pages = [];
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(i);
                      }

                      return pages.map((pageNum) => (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setPage(pageNum)}
                            isActive={page === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      ));
                    })()}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => {
                          const totalPages = Math.ceil(total / limit);
                          if (page < totalPages) {
                            setPage((p) => p + 1);
                          }
                        }}
                        className={
                          page >= Math.ceil(total / limit)
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('preview.title')}</DialogTitle>
          </DialogHeader>
          {previewVideoUrl && (
            <div className="relative overflow-hidden rounded-lg border">
              <video
                src={previewVideoUrl}
                controls
                className="h-auto w-full"
                preload="metadata"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
