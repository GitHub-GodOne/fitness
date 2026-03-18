"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, ArrowLeft, RefreshCw, Play, Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Link, useRouter } from "@/core/i18n/navigation";
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

function extractVideoGroups(result: any): any[] {
  if (!result) return [];
  if (result.matchedVideos && Array.isArray(result.matchedVideos)) {
    return result.matchedVideos;
  }
  return [];
}

function extractVideoUrls(result: any): string[] {
  const groups = extractVideoGroups(result);
  if (groups.length > 0) {
    // Extract first video URL from each group
    return groups.map((group: any) => {
      if (group.videos && Array.isArray(group.videos) && group.videos.length > 0) {
        return group.videos[0].videoUrl;
      }
      return group.videoUrl;
    }).filter(Boolean);
  }

  // Fallback for old format
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

function getLocalizedText(
  item: Record<string, any> | null | undefined,
  baseKey: string,
  locale: string,
): string {
  if (!item) return "";

  const localizedKey = `${baseKey}Zh`;
  if (locale === "zh") {
    return item[localizedKey] || item[baseKey] || "";
  }

  return item[baseKey] || item[localizedKey] || "";
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
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");
  const { user } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [videoGroups, setVideoGroups] = useState<any[]>([]);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<Record<string, number>>({});
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(null);

  // History state
  const [historyTasks, setHistoryTasks] = useState<HistoryTask[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyLimit = 12;

  // Fetch the specific task to get video groups
  useEffect(() => {
    if (!taskId) { setLoading(false); return; }

    setLoading(true); // Reset loading state when taskId changes

    (async () => {
      try {
        console.log('[VideoResults] Fetching task:', taskId);
        const resp = await fetch("/api/ai/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
        console.log('[VideoResults] Response status:', resp.status);
        if (!resp.ok) throw new Error("Failed to fetch task");
        const { code, data } = await resp.json();
        console.log('[VideoResults] Response data:', { code, data });
        if (code !== 0 || !data) throw new Error("Task not found");
        const parsed = parseTaskResult(data.taskResult);
        const groups = extractVideoGroups(parsed);
        console.log('[VideoResults] Extracted groups:', groups);
        setVideoGroups(groups);
        // Initialize selected video index for each group (default to 0)
        const initialSelection: Record<string, number> = {};
        groups.forEach((group: any) => {
          initialSelection[group.id] = 0;
        });
        setSelectedVideoIndex(initialSelection);
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

  const handleDownloadVideo = async (groupId: string, videoUrl: string) => {
    setDownloadingVideoId(groupId);
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workout-${groupId}.mp4`;
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
      {videoGroups.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("generated_videos")}</h2>
          <div className="grid gap-4">
            {videoGroups.map((group) => {
              const currentVideoIndex = selectedVideoIndex[group.id] || 0;
              const currentVideo = group.videos?.[currentVideoIndex];
              const hasMultipleVideos = group.videos && group.videos.length > 1;
              const title = getLocalizedText(group, "title", locale);
              const description = getLocalizedText(group, "description", locale);
              const instructions = getLocalizedText(group, "instructions", locale);

              return (
                <Card key={group.id} className="overflow-hidden">
                  <CardContent className="p-2 sm:pt-6 sm:px-6">
                    {/* Video Title and Description */}
                    <div className="mb-3">
                      <h3 className="font-semibold text-lg">{title}</h3>
                      {description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {description}
                        </p>
                      )}
                      {group.difficulty && (
                        <Badge variant="outline" className="mt-2">
                          {group.difficulty}
                        </Badge>
                      )}
                    </div>

                    {/* View Angle Tabs */}
                    {hasMultipleVideos && (
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {group.videos.map((video: any, index: number) => (
                          <Button
                            key={video.id}
                            size="sm"
                            variant={currentVideoIndex === index ? "default" : "outline"}
                            onClick={() => setSelectedVideoIndex(prev => ({ ...prev, [group.id]: index }))}
                          >
                            {getLocalizedText(video, "viewAngle", locale) || `View ${index + 1}`}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Video Player */}
                    {currentVideo && (
                      <video
                        key={currentVideo.id}
                        src={currentVideo.videoUrl}
                        controls
                        playsInline
                        className="w-full rounded-lg"
                        preload="metadata"
                      />
                    )}

                    {/* Instructions */}
                    {instructions && (
                      <div className="mt-3 p-3 bg-muted rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {instructions}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadVideo(group.id, currentVideo?.videoUrl)}
                        disabled={downloadingVideoId === group.id || !currentVideo}
                      >
                        {downloadingVideoId === group.id ? (
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
              );
            })}
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
              const parsed = parseTaskResult(task.taskResult);
              const videoGroups = extractVideoGroups(parsed);
              const taskVideos = extractVideoUrls(parsed);
              const bodyParts = getBodyPartsFromTask(task);
              const isSuccess = task.status === AITaskStatus.SUCCESS;
              const isFailed = task.status === AITaskStatus.FAILED;
              const isProcessing = task.status === AITaskStatus.PROCESSING || task.status === AITaskStatus.PENDING;

              // Count total videos across all groups
              const totalVideos = videoGroups.reduce((sum, group) => {
                return sum + (group.videos?.length || 0);
              }, 0);

              return (
                <div
                  key={task.id}
                  onClick={() => {
                    if (isSuccess) {
                      router.push(`/ai-video-generator/results?taskId=${task.id}`);
                    }
                  }}
                  className={isSuccess ? 'cursor-pointer' : 'cursor-default'}
                >
                  <Card className="overflow-hidden w-full hover:shadow-lg transition-shadow">
                    {/* Video or status placeholder */}
                    <div className="aspect-video bg-muted relative">
                      {isSuccess && taskVideos.length > 0 ? (
                        <>
                          <video
                            src={taskVideos[0]}
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-contain"
                            onClick={(e) => e.preventDefault()}
                          />
                          {/* Video count badge */}
                          {totalVideos > 1 && (
                            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              {totalVideos} {t("history.videos")}
                            </div>
                          )}
                        </>
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
                </div>
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
