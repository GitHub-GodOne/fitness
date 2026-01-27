"use client";

import { useState } from "react";
import {
  ThumbsUp,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Play,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { CommentWithReplies, CommentReply } from "@/shared/models/comment";
import { cn } from "@/shared/lib/utils";
import { CommentReplySection } from "./comment-reply-section";

interface CommentItemProps {
  comment: CommentWithReplies;
  onUpdate?: () => void;
  isHighlighted?: boolean;
  highlightedReplyId?: string | null;
}

export function CommentItem({
  comment,
  onUpdate,
  isHighlighted,
  highlightedReplyId,
}: CommentItemProps) {
  const t = useTranslations("components.comments");
  const [isLiked, setIsLiked] = useState(comment.isLikedByUser || false);
  const [likeCount, setLikeCount] = useState(comment.likes);
  const [showReplies, setShowReplies] = useState(!!highlightedReplyId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [liking, setLiking] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Determine if content should be collapsible
  const shouldCollapse = comment.content.length > 500;
  const displayContent =
    shouldCollapse && !isExpanded
      ? comment.content.slice(0, 500) + "..."
      : comment.content;

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);

    try {
      const response = await fetch("/api/comments/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: comment.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "操作失败");
      }

      const result = await response.json();
      setIsLiked(result.data.liked);
      setLikeCount((prev) => (result.data.liked ? prev + 1 : prev - 1));
    } catch (error: any) {
      toast.error(error.message || t("toast.likeFailed"));
    } finally {
      setLiking(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const now = new Date();
    const commentDate = typeof date === "string" ? new Date(date) : date;

    // Handle invalid dates
    if (isNaN(commentDate.getTime())) {
      return t("item.justNow");
    }

    const diffMs = Math.abs(now.getTime() - commentDate.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("item.justNow");
    if (diffMins < 60) return t("item.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("item.hoursAgo", { count: diffHours });
    if (diffDays < 7) return t("item.daysAgo", { count: diffDays });

    return commentDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card
      id={`comment-${comment.id}`}
      className={cn(
        "transition-all duration-300",
        isHighlighted && "ring-2 ring-primary shadow-lg",
      )}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-2 sm:gap-3">
          {/* Avatar */}
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
            <AvatarImage src={comment.userAvatar || undefined} />
            <AvatarFallback>
              {comment.userName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-2">
            {/* User Info */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base font-semibold">
                {comment.userName}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {formatDate(comment.createdAt)}
              </span>
            </div>

            {/* Comment Content */}
            <div className="space-y-2">
              <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed break-words">
                {displayContent}
              </p>
              {shouldCollapse && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-auto p-0 text-xs sm:text-sm text-primary hover:underline"
                >
                  {isExpanded ? t("item.collapse") : t("item.expand")}
                </Button>
              )}

              {/* Referenced AI Content */}
              {comment.referencedTaskUrl && (
                <div className="rounded-lg border bg-muted/50 p-2 sm:p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      {comment.referencedTaskType === "video" ? (
                        <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : comment.referencedTaskType === "image" ? (
                        <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : (
                        <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                      <span className="text-xs sm:text-sm">
                        {t("item.referenced")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPreviewOpen(true)}
                      className="h-8 w-full gap-1.5 text-xs sm:h-auto sm:w-auto sm:gap-2 sm:text-sm"
                    >
                      <Play className="h-3 w-3" />
                      {comment.referencedTaskType === "video"
                        ? t("item.playVideo")
                        : t("item.viewImage")}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={liking}
                className={cn(
                  "h-auto gap-1 px-2 py-1 text-xs sm:gap-1.5 sm:text-sm",
                  isLiked && "text-primary",
                )}
              >
                <ThumbsUp
                  className={cn(
                    "h-3.5 w-3.5 sm:h-4 sm:w-4",
                    isLiked && "fill-current",
                  )}
                />
                <span>{likeCount > 0 ? likeCount : t("item.like")}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplies(!showReplies)}
                className="h-auto gap-1 px-2 py-1 text-xs sm:gap-1.5 sm:text-sm"
              >
                <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>
                  {comment.replies > 0 ? comment.replies : t("item.reply")}
                </span>
                {comment.replies > 0 &&
                  (showReplies ? (
                    <ChevronUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  ) : (
                    <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  ))}
              </Button>
            </div>

            {/* Replies Section */}
            {showReplies && (
              <CommentReplySection
                commentId={comment.id}
                replyCount={comment.replies}
                onUpdate={onUpdate}
                highlightedReplyId={highlightedReplyId}
              />
            )}
          </div>
        </div>
      </CardContent>

      {/* Preview Dialog */}
      {comment.referencedTaskUrl && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl w-full p-0">
            <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <DialogTitle className="text-base sm:text-lg">
                {comment.referencedTaskType === "video"
                  ? t("item.videoPreview")
                  : t("item.imagePreview")}
              </DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              {comment.referencedTaskType === "video" ? (
                <video
                  src={comment.referencedTaskUrl}
                  controls
                  autoPlay
                  className="w-full h-auto rounded-lg"
                  style={{ maxHeight: "70vh" }}
                />
              ) : comment.referencedTaskType === "image" ? (
                <img
                  src={comment.referencedTaskUrl}
                  alt="Referenced content"
                  className="w-full h-auto rounded-lg"
                  style={{ maxHeight: "70vh", objectFit: "contain" }}
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
