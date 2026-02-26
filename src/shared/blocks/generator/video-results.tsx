"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, ArrowLeft, RefreshCw, Play, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Link } from "@/core/i18n/navigation";
import { AIMediaType, AITaskStatus } from "@/extensions/ai/types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { useAppContext } from "@/shared/contexts/app";

interface HistoryTask {
  id: string;
  taskId: string | null;
  status: string;
  provider: string;
  model: string;
  prompt: string | null;
  taskInfo: string | null;
  taskResult: string | null;
  options: string | null;
  createdAt: string;
}

function parseTaskResult(taskResult: string | null): any {
  if (!taskResult) return null;
  try { return JSON.parse(taskResult); } catch { return null; }
}

function extractVideoUrls(result: any): string[] {
  if (!result) return [];
  if (result.matchedVideos && Array.isArray(result.matchedVideos)) {
    return result.matchedVideos.map((item: any) => item?.videoUrl).filter(Boolean);
  }
  const videos = result.videos;
  if (videos && Array.isArray(videos)) {
    return videos
      .map((item: any) => {
        if (!item) return null;
        if (typeof item === "string") return item;
        if (typeof item === "object") return item.url ?? item.uri ?? item.video ?? item.src ?? item.videoUrl;
        return null;
      })
      .filter(Boolean);
  }
  if (result.content?.video_url && typeof result.content.video_url === "string") {
    return [result.content.video_url];
  }
  const output = result.output ?? result.video ?? result.data;
  if (!output) return [];
  if (typeof output === "string") return [output];
  if (Array.isArray(output)) {
    return output
      .flatMap((item) => {
        if (!item) return [];
        if (typeof item === "string") return [item];
        if (typeof item === "object") {
          const c = item.url ?? item.uri ?? item.video ?? item.src ?? item.videoUrl;
          return typeof c === "string" ? [c] : [];
        }
        return [];
      })
      .filter(Boolean);
  }
  if (typeof output === "object") {
    const c = output.url ?? output.uri ?? output.video ?? output.src ?? output.videoUrl;
    if (typeof c === "string") return [c];
  }
  return [];
}

function getBodyPartsFromTask(task: HistoryTask): string[] {
  const opts = parseTaskResult(task.options);
  return opts?.selected_body_parts || [];
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}

export function VideoResults() {
  const t = useTranslations("ai.video.generator");
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const { user } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<{ id: string; url: string }[]>([]);
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);

  // History state
  const [historyTasks, setHistoryTasks] = useState<HistoryTask[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyLimit = 12;

  // Fetch the specific task to get video URLs
  useEffect(() => {
    if (!taskId) { setLoading(false); return; }
    (async () => {
      try {
        const resp = await fetch("/api/ai/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
        if (!resp.ok) throw new Error("Failed to fetch task");
        const { code, data } = await resp.json();
        if (code !== 0 || !data) throw new Error("Task not found");
        const parsed = parseTaskResult(data.taskResult);
        const urls = extractVideoUrls(parsed);
        setVideos(urls.map((url: string, i: number) => ({ id: `${data.id}-${i}`, url })));
      } catch (err: any) {
        console.error("Failed to load task:", err);
        toast.error("Failed to load video results");
      } finally {
        setLoading(false);
      }
    })();
  }, [taskId]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: String(historyLimit),
        mediaType: AIMediaType.VIDEO,
      });
      const resp = await fetch(`/api/ai/list?${params.toString()}`);
      if (!resp.ok) throw new Error("Failed to fetch history");
      const { code, data } = await resp.json();
      if (code !== 0) throw new Error("Failed to fetch history");
      const tasks: HistoryTask[] = (data.data || []).map((task: any) => ({
        id: task.id, taskId: task.taskId, status: task.status,
        provider: task.provider, model: task.model, prompt: task.prompt,
        taskInfo: task.taskInfo, taskResult: task.taskResult, options: task.options,
        createdAt: task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
      }));
      setHistoryTasks(tasks);
      setHistoryTotal(data.total || 0);
    } catch (err: any) {
      console.error("Failed to fetch history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [user, historyPage, historyLimit]);

  useEffect(() => { if (user) fetchHistory(); }, [user, fetchHistory]);

  const handleDownloadVideo = async (video: { id: string; url: string }) => {
    setDownloadingVideoId(video.id);
    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workout-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(t("video_downloaded"));
    } catch {
      toast.error(t("download_failed"));
    } finally {
      setDownloadingVideoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Extract video URLs from a history task for card display
  const getTaskVideoUrls = (task: HistoryTask): string[] => {
    const parsed = parseTaskResult(task.taskResult);
    return extractVideoUrls(parsed);
  };

  const totalPages = Math.ceil(historyTotal / historyLimit);

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 pt-20 pb-8 space-y-10 overflow-hidden">
      {/* Current Generated Videos */}
      {videos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("generated_videos")}</h2>
          <div className="grid gap-4">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden">
                <CardContent className="p-2 sm:pt-6 sm:px-6">
                  <video
                    src={video.url}
                    controls
                    playsInline
                    className="w-full rounded-lg"
                    preload="metadata"
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadVideo(video)}
                      disabled={downloadingVideoId === video.id}
                    >
                      {downloadingVideoId === video.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      {t("download_video")}
                    </Button>
                    <Link href="/ai-video-generator">
                      <Button size="sm" variant="default">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        {t("regenerate")}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* History as Video Cards */}
      {user && historyTasks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t("history.title")}</h2>
            <Button size="sm" variant="ghost" onClick={fetchHistory} disabled={historyLoading}>
              {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {historyTasks.map((task) => {
              const taskVideos = getTaskVideoUrls(task);
              const bodyParts = getBodyPartsFromTask(task);
              const isSuccess = task.status === AITaskStatus.SUCCESS;
              const isFailed = task.status === AITaskStatus.FAILED;
              const isProcessing = task.status === AITaskStatus.PROCESSING || task.status === AITaskStatus.PENDING;

              return (
                <Card key={task.id} className="overflow-hidden w-full">
                  {/* Video or status placeholder */}
                  <div className="aspect-video bg-muted relative">
                    {isSuccess && taskVideos.length > 0 ? (
                      <video
                        src={taskVideos[0]}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {isProcessing && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
                        {isFailed && <span className="text-sm text-destructive">{t("history.status_failed")}</span>}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={isSuccess ? "default" : isFailed ? "destructive" : "secondary"}>
                        {isSuccess ? t("history.status_success") : isFailed ? t("history.status_failed") : t("history.status_processing")}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(task.createdAt)}
                      </span>
                    </div>
                    {bodyParts.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {bodyParts.map((part) => (
                          <Badge key={part} variant="outline" className="text-xs">{part}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                size="sm" variant="secondary"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((p) => p - 1)}
              >
                {t("history.previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {historyPage} / {totalPages}
              </span>
              <Button
                size="sm" variant="secondary"
                disabled={historyPage >= totalPages}
                onClick={() => setHistoryPage((p) => p + 1)}
              >
                {t("history.next")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
