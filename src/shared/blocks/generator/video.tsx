"use client";
import { AITask } from "@/shared/models/ai_task";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CreditCard,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
  Video,
  ChevronLeft,
  ChevronRight,
  Image,
  Settings,
  Merge,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Link } from "@/core/i18n/navigation";
import { AIMediaType, AITaskStatus } from "@/extensions/ai/types";
import { ImageUploader, ImageUploaderValue } from "@/shared/blocks/common";
import { ShareButton } from "@/shared/blocks/common/share-button";
import { Copy } from "@/shared/blocks/table/copy";
import { DownloadDialog } from "@/shared/blocks/generator/download-dialog";
import { VideoHistoryTable } from "@/shared/blocks/generator/video-history-table";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Progress } from "@/shared/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Switch } from "@/shared/components/ui/switch";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { useAppContext } from "@/shared/contexts/app";
import { SignModal } from "@/shared/blocks/sign/sign-modal";
import { usePathname } from "@/core/i18n/navigation";

interface VideoGeneratorProps {
  maxSizeMB?: number;
  srOnlyTitle?: string;
}

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

interface GeneratedVideo {
  id: string;
  url: string;
  provider?: string;
  model?: string;
  prompt?: string;
}

interface VideoSettings {
  resolution: "480p" | "720p" | "1080p";
  ratio: "16:9" | "9:16" | "1:1";
  duration: number;
}

interface BackendTask {
  id: string;
  status: string;
  provider: string;
  model: string;
  prompt: string | null;
  taskInfo: string | null;
  taskResult: string | null;
  options?: string | null;
  createdAt?: string;
}

interface HistoryResponse {
  list: HistoryTask[];
  total: number;
  page: number;
  limit: number;
  hasMore?: boolean;
}

type VideoGeneratorTab = "text-to-video" | "image-to-video" | "video-to-video";

const POLL_INTERVAL = 3000; // 3 seconds - faster polling for better UX
const GENERATION_TIMEOUT = 600000; // 10 minutes for video
const MAX_PROMPT_LENGTH = 2000;

const textToVideoCredits = 1;
const imageToVideoCredits = 1;
const videoToVideoCredits = 1;

const MODEL_OPTIONS = [
  // Replicate models
  {
    value: "google/veo-3.1",
    label: "Veo 3.1",
    provider: "replicate",
    scenes: ["text-to-video", "image-to-video"],
  },
  {
    value: "openai/sora-2",
    label: "Sora 2",
    provider: "replicate",
    scenes: ["text-to-video", "image-to-video"],
  },
  // Fal models
  {
    value: "fal-ai/veo3",
    label: "Veo 3",
    provider: "fal",
    scenes: ["text-to-video"],
  },
  {
    value: "fal-ai/wan-pro/image-to-video",
    label: "Wan Pro",
    provider: "fal",
    scenes: ["image-to-video"],
  },
  {
    value: "fal-ai/kling-video/o1/video-to-video/edit",
    label: "Kling Video O1",
    provider: "fal",
    scenes: ["video-to-video"],
  },
  // Kie models
  {
    value: "sora-2-pro-image-to-video",
    label: "Sora 2 Pro",
    provider: "kie",
    scenes: ["image-to-video"],
  },
  {
    value: "sora-2-pro-text-to-video",
    label: "Sora 2 Pro",
    provider: "kie",
    scenes: ["text-to-video"],
  },
  // Volcano models
  {
    value: "doubao-seedance-1-5-pro-251215",
    label: "Doubao Seedance 1.5 Pro",
    provider: "sp",
    scenes: ["image-to-video"],
  },
];

const PROVIDER_OPTIONS = [
  {
    value: "replicate",
    label: "Replicate",
  },
  {
    value: "fal",
    label: "Fal",
  },
  {
    value: "kie",
    label: "Kie",
  },
  {
    value: "sp",
    label: "Volcano Engine",
  },
];

function parseTaskResult(taskResult: string | null): any {
  if (!taskResult) {
    return null;
  }

  try {
    return JSON.parse(taskResult);
  } catch (error) {
    console.warn("Failed to parse taskResult:", error);
    return null;
  }
}

function extractVideoUrls(result: any): string[] {
  if (!result) {
    return [];
  }

  // check videos array first
  const videos = result.videos;
  if (videos && Array.isArray(videos)) {
    return videos
      .map((item: any) => {
        if (!item) return null;
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          return (
            item.url ?? item.uri ?? item.video ?? item.src ?? item.videoUrl
          );
        }
        return null;
      })
      .filter(Boolean);
  }

  // check content.video_url (Volcano Engine format)
  if (
    result.content &&
    result.content.video_url &&
    typeof result.content.video_url === "string"
  ) {
    return [result.content.video_url];
  }

  // check output
  const output = result.output ?? result.video ?? result.data;

  if (!output) {
    return [];
  }

  if (typeof output === "string") {
    return [output];
  }

  if (Array.isArray(output)) {
    return output
      .flatMap((item) => {
        if (!item) return [];
        if (typeof item === "string") return [item];
        if (typeof item === "object") {
          const candidate =
            item.url ?? item.uri ?? item.video ?? item.src ?? item.videoUrl;
          return typeof candidate === "string" ? [candidate] : [];
        }
        return [];
      })
      .filter(Boolean);
  }

  if (typeof output === "object") {
    const candidate =
      output.url ?? output.uri ?? output.video ?? output.src ?? output.videoUrl;
    if (typeof candidate === "string") {
      return [candidate];
    }
  }

  return [];
}

