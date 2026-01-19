'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Download,
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
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';
import { ImageUploader, ImageUploaderValue } from '@/shared/blocks/common';
import { ShareButton } from '@/shared/blocks/common/share-button';
import { Copy } from '@/shared/blocks/table/copy';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Progress } from '@/shared/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Switch } from '@/shared/components/ui/switch';
import { useMediaQuery } from '@/shared/hooks/use-media-query';
import { useAppContext } from '@/shared/contexts/app';

interface VideoGeneratorProps {
  maxSizeMB?: number;
  srOnlyTitle?: string;
}

interface GeneratedVideo {
  id: string;
  url: string;
  provider?: string;
  model?: string;
  prompt?: string;
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

interface HistoryResponse {
  list: HistoryTask[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

type VideoGeneratorTab = 'text-to-video' | 'image-to-video' | 'video-to-video';

const POLL_INTERVAL = 15000;
const GENERATION_TIMEOUT = 600000; // 10 minutes for video
const MAX_PROMPT_LENGTH = 2000;

const textToVideoCredits = 1;
const imageToVideoCredits = 1;
const videoToVideoCredits = 1;

const MODEL_OPTIONS = [
  // Replicate models
  {
    value: 'google/veo-3.1',
    label: 'Veo 3.1',
    provider: 'replicate',
    scenes: ['text-to-video', 'image-to-video'],
  },
  {
    value: 'openai/sora-2',
    label: 'Sora 2',
    provider: 'replicate',
    scenes: ['text-to-video', 'image-to-video'],
  },
  // Fal models
  {
    value: 'fal-ai/veo3',
    label: 'Veo 3',
    provider: 'fal',
    scenes: ['text-to-video'],
  },
  {
    value: 'fal-ai/wan-pro/image-to-video',
    label: 'Wan Pro',
    provider: 'fal',
    scenes: ['image-to-video'],
  },
  {
    value: 'fal-ai/kling-video/o1/video-to-video/edit',
    label: 'Kling Video O1',
    provider: 'fal',
    scenes: ['video-to-video'],
  },
  // Kie models
  {
    value: 'sora-2-pro-image-to-video',
    label: 'Sora 2 Pro',
    provider: 'kie',
    scenes: ['image-to-video'],
  },
  {
    value: 'sora-2-pro-text-to-video',
    label: 'Sora 2 Pro',
    provider: 'kie',
    scenes: ['text-to-video'],
  },
  // Volcano models
  {
    value: 'doubao-seedance-1-5-pro-251215',
    label: 'Doubao Seedance 1.5 Pro',
    provider: 'volcano',
    scenes: ['image-to-video'],
  },
];

const PROVIDER_OPTIONS = [
  {
    value: 'replicate',
    label: 'Replicate',
  },
  {
    value: 'fal',
    label: 'Fal',
  },
  {
    value: 'kie',
    label: 'Kie',
  },
  {
    value: 'volcano',
    label: 'Volcano Engine',
  },
];

function parseTaskResult(taskResult: string | null): any {
  if (!taskResult) {
    return null;
  }

  try {
    return JSON.parse(taskResult);
  } catch (error) {
    console.warn('Failed to parse taskResult:', error);
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
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          return (
            item.url ?? item.uri ?? item.video ?? item.src ?? item.videoUrl
          );
        }
        return null;
      })
      .filter(Boolean);
  }

  // check content.video_url (Volcano Engine format)
  if (result.content && result.content.video_url && typeof result.content.video_url === 'string') {
    return [result.content.video_url];
  }

  // check output
  const output = result.output ?? result.video ?? result.data;

  if (!output) {
    return [];
  }

  if (typeof output === 'string') {
    return [output];
  }

  if (Array.isArray(output)) {
    return output
      .flatMap((item) => {
        if (!item) return [];
        if (typeof item === 'string') return [item];
        if (typeof item === 'object') {
          const candidate =
            item.url ?? item.uri ?? item.video ?? item.src ?? item.videoUrl;
          return typeof candidate === 'string' ? [candidate] : [];
        }
        return [];
      })
      .filter(Boolean);
  }

  if (typeof output === 'object') {
    const candidate =
      output.url ?? output.uri ?? output.video ?? output.src ?? output.videoUrl;
    if (typeof candidate === 'string') {
      return [candidate];
    }
  }

  return [];
}

