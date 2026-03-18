"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  Play,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { AITaskStatus } from "@/extensions/ai/types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  extractFinalPromptFromAITask,
  extractVerseReferenceFromAITask,
  extractVideoUrlFromAITask,
} from "@/shared/lib/ai-task-video";

interface HistoryTask {
  id: string;
  taskId: string | null;
  status: string;
  provider: string;
  model: string;
  prompt: string | null;
  taskInfo: string | null;
  taskResult: string | null;
  options?: string | null;
  createdAt: string;
}

interface PrayerGalleryProps {
  tasks: HistoryTask[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  className?: string;
}

export function PrayerGallery({
  tasks,
  loading,
  total,
  page,
  limit,
  onPageChange,
  onRefresh,
  className = "",
}: PrayerGalleryProps) {
  const t = useTranslations("ai.video.generator");
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string;
    prompt: string | null;
    finalPrompt: string;
  } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const totalPages = Math.ceil(total / limit);

  const handlePrevPage = useCallback(() => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  }, [page, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  }, [page, totalPages, onPageChange]);

  const handleDownload = useCallback(
    async (task: HistoryTask) => {
      const videoUrl = extractVideoUrlFromAITask({
        taskInfo: task.taskInfo,
        taskResult: task.taskResult,
      });
      if (!videoUrl) {
        toast.error(t("no_video_found"));
        return;
      }

      try {
        setDownloadingId(task.id);
        const urlObj = new URL(videoUrl, window.location.origin);
        urlObj.searchParams.append("t", Date.now().toString());
        const resp = await fetch(urlObj.toString());
        if (!resp.ok) {
          throw new Error("Failed to fetch video");
        }

        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `prayer-${task.id}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
        toast.success(t("video_downloaded"));
      } catch (error) {
        console.error("Failed to download video:", error);
        toast.error(t("download_failed"));
      } finally {
        setDownloadingId(null);
      }
    },
    [t],
  );

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case AITaskStatus.SUCCESS:
        return {
          label: t("history.status_success"),
          className:
            "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        };
      case AITaskStatus.FAILED:
        return {
          label: t("history.status_failed"),
          className:
            "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        };
      case AITaskStatus.PROCESSING:
        return {
          label: t("history.status_processing"),
          className:
            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse",
        };
      default:
        return {
          label: t("history.status_pending"),
          className:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        };
    }
  };

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-semibold">
              {t("history.title")}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t("history.no_history")}
            </div>
          ) : (
            <>
              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks.map((task) => {
                  const videoUrl = extractVideoUrlFromAITask({
                    taskInfo: task.taskInfo,
                    taskResult: task.taskResult,
                  });
                  const verseReference = extractVerseReferenceFromAITask({
                    options: task.options,
                    taskResult: task.taskResult,
                  });
                  const finalPrompt = extractFinalPromptFromAITask({
                    options: task.options,
                    taskResult: task.taskResult,
                  });
                  const statusDisplay = getStatusDisplay(task.status);
                  const isProcessing =
                    task.status === AITaskStatus.PROCESSING ||
                    task.status === AITaskStatus.PENDING;

                  return (
                    <div
                      key={task.id}
                      className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Video Thumbnail / Placeholder */}
                      <div
                        className="aspect-video bg-muted relative overflow-hidden cursor-pointer"
                        onClick={() =>
                          videoUrl &&
                          task.status === AITaskStatus.SUCCESS &&
                          setSelectedVideo({
                            url: videoUrl,
                            prompt: task.prompt,
                            finalPrompt,
                          })
                        }
                      >
                        {videoUrl && task.status === AITaskStatus.SUCCESS ? (
                          <video
                            src={videoUrl}
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
                            {isProcessing ? (
                              <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            ) : (
                              <span className="text-4xl">🙏</span>
                            )}
                          </div>
                        )}

                        {/* Status Badge */}
                        <div className="absolute top-2 left-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusDisplay.className}`}
                          >
                            {statusDisplay.label}
                          </span>
                        </div>

                        {/* Play Button Overlay */}
                        {videoUrl && task.status === AITaskStatus.SUCCESS && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button
                              size="sm"
                              className="rounded-full h-12 w-12 p-0"
                              onClick={() =>
                                setSelectedVideo({
                                  url: videoUrl!,
                                  prompt: task.prompt,
                                  finalPrompt,
                                })
                              }
                            >
                              <Play className="h-5 w-5 ml-0.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-4 space-y-2">
                        {/* User's Prayer */}
                        <p className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">
                          {task.prompt || "-"}
                        </p>

                        {/* Bible Verse */}
                        {verseReference && (
                          <p className="text-xs text-primary font-medium">
                            {verseReference}
                          </p>
                        )}

                        {/* Created Time */}
                        <p className="text-xs text-muted-foreground">
                          {new Date(task.createdAt).toLocaleDateString()}
                        </p>

                        {/* Final Prompt */}
                        {finalPrompt && (
                          <div className="rounded-lg border bg-muted/20 p-2.5">
                            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {t("history.final_prompt")}
                            </div>
                            <p className="line-clamp-3 text-xs text-foreground/90">
                              {finalPrompt}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        {task.status === AITaskStatus.SUCCESS && videoUrl && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                              onClick={() =>
                                setSelectedVideo({
                                  url: videoUrl,
                                  prompt: task.prompt,
                                  finalPrompt,
                                })
                              }
                            >
                              <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                              <span className="hidden sm:inline">
                                {t("history.play")}
                              </span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
                              onClick={() => handleDownload(task)}
                              disabled={downloadingId === task.id}
                            >
                              {downloadingId === task.id ? (
                                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                              ) : (
                                <>
                                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" />
                                  <span className="hidden sm:inline">
                                    {t("history.download")}
                                  </span>
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 0 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
                  <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                    {t("history.showing", {
                      start: (page - 1) * limit + 1,
                      end: Math.min(page * limit, total),
                      total: total,
                    })}
                  </div>
                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={page <= 1 || loading}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium min-w-[60px] text-center">
                      {page} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={page >= totalPages || loading}
                      className="h-9 w-9 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Video Preview Dialog */}
      <Dialog
        open={!!selectedVideo}
        onOpenChange={() => setSelectedVideo(null)}
      >
        <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95 border-none">
          <DialogHeader className="px-6 pt-6 absolute top-0 left-0 right-0 z-10">
            <div className="min-w-0">
              <DialogTitle className="line-clamp-1 text-white">
                {selectedVideo?.prompt || t("generated_videos")}
              </DialogTitle>
              {selectedVideo?.finalPrompt ? (
                <p className="mt-2 line-clamp-2 max-w-3xl text-sm text-white/75">
                  {selectedVideo.finalPrompt}
                </p>
              ) : null}
            </div>
          </DialogHeader>
          <div className="w-full h-full flex items-center justify-center p-4">
            {selectedVideo && (
              <video
                src={selectedVideo.url}
                controls
                autoPlay
                loop
                className="w-full h-full max-h-[90vh] rounded-lg object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
