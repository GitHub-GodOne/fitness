"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

import { VideoHistoryTable } from "@/shared/blocks/generator/video-history-table";

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

/**
 * Settings 中的历史记录页面
 *
 * 功能：
 * - 展示用户的视频生成历史
 * - 支持分页
 * - 支持查看和下载
 */
export default function HistoryPage() {
  const t = useTranslations("ai.video.generator");
  const [historyTasks, setHistoryTasks] = useState<HistoryTask[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const historyLimit = 10;

  // 获取历史记录
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(
        `/api/ai/list?page=${historyPage}&limit=${historyLimit}`,
      );
      if (response.ok) {
        const data = await response.json();
        // Transform AITask[] to HistoryTask[] (convert Date to string)
        const transformedTasks: HistoryTask[] = (data.data.data || []).map(
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
        setHistoryTotal(data.data.total || 0);
        console.log(data);
        console.log(data.data.data);
        console.log(data.data.total);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyLimit]);

  // 初始加载和页码变化时获取历史
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("history.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          View and manage your video generation history
        </p>
      </div>

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
    </div>
  );
}
