'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  ExternalLink,
  Folder,
  Home,
  Image as ImageIcon,
  Loader,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';

import { CopyTextButton } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

type PickerDirectory = {
  name: string;
  prefix: string;
};

type PickerFile = {
  key: string;
  name: string;
  url?: string;
  size: number;
  lastModified?: string;
};

type PickerBrowserPayload = {
  provider: string;
  prefix: string;
  breadcrumbs: PickerDirectory[];
  directories: PickerDirectory[];
  files: PickerFile[];
};

export type MediaAssetPickerItem = {
  id: string;
  key: string;
  name: string;
  url: string;
  mediaType: 'image' | 'video';
};

function detectMediaType(file: PickerFile): 'image' | 'video' | null {
  const target = `${file.name} ${file.url || ''}`.toLowerCase();

  if (/\.(png|jpg|jpeg|webp|gif|avif|svg)\b/.test(target)) {
    return 'image';
  }

  if (/\.(mp4|mov|webm|avi|mpeg|m4v)\b/.test(target)) {
    return 'video';
  }

  return null;
}

export function MediaAssetPickerDialog({
  open,
  onOpenChange,
  mediaType,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType?: 'image' | 'video';
  onSelect: (asset: MediaAssetPickerItem) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [browser, setBrowser] = useState<PickerBrowserPayload | null>(null);
  const [currentPrefix, setCurrentPrefix] = useState('');

  async function loadBrowser(prefix = '') {
    try {
      setLoading(true);
      const query = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
      const response = await fetch(`/api/admin/media-assets/browser${query}`);
      const payload = await response.json();

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'Failed to load asset browser');
      }

      setBrowser(payload.data);
      setCurrentPrefix(payload.data.prefix || '');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load asset library');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    loadBrowser('');
  }, [open]);

  const filteredFiles = useMemo(() => {
    const files = browser?.files || [];
    if (!mediaType) {
      return files
        .map((file) => ({
          file,
          type: detectMediaType(file),
        }))
        .filter((item): item is { file: PickerFile; type: 'image' | 'video' } => Boolean(item.type));
    }

    return files
      .map((file) => ({
        file,
        type: detectMediaType(file),
      }))
      .filter(
        (item): item is { file: PickerFile; type: 'image' | 'video' } => item.type === mediaType
      );
  }, [browser?.files, mediaType]);

  const parentPrefix = currentPrefix.includes('/')
    ? currentPrefix.split('/').slice(0, -1).join('/')
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[94vh] w-[99vw] max-w-[99vw] flex-col gap-1.5 pt-5 sm:h-[95vh] sm:max-w-[99vw] 2xl:max-w-[1880px]">
        <DialogHeader className="gap-0">
          <DialogTitle>R2 Asset Library</DialogTitle>
          <DialogDescription className="mt-1">
            Browse folders, then choose a file and its public URL will be inserted into the current field.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border px-3 py-1 transition hover:border-primary/40 hover:text-foreground"
              onClick={() => loadBrowser('')}
            >
              <Home className="size-4" />
              Root
            </button>
            {browser?.breadcrumbs.map((crumb) => (
              <div key={crumb.prefix} className="inline-flex items-center gap-2">
                <ChevronRight className="size-4 opacity-60" />
                <button
                  type="button"
                  className="rounded-full border px-3 py-1 transition hover:border-primary/40 hover:text-foreground"
                  onClick={() => loadBrowser(crumb.prefix)}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
            {currentPrefix ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => loadBrowser(parentPrefix)}>
                <Folder className="size-4" />
                Up
              </Button>
            ) : null}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader className="size-5 animate-spin" />
            </div>
          ) : (
            <div className="grid h-[calc(94vh-9.5rem)] gap-5 overflow-hidden pr-1 sm:h-[calc(95vh-9.5rem)] lg:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="min-h-0 space-y-4 overflow-y-auto rounded-2xl border bg-muted/10 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Folder className="size-4" />
                  Folders
                </div>
                {browser?.directories.length ? (
                  <div className="space-y-2">
                    {browser.directories.map((directory) => (
                      <button
                        key={directory.prefix}
                        type="button"
                        onClick={() => loadBrowser(directory.prefix)}
                        className="flex w-full items-center justify-between rounded-xl border bg-background px-3 py-3 text-left transition hover:border-primary/40 hover:shadow-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{directory.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {directory.prefix}
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                    No folders here.
                  </div>
                )}
              </div>

              <div className="min-h-0 space-y-4 overflow-y-auto">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {mediaType === 'video' ? (
                    <Video className="size-4" />
                  ) : (
                    <ImageIcon className="size-4" />
                  )}
                  {mediaType === 'video' ? 'Video Files' : mediaType === 'image' ? 'Image Files' : 'Files'}
                </div>

                {filteredFiles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
                    No matching files found in this folder.
                  </div>
                ) : (
                  <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                    {filteredFiles.map(({ file, type }) => (
                      <article key={file.key} className="min-w-0 overflow-hidden rounded-2xl border bg-card">
                        <div className="bg-muted p-3">
                          {type === 'image' && file.url ? (
                            <div className="overflow-hidden rounded-xl bg-background">
                              <img
                                src={file.url}
                                alt={file.name}
                                className="aspect-[4/3] w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="overflow-hidden rounded-xl bg-black">
                              <video
                                src={file.url}
                                className="aspect-[4/3] w-full object-cover"
                                controls
                                preload="metadata"
                              />
                            </div>
                          )}
                        </div>
                        <div className="space-y-4 p-5">
                          <div>
                            <h3 className="line-clamp-2 text-base font-semibold">{file.name}</h3>
                            <p className="mt-1 line-clamp-2 break-all text-sm text-muted-foreground">
                              {file.url}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="outline"
                              title="Use URL"
                              onClick={() => {
                                if (!file.url) {
                                  return;
                                }
                                onSelect({
                                  id: file.key,
                                  key: file.key,
                                  name: file.name,
                                  url: file.url,
                                  mediaType: type,
                                });
                                onOpenChange(false);
                              }}
                            >
                              <Check className="size-4" />
                            </Button>
                            <CopyTextButton text={file.url || ''} size="icon-sm" variant="outline" />
                            <Button asChild size="sm" variant="ghost">
                              <a href={file.url || '#'} target="_blank" rel="noreferrer">
                                <ExternalLink className="size-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
