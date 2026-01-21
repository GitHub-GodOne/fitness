"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { CommentReply } from "@/shared/models/comment";
import { cn } from "@/shared/lib/utils";
import { CommentReplyInput } from "./comment-reply-input";

interface CommentReplySectionProps {
  commentId: string;
  replyCount: number;
  onUpdate?: () => void;
  highlightedReplyId?: string | null;
}

export function CommentReplySection({
  commentId,
  replyCount,
  onUpdate,
  highlightedReplyId,
}: CommentReplySectionProps) {
  const t = useTranslations("components.comments");
  const [replies, setReplies] = useState<CommentReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(
    highlightedReplyId || null,
  );

  useEffect(() => {
    loadReplies();
  }, [commentId]);

  // Scroll to and highlight reply when highlightedReplyId is present
  useEffect(() => {
    if (highlightedReplyId && replies.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`reply-${highlightedReplyId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedId(highlightedReplyId);
          // Remove highlight after 3 seconds
          setTimeout(() => setHighlightedId(null), 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightedReplyId, replies]);

  const loadReplies = async (loadMore = false) => {
    setLoading(true);
    try {
      const currentPage = loadMore ? page + 1 : 1;
      const params = new URLSearchParams({
        commentId,
        page: currentPage.toString(),
        limit: "10",
      });

      const response = await fetch(`/api/comments/replies?${params}`);
      if (!response.ok) throw new Error("Failed to load replies");

      const result = await response.json();
      const newReplies = result.data.data || [];

      if (loadMore) {
        setReplies((prev) => [...prev, ...newReplies]);
        setPage(currentPage);
      } else {
        setReplies(newReplies);
        setPage(1);
      }

      setHasMore(currentPage < result.data.pagination.totalPages);
    } catch (error) {
      console.error("Error loading replies:", error);
      toast.error("加载回复失败");
    } finally {
      setLoading(false);
    }
  };

  const handleReplyAdded = () => {
    loadReplies();
    setShowInput(false);
    onUpdate?.();
  };

  const formatDate = (date: Date | string) => {
    const now = new Date();
    const commentDate = typeof date === "string" ? new Date(date) : date;

    // Handle invalid dates
    if (isNaN(commentDate.getTime())) {
      return t("reply.justNow");
    }

    const diffMs = Math.abs(now.getTime() - commentDate.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("reply.justNow");
    if (diffMins < 60) return t("reply.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("reply.hoursAgo", { count: diffHours });
    if (diffDays < 7) return t("reply.daysAgo", { count: diffDays });

    return commentDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      {/* Reply Input */}
      {showInput ? (
        <CommentReplyInput
          commentId={commentId}
          onCancel={() => setShowInput(false)}
          onReplyAdded={handleReplyAdded}
        />
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInput(true)}
          className="h-auto px-0 text-primary hover:underline"
        >
          写回复...
        </Button>
      )}

      {/* Replies List */}
      {loading && replies.length === 0 ? (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {replies.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                isHighlighted={highlightedId === reply.id}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadReplies(true)}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  加载中...
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" />
                  加载更多回复
                </>
              )}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function ReplyItem({
  reply,
  isHighlighted,
}: {
  reply: CommentReply;
  isHighlighted?: boolean;
}) {
  const t = useTranslations("components.comments");
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reply.likes);
  const [liking, setLiking] = useState(false);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);

    try {
      const response = await fetch("/api/comments/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId: reply.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "操作失败");
      }

      const result = await response.json();
      setIsLiked(result.data.liked);
      setLikeCount((prev: number) => (result.data.liked ? prev + 1 : prev - 1));
    } catch (error: any) {
      toast.error(error.message || "操作失败");
    } finally {
      setLiking(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const now = new Date();
    const commentDate = typeof date === "string" ? new Date(date) : date;

    // Handle invalid dates
    if (isNaN(commentDate.getTime())) {
      return t("reply.justNow");
    }

    const diffMs = Math.abs(now.getTime() - commentDate.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("reply.justNow");
    if (diffMins < 60) return t("reply.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("reply.hoursAgo", { count: diffHours });
    if (diffDays < 7) return t("reply.daysAgo", { count: diffDays });

    return commentDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      id={`reply-${reply.id}`}
      className={cn(
        "flex gap-2 rounded-lg p-2 transition-all duration-300",
        isHighlighted && "ring-2 ring-primary shadow-lg bg-primary/5",
      )}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={reply.userAvatar || undefined} />
        <AvatarFallback className="text-xs">
          {reply.userName[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{reply.userName}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(reply.createdAt)}
          </span>
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {reply.content}
        </p>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={liking}
          className={cn(
            "h-auto gap-1 px-0 py-1 text-xs",
            isLiked && "text-primary",
          )}
        >
          <ThumbsUp className={cn("h-3 w-3", isLiked && "fill-current")} />
          {likeCount > 0 && <span>{likeCount}</span>}
        </Button>
      </div>
    </div>
  );
}
