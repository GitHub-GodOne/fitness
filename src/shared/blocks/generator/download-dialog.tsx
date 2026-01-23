"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Download,
  Image as ImageIcon,
  Loader2,
  Video,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { ShareButton } from "@/shared/blocks/common/share-button";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { toAbsoluteUrl } from "@/shared/lib/url-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

interface DownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskResult: string | null;
}

interface TaskResultData {
  video_url?: string;
  image_urls?: string[];
  original_image_urls?: string[];
  audio_url?: string;
}

type TabType = "video" | "images-with-text" | "images-original";

// 图片预览组件（支持选择下载）
function ImagePreview({
  images,
  taskId,
  onDownload,
  onDownloadSelected,
  renderButtons,
}: {
  images: string[];
  taskId: string;
  onDownload: (url: string, index: number) => Promise<void>;
  onDownloadSelected: (selectedUrls: string[]) => Promise<void>;
  renderButtons?: (props: {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDownloadAll: () => void;
    onDownloadSelected: () => void;
    downloading: boolean;
  }) => React.ReactNode;
}) {
  const t = useTranslations("ai.video.generator");
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());

  const handleDownload = useCallback(
    async (url: string, index: number) => {
      setDownloading(index);
      try {
        await onDownload(url, index);
      } finally {
        setDownloading(null);
      }
    },
    [onDownload],
  );

  const handleDownloadAll = useCallback(async () => {
    setDownloadingAll(true);
    try {
      await onDownloadSelected(images);
    } finally {
      setDownloadingAll(false);
    }
  }, [images, onDownloadSelected]);

  const handleDownloadSelected = useCallback(async () => {
    if (selectedImages.size === 0) {
      toast.error(t("no_images_selected"));
      return;
    }
    setDownloadingAll(true);
    try {
      const selectedUrls = Array.from(selectedImages).map((i) => images[i]);
      await onDownloadSelected(selectedUrls);
      setSelectedImages(new Set());
    } finally {
      setDownloadingAll(false);
    }
  }, [selectedImages, images, onDownloadSelected, t]);

  const toggleSelection = useCallback((index: number) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(images.map((_, i) => i)));
    }
  }, [selectedImages.size, images.length]);

  return (
    <>
      {renderButtons &&
        renderButtons({
          selectedCount: selectedImages.size,
          totalCount: images.length,
          onSelectAll: toggleSelectAll,
          onDownloadAll: handleDownloadAll,
          onDownloadSelected: handleDownloadSelected,
          downloading: downloadingAll,
        })}
      <div className="space-y-3 sm:space-y-4">
        {images.map((url, index) => (
          <div key={index} className="relative group border rounded-lg p-2">
            <div className="flex items-start gap-2">
              {/* 选择框 */}
              <Checkbox
                checked={selectedImages.has(index)}
                onCheckedChange={() => toggleSelection(index)}
                className="mt-2"
              />
              {/* 图片 */}
              <div className="flex-1 min-w-0">
                <img
                  src={url}
                  alt={`Image ${index + 1}`}
                  className="w-full h-auto rounded-lg"
                  style={{ maxHeight: "40vh", objectFit: "contain" }}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(url, index)}
                    disabled={downloading === index}
                  >
                    {downloading === index ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {t("download")}
                  </Button>
                  <ShareButton
                    url={toAbsoluteUrl(url, { usePublicDomain: true })}
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// 视频预览组件
function VideoPreview({
  videoUrl,
  taskId,
  onDownload,
}: {
  videoUrl: string;
  taskId: string;
  onDownload: () => Promise<void>;
}) {
  const t = useTranslations("ai.video.generator");
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  }, [onDownload]);

  return (
    <div className="space-y-4">
      <video
        src={videoUrl}
        controls
        className="w-full h-auto rounded-lg border"
        style={{ maxHeight: "50vh" }}
      />
      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {t("download_video")}
        </Button>
        <ShareButton
          url={toAbsoluteUrl(videoUrl, { usePublicDomain: true })}
          variant="outline"
          className="flex-1"
        />
      </div>
    </div>
  );
}

export function DownloadDialog({
  open,
  onOpenChange,
  taskId,
  taskResult,
}: DownloadDialogProps) {
  const t = useTranslations("ai.video.generator");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const resultData = useMemo<TaskResultData>(() => {
    try {
      return taskResult ? JSON.parse(taskResult) : {};
    } catch (error) {
      console.error("Failed to parse task result:", error);
      return {};
    }
  }, [taskResult]);

  const hasVideo = Boolean(resultData.video_url);
  const hasImagesWithText = Boolean(resultData.image_urls?.length);
  const hasOriginalImages = Boolean(resultData.original_image_urls?.length);

  const defaultTab = useMemo<TabType>(() => {
    if (hasVideo) return "video";
    if (hasImagesWithText) return "images-with-text";
    if (hasOriginalImages) return "images-original";
    return "video";
  }, [hasVideo, hasImagesWithText, hasOriginalImages]);

  const downloadFile = useCallback(
    async (url: string, filename: string) => {
      try {
        const resp = await fetch(
          `/api/proxy/file?url=${encodeURIComponent(url)}`,
        );
        if (!resp.ok) throw new Error("Download failed");
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      } catch (error) {
        console.error("Download failed:", error);
        throw error;
      }
    },
    [taskId],
  );

  const handleDownloadVideo = useCallback(async () => {
    if (!resultData.video_url) {
      toast.error(t("no_video_found"));
      return;
    }
    await downloadFile(resultData.video_url, `video-${taskId}.mp4`);
    toast.success(t("video_downloaded"));
  }, [resultData.video_url, downloadFile, t, taskId]);

  const handleDownloadImage = useCallback(
    async (url: string, index: number) => {
      await downloadFile(url, `image-${taskId}-${index + 1}.png`);
      toast.success(t("image_downloaded"));
    },
    [downloadFile, t, taskId],
  );

  const handleDownloadMultipleImages = useCallback(
    async (urls: string[]) => {
      for (let i = 0; i < urls.length; i++) {
        await downloadFile(urls[i], `image-${taskId}-${i + 1}.png`);
        if (i < urls.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
      toast.success(t("images_downloaded"));
    },
    [downloadFile, t, taskId],
  );

  const tabsContent = (
    <Tabs defaultValue={defaultTab} className="w-full flex flex-col h-full">
      {/* 固定的 Tab 头部 */}
      <div className="sticky top-0 z-10 bg-background pb-2">
        <TabsList className="grid w-full grid-cols-3 h-auto border-b">
          <TabsTrigger
            value="video"
            disabled={!hasVideo}
            className="text-xs sm:text-sm py-2 px-2 sm:px-3"
          >
            <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t("video")}</span>
            <span className="sm:hidden">{t("video")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="images-with-text"
            disabled={!hasImagesWithText}
            className="text-xs sm:text-sm py-2 px-2 sm:px-3"
          >
            <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t("with_text")}</span>
            <span className="sm:hidden">{t("with_text")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="images-original"
            disabled={!hasOriginalImages}
            className="text-xs sm:text-sm py-2 px-2 sm:px-3"
          >
            <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t("without_text")}</span>
            <span className="sm:hidden">{t("without_text")}</span>
          </TabsTrigger>
        </TabsList>
      </div>

      {/* 可滚动的内容区域 */}
      <div className="flex-1 overflow-y-auto mt-4">
        <TabsContent value="video" className="mt-0">
          {hasVideo && resultData.video_url ? (
            <VideoPreview
              videoUrl={resultData.video_url}
              taskId={taskId}
              onDownload={handleDownloadVideo}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("no_video_found")}
            </div>
          )}
        </TabsContent>

        <TabsContent value="images-with-text" className="mt-0">
          {hasImagesWithText && resultData.image_urls ? (
            <ImagePreview
              images={resultData.image_urls}
              taskId={taskId}
              onDownload={handleDownloadImage}
              onDownloadSelected={handleDownloadMultipleImages}
              renderButtons={(props) => (
                <div className="sticky top-0 z-20 bg-background pb-3 border-b mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={props.onSelectAll}
                      className="flex-1 sm:flex-none"
                    >
                      {props.selectedCount === props.totalCount
                        ? t("deselect_all")
                        : t("select_all")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={props.onDownloadAll}
                      disabled={props.downloading}
                      className="flex-1 sm:flex-none"
                    >
                      {props.downloading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {t("download_all")}
                    </Button>
                    {props.selectedCount > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={props.onDownloadSelected}
                        disabled={props.downloading}
                        className="flex-1 sm:flex-none"
                      >
                        {props.downloading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        {t("download_selected")} ({props.selectedCount})
                      </Button>
                    )}
                  </div>
                </div>
              )}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("no_watermarked_images")}
            </div>
          )}
        </TabsContent>

        <TabsContent value="images-original" className="mt-0">
          {hasOriginalImages && resultData.original_image_urls ? (
            <ImagePreview
              images={resultData.original_image_urls}
              taskId={taskId}
              onDownload={handleDownloadImage}
              onDownloadSelected={handleDownloadMultipleImages}
              renderButtons={(props) => (
                <div className="sticky top-0 z-20 bg-background pb-3 border-b mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={props.onSelectAll}
                      className="flex-1 sm:flex-none"
                    >
                      {props.selectedCount === props.totalCount
                        ? t("deselect_all")
                        : t("select_all")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={props.onDownloadAll}
                      disabled={props.downloading}
                      className="flex-1 sm:flex-none"
                    >
                      {props.downloading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {t("download_all")}
                    </Button>
                    {props.selectedCount > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={props.onDownloadSelected}
                        disabled={props.downloading}
                        className="flex-1 sm:flex-none"
                      >
                        {props.downloading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        {t("download_selected")} ({props.selectedCount})
                      </Button>
                    )}
                  </div>
                </div>
              )}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("no_original_images")}
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{t("download_options")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">{tabsContent}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader className="text-left">
          <DrawerTitle>{t("download_options")}</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4">{tabsContent}</div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">{t("close")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
