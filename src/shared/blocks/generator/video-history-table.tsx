"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  Loader2,
  RefreshCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Gift,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { AITaskStatus } from "@/extensions/ai/types";
import {
  extractVideoCoverFromAITask,
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
  errorMessage?: string | null;
  errorCode?: string | null;
}
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Copy } from "@/shared/blocks/table/copy";
import { DownloadDialog } from "@/shared/blocks/generator/download-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface VideoHistoryTableProps {
  tasks: HistoryTask[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onRegenerate?: (task: HistoryTask) => void;
  showTitle?: boolean;
  showFinalPrompt?: boolean;
  className?: string;
}

/**
 * 可复用的视频历史记录表格组件
 *
 * 功能特性：
 * - 分页展示历史记录
 * - 支持查看、下载、重新生成
 * - 响应式设计，适配移动端
 * - 国际化支持（中英文）
 * - 性能优化（useMemo、useCallback）
 * - 健壮的错误处理
 */
export function VideoHistoryTable({
  tasks,
  loading,
  total,
  page,
  limit,
  onPageChange,
  onRefresh,
  onRegenerate,
  showTitle = true,
  showFinalPrompt = true,
  className = "",
}: VideoHistoryTableProps) {
  const t = useTranslations("ai.video.generator");
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedTaskForDownload, setSelectedTaskForDownload] =
    useState<HistoryTask | null>(null);

  // Gift dialog state
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [selectedTaskForGift, setSelectedTaskForGift] =
    useState<HistoryTask | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [sendingGift, setSendingGift] = useState(false);

  // 提取视频 URL
  const extractVideoUrl = useCallback(
    (taskInfo: string | null, taskResult: string | null): string | null => {
      return extractVideoUrlFromAITask({
        taskInfo,
        taskResult,
      });
    },
    [],
  );

  // 打开下载对话框
  const handleOpenDownloadDialog = useCallback((task: HistoryTask) => {
    setSelectedTaskForDownload(task);
    setDownloadDialogOpen(true);
  }, []);

  // 处理重新生成
  const handleRegenerate = useCallback(
    (task: HistoryTask) => {
      if (onRegenerate) {
        onRegenerate(task);
      } else {
        toast.info(t("regenerate_not_available"));
      }
    },
    [onRegenerate, t],
  );

  // 打开送礼对话框
  const handleOpenGiftDialog = useCallback((task: HistoryTask) => {
    setSelectedTaskForGift(task);
    setRecipientEmail("");
    setGiftMessage("");
    setGiftDialogOpen(true);
  }, []);

  // 发送礼物
  const handleSendGift = useCallback(async () => {
    if (!selectedTaskForGift || !recipientEmail) {
      toast.error("Please enter a recipient email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSendingGift(true);
    try {
      const videoUrl = extractVideoUrl(
        selectedTaskForGift.taskInfo,
        selectedTaskForGift.taskResult,
      );

      const response = await fetch("/api/video/send-gift", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: selectedTaskForGift.id,
          recipientEmail,
          message: giftMessage,
          videoUrl,
        }),
      });

      if (response.ok) {
        toast.success(
          "Gift sent successfully! They will receive an email with your blessing.",
        );
        setGiftDialogOpen(false);
        setSelectedTaskForGift(null);
        setRecipientEmail("");
        setGiftMessage("");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to send gift. Please try again.");
      }
    } catch (error) {
      console.error("Failed to send gift:", error);
      toast.error("Failed to send gift. Please try again.");
    } finally {
      setSendingGift(false);
    }
  }, [selectedTaskForGift, recipientEmail, giftMessage, extractVideoUrl]);

  // 计算总页数
  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);

  // 分页控制
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

  return (
    <>
      <Card className={className}>
        {showTitle && (
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
        )}
        <CardContent className={showTitle ? "" : "pt-6"}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t("history.no_history")}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("history.status")}</TableHead>
                      <TableHead>{t("history.preview")}</TableHead>
                      <TableHead>{t("history.prompt")}</TableHead>
                      <TableHead>{t("history.verse_reference")}</TableHead>
                      {showFinalPrompt && (
                        <TableHead className="max-w-xs">
                          {t("history.final_prompt")}
                        </TableHead>
                      )}
                      <TableHead>{t("history.created")}</TableHead>
                      <TableHead className="max-w-xs">
                        {t("history.task_id")}
                      </TableHead>
                      <TableHead className="max-w-xs text-red-600">
                        Error Info
                      </TableHead>
                      <TableHead className="text-right sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 z-10">
                        {t("history.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => {
                      const videoUrl = extractVideoUrl(
                        task.taskInfo,
                        task.taskResult,
                      );
                      const coverUrl = extractVideoCoverFromAITask(task.taskResult);
                      let finalPrompt = "";
                      let verseReference = "";

                      // Try to extract from taskResult first (for comfly-api)
                      try {
                        if (task.taskResult) {
                          const taskResult = JSON.parse(task.taskResult);
                          if (taskResult.verse_reference) {
                            verseReference = taskResult.verse_reference;
                          }
                          if (taskResult.narration) {
                            finalPrompt = taskResult.narration;
                          }
                        }
                      } catch (e) {
                        // Ignore parse error
                      }

                      // Fallback to options.final_prompt (for gw-api)
                      try {
                        if (task.options && !verseReference) {
                          const options = JSON.parse(task.options);
                          finalPrompt = options.final_prompt || finalPrompt;
                          // Extract verse_reference from final_prompt JSON
                          if (finalPrompt && !verseReference) {
                            try {
                              const analysis = JSON.parse(finalPrompt);
                              verseReference = analysis.verse_reference || "";
                            } catch (e) {
                              // Ignore parse error
                            }
                          }
                        }
                      } catch (e) {
                        // 忽略解析错误
                      }

                      return (
                        <TableRow key={task.id}>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                task.status === AITaskStatus.SUCCESS
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : task.status === AITaskStatus.FAILED
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    : task.status === AITaskStatus.PROCESSING
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 animate-pulse"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                              }`}
                            >
                              {task.status === AITaskStatus.SUCCESS
                                ? t("history.status_success")
                                : task.status === AITaskStatus.FAILED
                                  ? t("history.status_failed")
                                  : task.status === AITaskStatus.PROCESSING
                                    ? t("history.status_processing")
                                    : t("history.status_pending")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => handleOpenDownloadDialog(task)}
                              className="group block w-[140px] text-left"
                              title={t("history.view")}
                            >
                              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-muted">
                                <div className="aspect-[16/10] overflow-hidden">
                                  {coverUrl ? (
                                    <img
                                      src={coverUrl}
                                      alt={task.prompt || "Video thumbnail"}
                                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,_rgba(249,115,22,0.18),_rgba(20,184,166,0.14))]">
                                      <Sparkles className="h-8 w-8 text-primary" />
                                    </div>
                                  )}
                                </div>
                                {videoUrl ? (
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 py-2 text-[11px] font-medium text-white">
                                    {t("history.view")}
                                  </div>
                                ) : null}
                              </div>
                            </button>
                          </TableCell>
                          <TableCell>
                            {task.prompt ? (
                              <Copy
                                value={task.prompt}
                                className="max-w-[200px]"
                              >
                                <span className="truncate" title={task.prompt}>
                                  {task.prompt}
                                </span>
                              </Copy>
                            ) : (
                              <span>-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {verseReference ? (
                              <Copy value={verseReference} className="">
                                <span
                                  className="truncate font-medium text-blue-600 dark:text-blue-400"
                                  title={verseReference}
                                >
                                  {verseReference}
                                </span>
                              </Copy>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          {showFinalPrompt && (
                            <TableCell>
                              {finalPrompt ? (
                                <Copy value={finalPrompt} className="max-w-xs">
                                  <span
                                    className="line-clamp-2 text-xs sm:text-sm"
                                    title={finalPrompt}
                                  >
                                    {finalPrompt}
                                  </span>
                                </Copy>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  -
                                </span>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {task.createdAt ? (
                              <span className="text-xs sm:text-sm">
                                {new Date(task.createdAt).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Copy value={task.id} className="max-w-xs">
                              <span className="truncate text-xs sm:text-sm">
                                {task.id}
                              </span>
                            </Copy>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              // Try to get error from taskResult JSON
                              let errorInfo = null;
                              if (task.taskResult) {
                                try {
                                  const result = JSON.parse(task.taskResult);
                                  if (result.error || result.stack) {
                                    errorInfo = {
                                      error: result.error,
                                      stack: result.stack,
                                    };
                                  }
                                } catch (e) {
                                  // Not valid JSON, ignore
                                }
                              }
                              // Fallback to errorMessage/errorCode fields
                              if (
                                !errorInfo &&
                                (task.errorMessage || task.errorCode)
                              ) {
                                errorInfo = {
                                  error: task.errorCode,
                                  stack: task.errorMessage,
                                };
                              }

                              if (
                                task.status === AITaskStatus.FAILED &&
                                errorInfo
                              ) {
                                const errorText =
                                  errorInfo.stack ||
                                  errorInfo.error ||
                                  "Unknown error";
                                return (
                                  <Copy value={errorText} className="max-w-xs">
                                    <div className="max-w-xs cursor-pointer">
                                      {errorInfo.error && (
                                        <span
                                          className="text-xs font-mono text-red-600 block truncate"
                                          title={errorInfo.error}
                                        >
                                          {errorInfo.error}
                                        </span>
                                      )}
                                      {errorInfo.stack && (
                                        <span
                                          className="text-xs text-red-500 line-clamp-2"
                                          title={errorInfo.stack}
                                        >
                                          {errorInfo.stack.length > 100
                                            ? errorInfo.stack.slice(0, 100) +
                                              "..."
                                            : errorInfo.stack}
                                        </span>
                                      )}
                                    </div>
                                  </Copy>
                                );
                              }
                              return (
                                <span className="text-xs text-muted-foreground">
                                  -
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right w-auto sm:w-[320px] sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 z-10">
                            <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                              {videoUrl && (
                                <>{/* Preview and Share buttons removed */}</>
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleOpenDownloadDialog(task)}
                                title="View"
                                className="w-auto justify-center bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="ml-2 hidden sm:inline">
                                  View
                                </span>
                              </Button>
                              {task.status === AITaskStatus.SUCCESS &&
                                videoUrl && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleOpenGiftDialog(task)}
                                    title="Send as Gift"
                                    className="w-auto justify-center bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200"
                                  >
                                    <Gift className="h-4 w-4" />
                                    <span className="ml-2 hidden sm:inline">
                                      Gift
                                    </span>
                                  </Button>
                                )}
                              {onRegenerate &&
                                task.status === AITaskStatus.SUCCESS && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRegenerate(task)}
                                    title={t("regenerate")}
                                    className="w-auto justify-center"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                    <span className="ml-2 hidden sm:inline">
                                      {t("regenerate")}
                                    </span>
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* 分页控制 */}
              {totalPages > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
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
                      className="h-9 w-9 p-0 sm:h-8 sm:w-8"
                      title={t("history.previous")}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">{t("history.previous")}</span>
                    </Button>
                    <div className="text-sm sm:text-xs font-medium min-w-[60px] text-center">
                      {page} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={page >= totalPages || loading}
                      className="h-9 w-9 p-0 sm:h-8 sm:w-8"
                      title={t("history.next")}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">{t("history.next")}</span>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 下载对话框 */}
      {selectedTaskForDownload && (
        <DownloadDialog
          open={downloadDialogOpen}
          onOpenChange={setDownloadDialogOpen}
          taskId={selectedTaskForDownload.id}
          taskResult={selectedTaskForDownload.taskResult}
          taskInfo={selectedTaskForDownload.taskInfo}
        />
      )}
      {/* Gift Dialog */}
      <Dialog open={giftDialogOpen} onOpenChange={setGiftDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              Share God's Blessing
            </DialogTitle>
            <DialogDescription>
              Send this personalized Bible video as a heartfelt gift to someone
              special.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-email">
                Recipient's Email Address *
              </Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="e.g., friend@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gift-message">Personal Message (Optional)</Label>
              <textarea
                id="gift-message"
                placeholder="Add a warm message to accompany this blessing..."
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                This message will be included in the email sent to the
                recipient.
              </p>
            </div>
            {selectedTaskForGift && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium text-foreground">
                  Video:{" "}
                  {selectedTaskForGift.prompt?.slice(0, 50) ||
                    "Bible Verse Video"}
                  {selectedTaskForGift.prompt &&
                  selectedTaskForGift.prompt.length > 50
                    ? "..."
                    : ""}
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setGiftDialogOpen(false)}
              disabled={sendingGift}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendGift}
              disabled={sendingGift || !recipientEmail}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {sendingGift ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Gift
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
