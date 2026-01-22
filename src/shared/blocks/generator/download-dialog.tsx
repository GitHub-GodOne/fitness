"use client";

import { useState } from "react";
import { Download, Image as ImageIcon, Loader2, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

interface DownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskResult: string | null;
}

interface DownloadOption {
  type: "video" | "images-with-text" | "images-original";
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export function DownloadDialog({
  open,
  onOpenChange,
  taskId,
  taskResult,
}: DownloadDialogProps) {
  const t = useTranslations("ai.video.generator");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [downloading, setDownloading] = useState<string | null>(null);

  const parseTaskResult = () => {
    try {
      return taskResult ? JSON.parse(taskResult) : {};
    } catch (error) {
      console.error("Failed to parse task result:", error);
      return {};
    }
  };

  const handleDownload = async (type: string) => {
    try {
      setDownloading(type);
      const result = parseTaskResult();

      if (type === "video") {
        await downloadVideo(result.video_url);
      } else if (type === "images-with-text") {
        await downloadImages(result.image_urls, true);
      } else if (type === "images-original") {
        await downloadImages(result.original_image_urls, false);
      }
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(t("download_failed"));
    } finally {
      setDownloading(null);
    }
  };

  const downloadVideo = async (videoUrl: string) => {
    if (!videoUrl) {
      toast.error(t("no_video_found"));
      return;
    }

    const resp = await fetch(
      `/api/proxy/file?url=${encodeURIComponent(videoUrl)}`,
    );
    if (!resp.ok) {
      throw new Error("Failed to fetch video");
    }

    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `video-${taskId}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
    toast.success(t("video_downloaded"));
  };

  const downloadImages = async (
    imageUrls: string[],
    withWatermark: boolean,
  ) => {
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      toast.error(
        withWatermark ? t("no_watermarked_images") : t("no_original_images"),
      );
      return;
    }

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      const resp = await fetch(
        `/api/proxy/file?url=${encodeURIComponent(imageUrl)}`,
      );
      if (!resp.ok) {
        throw new Error(`Failed to fetch image ${i + 1}`);
      }

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `image-${taskId}-${i + 1}${withWatermark ? "-watermark" : ""}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);

      if (i < imageUrls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    toast.success(t("images_downloaded"));
  };

  const result = parseTaskResult();
  const hasVideo = !!result.video_url;
  const hasImagesWithText =
    result.image_urls &&
    Array.isArray(result.image_urls) &&
    result.image_urls.length > 0;
  const hasOriginalImages =
    result.original_image_urls &&
    Array.isArray(result.original_image_urls) &&
    result.original_image_urls.length > 0;

  const downloadOptions: DownloadOption[] = [
    {
      type: "video",
      label: t("download_video"),
      icon: <Video className="h-5 w-5" />,
      disabled: !hasVideo,
    },
    {
      type: "images-with-text",
      label: t("download_images_with_watermark"),
      icon: <ImageIcon className="h-5 w-5" />,
      disabled: !hasImagesWithText,
    },
    {
      type: "images-original",
      label: t("download_images_without_watermark"),
      icon: <ImageIcon className="h-5 w-5" />,
      disabled: !hasOriginalImages,
    },
  ];

  const content = (
    <div className="space-y-3 py-4">
      {downloadOptions.map((option) => (
        <Button
          key={option.type}
          variant="outline"
          className="w-full justify-start h-auto py-3 px-4"
          onClick={() => handleDownload(option.type)}
          disabled={option.disabled || downloading !== null}
        >
          <div className="flex items-center gap-3 w-full">
            {downloading === option.type ? (
              <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
            ) : (
              <div className="flex-shrink-0">{option.icon}</div>
            )}
            <span className="text-sm sm:text-base flex-1 text-left">
              {option.label}
            </span>
            {!option.disabled && downloading !== option.type && (
              <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        </Button>
      ))}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("download_options")}</DialogTitle>
            <DialogDescription>{t("download_description")}</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{t("download_options")}</DrawerTitle>
          <DrawerDescription>{t("download_description")}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4">{content}</div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">{t("cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
