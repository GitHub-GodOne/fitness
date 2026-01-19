'use client';

import { useEffect, useState } from 'react';
import { Video, X, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { cn } from '@/shared/lib/utils';

interface AITask {
  id: string;
  mediaType: string;
  taskResult: string;
  taskInfo?: string;
  prompt: string;
  createdAt: Date;
}

interface AITaskSelectorProps {
  onSelect: (task: { id: string; type: string; url: string }) => void;
  onCancel: () => void;
}

export function AITaskSelector({ onSelect, onCancel }: AITaskSelectorProps) {
  const t = useTranslations('components.comments');
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/list?limit=20&status=success');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load tasks');
      }

      const result = await response.json();
      // API returns { code, message, data: { data: tasks[], total, page, hasMore } }
      const tasksData = result.data?.data || result.data || [];
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (task: AITask) => {
    try {
      const result = task.taskResult ? JSON.parse(task.taskResult) : null;
      const taskInfo = task.taskInfo ? JSON.parse(task.taskInfo) : null;
      
      // Try multiple sources for the URL (Priority: CDN > Original API URL > Other sources)
      const url = 
        result?.saved_video_url ||  // CDN URL (preferred)
        result?.original_video_url || // Original API URL (fallback for History)
        result?.saved_video_urls?.[0] || // CDN URLs array
        result?.original_video_urls?.[0] || // Original URLs array
        result?.content?.video_url || 
        taskInfo?.videos?.[0]?.videoUrl || 
        result?.url || 
        result?.output || 
        '';

      if (url) {
        onSelect({
          id: task.id,
          type: task.mediaType,
          url,
        });
      }
    } catch (error) {
      console.error('Error parsing task result:', error);
    }
  };

  return (
    <Card className="border-2">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{t('aiSelector.title')}</h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-auto p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-destructive">
            <p>{error}</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadTasks}
              className="mt-2"
            >
              {t('aiSelector.retry')}
            </Button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Video className="mx-auto mb-2 h-8 w-8 opacity-20" />
            <p>{t('aiSelector.empty')}</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="grid gap-2 sm:grid-cols-2">
              {tasks.map((task) => {
                let result = null;
                let taskInfo = null;
                let url = '';
                
                try {
                  result = task.taskResult ? JSON.parse(task.taskResult) : null;
                  taskInfo = task.taskInfo ? JSON.parse(task.taskInfo) : null;
                  
                  // Try multiple sources for the URL (Priority: CDN > Original API URL > Other sources)
                  url = 
                    result?.saved_video_url ||  // CDN URL (preferred)
                    result?.original_video_url || // Original API URL (fallback for History)
                    result?.saved_video_urls?.[0] || // CDN URLs array
                    result?.original_video_urls?.[0] || // Original URLs array
                    result?.content?.video_url || 
                    taskInfo?.videos?.[0]?.videoUrl || 
                    result?.url || 
                    result?.output || 
                    '';
                } catch (error) {
                  console.error('Error parsing task data:', error, task);
                }
                
                const isSelected = selectedId === task.id;

                // Skip tasks without valid URL
                if (!url) {
                  return null;
                }

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(task.id);
                      handleSelect(task);
                    }}
                    className={cn(
                      'group relative overflow-hidden rounded-lg border-2 transition-all',
                      isSelected
                        ? 'border-primary'
                        : 'border-transparent hover:border-muted-foreground/20'
                    )}
                  >
                    {task.mediaType === 'video' && url && (
                      <video
                        src={url}
                        className="aspect-video w-full object-cover"
                        muted
                      />
                    )}
                    {task.mediaType === 'image' && url && (
                      <img
                        src={url}
                        alt={task.prompt}
                        className="aspect-video w-full object-cover"
                      />
                    )}

                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                        <CheckCircle className="h-8 w-8 text-primary" />
                      </div>
                    )}

                    {/* Prompt Overlay */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="line-clamp-2 text-xs text-white">
                        {task.prompt}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
