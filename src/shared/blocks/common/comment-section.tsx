"use client";

import { useEffect, useState, useRef } from "react";
import { MessageSquare, TrendingUp, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { CommentWithReplies } from "@/shared/models/comment";
import { CommentInput } from "./comment-input";
import { CommentItem } from "./comment-item";
import { cn } from "@/shared/lib/utils";

interface CommentSectionProps {
  className?: string;
  pageId?: string; // For filtering comments by page
}

export function CommentSection({ className, pageId }: CommentSectionProps) {
  const t = useTranslations("components.comments");
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const replyId = searchParams.get("reply");
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("time"); // time | hot
  const [hasMore, setHasMore] = useState(true);
  const [highlightedCommentId, setHighlightedCommentId] = useState<
    string | null
  >(highlightId);
  const [highlightedReplyId, setHighlightedReplyId] = useState<string | null>(
    replyId,
  );

  useEffect(() => {
    loadComments();
  }, [page, sortBy]);

  // Scroll to and highlight comment when highlight parameter is present
  useEffect(() => {
    if (highlightId && comments.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`comment-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedCommentId(highlightId);
          // Remove highlight after 3 seconds
          setTimeout(() => setHighlightedCommentId(null), 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightId, comments]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        sort: sortBy,
      });

      const response = await fetch(`/api/comments/list?${params}`);
      if (!response.ok) throw new Error("Failed to load comments");

      const result = await response.json();
      if (page === 1) {
        setComments(result.data.data || []);
      } else {
        setComments((prev) => [...prev, ...(result.data.data || [])]);
      }
      setTotalPages(result.data.pagination.totalPages);
      setHasMore(page < result.data.pagination.totalPages);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAdded = () => {
    setPage(1);
    loadComments();
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage((p) => p + 1);
    }
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
    setComments([]);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-muted-foreground">
        <h2 className="text-white flex items-center gap-2 text-xl sm:text-2xl font-bold">
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 font-normal text-muted-foreground" />

          <span className="text-sm sm:text-base font-normal text-muted-foreground">
            {t("section.title")}(
            {comments.length > 0 ? `${comments.length}+` : "0"})
          </span>
        </h2>

        {/* Sort Options */}
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-32 !text-muted-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">
              <div className="flex items-center gap-2 !text-muted-foreground">
                <Clock className="h-4 w-4" />
                {t("section.sort.latest")}
              </div>
            </SelectItem>
            <SelectItem value="hot">
              <div className="flex items-center gap-2 !text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                {t("section.sort.hot")}
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Comment Input */}
      <CommentInput onCommentAdded={handleCommentAdded} />

      {/* Comments List */}
      <div className="space-y-4">
        {loading && page === 1 ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : comments.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p>{t("section.empty")}</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onUpdate={loadComments}
                isHighlighted={highlightedCommentId === comment.id}
                highlightedReplyId={highlightedReplyId}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {t("section.loading")}
                    </>
                  ) : (
                    t("section.loadMore")
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
