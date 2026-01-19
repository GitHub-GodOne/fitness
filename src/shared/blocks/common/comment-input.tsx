'use client';

import { useState } from 'react';
import { Send, Video } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent } from '@/shared/components/ui/card';
import { useAppContext } from '@/shared/contexts/app';
import { AITaskSelector } from './ai-task-selector';

interface CommentInputProps {
  onCommentAdded?: () => void;
}

export function CommentInput({ onCommentAdded }: CommentInputProps) {
  const t = useTranslations('components.comments');
  const { user } = useAppContext();
  const [content, setContent] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{
    id: string;
    type: string;
    url: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error(t('toast.commentRequired'));
      return;
    }

    if (!user && (!userName.trim() || !userEmail.trim())) {
      toast.error(t('toast.nameEmailRequired'));
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/comments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          userName: userName.trim(),
          userEmail: userEmail.trim(),
          referencedTaskId: selectedTask?.id || null,
        }),
      });

      if (!response.ok) {
        let errorMessage = '发布失败';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `Error ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      toast.success(t('toast.commentSuccess'));
      setContent('');
      setSelectedTask(null);
      onCommentAdded?.();
    } catch (error: any) {
      console.error('Comment submission error:', error);
      toast.error(error.message || t('toast.commentFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Anonymous User Fields */}
          {!user && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="userName">{t('input.userName')} *</Label>
                <Input
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder={t('input.userName')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userEmail">{t('input.userEmail')} *</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
          )}

          {/* Comment Content */}
          <div className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                user
                  ? t('input.placeholder')
                  : t('input.placeholderAnonymous')
              }
              className="min-h-24 resize-none"
              maxLength={5000}
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('input.characterCount', { count: content.length })}</span>
            </div>
          </div>

          {/* Referenced Task Preview */}
          {selectedTask && (
            <div className="rounded-lg border bg-muted/50 p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                  <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{t('item.referenced')}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTask(null)}
                  className="h-7 text-xs sm:h-auto sm:text-sm"
                >
                  {t('input.cancel')}
                </Button>
              </div>
              {selectedTask.type === 'video' && (
                <video
                  src={selectedTask.url}
                  className="mt-2 w-full rounded"
                  controls
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {user && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTaskSelector(!showTaskSelector)}
                className="w-full sm:w-auto"
              >
                <Video className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">{t('input.referenceAI')}</span>
              </Button>
            )}

            <div className="flex-1" />

            <Button type="submit" disabled={submitting} className="w-full gap-2 sm:w-auto">
              {submitting ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">{t('input.submitting')}</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">{t('input.submit')}</span>
                </>
              )}
            </Button>
          </div>

          {/* AI Task Selector */}
          {showTaskSelector && (
            <AITaskSelector
              onSelect={(task) => {
                setSelectedTask(task);
                setShowTaskSelector(false);
              }}
              onCancel={() => setShowTaskSelector(false)}
            />
          )}
        </form>
      </CardContent>
    </Card>
  );
}
