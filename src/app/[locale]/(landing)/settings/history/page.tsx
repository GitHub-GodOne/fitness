"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

import { AITask } from "@/shared/models/ai_task";
import { VideoHistoryTable } from "@/shared/blocks/generator/video-history-table";

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
  const [historyTasks, setHistoryTasks] = useState<AITask[]>([]);
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
        setHistoryTasks(data.tasks || []);
        setHistoryTotal(data.total || 0);
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
        showTitle={false}
      />
    </div>
  );
}
