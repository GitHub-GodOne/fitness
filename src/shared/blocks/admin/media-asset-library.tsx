'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileImage,
  Film,
  Folder,
  FolderPlus,
  Home,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import { Input } from '@/shared/components/ui/input';

type BrowserDirectory = {
  name: string;
  prefix: string;
};

type BrowserFile = {
  key: string;
  name: string;
  url?: string;
  size: number;
  lastModified?: string;
};

type BrowserPayload = {
  provider: string;
  prefix: string;
  breadcrumbs: BrowserDirectory[];
  directories: BrowserDirectory[];
  files: BrowserFile[];
};

function formatFileSize(size: number) {
  if (!size) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatDate(value?: string, locale = 'en') {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US');
}

function getFileType(file: BrowserFile) {
  const normalizedName = file.name.toLowerCase();
  const normalizedUrl = (file.url || '').toLowerCase();
  const target = `${normalizedName} ${normalizedUrl}`;

  if (/\.(png|jpg|jpeg|webp|gif|avif|svg)\b/.test(target)) {
    return 'image';
  }

  if (/\.(mp4|mov|webm|avi|mpeg|m4v)\b/.test(target)) {
    return 'video';
  }

  return 'other';
}

export function MediaAssetLibrary({ locale }: { locale: string }) {
  const t = useTranslations('components.media-asset-library');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [browser, setBrowser] = useState<BrowserPayload | null>(null);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [pathDraft, setPathDraft] = useState('');
  const [previewFile, setPreviewFile] = useState<BrowserFile | null>(null);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<BrowserFile | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const currentUploadPath = useMemo(() => {
    return pathDraft.trim().replace(/^\/+/, '').replace(/\/+/g, '/').replace(/\/$/, '');
  }, [pathDraft]);

  async function loadBrowser(prefix = currentPrefix, showRefreshSpinner = false) {
    try {
      if (showRefreshSpinner) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const query = prefix ? `?prefix=${encodeURIComponent(prefix)}` : '';
      const response = await fetch(`/api/admin/media-assets/browser${query}`, {
        cache: 'no-store',
      });
      const payload = await response.json();

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'Failed to load asset browser');
      }

      setBrowser(payload.data);
      setCurrentPrefix(payload.data.prefix || '');
      setPathDraft(payload.data.prefix || '');
    } catch (error: any) {
      toast.error(error?.message || t('messages.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadBrowser('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      formData.append('path', currentUploadPath);

      const response = await fetch('/api/admin/media-assets/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'Upload failed');
      }

      toast.success(
        t('messages.uploaded', { count: payload.data.count })
      );
      await loadBrowser(currentUploadPath, true);
    } catch (error: any) {
      toast.error(error?.message || t('messages.uploadFailed'));
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  async function handleDelete(file: BrowserFile) {
    try {
      setDeletingKey(file.key);
      const response = await fetch('/api/admin/media-assets/object', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: file.key,
          url: file.url,
        }),
      });
      const payload = await response.json();

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'Delete failed');
      }

      toast.success(t('messages.deleted'));
      setPendingDeleteFile(null);
      await loadBrowser(currentPrefix, true);
    } catch (error: any) {
      toast.error(error?.message || t('messages.deleteFailed'));
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleCreateFolder() {
    const trimmedName = folderName.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    if (!trimmedName) {
      toast.error(t('messages.missingFolderName'));
      return;
    }

    if (trimmedName.includes('/')) {
      toast.error(t('messages.invalidFolderName'));
      return;
    }

    try {
      setCreatingFolder(true);
      const response = await fetch('/api/admin/media-assets/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix: currentPrefix,
          name: trimmedName,
        }),
      });
      const payload = await response.json();

      if (!response.ok || payload.code !== 0) {
        throw new Error(payload.message || 'Create folder failed');
      }

      toast.success(t('messages.folderCreated'));
      setCreateFolderOpen(false);
      setFolderName('');
      await loadBrowser(currentPrefix, true);
    } catch (error: any) {
      toast.error(error?.message || t('messages.createFolderFailed'));
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleDownload(file: BrowserFile) {
    if (!file.url) {
      toast.error(t('messages.invalidFileUrl'));
      return;
    }

    try {
      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
    } catch (error: any) {
      toast.error(error?.message || t('messages.downloadFailed'));
    }
  }

  const fileCountText = browser
    ? t('messages.counts', {
        folders: browser.directories.length,
        files: browser.files.length,
      })
    : '';

  const parentPrefix = currentPrefix.includes('/')
    ? currentPrefix.split('/').slice(0, -1).join('/')
    : '';

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border bg-card p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">
                {t('title')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('description')}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => loadBrowser(currentPrefix, true)}
                disabled={refreshing || loading}
              >
                {refreshing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {t('actions.refresh')}
              </Button>
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
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                {t('actions.uploadFiles')}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="space-y-2">
              <div className="text-sm font-medium">{t('fields.uploadDirectoryPath')}</div>
              <Input
                value={pathDraft}
                onChange={(event) => setPathDraft(event.target.value)}
                placeholder={t('fields.uploadDirectoryPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">{t('fields.uploadDirectoryHint')}</p>
            </div>

            <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <div>{t('fields.currentDirectory')}</div>
              <div className="mt-1 break-all font-medium text-foreground">
                {browser?.prefix || '/'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border bg-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 transition hover:border-primary/40 hover:text-foreground"
                onClick={() => loadBrowser('', true)}
              >
                <Home className="size-4" />
                {t('fields.root')}
              </button>
              {browser?.breadcrumbs.map((crumb) => (
                <div key={crumb.prefix} className="inline-flex items-center gap-2">
                  <ChevronRight className="size-4 opacity-60" />
                  <button
                    type="button"
                    className="rounded-full border px-3 py-1 transition hover:border-primary/40 hover:text-foreground"
                    onClick={() => loadBrowser(crumb.prefix, true)}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">{fileCountText}</div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="size-4" />
              {t('actions.createFolder')}
            </Button>
            {currentPrefix ? (
              <Button type="button" variant="outline" onClick={() => loadBrowser(parentPrefix, true)}>
                <Folder className="size-4" />
                {t('actions.upOneLevel')}
              </Button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Folder className="size-5" />
                <h3 className="text-lg font-semibold">{t('fields.folders')}</h3>
              </div>

              {browser?.directories.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {browser.directories.map((directory) => (
                    <button
                      key={directory.prefix}
                      type="button"
                      onClick={() => loadBrowser(directory.prefix, true)}
                      className="flex items-center justify-between rounded-3xl border bg-background px-5 py-4 text-left transition hover:border-primary/40 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                          <Folder className="size-5" />
                        </div>
                        <div>
                          <div className="font-medium">{directory.name}</div>
                          <div className="text-xs text-muted-foreground break-all">
                            {directory.prefix}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  {t('messages.noFolders')}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Copy className="size-5" />
                <h3 className="text-lg font-semibold">{t('fields.files')}</h3>
              </div>

              {browser?.files.length ? (
                <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                  {browser.files.map((file) => {
                    const fileType = getFileType(file);
                    return (
                      <article key={file.key} className="overflow-hidden rounded-3xl border bg-background">
                        <div className="bg-muted/30 p-3">
                          {fileType === 'image' && file.url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewFile(file)}
                              className="block w-full overflow-hidden rounded-2xl bg-background"
                            >
                              <img
                                src={file.url}
                                alt={file.name}
                                className="aspect-[4/3] w-full object-cover"
                              />
                            </button>
                          ) : fileType === 'video' && file.url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewFile(file)}
                              className="block w-full overflow-hidden rounded-2xl bg-black"
                            >
                              <video
                                preload="metadata"
                                src={file.url}
                                className="aspect-[4/3] w-full object-cover"
                              />
                            </button>
                          ) : (
                            <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-background text-muted-foreground">
                              <FileImage className="size-10" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 p-5">
                          <div className="space-y-1">
                            <div className="flex items-start gap-3">
                              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                {fileType === 'video' ? (
                                  <Film className="size-4" />
                                ) : (
                                  <FileImage className="size-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="line-clamp-2 text-lg font-semibold">{file.name}</h3>
                                <div className="mt-1 break-all text-xs text-muted-foreground">
                                  {file.key}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="rounded-full border px-2 py-1">
                                {fileType === 'video'
                                  ? t('fileTypes.video')
                                  : fileType === 'image'
                                    ? t('fileTypes.image')
                                    : t('fileTypes.file')}
                              </span>
                              <span>{formatFileSize(file.size)}</span>
                              {file.lastModified ? <span>{formatDate(file.lastModified, locale)}</span> : null}
                            </div>
                          </div>

                          {file.url ? (
                            <div className="rounded-2xl bg-muted/30 p-3 text-xs text-muted-foreground">
                              <div className="line-clamp-2 break-all">{file.url}</div>
                            </div>
                          ) : null}

                          <div className="grid gap-2 sm:grid-cols-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setPreviewFile(file)}
                              disabled={!file.url}
                              className="w-full"
                            >
                              {t('actions.preview')}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleDownload(file)}
                              disabled={!file.url}
                              className="w-full"
                            >
                              <Download className="size-4" />
                              {t('actions.download')}
                            </Button>
                            <CopyTextButton
                              text={file.url || ''}
                              showText={true}
                              size="sm"
                              variant="outline"
                              className="w-full justify-center"
                            />
                            <Button asChild variant="outline" className="w-full">
                              <a href={file.url || '#'} target="_blank" rel="noreferrer">
                                <ExternalLink className="size-4" />
                                {t('actions.open')}
                              </a>
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              className="w-full sm:col-span-2"
                              disabled={deletingKey === file.key}
                              onClick={() => setPendingDeleteFile(file)}
                            >
                              {deletingKey === file.key ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                              {t('actions.deleteFile')}
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
                  {t('messages.noFiles')}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <Dialog open={Boolean(previewFile)} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="w-[96vw] max-w-5xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
            <DialogDescription>{previewFile?.key}</DialogDescription>
          </DialogHeader>

          {previewFile?.url ? (
            getFileType(previewFile) === 'video' ? (
              <div className="overflow-hidden rounded-2xl bg-black">
                <video
                  src={previewFile.url}
                  controls
                  autoPlay
                  className="max-h-[75vh] w-full bg-black object-contain"
                />
              </div>
            ) : getFileType(previewFile) === 'image' ? (
              <div className="overflow-hidden rounded-2xl bg-muted/30 p-3">
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-h-[75vh] w-full object-contain"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                {t('messages.inlinePreviewUnavailable')}
              </div>
            )
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingDeleteFile)}
        onOpenChange={(open) => {
          if (!open && !deletingKey) {
            setPendingDeleteFile(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('actions.deleteFile')}</DialogTitle>
            <DialogDescription>
              {pendingDeleteFile
                ? t('messages.deleteDescription', { name: pendingDeleteFile.name })
                : ''}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingDeleteFile(null)}
              disabled={Boolean(deletingKey)}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!pendingDeleteFile || Boolean(deletingKey)}
              onClick={() => pendingDeleteFile && handleDelete(pendingDeleteFile)}
            >
              {deletingKey ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t('actions.confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={createFolderOpen}
        onOpenChange={(open) => {
          if (!creatingFolder) {
            setCreateFolderOpen(open);
            if (!open) {
              setFolderName('');
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('actions.createFolder')}</DialogTitle>
            <DialogDescription>{t('messages.createFolderDescription', { path: currentPrefix || '/' })}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm font-medium">{t('fields.folderName')}</div>
            <Input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder={t('fields.folderNamePlaceholder')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateFolderOpen(false);
                setFolderName('');
              }}
              disabled={creatingFolder}
            >
              {t('actions.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleCreateFolder}
              disabled={creatingFolder}
            >
              {creatingFolder ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FolderPlus className="size-4" />
              )}
              {t('actions.confirmCreate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
