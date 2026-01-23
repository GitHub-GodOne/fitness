"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { VideoHistoryTable } from "@/shared/blocks/generator/video-history-table";
import { AIMediaType } from "@/extensions/ai/types";

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

interface VideoManagementProps {
  initialPage?: number;
  initialLimit?: number;
}

export function VideoManagement({
  initialPage = 1,
  initialLimit = 10,
}: VideoManagementProps) {
  const t = useTranslations("ai.video.generator");
  const [historyTasks, setHistoryTasks] = useState<HistoryTask[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(initialPage);
  const [historyTotal, setHistoryTotal] = useState(0);
  const historyLimit = initialLimit;

  // 获取历史记录
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: String(historyLimit),
        mediaType: AIMediaType.VIDEO,
      });

      const resp = await fetch(`/api/admin/ai-tasks?${params.toString()}`, {
        method: "GET",
      });

      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message || "Failed to fetch history");
      }

      // Transform API response to HistoryTask[] (convert Date to string)
      const transformedTasks: HistoryTask[] = (data.tasks || []).map(
        (task: any) => ({
          id: task.id,
          taskId: task.taskId,
          status: task.status,
          provider: task.provider,
          model: task.model,
          prompt: task.prompt,
          taskInfo: task.taskInfo,
          taskResult: task.taskResult,
          options: task.options,
          createdAt:
            task.createdAt instanceof Date
              ? task.createdAt.toISOString()
              : task.createdAt,
        }),
      );

      setHistoryTasks(transformedTasks);
      setHistoryTotal(data.total || 0);
    } catch (error: any) {
      console.error("Failed to fetch history:", error);
      toast.error(`Failed to fetch history: ${error.message}`);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyLimit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <VideoHistoryTable
      tasks={historyTasks}
      loading={historyLoading}
      total={historyTotal}
      page={historyPage}
      limit={historyLimit}
      onPageChange={setHistoryPage}
      onRefresh={fetchHistory}
      showTitle={true}
    />
  );
}
