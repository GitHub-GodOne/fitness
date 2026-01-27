'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useAppContext } from '@/shared/contexts/app';

interface CommentReplyInputProps {
  commentId: string;
  parentReplyId?: string;
  onCancel?: () => void;
  onReplyAdded?: () => void;
}

export function CommentReplyInput({
  commentId,
  parentReplyId,
  onCancel,
  onReplyAdded,
}: CommentReplyInputProps) {
  const { user } = useAppContext();
  const [content, setContent] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('请输入回复内容');
      return;
    }

    if (!user && (!userName.trim() || !userEmail.trim())) {
      toast.error('请填写昵称和邮箱');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          parentReplyId: parentReplyId || null,
          content: content.trim(),
          userName: userName.trim(),
          userEmail: userEmail.trim(),
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
      toast.success('回复发布成功');
      setContent('');
      setUserName('');
      setUserEmail('');
      onReplyAdded?.();
    } catch (error: any) {
      console.error('Reply submission error:', error);
      toast.error(error.message || '发布失败,请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-3">
      {/* Anonymous User Fields */}
      {!user && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="replyUserName" className="text-xs">
              昵称 *
            </Label>
            <Input
              id="replyUserName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="请输入昵称"
              className="h-8 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="replyUserEmail" className="text-xs">
              邮箱 *
            </Label>
            <Input
              id="replyUserEmail"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-8 text-sm"
              required
            />
          </div>
        </div>
      )}

      {/* Reply Content */}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="写下你的回复..."
        className="min-h-20 resize-none text-sm"
        maxLength={2000}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {content.length} / 2000
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8"
            >
              取消
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="h-8 gap-1.5"
          >
            {submitting ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                发布中...
              </>
            ) : (
              <>
                <Send className="h-3 w-3" />
                发布回复
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