export function VideoGenerator({
  maxSizeMB = 20,
  srOnlyTitle,
}: VideoGeneratorProps) {
  const t = useTranslations("ai.video.generator");

  const [activeTab, setActiveTab] =
    useState<VideoGeneratorTab>("image-to-video");

  const [costCredits, setCostCredits] = useState<number>(textToVideoCredits);
  // Default to Volcano Engine
  const [provider, setProvider] = useState("sp");
  // Default to Volcano Engine's model for image-to-video
  const [model, setModel] = useState("doubao-seedance-1-5-pro-251215");
  const [referenceImageItems, setReferenceImageItems] = useState<
    ImageUploaderValue[]
  >([]);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string>("");
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepMessage, setStepMessage] = useState<string>("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(
    null,
  );
  const [taskStatus, setTaskStatus] = useState<AITaskStatus | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(
    null,
  );
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(
    null,
  );
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedTaskForDownload, setSelectedTaskForDownload] =
    useState<HistoryTask | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [historyTasks, setHistoryTasks] = useState<HistoryTask[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const progressCardRef = useRef<HTMLDivElement>(null);
  const historyLimit = 10;
  // 选中的视频（按顺序）：Map<taskId, videoUrl>
  const [selectedVideos, setSelectedVideos] = useState<Map<string, string>>(
    new Map(),
  );
  const [isMerging, setIsMerging] = useState(false);

  // Video settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [resolution, setResolution] = useState<"480p" | "720p" | "1080p">(
    "480p",
  );
  const [ratio, setRatio] = useState<
    "16:9" | "9:16" | "4:3" | "1:1" | "3:4" | "21:9" | "adaptive"
  >("adaptive");
  const [duration, setDuration] = useState<number>(12); // Default duration: 12 seconds
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);

  // Target muscle group (required for fitness video generation)
  const [userFeeling, setUserFeeling] = useState("");

  // Aspect ratio for video (9:16 portrait or 16:9 landscape)
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");

  // Voice gender selection (male or female) - load from cookies
  const [voiceGender, setVoiceGender] = useState<"male" | "female">("female");

  // Load voice gender from cookies on client side only (avoid hydration mismatch)
  useEffect(() => {
    if (typeof document !== "undefined") {
      const savedGender = document.cookie
        .split("; ")
        .find((row) => row.startsWith("voice_gender="))
        ?.split("=")[1] as "male" | "female" | undefined;
      if (savedGender && savedGender !== voiceGender) {
        setVoiceGender(savedGender);
      }
    }
  }, []);

  const { user, isCheckSign, setIsShowSignModal, fetchUserCredits } =
    useAppContext();

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!user) return;

    setHistoryLoading(true);
    try {
      // Use GET request with URLSearchParams (same as AI Tasks page)
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: String(historyLimit),
        mediaType: AIMediaType.VIDEO,
      });

      const resp = await fetch(`/api/ai/list?${params.toString()}`, {
        method: "GET",
      });

      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message || "Failed to fetch history");
      }

      // GET endpoint returns { data: tasks, total, page, limit, hasMore }
      // Transform AITask[] to HistoryTask[] (convert Date to string)
      const transformedTasks: HistoryTask[] = (data.data || []).map(
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

      const historyData: HistoryResponse = {
        list: transformedTasks,
        total: data.total || 0,
        page: data.page || historyPage,
        limit: data.limit || historyLimit,
        hasMore: data.hasMore || false,
      };
      setHistoryTasks(historyData.list || []);
      setHistoryTotal(historyData.total || 0);
    } catch (error: any) {
      console.error("Failed to fetch history:", error);
      toast.error(`Failed to fetch history: ${error.message}`);
    } finally {
      setHistoryLoading(false);
    }
  }, [user, historyPage, historyLimit]);

  useEffect(() => {
    if (user && !isCheckSign) {
      fetchHistory();
    }
  }, [user, isCheckSign, fetchHistory]);

  // Ensure default model matches provider and active tab
  useEffect(() => {
    const availableModels = MODEL_OPTIONS.filter(
      (option) =>
        option.scenes.includes(activeTab) && option.provider === provider,
    );

    if (availableModels.length > 0) {
      const currentModelExists = availableModels.some((m) => m.value === model);
      if (!currentModelExists) {
        setModel(availableModels[0].value);
      }
    }
  }, [provider, activeTab, model]);

  const toAbsoluteUrl = (url: string | null): string | null => {
    if (!url) return null;

    // Already absolute URL
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    // Convert relative URL to absolute with public domain
    if (url.startsWith("/")) {
      const baseUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXTAUTH_URL ||
            process.env.NEXT_PUBLIC_SITE_URL ||
            "https://fearnotforiamwithyou.com";
      return `${baseUrl}${url}`;
    }

    return url;
  };

  const extractVideoUrl = (
    taskInfo: string | null,
    taskResult: string | null,
  ): string | null => {
    // First try to get saved video URL from taskResult (highest priority)
    if (taskResult) {
      try {
        const parsedResult = JSON.parse(taskResult);
        // Priority order: saved_video_url (CDN) > original_video_url (API) > saved_video_urls[0] > original_video_urls[0] > content.video_url
        // Check for saved_video_url (CDN URL - preferred, permanent)
        if (
          parsedResult.saved_video_url &&
          typeof parsedResult.saved_video_url === "string"
        ) {
          return toAbsoluteUrl(parsedResult.saved_video_url);
        }
        // Check for original_video_url (original API URL - fallback for History)
        if (
          parsedResult.original_video_url &&
          typeof parsedResult.original_video_url === "string"
        ) {
          return toAbsoluteUrl(parsedResult.original_video_url);
        }
        // Check for saved_video_urls array
        if (
          parsedResult.saved_video_urls &&
          Array.isArray(parsedResult.saved_video_urls) &&
          parsedResult.saved_video_urls.length > 0
        ) {
          return toAbsoluteUrl(parsedResult.saved_video_urls[0]);
        }
        // Check for original_video_urls array
        if (
          parsedResult.original_video_urls &&
          Array.isArray(parsedResult.original_video_urls) &&
          parsedResult.original_video_urls.length > 0
        ) {
          return toAbsoluteUrl(parsedResult.original_video_urls[0]);
        }
        // Check for content.video_url (Volcano Engine format)
        if (
          parsedResult.content &&
          parsedResult.content.video_url &&
          typeof parsedResult.content.video_url === "string"
        ) {
          return toAbsoluteUrl(parsedResult.content.video_url);
        }
      } catch {
        // Ignore parse errors
      }
    }
    // Fallback to taskInfo
    if (taskInfo) {
      try {
        const parsed = JSON.parse(taskInfo);
        const videoUrls = extractVideoUrls(parsed);
        return videoUrls.length > 0 ? toAbsoluteUrl(videoUrls[0]) : null;
      } catch {
        return null;
      }
    }
    return null;
  };

  const extractLastFrameImage = (taskResult: string | null): string | null => {
    if (!taskResult) return null;
    try {
      const parsed = JSON.parse(taskResult);

      // Prefer saved (CDN) URL
      if (
        parsed.saved_last_frame_url &&
        typeof parsed.saved_last_frame_url === "string"
      ) {
        return parsed.saved_last_frame_url;
      }

      // Volcano Engine format
      if (
        parsed.content &&
        parsed.content.last_frame_url &&
        typeof parsed.content.last_frame_url === "string"
      ) {
        return parsed.content.last_frame_url;
      }

      // Original/fallback last frame urls
      if (
        parsed.original_last_frame_url &&
        typeof parsed.original_last_frame_url === "string"
      ) {
        return parsed.original_last_frame_url;
      }
      if (
        parsed.lastFrame ||
        parsed.last_frame ||
        parsed.frame ||
        parsed.last_frame_url
      ) {
        return (
          parsed.lastFrame ||
          parsed.last_frame ||
          parsed.frame ||
          parsed.last_frame_url
        );
      }

      // Images array fallback
      if (
        parsed.images &&
        Array.isArray(parsed.images) &&
        parsed.images.length > 0
      ) {
        return parsed.images[parsed.images.length - 1];
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleUseLastFrame = useCallback((task: AITask) => {
    const lastFrameImage = extractLastFrameImage(task.taskResult);
    console.log("[VideoGenerator] handleUseLastFrame:", {
      taskId: task.id,
      taskResult: task.taskResult,
      lastFrameImage,
    });
    if (lastFrameImage) {
      // Set both state values to ensure ImageUploader receives the update
      setReferenceImageUrls([lastFrameImage]);
      setReferenceImageItems([
        {
          id: `last-frame-${task.id}-${Date.now()}`,
          preview: lastFrameImage,
          url: lastFrameImage,
          status: "uploaded",
        },
      ]);
      toast.success("Last frame image loaded");
    } else {
      console.warn(
        "[VideoGenerator] No last frame image found in taskResult:",
        task.taskResult,
      );
      toast.error("No last frame image found");
    }
  }, []);

  const handleRegenerate = useCallback((task: AITask) => {
    // Extract user_feeling from options and set to feeling input
    if (task.options) {
      try {
        const options = JSON.parse(task.options);
        if (options.user_feeling) {
          setUserFeeling(options.user_feeling);
        }
      } catch {
        // Ignore parse errors
      }
    }

    // If no user_feeling in options, try to use prompt as fallback
    if (!task.options || !JSON.parse(task.options || "{}").user_feeling) {
      if (task.prompt) {
        setUserFeeling(task.prompt);
      }
    }

    // Extract and set image from task result
    const lastFrameImage = extractLastFrameImage(task.taskResult);
    if (lastFrameImage) {
      setReferenceImageItems([
        {
          id: `regenerate-${task.id}`,
          preview: lastFrameImage,
          url: lastFrameImage,
          status: "uploaded",
        },
      ]);
      setReferenceImageUrls([lastFrameImage]);
    }

    // Extract options if available
    if (task.options) {
      try {
        const options = JSON.parse(task.options);
        if (options.image_input && Array.isArray(options.image_input)) {
          setReferenceImageUrls(options.image_input);
          setReferenceImageItems(
            options.image_input.map((url: string, idx: number) => ({
              id: `regenerate-${task.id}-${idx}`,
              preview: url,
              url,
              status: "uploaded" as const,
            })),
          );
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // 处理视频选择/取消选择（按顺序记录）
  const handleVideoSelect = useCallback(
    (taskId: string, videoUrl: string | null, checked: boolean) => {
      setSelectedVideos((prev) => {
        const newMap = new Map(prev);
        if (checked && videoUrl) {
          // 添加：按顺序添加到末尾
          newMap.set(taskId, videoUrl);
        } else {
          // 移除
          newMap.delete(taskId);
        }
        return newMap;
      });
    },
    [],
  );

  // 合并选中的视频
  const handleMergeVideos = useCallback(async () => {
    if (selectedVideos.size < 2) {
      toast.error("Please select at least 2 videos to merge");
      return;
    }

    setIsMerging(true);
    try {
      // 按照选择的顺序获取视频URL（Map保持插入顺序）
      const videoUrls = Array.from(selectedVideos.values());

      const response = await fetch("/api/video/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls: videoUrls,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Merge request failed with status: ${response.status}`,
        );
      }

      const result = await response.json();
      if (result.code !== 0) {
        // Handle specific error messages with translations
        const errorMessage = result.message || "Failed to merge videos";
        if (errorMessage === "insufficient_credits_for_merge") {
          throw new Error(t("merge.insufficient_credits"));
        }
        // Try to translate other error messages if they match translation keys
        const translatedMessage = t(errorMessage as any, {
          defaultValue: errorMessage,
        });
        throw new Error(translatedMessage);
      }

      // 合并成功后，清空选择并将合并后的视频添加到生成的视频列表
      if (result.data?.url) {
        const mergedCount = selectedVideos.size;
        setGeneratedVideos((prev) => [
          {
            id: `merged-${Date.now()}`,
            url: result.data.url,
            provider: "merged",
            prompt: `Merged ${mergedCount} videos`,
          },
          ...prev,
        ]);
        setSelectedVideos(new Map());
        toast.success(`Successfully merged ${mergedCount} videos`);

        // 滚动到生成的视频区域
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        throw new Error("No merged video URL in response");
      }
    } catch (error: any) {
      console.error("Failed to merge videos:", error);
      toast.error(`Failed to merge videos: ${error.message}`);
    } finally {
      setIsMerging(false);
    }
  }, [selectedVideos]);

  // 清空选择
  const handleClearSelection = useCallback(() => {
    setSelectedVideos(new Map());
  }, []);

  const remainingCredits = user?.credits?.remainingCredits ?? 0;
  const isTextToVideoMode = activeTab === "text-to-video";
  const isImageToVideoMode = activeTab === "image-to-video";
  const isVideoToVideoMode = activeTab === "video-to-video";

  const handleTabChange = (value: string) => {
    const tab = value as VideoGeneratorTab;
    setActiveTab(tab);

    const availableModels = MODEL_OPTIONS.filter(
      (option) => option.scenes.includes(tab) && option.provider === provider,
    );

    if (availableModels.length > 0) {
      setModel(availableModels[0].value);
    } else {
      setModel("");
    }

    if (tab === "text-to-video") {
      setCostCredits(textToVideoCredits);
    } else if (tab === "image-to-video") {
      setCostCredits(imageToVideoCredits);
    } else if (tab === "video-to-video") {
      setCostCredits(videoToVideoCredits);
    }
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);

    const availableModels = MODEL_OPTIONS.filter(
      (option) =>
        option.scenes.includes(activeTab) && option.provider === value,
    );

    if (availableModels.length > 0) {
      setModel(availableModels[0].value);
    } else {
      setModel("");
    }
  };

  const taskStatusLabel = useMemo(() => {
    if (!taskStatus) {
      return "";
    }

    switch (taskStatus) {
      case AITaskStatus.PENDING:
        return "Waiting for the model to start";
      case AITaskStatus.PROCESSING:
        return "Generating your video...";
      case AITaskStatus.SUCCESS:
        return "Video generation completed";
      case AITaskStatus.FAILED:
        return "Generation failed";
      default:
        return "";
    }
  }, [taskStatus]);

  const handleReferenceImagesChange = useCallback(
    (items: ImageUploaderValue[]) => {
      setReferenceImageItems(items);
      const uploadedUrls = items
        .filter((item) => item.status === "uploaded" && item.url)
        .map((item) => item.url as string);
      setReferenceImageUrls(uploadedUrls);
    },
    [],
  );

  const isReferenceUploading = useMemo(
    () => referenceImageItems.some((item) => item.status === "uploading"),
    [referenceImageItems],
  );

  const hasReferenceUploadError = useMemo(
    () => referenceImageItems.some((item) => item.status === "error"),
    [referenceImageItems],
  );

  const resetTaskState = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setTaskId(null);
    setGenerationStartTime(null);
    setTaskStatus(null);
    setIsQuerying(false);
  }, []);

  const pollTaskStatus = useCallback(
    async (id: string) => {
      // If a query is already in progress, skip this request
      if (isQuerying) {
        return false;
      }

      try {
        // Set querying flag to prevent concurrent requests
        setIsQuerying(true);

        if (
          generationStartTime &&
          Date.now() - generationStartTime > GENERATION_TIMEOUT
        ) {
          resetTaskState();
          toast.error("Video generation timed out. Please try again.");
          setIsQuerying(false);
          return true;
        }

        const resp = await fetch("/api/ai/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ taskId: id }),
        });

        if (!resp.ok) {
          throw new Error(`request failed with status: ${resp.status}`);
        }

        const { code, message, data } = await resp.json();
        if (code !== 0) {
          throw new Error(message || "Query task failed");
        }

        const task = data as BackendTask;
        const currentStatus = task.status as AITaskStatus;
        setTaskStatus(currentStatus);

        const parsedResult = parseTaskResult(task.taskInfo);

        // Update progress from backend if available
        if (parsedResult?.progress) {
          if (typeof parsedResult.progress.progress === "number") {
            setProgress(parsedResult.progress.progress);
          }
          if (parsedResult.progress.stepMessage) {
            setStepMessage(parsedResult.progress.stepMessage);
          }
        }

        const videoUrls = extractVideoUrls(parsedResult);

        if (currentStatus === AITaskStatus.PENDING) {
          if (!parsedResult?.progress) {
            setProgress((prev) => Math.max(prev, 20));
          }
          setIsQuerying(false);
          return false;
        }

        if (currentStatus === AITaskStatus.PROCESSING) {
          if (videoUrls.length > 0) {
            setGeneratedVideos(
              videoUrls.map((url, index) => ({
                id: `${task.id}-${index}`,
                url,
                provider: task.provider,
                model: task.model,
                prompt: task.prompt ?? undefined,
              })),
            );
            setProgress((prev) => Math.max(prev, 85));
          } else {
            if (!parsedResult?.progress) {
              setProgress((prev) => Math.min(prev + 5, 80));
            }
          }
          setIsQuerying(false);
          return false;
        }

        if (currentStatus === AITaskStatus.SUCCESS) {
          if (videoUrls.length === 0) {
            toast.error("The provider returned no videos. Please retry.");
          } else {
            setGeneratedVideos(
              videoUrls.map((url, index) => ({
                id: `${task.id}-${index}`,
                url,
                provider: task.provider,
                model: task.model,
                prompt: task.prompt ?? undefined,
              })),
            );
            toast.success("Video generated successfully");
          }

          setProgress(100);
          resetTaskState();
          setIsQuerying(false);
          return true;
        }

        if (currentStatus === AITaskStatus.FAILED) {
          const errorMessage =
            parsedResult?.errorMessage || "Generate video failed";
          toast.error(errorMessage);
          resetTaskState();

          fetchUserCredits();

          setIsQuerying(false);
          return true;
        }

        if (!parsedResult?.progress) {
          setProgress((prev) => Math.min(prev + 3, 95));
        }
        setIsQuerying(false);
        return false;
      } catch (error: any) {
        console.error("Error polling video task:", error);
        toast.error(`Query task failed: ${error.message}`);
        resetTaskState();
        setStepMessage("");

        fetchUserCredits();

        setIsQuerying(false);
        return true;
      }
    },
    [generationStartTime, resetTaskState, fetchUserCredits, isQuerying],
  );

  useEffect(() => {
    if (!taskId || !isGenerating) {
      return;
    }

    let cancelled = false;

    const tick = async () => {
      if (!taskId || isQuerying) {
        return;
      }
      const completed = await pollTaskStatus(taskId);
      if (completed) {
        cancelled = true;
      }
    };

    tick();

    const interval = setInterval(async () => {
      if (cancelled || !taskId) {
        clearInterval(interval);
        return;
      }
      // Skip if a query is already in progress
      if (isQuerying) {
        return;
      }
      const completed = await pollTaskStatus(taskId);
      if (completed) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [taskId, isGenerating, pollTaskStatus, isQuerying]);

  const handleVoiceGenderChange = (gender: "male" | "female") => {
    setVoiceGender(gender);
    // Save to cookies (expires in 1 year)
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `voice_gender=${gender}; expires=${expires.toUTCString()}; path=/`;
    // Show success toast
    toast.success(t(`form.voice_gender_${gender}_selected`));
  };

  const handleReset = () => {
    setUserFeeling("");
    // Don't reset voice gender - keep user's preference
    setReferenceImageItems([]);
    setReferenceImageUrls([]);
    setReferenceVideoUrl("");
    toast.success(t("reset_success"));
  };

  const handleGenerate = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (remainingCredits < costCredits) {
      toast.error("Insufficient credits. Please top up to keep creating.");
      return;
    }

    const trimmedFeeling = userFeeling.trim();
    if (!trimmedFeeling) {
      toast.error(t("form.user_feeling_required"));
      return;
    }

    if (!provider || !model) {
      toast.error("Provider or model is not configured correctly.");
      return;
    }

    if (
      isImageToVideoMode &&
      referenceImageUrls.length === 0 &&
      !referenceImageItems.some((item) => item.file)
    ) {
      toast.error("Please upload a reference image before generating.");
      return;
    }

    if (isVideoToVideoMode && !referenceVideoUrl) {
      toast.error("Please provide a reference video URL before generating.");
      return;
    }

    setIsGenerating(true);
    setProgress(15);
    setTaskStatus(AITaskStatus.PENDING);
    setGeneratedVideos([]);
    setGenerationStartTime(Date.now());

    // 显示排队提示
    toast.info(t("queue_notice"), { duration: 5000 });

    // Scroll to progress card on mobile after a short delay
    setTimeout(() => {
      if (progressCardRef.current) {
        progressCardRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 300);

    try {
      const options: any = {
        resolution,
        ratio,
        duration,
        generate_audio: generateAudio,
        target_muscle_group: trimmedFeeling, // Pass target muscle group to backend
        aspect_ratio: aspectRatio, // Pass aspect ratio to backend
        voice_gender: voiceGender, // Pass voice gender selection to backend
      };

      if (isImageToVideoMode) {
        // Validation moved to form submission, file will be sent via FormData
        if (
          referenceImageUrls.length === 0 &&
          !referenceImageItems.some((item) => item.file)
        ) {
          throw new Error("Please add at least one reference image.");
        }
      }

      if (isVideoToVideoMode) {
        options.video_input = [referenceVideoUrl];
      }

      // Build FormData for merged request
      const body: any = {
        provider,
        mediaType: AIMediaType.VIDEO,
        model,
        prompt: "", // Prompt will be auto-generated from user feeling by Volcano provider
        options: {
          ...options,
          user_feeling: trimmedFeeling, // Add user_feeling to options
          voice_gender: voiceGender, // Add voice_gender to options
        },
        scene: activeTab,
      };

      const formData = new FormData();
      formData.append("body", JSON.stringify(body));

      // Append file if exists in reference images
      if (isImageToVideoMode && referenceImageItems.length > 0) {
        const item = referenceImageItems[0];
        if (item.file) {
          formData.append("file", item.file);
        } else if (item.url) {
          // If URL exists (e.g. preset or re-selection), pass it in options
          body.options.image_input = [item.url];
          // Update body json in formData
          formData.set("body", JSON.stringify(body));
        }
      }

      console.log("Sending generate request:", body);

      const resp = await fetch("/api/ai/generate", {
        method: "POST",
        // Do not set Content-Type header when sending FormData, browser sets it with boundary
        body: formData,
      });

      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message || "Failed to create a video task");
      }

      const newTaskId = data?.id;
      if (!newTaskId) {
        throw new Error("Task id missing in response");
      }

      if (data.status === AITaskStatus.SUCCESS && data.taskInfo) {
        const parsedResult = parseTaskResult(data.taskInfo);
        const videoUrls = extractVideoUrls(parsedResult);

        if (videoUrls.length > 0) {
          setGeneratedVideos(
            videoUrls.map((url, index) => ({
              id: `${newTaskId}-${index}`,
              url,
              provider,
              model,
              prompt: trimmedFeeling,
            })),
          );
          toast.success("Video generated successfully");
          setProgress(100);
          setTaskStatus(AITaskStatus.SUCCESS);
          setIsGenerating(false); // 恢复按钮可点击状态
          await fetchUserCredits();
          await fetchHistory();
          return;
        }
      }

      setTaskId(newTaskId);
      setProgress(25);

      await fetchUserCredits();
    } catch (error: any) {
      console.error("Failed to generate video:", error);
      toast.error(`Failed to generate video: ${error.message}`);
      resetTaskState();
    }
  };

  const handleDownloadVideo = async (video: GeneratedVideo) => {
    if (!video.url) {
      return;
    }

    try {
      setDownloadingVideoId(video.id);
      // fetch video directly with cache busting
      const urlObj = new URL(video.url, window.location.origin);
      urlObj.searchParams.append("t", Date.now().toString());
      const resp = await fetch(urlObj.toString());
      if (!resp.ok) {
        throw new Error("Failed to fetch video");
      }

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      toast.success("Video downloaded");
    } catch (error) {
      console.error("Failed to download video:", error);
      toast.error("Failed to download video");
    } finally {
      setDownloadingVideoId(null);
    }
  };

  const handleDownloadTaskVideo = async (task: AITask) => {
    try {
      const taskResult = task.taskResult ? JSON.parse(task.taskResult) : {};
      const videoUrl = taskResult.video_url;

      if (!videoUrl) {
        toast.error("No video URL found");
        return;
      }

      setDownloadingVideoId(task.id);
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
      link.download = `video-${task.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      toast.success(t("video_downloaded"));
    } catch (error) {
      console.error("Failed to download video:", error);
      toast.error(t("download_failed"));
    } finally {
      setDownloadingVideoId(null);
    }
  };

  const handleDownloadTaskImages = async (
    task: AITask,
    withWatermark: boolean = true,
  ) => {
    try {
      const taskResult = task.taskResult ? JSON.parse(task.taskResult) : {};
      const imageUrls = withWatermark
        ? taskResult.image_urls
        : taskResult.original_image_urls;

      if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        toast.error(
          withWatermark ? t("no_watermarked_images") : t("no_original_images"),
        );
        return;
      }

      setDownloadingImageId(task.id);

      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        const urlObj = new URL(imageUrl, window.location.origin);
        urlObj.searchParams.append("t", Date.now().toString());
        const resp = await fetch(urlObj.toString());
        if (!resp.ok) {
          throw new Error(`Failed to fetch image ${i + 1}`);
        }

        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `image-${task.id}-${i + 1}${withWatermark ? "-watermark" : ""}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 200);

        // Add delay between downloads to avoid browser blocking
        if (i < imageUrls.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      toast.success(t("images_downloaded"));
    } catch (error) {
      console.error("Failed to download images:", error);
      toast.error(t("download_failed"));
    } finally {
      setDownloadingImageId(null);
    }
  };

  const handleOpenDownloadDialog = (task: HistoryTask) => {
    setSelectedTaskForDownload(task);
    setDownloadDialogOpen(true);
  };

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                {srOnlyTitle && <h2 className="sr-only">{srOnlyTitle}</h2>}
                <CardTitle className="flex items-center justify-between text-xl font-semibold">
                  <span className="flex items-center gap-2">{t("title")}</span>
                  {/* Settings button hidden for now */}
                  {/* <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSettingsOpen(true)}
                    className="h-8 w-8 p-0"
                    title={t('settings.title')}
                  >
                    <Settings className="h-4 w-4" />
                  </Button> */}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-6 sm:space-y-6 sm:px-6 sm:pb-8">
                <div className="hidden">
                  <div className="space-y-2">
                    <Label>{t("form.provider")}</Label>
                    <Select
                      value={provider}
                      onValueChange={handleProviderChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("form.select_provider")} />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("form.model")}</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("form.select_model")} />
                      </SelectTrigger>
                      <SelectContent>
                        {MODEL_OPTIONS.filter(
                          (option) =>
                            option.scenes.includes(activeTab) &&
                            option.provider === provider,
                        ).map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isImageToVideoMode && (
                  <div className="space-y-4">
                    {/* 
                      Note: Currently limited to 1 image, but code supports multiple images for future use.
                      To enable multiple images, change maxImages to desired number (e.g., 3).
                      Backend already supports multiple images via options.image_input array.
                    */}
                    <ImageUploader
                      title={t("form.reference_image")}
                      allowMultiple={true}
                      maxImages={1}
                      maxSizeMB={maxSizeMB}
                      onChange={handleReferenceImagesChange}
                      uploadOnSelect={false}
                    />

                    {hasReferenceUploadError && (
                      <p className="text-destructive text-xs">
                        {t("form.some_images_failed_to_upload")}
                      </p>
                    )}
                  </div>
                )}

                {isVideoToVideoMode && (
                  <div className="space-y-2">
                    <Label htmlFor="video-url">
                      {t("form.reference_video")}
                    </Label>
                    <Textarea
                      id="video-url"
                      value={referenceVideoUrl}
                      onChange={(e) => setReferenceVideoUrl(e.target.value)}
                      placeholder={t("form.reference_video_placeholder")}
                      className="min-h-20"
                    />
                  </div>
                )}

                {/* Target Muscle Group Selection (Required) */}
                <div className="space-y-2">
                  <Label
                    htmlFor="target-muscle"
                    className="flex items-center gap-2"
                  >
                    <span>{t("form.user_feeling")}</span>
                    <span className="text-red-500 font-semibold">*</span>
                  </Label>
                  <Select value={userFeeling} onValueChange={setUserFeeling}>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={t("form.user_feeling_placeholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chest">
                        {t("form.target_muscle_groups.chest")}
                      </SelectItem>
                      <SelectItem value="arms">
                        {t("form.target_muscle_groups.arms")}
                      </SelectItem>
                      <SelectItem value="legs">
                        {t("form.target_muscle_groups.legs")}
                      </SelectItem>
                      <SelectItem value="core">
                        {t("form.target_muscle_groups.core")}
                      </SelectItem>
                      <SelectItem value="back">
                        {t("form.target_muscle_groups.back")}
                      </SelectItem>
                      <SelectItem value="shoulders">
                        {t("form.target_muscle_groups.shoulders")}
                      </SelectItem>
                      <SelectItem value="full_body">
                        {t("form.target_muscle_groups.full_body")}
                      </SelectItem>
                      <SelectItem value="cardio">
                        {t("form.target_muscle_groups.cardio")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t("form.user_feeling_hint")}
                  </p>
                </div>

                {/* Aspect Ratio Selection */}
                <div className="space-y-2">
                  <Label className="text-sm">{t("form.aspect_ratio")}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={aspectRatio === "9:16" ? "default" : "outline"}
                      onClick={() => setAspectRatio("9:16")}
                      className="h-9 text-xs px-2 sm:h-10 sm:text-sm sm:px-4"
                    >
                      <span className="truncate">
                        {t("form.aspect_ratio_portrait")}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant={aspectRatio === "16:9" ? "default" : "outline"}
                      onClick={() => setAspectRatio("16:9")}
                      className="h-9 text-xs px-2 sm:h-10 sm:text-sm sm:px-4"
                    >
                      <span className="truncate">
                        {t("form.aspect_ratio_landscape")}
                      </span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("form.aspect_ratio_hint")}
                  </p>
                </div>

                {!isMounted ? (
                  <Button
                    className="h-9 w-full px-2 text-xs sm:h-10 sm:px-4 sm:text-sm"
                    disabled
                  >
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="whitespace-nowrap">{t("loading")}</span>
                  </Button>
                ) : isCheckSign ? (
                  <Button
                    className="h-9 w-full px-2 text-xs sm:h-10 sm:px-4 sm:text-sm"
                    disabled
                  >
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="whitespace-nowrap">
                      {t("checking_account")}
                    </span>
                  </Button>
                ) : user ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={isGenerating}
                      className="h-10 w-full px-4 text-sm sm:h-10 sm:flex-1"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      <span className="whitespace-nowrap">{t("reset")}</span>
                    </Button>
                    <Button
                      className="h-10 w-full px-4 text-sm sm:h-10 sm:flex-1"
                      onClick={handleGenerate}
                      disabled={
                        isGenerating ||
                        !userFeeling.trim() ||
                        isReferenceUploading ||
                        hasReferenceUploadError ||
                        (isImageToVideoMode &&
                          referenceImageUrls.length === 0 &&
                          !referenceImageItems.some((item) => item.file)) ||
                        (isVideoToVideoMode && !referenceVideoUrl)
                      }
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span className="whitespace-nowrap">
                            {t("generating")}
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          <span className="whitespace-nowrap">
                            {t("generate")}
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="h-9 w-full px-2 text-xs sm:h-10 sm:px-4 sm:text-sm"
                    onClick={() => setIsShowSignModal(true)}
                  >
                    <User className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="whitespace-nowrap">
                      {t("sign_in_to_generate")}
                    </span>
                  </Button>
                )}

                {!isMounted ? (
                  <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-primary">
                      {t("credits_cost", { credits: costCredits })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link href="/pricing">
                        <button
                          className="text-primary hover:text-primary/80 flex h-5 w-5 items-center justify-center rounded-full border border-current transition-colors"
                          title="Buy Credits"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </Link>
                      <span>{t("credits_remaining", { credits: 0 })}</span>
                    </div>
                  </div>
                ) : user && remainingCredits > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-primary">
                        {t("credits_cost", { credits: costCredits })}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link href="/pricing">
                          <button
                            className="text-primary hover:text-primary/80 flex h-5 w-5 items-center justify-center rounded-full border border-current transition-colors"
                            title="Buy Credits"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </Link>
                        <span>
                          {t("credits_remaining", {
                            credits: remainingCredits,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="inline-flex items-center gap-2 text-sm font-medium"
                        style={{ color: "#2ECC71" }}
                      >
                        <svg
                          className="h-5 w-5 flex-shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                          <path d="m9 11 3 3L22 4" />
                        </svg>
                        <span className="font-sans">{t("refund_support")}</span>
                      </div>
                      <Link
                        href="/refund"
                        className="text-primary hover:underline text-xs font-medium"
                      >
                        {t("learn_more")}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-primary">
                        {t("credits_cost", { credits: costCredits })}
                      </span>
                      <div className="flex items-center gap-2">
                        <Link href="/pricing">
                          <button
                            className="text-primary hover:text-primary/80 flex h-5 w-5 items-center justify-center rounded-full border border-current transition-colors"
                            title="Buy Credits"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </Link>
                        <span>
                          {t("credits_remaining", {
                            credits: remainingCredits,
                          })}
                        </span>
                      </div>
                    </div>
                    <Link href="/pricing">
                      <Button
                        variant="outline"
                        className="h-9 w-full px-2 text-xs sm:h-10 sm:px-4 sm:text-sm"
                      >
                        <CreditCard className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        <span className="whitespace-nowrap">
                          {t("buy_credits")}
                        </span>
                      </Button>
                    </Link>

                    <div className="flex items-center gap-2 py-2">
                      <div
                        className="inline-flex items-center gap-2 text-sm font-medium"
                        style={{ color: "#2ECC71" }}
                      >
                        <svg
                          className="h-5 w-5 flex-shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                          <path d="m9 11 3 3L22 4" />
                        </svg>
                        <span className="font-sans">{t("refund_support")}</span>
                      </div>
                      <Link
                        href="/refund"
                        className="text-primary hover:underline text-xs font-medium"
                      >
                        {t("learn_more")}
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card ref={progressCardRef}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <Video className="h-5 w-5" />
                  {t("generated_videos")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-8">
                {isGenerating && (
                  <div className="mb-6 space-y-3 rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 sm:p-6">
                    <div className="flex items-center justify-between text-sm font-medium sm:text-base">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                        <span>{t("progress")}</span>
                      </span>
                      <span className="font-bold text-primary">
                        {progress}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2.5 sm:h-3" />
                    {(stepMessage || taskStatusLabel) && (
                      <p className="text-center text-xs font-medium text-muted-foreground sm:text-sm">
                        {stepMessage || taskStatusLabel}
                      </p>
                    )}
                    <div className="flex justify-center">
                      <div className="relative flex items-center justify-center h-32 w-32 sm:h-36 sm:w-36">
                        {/* Outer rotating ring with gradient */}
                        <div
                          className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-transparent border-t-primary/80 border-r-primary/60 animate-spin"
                          style={{ animationDuration: "1.5s" }}
                        />

                        {/* Middle pulsing ring */}
                        <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-primary/30 animate-pulse" />

                        {/* Inner rotating ring (opposite direction) */}
                        <div
                          className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-transparent border-b-primary/70 border-l-primary/50 animate-spin"
                          style={{
                            animationDuration: "2s",
                            animationDirection: "reverse",
                          }}
                        />

                        {/* Center icon with glow effect */}
                        <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/20 backdrop-blur-md shadow-lg shadow-primary/30">
                          <Video
                            className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-pulse"
                            style={{ animationDuration: "2s" }}
                          />
                        </div>

                        {/* Sparkle effects */}
                        <div
                          className="absolute w-2 h-2 bg-primary rounded-full top-0 left-1/2 -translate-x-1/2 animate-ping"
                          style={{ animationDelay: "0s" }}
                        />
                        <div
                          className="absolute w-2 h-2 bg-primary rounded-full bottom-0 left-1/2 -translate-x-1/2 animate-ping"
                          style={{ animationDelay: "0.5s" }}
                        />
                        <div
                          className="absolute w-2 h-2 bg-primary rounded-full left-0 top-1/2 -translate-y-1/2 animate-ping"
                          style={{ animationDelay: "1s" }}
                        />
                        <div
                          className="absolute w-2 h-2 bg-primary rounded-full right-0 top-1/2 -translate-y-1/2 animate-ping"
                          style={{ animationDelay: "1.5s" }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-200 sm:text-sm">
                      <span className="mt-0.5 shrink-0">💡</span>
                      <span>{t("do_not_close_page")}</span>
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsGenerating(false);
                          handleReset();
                        }}
                        className="text-xs sm:text-sm"
                      >
                        {t("continue_generating")}
                      </Button>
                    </div>
                  </div>
                )}
                {generatedVideos.length > 0 ? (
                  <div className="space-y-6">
                    {generatedVideos.map((video) => (
                      <div key={video.id} className="space-y-3">
                        <div className="relative overflow-hidden rounded-lg border">
                          <video
                            src={video.url}
                            controls
                            className="h-auto w-full"
                            preload="metadata"
                          />

                          <div className="absolute right-2 bottom-2 flex justify-end text-sm">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="ml-auto"
                              onClick={() => handleDownloadVideo(video)}
                              disabled={downloadingVideoId === video.id}
                            >
                              {downloadingVideoId === video.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                      <Video className="text-muted-foreground h-10 w-10" />
                    </div>
                    <p className="text-muted-foreground">
                      {isGenerating
                        ? t("ready_to_generate")
                        : t("no_videos_generated")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History Section */}
          {/* History Section */}
          {user && (
            <VideoHistoryTable
              tasks={historyTasks}
              loading={historyLoading}
              total={historyTotal}
              page={historyPage}
              limit={historyLimit}
              onPageChange={setHistoryPage}
              onRefresh={fetchHistory}
              showTitle={true}
              className="mt-8"
            />
          )}
        </div>
      </div>

      {/* Video Preview Dialog - 已隐藏 */}
      {/* <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (open) {
            setIsVideoLoading(true);
          } else {
            setIsVideoLoading(true);
          }
        }}
      >
        <DialogContent className="max-w-4xl w-full p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Video Preview</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {previewVideoUrl && (
              <div
                className="relative w-full rounded-lg overflow-hidden bg-black/5"
                style={{ minHeight: "400px" }}
              >
                {isVideoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-sm z-10">
                    <div className="relative flex items-center justify-center">
                      <div
                        className="absolute w-32 h-32 rounded-full border-4 border-transparent border-t-primary/80 border-r-primary/60 animate-spin"
                        style={{ animationDuration: "1.5s" }}
                      />
                      <div className="absolute w-28 h-28 rounded-full border-2 border-primary/30 animate-pulse" />
                      <div
                        className="absolute w-24 h-24 rounded-full border-4 border-transparent border-b-primary/70 border-l-primary/50 animate-spin"
                        style={{
                          animationDuration: "2s",
                          animationDirection: "reverse",
                        }}
                      />
                      <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 backdrop-blur-md shadow-lg shadow-primary/30">
                        <Video
                          className="w-10 h-10 text-primary animate-pulse"
                          style={{ animationDuration: "2s" }}
                        />
                      </div>
                      <div
                        className="absolute w-2 h-2 bg-primary rounded-full top-0 left-1/2 -translate-x-1/2 animate-ping"
                        style={{ animationDelay: "0s" }}
                      />
                      <div
                        className="absolute w-2 h-2 bg-primary rounded-full bottom-0 left-1/2 -translate-x-1/2 animate-ping"
                        style={{ animationDelay: "0.5s" }}
                      />
                      <div
                        className="absolute w-2 h-2 bg-primary rounded-full left-0 top-1/2 -translate-y-1/2 animate-ping"
                        style={{ animationDelay: "1s" }}
                      />
                      <div
                        className="absolute w-2 h-2 bg-primary rounded-full right-0 top-1/2 -translate-y-1/2 animate-ping"
                        style={{ animationDelay: "1.5s" }}
                      />
                    </div>
                  </div>
                )}
                <video
                  src={previewVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-auto rounded-lg"
                  style={{ maxHeight: "70vh" }}
                  onLoadedData={() => setIsVideoLoading(false)}
                  onError={() => setIsVideoLoading(false)}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog> */}

      {/* Video Settings Dialog/Drawer */}
      {isDesktop ? (
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-md w-full sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("settings.title")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Resolution */}
              <div className="space-y-2">
                <Label>{t("settings.resolution")}</Label>
                <Select
                  value={resolution}
                  onValueChange={(value) =>
                    setResolution(value as "480p" | "720p" | "1080p")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">
                      {t("settings.resolution_480p")}
                    </SelectItem>
                    <SelectItem value="720p" disabled={remainingCredits <= 3}>
                      {t("settings.resolution_720p")}
                    </SelectItem>
                    <SelectItem value="1080p" disabled={remainingCredits <= 3}>
                      {t("settings.resolution_1080p")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {remainingCredits <= 3 && (
                  <p className="text-xs text-muted-foreground">
                    {t("settings.free_user_limit")}
                  </p>
                )}
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>{t("settings.ratio")}</Label>
                <Select
                  value={ratio}
                  onValueChange={(value) =>
                    setRatio(
                      value as
                        | "16:9"
                        | "9:16"
                        | "4:3"
                        | "1:1"
                        | "3:4"
                        | "21:9"
                        | "adaptive",
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">
                      {t("settings.ratio_16_9")}
                    </SelectItem>
                    <SelectItem value="9:16">
                      {t("settings.ratio_9_16")}
                    </SelectItem>
                    <SelectItem value="4:3">
                      {t("settings.ratio_4_3")}
                    </SelectItem>
                    <SelectItem value="1:1">
                      {t("settings.ratio_1_1")}
                    </SelectItem>
                    <SelectItem value="3:4">
                      {t("settings.ratio_3_4")}
                    </SelectItem>
                    <SelectItem value="21:9">
                      {t("settings.ratio_21_9")}
                    </SelectItem>
                    <SelectItem value="adaptive">
                      {t("settings.ratio_adaptive")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">{t("settings.duration")}</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={12}
                  value={duration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value >= 1 && value <= 12) {
                      setDuration(value);
                    }
                  }}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.duration_max")}
                </p>
              </div>

              {/* Generate Audio */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="generate-audio">
                    {t("settings.generate_audio")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.generate_audio_hint")}
                  </p>
                </div>
                <Switch
                  id="generate-audio"
                  checked={generateAudio}
                  onCheckedChange={setGenerateAudio}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSettingsOpen(false)}
              >
                {t("settings.cancel")}
              </Button>
              <Button
                onClick={() => {
                  setIsSettingsOpen(false);
                  toast.success(t("settings.save"));
                }}
              >
                {t("settings.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t("settings.title")}</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-4 px-4 py-4 max-h-[70vh] overflow-y-auto">
              {/* Resolution */}
              <div className="space-y-2">
                <Label>{t("settings.resolution")}</Label>
                <Select
                  value={resolution}
                  onValueChange={(value) =>
                    setResolution(value as "480p" | "720p" | "1080p")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">
                      {t("settings.resolution_480p")}
                    </SelectItem>
                    <SelectItem value="720p" disabled={remainingCredits <= 3}>
                      {t("settings.resolution_720p")}
                    </SelectItem>
                    <SelectItem value="1080p" disabled={remainingCredits <= 3}>
                      {t("settings.resolution_1080p")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {remainingCredits <= 3 && (
                  <p className="text-xs text-muted-foreground">
                    {t("settings.free_user_limit")}
                  </p>
                )}
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>{t("settings.ratio")}</Label>
                <Select
                  value={ratio}
                  onValueChange={(value) =>
                    setRatio(
                      value as
                        | "16:9"
                        | "9:16"
                        | "4:3"
                        | "1:1"
                        | "3:4"
                        | "21:9"
                        | "adaptive",
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">
                      {t("settings.ratio_16_9")}
                    </SelectItem>
                    <SelectItem value="9:16">
                      {t("settings.ratio_9_16")}
                    </SelectItem>
                    <SelectItem value="4:3">
                      {t("settings.ratio_4_3")}
                    </SelectItem>
                    <SelectItem value="1:1">
                      {t("settings.ratio_1_1")}
                    </SelectItem>
                    <SelectItem value="3:4">
                      {t("settings.ratio_3_4")}
                    </SelectItem>
                    <SelectItem value="21:9">
                      {t("settings.ratio_21_9")}
                    </SelectItem>
                    <SelectItem value="adaptive">
                      {t("settings.ratio_adaptive")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration-mobile">
                  {t("settings.duration")}
                </Label>
                <Input
                  id="duration-mobile"
                  type="number"
                  min={1}
                  max={12}
                  value={duration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value >= 1 && value <= 12) {
                      setDuration(value);
                    }
                  }}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.duration_max")}
                </p>
              </div>

              {/* Generate Audio */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="generate-audio-mobile">
                    {t("settings.generate_audio")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("settings.generate_audio_hint")}
                  </p>
                </div>
                <Switch
                  id="generate-audio-mobile"
                  checked={generateAudio}
                  onCheckedChange={setGenerateAudio}
                />
              </div>
            </div>
            <DrawerFooter className="flex-row gap-2">
              <DrawerClose asChild>
                <Button variant="outline" className="flex-1">
                  {t("settings.cancel")}
                </Button>
              </DrawerClose>
              <Button
                className="flex-1"
                onClick={() => {
                  setIsSettingsOpen(false);
                  toast.success(t("settings.save"));
                }}
              >
                {t("settings.save")}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}

      {/* Sign Modal */}
      <SignModal callbackUrl={pathname || "/ai-video-generator"} />

      {/* Download Dialog */}
      {selectedTaskForDownload && (
        <DownloadDialog
          open={downloadDialogOpen}
          onOpenChange={setDownloadDialogOpen}
          taskId={selectedTaskForDownload.id}
          taskResult={selectedTaskForDownload.taskResult}
        />
      )}
    </section>
  );
}