export function VideoGenerator({
  maxSizeMB = 50,
  srOnlyTitle,
}: VideoGeneratorProps) {
  const t = useTranslations('ai.video.generator');

  const [activeTab, setActiveTab] =
    useState<VideoGeneratorTab>('image-to-video');

  const [costCredits, setCostCredits] = useState<number>(textToVideoCredits);
  // Default to Volcano Engine
  const [provider, setProvider] = useState('volcano');
  // Default to Volcano Engine's model for image-to-video
  const [model, setModel] = useState('doubao-seedance-1-5-pro-251215');
  const [referenceImageItems, setReferenceImageItems] = useState<
    ImageUploaderValue[]
  >([]);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string>('');
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(
    null
  );
  const [taskStatus, setTaskStatus] = useState<AITaskStatus | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [downloadingVideoId, setDownloadingVideoId] = useState<string | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);
  const [historyTasks, setHistoryTasks] = useState<HistoryTask[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const historyLimit = 10;
  // 选中的视频（按顺序）：Map<taskId, videoUrl>
  const [selectedVideos, setSelectedVideos] = useState<Map<string, string>>(new Map());
  const [isMerging, setIsMerging] = useState(false);

  // Video settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [resolution, setResolution] = useState<'480p' | '720p' | '1080p'>('480p');
  const [ratio, setRatio] = useState<'16:9' | '9:16' | '4:3' | '1:1' | '3:4' | '21:9' | 'adaptive'>('adaptive');
  const [duration, setDuration] = useState<number>(12); // Default duration: 12 seconds
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);

  // User feeling (required for Bible video generation)
  const [userFeeling, setUserFeeling] = useState('');

  const { user, isCheckSign, setIsShowSignModal, fetchUserCredits } =
    useAppContext();

  const isDesktop = useMediaQuery('(min-width: 768px)');

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
        method: 'GET',
      });

      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message || 'Failed to fetch history');
      }

      // GET endpoint returns { data: tasks, total, page, limit, hasMore }
      // Convert to HistoryResponse format
      const historyData: HistoryResponse = {
        list: data.data || [],
        total: data.total || 0,
        page: data.page || historyPage,
        limit: data.limit || historyLimit,
        hasMore: data.hasMore || false,
      };
      setHistoryTasks(historyData.list || []);
      setHistoryTotal(historyData.total || 0);
    } catch (error: any) {
      console.error('Failed to fetch history:', error);
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
      (option) => option.scenes.includes(activeTab) && option.provider === provider
    );
    
    if (availableModels.length > 0) {
      const currentModelExists = availableModels.some((m) => m.value === model);
      if (!currentModelExists) {
        setModel(availableModels[0].value);
      }
    }
  }, [provider, activeTab, model]);

  const extractVideoUrl = (taskInfo: string | null, taskResult: string | null): string | null => {
    // First try to get saved video URL from taskResult (highest priority)
    if (taskResult) {
      try {
        const parsedResult = JSON.parse(taskResult);
        // Priority order: saved_video_url (CDN) > original_video_url (API) > saved_video_urls[0] > original_video_urls[0] > content.video_url
        // Check for saved_video_url (CDN URL - preferred, permanent)
        if (parsedResult.saved_video_url && typeof parsedResult.saved_video_url === 'string') {
          return parsedResult.saved_video_url;
        }
        // Check for original_video_url (original API URL - fallback for History)
        if (parsedResult.original_video_url && typeof parsedResult.original_video_url === 'string') {
          return parsedResult.original_video_url;
        }
        // Check for saved_video_urls array
        if (parsedResult.saved_video_urls && Array.isArray(parsedResult.saved_video_urls) && parsedResult.saved_video_urls.length > 0) {
          return parsedResult.saved_video_urls[0];
        }
        // Check for original_video_urls array
        if (parsedResult.original_video_urls && Array.isArray(parsedResult.original_video_urls) && parsedResult.original_video_urls.length > 0) {
          return parsedResult.original_video_urls[0];
        }
        // Check for content.video_url (Volcano Engine format)
        if (parsedResult.content && parsedResult.content.video_url && typeof parsedResult.content.video_url === 'string') {
          return parsedResult.content.video_url;
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
        return videoUrls.length > 0 ? videoUrls[0] : null;
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
      // Check for content.last_frame_url (Volcano Engine format)
      if (parsed.content && parsed.content.last_frame_url && typeof parsed.content.last_frame_url === 'string') {
        return parsed.content.last_frame_url;
      }
      // Try to find last frame image in various possible formats
      if (parsed.lastFrame || parsed.last_frame || parsed.frame || parsed.last_frame_url) {
        return parsed.lastFrame || parsed.last_frame || parsed.frame || parsed.last_frame_url;
      }
      if (parsed.images && Array.isArray(parsed.images) && parsed.images.length > 0) {
        return parsed.images[parsed.images.length - 1];
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleUseLastFrame = useCallback((task: HistoryTask) => {
    const lastFrameImage = extractLastFrameImage(task.taskResult);
    console.log('[VideoGenerator] handleUseLastFrame:', {
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
          status: 'uploaded',
        },
      ]);
      toast.success('Last frame image loaded');
    } else {
      console.warn('[VideoGenerator] No last frame image found in taskResult:', task.taskResult);
      toast.error('No last frame image found');
    }
  }, []);

  const handleRegenerate = useCallback((task: HistoryTask) => {
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
    if (!task.options || !JSON.parse(task.options || '{}').user_feeling) {
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
          status: 'uploaded',
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
              status: 'uploaded' as const,
            }))
          );
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 处理视频选择/取消选择（按顺序记录）
  const handleVideoSelect = useCallback((taskId: string, videoUrl: string | null, checked: boolean) => {
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
  }, []);

  // 合并选中的视频
  const handleMergeVideos = useCallback(async () => {
    if (selectedVideos.size < 2) {
      toast.error('Please select at least 2 videos to merge');
      return;
    }

    setIsMerging(true);
    try {
      // 按照选择的顺序获取视频URL（Map保持插入顺序）
      const videoUrls = Array.from(selectedVideos.values());

      const response = await fetch('/api/video/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: videoUrls,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Merge request failed with status: ${response.status}`);
      }

      const result = await response.json();
      if (result.code !== 0) {
        // Handle specific error messages with translations
        const errorMessage = result.message || 'Failed to merge videos';
        if (errorMessage === 'insufficient_credits_for_merge') {
          throw new Error(t('merge.insufficient_credits'));
        }
        // Try to translate other error messages if they match translation keys
        const translatedMessage = t(errorMessage as any, { defaultValue: errorMessage });
        throw new Error(translatedMessage);
      }

      // 合并成功后，清空选择并将合并后的视频添加到生成的视频列表
      if (result.data?.url) {
        const mergedCount = selectedVideos.size;
        setGeneratedVideos((prev) => [
          {
            id: `merged-${Date.now()}`,
            url: result.data.url,
            provider: 'merged',
            prompt: `Merged ${mergedCount} videos`,
          },
          ...prev,
        ]);
        setSelectedVideos(new Map());
        toast.success(`Successfully merged ${mergedCount} videos`);
        
        // 滚动到生成的视频区域
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error('No merged video URL in response');
      }
    } catch (error: any) {
      console.error('Failed to merge videos:', error);
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
  const isTextToVideoMode = activeTab === 'text-to-video';
  const isImageToVideoMode = activeTab === 'image-to-video';
  const isVideoToVideoMode = activeTab === 'video-to-video';

  const handleTabChange = (value: string) => {
    const tab = value as VideoGeneratorTab;
    setActiveTab(tab);

    const availableModels = MODEL_OPTIONS.filter(
      (option) => option.scenes.includes(tab) && option.provider === provider
    );

    if (availableModels.length > 0) {
      setModel(availableModels[0].value);
    } else {
      setModel('');
    }

    if (tab === 'text-to-video') {
      setCostCredits(textToVideoCredits);
    } else if (tab === 'image-to-video') {
      setCostCredits(imageToVideoCredits);
    } else if (tab === 'video-to-video') {
      setCostCredits(videoToVideoCredits);
    }
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);

    const availableModels = MODEL_OPTIONS.filter(
      (option) => option.scenes.includes(activeTab) && option.provider === value
    );

    if (availableModels.length > 0) {
      setModel(availableModels[0].value);
    } else {
      setModel('');
    }
  };

  const taskStatusLabel = useMemo(() => {
    if (!taskStatus) {
      return '';
    }

    switch (taskStatus) {
      case AITaskStatus.PENDING:
        return 'Waiting for the model to start';
      case AITaskStatus.PROCESSING:
        return 'Generating your video...';
      case AITaskStatus.SUCCESS:
        return 'Video generation completed';
      case AITaskStatus.FAILED:
        return 'Generation failed';
      default:
        return '';
    }
  }, [taskStatus]);

  const handleReferenceImagesChange = useCallback(
    (items: ImageUploaderValue[]) => {
      setReferenceImageItems(items);
      const uploadedUrls = items
        .filter((item) => item.status === 'uploaded' && item.url)
        .map((item) => item.url as string);
      setReferenceImageUrls(uploadedUrls);
    },
    []
  );

  const isReferenceUploading = useMemo(
    () => referenceImageItems.some((item) => item.status === 'uploading'),
    [referenceImageItems]
  );

  const hasReferenceUploadError = useMemo(
    () => referenceImageItems.some((item) => item.status === 'error'),
    [referenceImageItems]
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
          toast.error('Video generation timed out. Please try again.');
          setIsQuerying(false);
          return true;
        }

        const resp = await fetch('/api/ai/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ taskId: id }),
        });

        if (!resp.ok) {
          throw new Error(`request failed with status: ${resp.status}`);
        }

        const { code, message, data } = await resp.json();
        if (code !== 0) {
          throw new Error(message || 'Query task failed');
        }

        const task = data as BackendTask;
        const currentStatus = task.status as AITaskStatus;
        setTaskStatus(currentStatus);

        const parsedResult = parseTaskResult(task.taskInfo);
        const videoUrls = extractVideoUrls(parsedResult);

        if (currentStatus === AITaskStatus.PENDING) {
          setProgress((prev) => Math.max(prev, 20));
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
              }))
            );
            setProgress((prev) => Math.max(prev, 85));
          } else {
            setProgress((prev) => Math.min(prev + 5, 80));
          }
          setIsQuerying(false);
          return false;
        }

        if (currentStatus === AITaskStatus.SUCCESS) {
          if (videoUrls.length === 0) {
            toast.error('The provider returned no videos. Please retry.');
          } else {
            setGeneratedVideos(
              videoUrls.map((url, index) => ({
                id: `${task.id}-${index}`,
                url,
                provider: task.provider,
                model: task.model,
                prompt: task.prompt ?? undefined,
              }))
            );
            toast.success('Video generated successfully');
          }

          setProgress(100);
          resetTaskState();
          setIsQuerying(false);
          return true;
        }

        if (currentStatus === AITaskStatus.FAILED) {
          const errorMessage =
            parsedResult?.errorMessage || 'Generate video failed';
          toast.error(errorMessage);
          resetTaskState();

          fetchUserCredits();

          setIsQuerying(false);
          return true;
        }

        setProgress((prev) => Math.min(prev + 3, 95));
        setIsQuerying(false);
        return false;
      } catch (error: any) {
        console.error('Error polling video task:', error);
        toast.error(`Query task failed: ${error.message}`);
        resetTaskState();

        fetchUserCredits();

        setIsQuerying(false);
        return true;
      }
    },
    [generationStartTime, resetTaskState, fetchUserCredits, isQuerying]
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

  const handleReset = () => {
    setUserFeeling('');
    setReferenceImageItems([]);
    setReferenceImageUrls([]);
    setReferenceVideoUrl('');
    toast.success(t('reset_success'));
  };

  const handleGenerate = async () => {
    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    if (remainingCredits < costCredits) {
      toast.error('Insufficient credits. Please top up to keep creating.');
      return;
    }

    const trimmedFeeling = userFeeling.trim();
    if (!trimmedFeeling) {
      toast.error(t('form.user_feeling_required'));
      return;
    }

    if (!provider || !model) {
      toast.error('Provider or model is not configured correctly.');
      return;
    }

    if (isImageToVideoMode && referenceImageUrls.length === 0) {
      toast.error('Please upload a reference image before generating.');
      return;
    }

    if (isVideoToVideoMode && !referenceVideoUrl) {
      toast.error('Please provide a reference video URL before generating.');
      return;
    }

    setIsGenerating(true);
    setProgress(15);
    setTaskStatus(AITaskStatus.PENDING);
    setGeneratedVideos([]);
    setGenerationStartTime(Date.now());

    try {
      const options: any = {
        resolution,
        ratio,
        duration,
        generate_audio: generateAudio,
        user_feeling: trimmedFeeling, // Pass user feeling to backend for auto-enhancement
      };

      if (isImageToVideoMode) {
        // Backend supports multiple images via array
        // Currently limited to 1 image, but code is ready for multiple images
        options.image_input = referenceImageUrls;
      }

      if (isVideoToVideoMode) {
        options.video_input = [referenceVideoUrl];
      }

      const resp = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaType: AIMediaType.VIDEO,
          scene: activeTab,
          provider,
          model,
          prompt: '', // Prompt will be auto-generated from user feeling by Volcano provider
          options,
        }),
      });

      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }

      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message || 'Failed to create a video task');
      }

      const newTaskId = data?.id;
      if (!newTaskId) {
        throw new Error('Task id missing in response');
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
            }))
          );
          toast.success('Video generated successfully');
          setProgress(100);
          resetTaskState();
          await fetchUserCredits();
          await fetchHistory();
          return;
        }
      }

      setTaskId(newTaskId);
      setProgress(25);

      await fetchUserCredits();
    } catch (error: any) {
      console.error('Failed to generate video:', error);
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
      // fetch video via proxy
      const resp = await fetch(
        `/api/proxy/file?url=${encodeURIComponent(video.url)}`
      );
      if (!resp.ok) {
        throw new Error('Failed to fetch video');
      }

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      toast.success('Video downloaded');
    } catch (error) {
      console.error('Failed to download video:', error);
      toast.error('Failed to download video');
    } finally {
      setDownloadingVideoId(null);
    }
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
                  <span className="flex items-center gap-2">{t('title')}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSettingsOpen(true)}
                    className="h-8 w-8 p-0"
                    title={t('settings.title')}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-6 sm:space-y-6 sm:px-6 sm:pb-8">

                <div className="hidden">
                  <div className="space-y-2">
                    <Label>{t('form.provider')}</Label>
                    <Select
                      value={provider}
                      onValueChange={handleProviderChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('form.select_provider')} />
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
                    <Label>{t('form.model')}</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('form.select_model')} />
                      </SelectTrigger>
                      <SelectContent>
                        {MODEL_OPTIONS.filter(
                          (option) =>
                            option.scenes.includes(activeTab) &&
                            option.provider === provider
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
                      title={t('form.reference_image')}
                      allowMultiple={true}
                      maxImages={1}
                      maxSizeMB={maxSizeMB}
                      onChange={handleReferenceImagesChange}
                      defaultPreviews={referenceImageUrls}
                    />

                    {hasReferenceUploadError && (
                      <p className="text-destructive text-xs">
                        {t('form.some_images_failed_to_upload')}
                      </p>
                    )}
                  </div>
                )}

                {isVideoToVideoMode && (
                  <div className="space-y-2">
                    <Label htmlFor="video-url">
                      {t('form.reference_video')}
                    </Label>
                    <Textarea
                      id="video-url"
                      value={referenceVideoUrl}
                      onChange={(e) => setReferenceVideoUrl(e.target.value)}
                      placeholder={t('form.reference_video_placeholder')}
                      className="min-h-20"
                    />
                  </div>
                )}

                {/* User Feeling Input (Required) */}
                <div className="space-y-2">
                  <Label htmlFor="user-feeling" className="flex items-center gap-2">
                    <span>{t('form.user_feeling')}</span>
                    <span className="text-red-500 font-semibold">*</span>
                  </Label>
                  <Textarea
                    id="user-feeling"
                    value={userFeeling}
                    onChange={(e) => setUserFeeling(e.target.value)}
                    placeholder={t('form.user_feeling_placeholder')}
                    className="min-h-32"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('form.user_feeling_hint')}
                  </p>
                </div>

                {!isMounted ? (
                  <Button className="h-9 w-full px-2 text-xs sm:h-10 sm:px-4 sm:text-sm" disabled>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="whitespace-nowrap">{t('loading')}</span>
                  </Button>
                ) : isCheckSign ? (
                  <Button className="h-9 w-full px-2 text-xs sm:h-10 sm:px-4 sm:text-sm" disabled>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                    <span className="whitespace-nowrap">{t('checking_account')}</span>
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
                      <span className="whitespace-nowrap">{t('reset')}</span>
                    </Button>
                    <Button
                      className="h-10 w-full px-4 text-sm sm:h-10 sm:flex-1"
                      onClick={handleGenerate}
                      disabled={
                        isGenerating ||
                        !userFeeling.trim() ||
                        isReferenceUploading ||
                        hasReferenceUploadError ||
                        (isImageToVideoMode && referenceImageUrls.length === 0) ||
                        (isVideoToVideoMode && !referenceVideoUrl)
                      }
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          <span className="whitespace-nowrap">{t('generating')}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          <span className="whitespace-nowrap">{t('generate')}</span>
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
                    <span className="whitespace-nowrap">{t('sign_in_to_generate')}</span>
                  </Button>
                )}

                {!isMounted ? (
                  <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-primary">
                      {t('credits_cost', { credits: costCredits })}
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
                      <span>{t('credits_remaining', { credits: 0 })}</span>
                    </div>
                  </div>
                ) : user && remainingCredits > 0 ? (
                  <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-primary">
                      {t('credits_cost', { credits: costCredits })}
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
                        {t('credits_remaining', { credits: remainingCredits })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-primary">
                        {t('credits_cost', { credits: costCredits })}
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
                          {t('credits_remaining', { credits: remainingCredits })}
                        </span>
                      </div>
                    </div>
                    <Link href="/pricing">
                      <Button variant="outline" className="h-9 w-full px-2 text-xs sm:h-10 sm:px-4 sm:text-sm">
                        <CreditCard className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        <span className="whitespace-nowrap">{t('buy_credits')}</span>
                      </Button>
                    </Link>
                  </div>
                )}

                {isGenerating && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('progress')}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    {taskStatusLabel && (
                      <p className="text-muted-foreground text-center text-xs">
                        {taskStatusLabel}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <Video className="h-5 w-5" />
                  {t('generated_videos')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-8">
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
                        ? t('ready_to_generate')
                        : t('no_videos_generated')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* History Section */}
          {user && (
            <Card className="mt-8">
              <CardHeader>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
                      <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                      History
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVideos(new Map());
                        fetchHistory();
                      }}
                      disabled={historyLoading}
                      className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${historyLoading ? 'animate-spin' : ''}`}
                      />
                    </Button>
                  </div>
                  {selectedVideos.size > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {selectedVideos.size} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearSelection}
                        disabled={isMerging}
                        className="h-8 text-xs sm:h-9 sm:text-sm"
                      >
                        Clear
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleMergeVideos}
                        disabled={isMerging || selectedVideos.size < 2}
                        className="h-8 text-xs sm:h-9 sm:text-sm"
                      >
                        {isMerging ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin sm:mr-2 sm:h-4 sm:w-4" />
                            Merging...
                          </>
                        ) : (
                          <>
                            <Merge className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
                            Merge ({selectedVideos.size})
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : historyTasks.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No history found
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={historyTasks.length > 0 && historyTasks.every((task) => {
                                const videoUrl = extractVideoUrl(task.taskInfo, task.taskResult);
                                return !videoUrl || selectedVideos.has(task.id);
                              })}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  // 全选：按顺序添加所有有视频的任务
                                  const newMap = new Map<string, string>();
                                  historyTasks.forEach((task) => {
                                    const videoUrl = extractVideoUrl(task.taskInfo, task.taskResult);
                                    if (videoUrl && task.status === AITaskStatus.SUCCESS) {
                                      newMap.set(task.id, videoUrl);
                                    }
                                  });
                                  setSelectedVideos(newMap);
                                } else {
                                  // 取消全选
                                  setSelectedVideos(new Map());
                                }
                              }}
                              aria-label="Select all"
                            />
                          </TableHead>
                          <TableHead className="w-12">Order</TableHead>
                          <TableHead className="max-w-[120px]">Task ID</TableHead>
                          <TableHead>Prompt</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyTasks.map((task) => {
                          const videoUrl = extractVideoUrl(task.taskInfo, task.taskResult);
                          const isSelected = selectedVideos.has(task.id);
                          // 获取选中顺序（从1开始）
                          const selectedOrder = isSelected
                            ? Array.from(selectedVideos.keys()).indexOf(task.id) + 1
                            : null;
                          const canSelect = videoUrl && task.status === AITaskStatus.SUCCESS;

                          return (
                            <TableRow key={task.id}>
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    handleVideoSelect(task.id, videoUrl, checked as boolean);
                                  }}
                                  disabled={!canSelect}
                                  aria-label={`Select task ${task.id}`}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                {selectedOrder && (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                    {selectedOrder}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[120px]">
                                {task.taskId ? (
                                  <Copy
                                    value={task.taskId}
                                    metadata={{ message: t('copied') }}
                                    className="cursor-pointer"
                                  >
                                    <span className="truncate text-xs" title={task.taskId}>
                                      {task.taskId}
                                    </span>
                                  </Copy>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="max-w-xs">
                                {task.prompt ? (
                                  <Copy
                                    value={task.prompt}
                                    metadata={{ message: t('copied') }}
                                    className="cursor-pointer"
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
                                <span
                                  className={`text-xs ${
                                    task.status === AITaskStatus.SUCCESS
                                      ? 'text-green-600'
                                      : task.status === AITaskStatus.FAILED
                                        ? 'text-red-600'
                                        : task.status === AITaskStatus.PROCESSING
                                          ? 'text-blue-600'
                                          : 'text-gray-600'
                                  }`}
                                >
                                  {task.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">
                                {task.createdAt
                                  ? new Date(task.createdAt).toLocaleDateString()
                                  : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
                                  {videoUrl && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setPreviewVideoUrl(videoUrl);
                                          setIsPreviewOpen(true);
                                        }}
                                        title="Preview video"
                                        className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                                      >
                                        <Video className="h-4 w-4" />
                                        <span className="hidden sm:inline ml-1">Preview</span>
                                      </Button>
                                      <ShareButton
                                        url={videoUrl}
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                                      />
                                    </>
                                  )}
                                  {extractLastFrameImage(task.taskResult) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleUseLastFrame(task)}
                                      title="Use last frame image"
                                      className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                                    >
                                      <Image className="h-4 w-4" />
                                      <span className="hidden sm:inline ml-1">Frame</span>
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRegenerate(task)}
                                    title={t('regenerate')}
                                    className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                    <span className="hidden sm:inline ml-1">{t('regenerate')}</span>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {historyTotal > 0 && (
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Showing {(historyPage - 1) * historyLimit + 1} to{' '}
                          {Math.min(historyPage * historyLimit, historyTotal)} of{' '}
                          {historyTotal} results
                        </div>
                        {Math.ceil(historyTotal / historyLimit) > 1 && (
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() => {
                                    if (historyPage > 1) {
                                      setHistoryPage((p) => p - 1);
                                    }
                                  }}
                                  className={
                                    historyPage === 1
                                      ? 'pointer-events-none opacity-50'
                                      : 'cursor-pointer'
                                  }
                                />
                              </PaginationItem>
                              {(() => {
                                const totalPages = Math.ceil(historyTotal / historyLimit);
                                const maxPagesToShow = 5;
                                let startPage = Math.max(1, historyPage - Math.floor(maxPagesToShow / 2));
                                let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
                                
                                // Adjust start page if we're near the end
                                if (endPage - startPage < maxPagesToShow - 1) {
                                  startPage = Math.max(1, endPage - maxPagesToShow + 1);
                                }
                                
                                const pages = [];
                                for (let i = startPage; i <= endPage; i++) {
                                  pages.push(i);
                                }
                                
                                return pages.map((pageNum) => (
                                  <PaginationItem key={pageNum}>
                                    <PaginationLink
                                      onClick={() => setHistoryPage(pageNum)}
                                      isActive={historyPage === pageNum}
                                      className="cursor-pointer"
                                    >
                                      {pageNum}
                                    </PaginationLink>
                                  </PaginationItem>
                                ));
                              })()}
                              <PaginationItem>
                                <PaginationNext
                                  onClick={() => {
                                    const totalPages = Math.ceil(historyTotal / historyLimit);
                                    if (historyPage < totalPages) {
                                      setHistoryPage((p) => p + 1);
                                    }
                                  }}
                                  className={
                                    historyPage >= Math.ceil(historyTotal / historyLimit)
                                      ? 'pointer-events-none opacity-50'
                                      : 'cursor-pointer'
                                  }
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl w-full p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Video Preview</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            {previewVideoUrl && (
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full h-auto rounded-lg"
                style={{ maxHeight: '70vh' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Settings Dialog/Drawer */}
      {isDesktop ? (
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="max-w-md w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('settings.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Resolution */}
            <div className="space-y-2">
              <Label>{t('settings.resolution')}</Label>
              <Select
                value={resolution}
                onValueChange={(value) => setResolution(value as '480p' | '720p' | '1080p')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">{t('settings.resolution_480p')}</SelectItem>
                  <SelectItem
                    value="720p"
                    disabled={remainingCredits <= 3}
                  >
                    {t('settings.resolution_720p')}
                  </SelectItem>
                  <SelectItem
                    value="1080p"
                    disabled={remainingCredits <= 3}
                  >
                    {t('settings.resolution_1080p')}
                  </SelectItem>
                </SelectContent>
              </Select>
              {remainingCredits <= 3 && (
                <p className="text-xs text-muted-foreground">
                  {t('settings.free_user_limit')}
                </p>
              )}
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label>{t('settings.ratio')}</Label>
              <Select
                value={ratio}
                onValueChange={(value) =>
                  setRatio(value as '16:9' | '9:16' | '4:3' | '1:1' | '3:4' | '21:9' | 'adaptive')
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">{t('settings.ratio_16_9')}</SelectItem>
                  <SelectItem value="9:16">{t('settings.ratio_9_16')}</SelectItem>
                  <SelectItem value="4:3">{t('settings.ratio_4_3')}</SelectItem>
                  <SelectItem value="1:1">{t('settings.ratio_1_1')}</SelectItem>
                  <SelectItem value="3:4">{t('settings.ratio_3_4')}</SelectItem>
                  <SelectItem value="21:9">{t('settings.ratio_21_9')}</SelectItem>
                  <SelectItem value="adaptive">{t('settings.ratio_adaptive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">{t('settings.duration')}</Label>
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
              <p className="text-xs text-muted-foreground">{t('settings.duration_max')}</p>
            </div>

            {/* Generate Audio */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="generate-audio">{t('settings.generate_audio')}</Label>
                <p className="text-xs text-muted-foreground">{t('settings.generate_audio_hint')}</p>
              </div>
              <Switch
                id="generate-audio"
                checked={generateAudio}
                onCheckedChange={setGenerateAudio}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              {t('settings.cancel')}
            </Button>
            <Button
              onClick={() => {
                setIsSettingsOpen(false);
                toast.success(t('settings.save'));
              }}
            >
              {t('settings.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      ) : (
        <Drawer open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t('settings.title')}</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-4 px-4 py-4 max-h-[70vh] overflow-y-auto">
              {/* Resolution */}
              <div className="space-y-2">
                <Label>{t('settings.resolution')}</Label>
                <Select
                  value={resolution}
                  onValueChange={(value) => setResolution(value as '480p' | '720p' | '1080p')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="480p">{t('settings.resolution_480p')}</SelectItem>
                    <SelectItem
                      value="720p"
                      disabled={remainingCredits <= 3}
                    >
                      {t('settings.resolution_720p')}
                    </SelectItem>
                    <SelectItem
                      value="1080p"
                      disabled={remainingCredits <= 3}
                    >
                      {t('settings.resolution_1080p')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {remainingCredits <= 3 && (
                  <p className="text-xs text-muted-foreground">
                    {t('settings.free_user_limit')}
                  </p>
                )}
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>{t('settings.ratio')}</Label>
                <Select
                  value={ratio}
                  onValueChange={(value) =>
                    setRatio(value as '16:9' | '9:16' | '4:3' | '1:1' | '3:4' | '21:9' | 'adaptive')
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">{t('settings.ratio_16_9')}</SelectItem>
                    <SelectItem value="9:16">{t('settings.ratio_9_16')}</SelectItem>
                    <SelectItem value="4:3">{t('settings.ratio_4_3')}</SelectItem>
                    <SelectItem value="1:1">{t('settings.ratio_1_1')}</SelectItem>
                    <SelectItem value="3:4">{t('settings.ratio_3_4')}</SelectItem>
                    <SelectItem value="21:9">{t('settings.ratio_21_9')}</SelectItem>
                    <SelectItem value="adaptive">{t('settings.ratio_adaptive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration-mobile">{t('settings.duration')}</Label>
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
                <p className="text-xs text-muted-foreground">{t('settings.duration_max')}</p>
              </div>

              {/* Generate Audio */}
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="generate-audio-mobile">{t('settings.generate_audio')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.generate_audio_hint')}</p>
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
                  {t('settings.cancel')}
                </Button>
              </DrawerClose>
              <Button
                className="flex-1"
                onClick={() => {
                  setIsSettingsOpen(false);
                  toast.success(t('settings.save'));
                }}
              >
                {t('settings.save')}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </section>
  );
}
