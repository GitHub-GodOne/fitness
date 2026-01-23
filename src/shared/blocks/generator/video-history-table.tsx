"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Download, Eye, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { AITask } from "@/shared/models/ai_task";
import { AITaskStatus } from "@/extensions/ai/types";
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

interface VideoHistoryTableProps {
  tasks: AITask[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onRegenerate?: (task: AITask) => void;
  showTitle?: boolean;
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
  className = "",
}: VideoHistoryTableProps) {
  const t = useTranslations("ai.video.generator");
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedTaskForDownload, setSelectedTaskForDownload] =
    useState<AITask | null>(null);

  // 提取视频 URL
  const extractVideoUrl = useCallback(
    (taskInfo: string | null, taskResult: string | null): string | null => {
      try {
        if (taskResult) {
          const result = JSON.parse(taskResult);
          return result.video_url || null;
        }
      } catch (e) {
        // 忽略解析错误
      }
      return null;
    },
    [],
  );

  // 打开下载对话框
  const handleOpenDownloadDialog = useCallback((task: AITask) => {
    setSelectedTaskForDownload(task);
    setDownloadDialogOpen(true);
  }, []);

  // 处理重新生成
  const handleRegenerate = useCallback(
    (task: AITask) => {
      if (onRegenerate) {
        onRegenerate(task);
      } else {
        toast.info(t("regenerate_not_available"));
      }
    },
    [onRegenerate, t],
  );

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
                      <TableHead>{t("history.prompt")}</TableHead>
                      <TableHead className="max-w-xs">
                        {t("history.final_prompt")}
                      </TableHead>
                      <TableHead>{t("history.created")}</TableHead>
                      <TableHead className="max-w-[120px]">
                        {t("history.task_id")}
                      </TableHead>
                      <TableHead className="text-right w-[220px] sm:w-[260px] sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 z-10">
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
                      let finalPrompt = "";
                      try {
                        if (task.options) {
                          const options = JSON.parse(task.options);
                          finalPrompt = options.final_prompt || "";
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
                            <div className="max-w-[200px] truncate">
                              {task.prompt || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs line-clamp-2 text-xs sm:text-sm">
                              {finalPrompt || "-"}
                            </div>
                          </TableCell>
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
                            <Copy value={task.id} className="max-w-[120px]">
                              <span className="truncate text-xs sm:text-sm">
                                {task.id.substring(0, 8)}...
                              </span>
                            </Copy>
                          </TableCell>
                          <TableCell className="text-right w-auto sm:w-[260px] sticky right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 z-10">
                            <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                              {videoUrl && (
                                <>{/* Preview 和 Share 按钮已移除 */}</>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDownloadDialog(task)}
                                title="View"
                                className="w-auto justify-center"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="ml-2 hidden sm:inline">
                                  View
                                </span>
                              </Button>
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
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {t("history.showing", {
                      start: (page - 1) * limit + 1,
                      end: Math.min(page * limit, total),
                      total: total,
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={page <= 1 || loading}
                      className="h-8 px-2 sm:px-3"
                    >
                      {t("history.previous")}
                    </Button>
                    <div className="text-xs sm:text-sm">
                      {page} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={page >= totalPages || loading}
                      className="h-8 px-2 sm:px-3"
                    >
                      {t("history.next")}
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
        />
      )}
    </>
  );
}
