'use client';

import { useRef, useState } from 'react';
import { ExternalLink, Loader, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { CopyTextButton } from '@/shared/blocks/common';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import type { MediaAsset } from '@/shared/models/media-asset';

function formatFileSize(size: number) {
  if (!size) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaAssetLibrary({
  initialAssets,
  locale,
}: {
  initialAssets: MediaAsset[];
  locale: string;
}) {
  const isZh = locale === 'zh';
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteAsset, setPendingDeleteAsset] = useState<MediaAsset | null>(null);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/admin/media-assets/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'Upload failed');
      }

      toast.success(
        isZh ? `已上传 ${payload.data.count} 个文件` : `Uploaded ${payload.data.count} files`
      );
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || (isZh ? '上传失败' : 'Upload failed'));
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  async function handleDelete(asset: MediaAsset) {
    try {
      setDeletingId(asset.id);
      const response = await fetch(`/api/admin/media-assets/${asset.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'Delete failed');
      }

      toast.success(isZh ? '资源已删除' : 'Asset deleted');
      setPendingDeleteAsset(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || (isZh ? '删除失败' : 'Delete failed'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              {isZh ? '上传资源到 R2' : 'Upload Assets to R2'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isZh
                ? '支持图片和视频。上传后会进入资源库，可直接复制 URL 或打开查看。'
                : 'Supports images and videos. Uploaded files are listed below for preview, opening, and URL copy.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(event) => handleUpload(event.target.files)}
            />
            <Button
              type="button"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {isZh ? '上传文件' : 'Upload Files'}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{isZh ? '资源库' : 'Asset Library'}</h2>
          <span className="text-sm text-muted-foreground">
            {isZh ? `共 ${initialAssets.length} 个资源` : `${initialAssets.length} assets`}
          </span>
        </div>

        {initialAssets.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-12 text-center text-muted-foreground">
            {isZh ? '还没有上传任何资源。' : 'No assets uploaded yet.'}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {initialAssets.map((asset) => (
              <article key={asset.id} className="overflow-hidden rounded-3xl border bg-card">
                <div className="bg-muted p-3">
                  {asset.mediaType === 'image' ? (
                    <div className="overflow-hidden rounded-2xl bg-background">
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl bg-black">
                      <video
                        controls
                        preload="metadata"
                        src={asset.url}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-5">
                  <div className="space-y-1">
                    <h3 className="line-clamp-2 text-lg font-semibold">{asset.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border px-2 py-1">
                        {asset.mediaType === 'image'
                          ? isZh
                            ? '图片'
                            : 'Image'
                          : isZh
                            ? '视频'
                            : 'Video'}
                      </span>
                      <span>{formatFileSize(asset.size)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-muted/30 p-3 text-xs text-muted-foreground">
                    <div className="line-clamp-2 break-all">{asset.url}</div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <CopyTextButton
                      text={asset.url}
                      showText={true}
                      size="sm"
                      variant="outline"
                      className="w-full justify-center sm:w-auto"
                    />
                    <Button asChild size="sm" variant="ghost" className="w-full sm:w-auto">
                      <a href={asset.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" />
                        {isZh ? '查看文件' : 'Open File'}
                      </a>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="w-full sm:w-auto"
                      disabled={deletingId === asset.id}
                      onClick={() => setPendingDeleteAsset(asset)}
                    >
                      {deletingId === asset.id ? (
                        <Loader className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      {isZh ? '删除' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(pendingDeleteAsset)}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setPendingDeleteAsset(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isZh ? '删除资源' : 'Delete Asset'}</DialogTitle>
            <DialogDescription>
              {pendingDeleteAsset
                ? isZh
                  ? `确认删除“${pendingDeleteAsset.name}”吗？这会同时删除数据库记录和 R2/S3 中的真实文件。`
                  : `Delete "${pendingDeleteAsset.name}"? This will remove both the database record and the stored file.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDeleteAsset(null)}
              disabled={Boolean(deletingId)}
            >
              {isZh ? '取消' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!pendingDeleteAsset || Boolean(deletingId)}
              onClick={() => pendingDeleteAsset && handleDelete(pendingDeleteAsset)}
            >
              {deletingId ? (
                <Loader className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {isZh ? '确认删除' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
