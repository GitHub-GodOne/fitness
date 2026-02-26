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
import { BodyPartSelector } from "@/shared/components/body-part-selector";
import { Badge } from "@/shared/components/ui/badge";
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
import { cn } from "@/shared/lib/utils";
import { useAppContext } from "@/shared/contexts/app";
import { SignModal } from "@/shared/blocks/sign/sign-modal";
import { usePathname, useRouter } from "@/core/i18n/navigation";

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

  // check matchedVideos array (video-library provider format)
  if (result.matchedVideos && Array.isArray(result.matchedVideos) && result.matchedVideos.length > 0) {
    return result.matchedVideos
      .map((item: any) => item?.videoUrl)
      .filter(Boolean);
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
  const [generationError, setGenerationError] = useState<string>("");
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


  // Voice gender selection (male or female) - load from cookies
  const [voiceGender, setVoiceGender] = useState<"male" | "female">("female");

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [ageGroup, setAgeGroup] = useState<"young" | "middle" | "senior" | "">("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "">("");
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const TOTAL_STEPS = 5;

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
  const router = useRouter();

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
    // Extract selected_body_parts or user_feeling from options
    if (task.options) {
      try {
        const options = JSON.parse(task.options);
        if (options.selected_body_parts && Array.isArray(options.selected_body_parts)) {
          setSelectedBodyParts(options.selected_body_parts);
        } else if (options.user_feeling) {
          setSelectedBodyParts(options.user_feeling.split(",").filter(Boolean));
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Fallback: try prompt
    if (!task.options) {
      if (task.prompt) {
        setSelectedBodyParts(task.prompt.split(",").filter(Boolean));
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
        const parsedTaskResult = parseTaskResult(task.taskResult);

        // Update progress from backend if available
        if (parsedResult?.progress) {
          if (typeof parsedResult.progress.progress === "number") {
            setProgress(parsedResult.progress.progress);
          }
          if (parsedResult.progress.stepMessage) {
            setStepMessage(parsedResult.progress.stepMessage);
          }
        }

        // Try extracting video URLs from taskResult first, then taskInfo
        const videoUrls = extractVideoUrls(parsedTaskResult).length > 0
          ? extractVideoUrls(parsedTaskResult)
          : extractVideoUrls(parsedResult);

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
            toast.success("Video generated successfully");
            // Redirect to results page
            router.push(`/ai-video-generator/results?taskId=${task.id}`);
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
    setReferenceImageItems([]);
    setReferenceImageUrls([]);
    setReferenceVideoUrl("");
    setCurrentStep(1);
    setAgeGroup("");
    setDifficulty("");
    setSelectedBodyParts([]);
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

    // Use selectedBodyParts as the muscle group target
    const trimmedFeeling = selectedBodyParts.join(",");
    if (!trimmedFeeling) {
      toast.error(t("form.user_feeling_required"));
      return;
    }

    if (!provider || !model) {
      toast.error("Provider or model is not configured correctly.");
      return;
    }

    // Auto-determine scene based on whether user uploaded an image
    const hasImage =
      referenceImageUrls.length > 0 ||
      referenceImageItems.some((item) => item.file);
    const autoScene: VideoGeneratorTab = hasImage
      ? "image-to-video"
      : "text-to-video";

    setGenerationError("");

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
        target_muscle_group: trimmedFeeling,
        aspect_ratio: "9:16", // Always portrait
        voice_gender: voiceGender,
        age_group: ageGroup,
        difficulty: difficulty,
        selected_body_parts: selectedBodyParts,
      };

      if (hasImage) {
        // Validation for image mode
        if (
          referenceImageUrls.length === 0 &&
          !referenceImageItems.some((item) => item.file)
        ) {
          throw new Error("Please add at least one reference image.");
        }
      }

      // Build FormData for merged request
      const body: any = {
        provider,
        mediaType: AIMediaType.VIDEO,
        model,
        prompt: "",
        options: {
          ...options,
          user_feeling: trimmedFeeling,
          voice_gender: voiceGender,
        },
        scene: autoScene,
      };

      const formData = new FormData();
      formData.append("body", JSON.stringify(body));

      // Append file if exists in reference images
      if (hasImage && referenceImageItems.length > 0) {
        const item = referenceImageItems[0];
        if (item.file) {
          formData.append("file", item.file);
        } else if (item.url) {
          body.options.image_input = [item.url];
          formData.set("body", JSON.stringify(body));
        }
      }

      console.log("Sending generate request:", body);

      const resp = await fetch("/api/ai/generate", {
        method: "POST",
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

      if (data.status === AITaskStatus.SUCCESS && (data.taskResult || data.taskInfo)) {
        const parsedResult = parseTaskResult(data.taskResult) || parseTaskResult(data.taskInfo);
        const videoUrls = extractVideoUrls(parsedResult);

        if (videoUrls.length > 0) {
          toast.success("Video generated successfully");
          setProgress(100);
          setTaskStatus(AITaskStatus.SUCCESS);
          setIsGenerating(false);
          await fetchUserCredits();
          // Redirect to results page
          router.push(`/ai-video-generator/results?taskId=${newTaskId}`);
          return;
        }
      }

      setTaskId(newTaskId);
      setProgress(25);

      await fetchUserCredits();
    } catch (error: any) {
      console.error("Failed to generate video:", error);
      setGenerationError(error.message || "Failed to generate video");
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
    <div className="min-h-screen flex flex-col px-4 pt-24 pb-12">
      {srOnlyTitle && <h2 className="sr-only">{srOnlyTitle}</h2>}

      {/* Progress bar */}
      <div className="w-full max-w-xl mx-auto mb-6">
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2.5">
          <span className="text-[13px] text-muted-foreground tracking-wide">
            {t("wizard.step_indicator", { current: currentStep, total: TOTAL_STEPS })}
          </span>
          <span className="text-[13px] text-muted-foreground tracking-wide">
            {Math.round((currentStep / TOTAL_STEPS) * 100)}%
          </span>
        </div>
      </div>

      {/* Hidden provider/model selects */}
      <div className="hidden">
        <Select value={provider} onValueChange={handleProviderChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PROVIDER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODEL_OPTIONS.filter((o) => o.scenes.includes(activeTab) && o.provider === provider).map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-xl">

          {/* Step 1: Gender */}
          {currentStep === 1 && (
            <div className="flex flex-col items-center">
              <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-center leading-tight text-foreground">{t("wizard.gender.title")}</h2>
              <p className="text-[15px] text-muted-foreground text-center mb-8">{t("wizard.gender.description")}</p>
              <div className="flex flex-wrap gap-2.5 justify-center mb-10">
                {(["male", "female"] as const).map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => {
                      setVoiceGender(gender);
                      document.cookie = `voice_gender=${gender};path=/;max-age=31536000`;
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full border text-[14px] font-medium transition-all cursor-pointer",
                      voiceGender === gender
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    {t(`wizard.gender.${gender}`)}
                  </button>
                ))}
              </div>
              <div className="flex justify-end items-center w-full">
                <button
                  type="button"
                  onClick={() => voiceGender && setCurrentStep(2)}
                  disabled={!voiceGender}
                  className="flex items-center px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-[15px] shadow-sm hover:shadow transition-all disabled:opacity-40"
                >
                  {t("wizard.next")} <ChevronRight className="h-4 w-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Age Group */}
          {currentStep === 2 && (
            <div className="flex flex-col items-center">
              <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-center leading-tight text-foreground">{t("wizard.age_group.title")}</h2>
              <p className="text-[15px] text-muted-foreground text-center mb-8">{t("wizard.age_group.description")}</p>
              <div className="flex flex-wrap gap-2.5 justify-center mb-10">
                {(["young", "middle", "senior"] as const).map((age) => (
                  <button
                    key={age}
                    type="button"
                    onClick={() => setAgeGroup(age)}
                    className={cn(
                      "px-4 py-2 rounded-full border text-[14px] font-medium transition-all cursor-pointer",
                      ageGroup === age
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    {t(`wizard.age_group.${age}`)}
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center w-full">
                <button type="button" onClick={() => setCurrentStep(1)} className="flex items-center px-5 py-2.5 rounded-xl border border-border text-muted-foreground bg-background hover:bg-muted font-medium text-[15px] transition-all">
                  <ChevronLeft className="h-4 w-4 mr-1.5" /> {t("wizard.back")}
                </button>
                <button
                  type="button"
                  onClick={() => ageGroup && setCurrentStep(3)}
                  disabled={!ageGroup}
                  className="flex items-center px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-[15px] shadow-sm hover:shadow transition-all disabled:opacity-40"
                >
                  {t("wizard.next")} <ChevronRight className="h-4 w-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}


          {/* Step 3: Difficulty */}
          {currentStep === 3 && (
            <div className="flex flex-col items-center">
              <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-center leading-tight text-foreground">{t("wizard.difficulty.title")}</h2>
              <p className="text-[15px] text-muted-foreground text-center mb-8">{t("wizard.difficulty.description")}</p>
              <div className="flex flex-wrap gap-2.5 justify-center mb-10">
                {(["easy", "medium", "hard"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={cn(
                      "px-4 py-2 rounded-full border text-[14px] font-medium transition-all cursor-pointer",
                      difficulty === level
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5",
                    )}
                  >
                    {t(`wizard.difficulty.${level}`)}
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center w-full">
                <button type="button" onClick={() => setCurrentStep(2)} className="flex items-center px-5 py-2.5 rounded-xl border border-border text-muted-foreground bg-background hover:bg-muted font-medium text-[15px] transition-all">
                  <ChevronLeft className="h-4 w-4 mr-1.5" /> {t("wizard.back")}
                </button>
                <button
                  type="button"
                  onClick={() => difficulty && setCurrentStep(4)}
                  disabled={!difficulty}
                  className="flex items-center px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-[15px] shadow-sm hover:shadow transition-all disabled:opacity-40"
                >
                  {t("wizard.next")} <ChevronRight className="h-4 w-4 ml-1.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Upload Image (Optional) */}
          {currentStep === 4 && (
            <div className="flex flex-col items-center">
              <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-center leading-tight text-foreground">{t("wizard.upload.title")}</h2>
              <p className="text-[15px] text-muted-foreground text-center mb-8">{t("wizard.upload.description")}</p>
              <div className="w-full mb-4">
                <ImageUploader
                  title={t("form.reference_image")}
                  allowMultiple={true}
                  maxImages={1}
                  maxSizeMB={maxSizeMB}
                  onChange={handleReferenceImagesChange}
                  uploadOnSelect={false}
                />
                {hasReferenceUploadError && (
                  <p className="text-destructive text-xs mt-2">{t("form.some_images_failed_to_upload")}</p>
                )}
                <p className="text-xs text-muted-foreground text-center mt-3">{t("wizard.upload.skip_hint")}</p>
              </div>
              <div className="flex justify-between items-center w-full mt-6">
                <button type="button" onClick={() => setCurrentStep(3)} className="flex items-center px-5 py-2.5 rounded-xl border border-border text-muted-foreground bg-background hover:bg-muted font-medium text-[15px] transition-all">
                  <ChevronLeft className="h-4 w-4 mr-1.5" /> {t("wizard.back")}
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCurrentStep(5)} className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground bg-background hover:bg-muted font-medium text-[15px] transition-all">
                    {t("wizard.skip")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(5)}
                    disabled={referenceImageItems.length === 0 || isReferenceUploading}
                    className="flex items-center px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-[15px] shadow-sm transition-all disabled:opacity-40"
                  >
                    {t("wizard.next")} <ChevronRight className="h-4 w-4 ml-1.5" />
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* Step 5: Body Part Selection + Generate */}
          {currentStep === 5 && (
            <div className="flex flex-col items-center">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <span className="px-3 py-1 rounded-full border border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                  {t("wizard.summary.gender")}: {t(`wizard.gender.${voiceGender}`)}
                </span>
                {ageGroup && (
                  <span className="px-3 py-1 rounded-full border border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                    {t("wizard.summary.age")}: {t(`wizard.age_group.${ageGroup}`)}
                  </span>
                )}
                {difficulty && (
                  <span className="px-3 py-1 rounded-full border border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                    {t("wizard.summary.difficulty")}: {t(`wizard.difficulty.${difficulty}`)}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full border border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                  {t("wizard.summary.image")}: {referenceImageUrls.length > 0 || referenceImageItems.some((item) => item.file)
                    ? t("wizard.summary.image_uploaded")
                    : t("wizard.summary.image_none")}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-semibold mb-2 text-center leading-tight text-foreground">{t("wizard.body_parts.title")}</h2>
              <p className="text-[15px] text-muted-foreground text-center mb-6">{t("wizard.body_parts.description")}</p>

              <div className="w-full mb-8">
                <BodyPartSelector
                  selected={selectedBodyParts}
                  onChange={setSelectedBodyParts}
                  disabled={isGenerating}
                />
              </div>

              {/* Generate / Sign in button */}
              <div className="w-full space-y-4">
                {!isMounted ? (
                  <button disabled className="w-full flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-[15px] shadow-sm transition-all disabled:opacity-40">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("loading")}
                  </button>
                ) : isCheckSign ? (
                  <button disabled className="w-full flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-[15px] shadow-sm transition-all disabled:opacity-40">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("checking_account")}
                  </button>
// __STEP5_BUTTONS_CONTINUE__
                ) : user ? (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || selectedBodyParts.length === 0}
                    className="w-full flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-[15px] shadow-sm hover:shadow transition-all disabled:opacity-40"
                  >
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("generating")}</>
                    ) : (
                      <><Sparkles className="mr-2 h-5 w-5" /> {t("generate")}</>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsShowSignModal(true)}
                    className="w-full flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-[15px] shadow-sm hover:shadow transition-all"
                  >
                    <User className="mr-2 h-5 w-5" /> {t("sign_in_to_generate")}
                  </button>
                )}

                {/* Credits info */}
                {isMounted && user && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="text-primary">{t("credits_cost", { credits: costCredits })}</span>
                    <div className="flex items-center gap-2">
                      <Link href="/pricing">
                        <button className="text-primary hover:text-primary/80 flex h-5 w-5 items-center justify-center rounded-full border border-current transition-colors" title="Buy Credits">
                          <Plus className="h-3 w-3" />
                        </button>
                      </Link>
                      <span>{t("credits_remaining", { credits: remainingCredits })}</span>
                    </div>
                  </div>
                )}
                {isMounted && user && remainingCredits <= 0 && (
                  <Link href="/pricing" className="block">
                    <button className="w-full flex items-center justify-center px-5 py-2.5 rounded-xl border border-border text-muted-foreground bg-background hover:bg-muted font-medium text-[15px] transition-all">
                      <CreditCard className="mr-2 h-4 w-4" /> {t("buy_credits")}
                    </button>
                  </Link>
                )}
              </div>

              {/* Back button */}
              <div className="flex justify-start w-full mt-6">
                <button type="button" onClick={() => setCurrentStep(4)} className="flex items-center px-5 py-2.5 rounded-xl border border-border text-muted-foreground bg-background hover:bg-muted font-medium text-[15px] transition-all">
                  <ChevronLeft className="h-4 w-4 mr-1.5" /> {t("wizard.back")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Card - shown during generation */}
      {isGenerating && (
        <div ref={progressCardRef} className="w-full max-w-xl mx-auto mt-8">
          <Card className="border-primary/30">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{taskStatusLabel || t("generating")}</p>
                  {stepMessage && (
                    <p className="text-xs text-muted-foreground mt-1">{stepMessage}</p>
                  )}
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {t("do_not_close_page")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generation Error - shown inline */}
      {generationError && !isGenerating && (
        <div className="w-full max-w-xl mx-auto mt-8">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6 flex flex-col items-center gap-3">
              <p className="text-sm text-destructive text-center">{generationError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGenerationError("");
                  setCurrentStep(1);
                }}
              >
                {t("regenerate")}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Download Dialog */}
      {selectedTaskForDownload && (
        <DownloadDialog
          open={downloadDialogOpen}
          onOpenChange={setDownloadDialogOpen}
          taskId={selectedTaskForDownload.id}
          taskResult={selectedTaskForDownload.taskResult}
        />
      )}

      {/* Sign Modal */}
      <SignModal callbackUrl={pathname || "/ai-video-generator"} />
    </div>
  );
}
