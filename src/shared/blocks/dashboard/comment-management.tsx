"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Eye,
  EyeOff,
  Trash2,
  Video,
  ThumbsUp,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { CommentWithReplies } from "@/shared/models/comment";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { cn } from "@/shared/lib/utils";

interface CommentManagementProps {
  status?: string;
  page?: number;
  limit?: number;
}

export function CommentManagement({
  status: initialStatus,
  page: initialPage = 1,
  limit: initialLimit = 20,
}: CommentManagementProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("time");
  const [selectedComment, setSelectedComment] =
    useState<CommentWithReplies | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    loadComments();
  }, [page, sortBy, initialStatus]);

  const loadComments = async () => {
    setLoading(true);
    try {
      // Note: This would need an admin version of the API that shows all comments
      const params = new URLSearchParams({
        page: page.toString(),
        limit: initialLimit.toString(),
        sort: sortBy,
      });

      if (initialStatus && initialStatus !== "all") {
        params.append("status", initialStatus);
      }

      const response = await fetch(`/api/comments/list?${params}`);
      if (!response.ok) throw new Error("Failed to load comments");

      const result = await response.json();
      setComments(result.data.data || []);
      setTotalPages(result.data.pagination.totalPages);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("加载评论失败");
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityToggle = async (
    id: string,
    type: "comment" | "reply",
    currentStatus: string,
  ) => {
    try {
      const newStatus = currentStatus === "visible" ? "hidden" : "visible";
      const response = await fetch("/api/comments/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type, status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast.success(`已将评论设为${newStatus === "visible" ? "可见" : "隐藏"}`);
      loadComments();
      setDetailOpen(false);
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast.error("更新失败");
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("zh-CN");
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            评论列表
          </CardTitle>
          <CardDescription>管理所有用户评论和回复</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <Label className="text-sm">排序方式:</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">最新</SelectItem>
                <SelectItem value="hot">最热</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {loading && page === 1 ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : comments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              暂无评论
            </CardContent>
          </Card>
        ) : (
          <>
            {comments.map((comment) => (
              <Card
                key={comment.id}
                className={cn(
                  "transition-all hover:shadow-md",
                  comment.status === "hidden" && "opacity-60",
                )}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex gap-2 sm:gap-3">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                      <AvatarImage src={comment.userAvatar || undefined} />
                      <AvatarFallback>
                        {comment.userName[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-2">
                      {/* User Info */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <span className="font-semibold">
                            {comment.userName}
                          </span>
                          <span className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                            {comment.userEmail}
                          </span>
                          <Badge
                            variant={
                              comment.status === "visible"
                                ? "default"
                                : "secondary"
                            }
                            className="w-fit"
                          >
                            {comment.status === "visible" ? "可见" : "隐藏"}
                          </Badge>
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>

                      {/* Comment Content */}
                      <p className="text-sm line-clamp-3">{comment.content}</p>

                      {/* Referenced Content */}
                      {comment.referencedTaskUrl && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Video className="h-4 w-4" />
                          <span>引用了 AI 生成内容</span>
                        </div>
                      )}

                      {/* Stats and Actions */}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <ThumbsUp className="h-4 w-4" />
                            {comment.likes}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MessageCircle className="h-4 w-4" />
                            {comment.replies}
                          </div>
                        </div>

                        <div className="flex-1" />

                        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedComment(comment);
                              setDetailOpen(true);
                            }}
                            className="w-full justify-start sm:w-auto sm:justify-center"
                          >
                            查看详情
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleVisibilityToggle(
                                comment.id,
                                "comment",
                                comment.status,
                              )
                            }
                            className="w-full justify-start sm:w-auto sm:justify-center"
                          >
                            {comment.status === "visible" ? (
                              <>
                                <EyeOff className="mr-1 h-4 w-4" />
                                隐藏
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1 h-4 w-4" />
                                显示
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  上一页
                </Button>
                <span className="text-sm">
                  第 {page} / {totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Dialog */}
      {selectedComment && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>评论详情</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedComment.userAvatar || undefined} />
                  <AvatarFallback>
                    {selectedComment.userName[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">
                    {selectedComment.userName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedComment.userEmail}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div>
                <Label>评论内容</Label>
                <div className="mt-2 rounded-lg border bg-muted/50 p-4">
                  {selectedComment.content}
                </div>
              </div>

              {/* Referenced Content */}
              {selectedComment.referencedTaskUrl && (
                <div>
                  <Label>引用内容</Label>
                  <div className="mt-2 rounded-lg border p-3">
                    {selectedComment.referencedTaskType === "video" ? (
                      <video
                        src={selectedComment.referencedTaskUrl}
                        controls
                        className="w-full rounded"
                      />
                    ) : (
                      <img
                        src={selectedComment.referencedTaskUrl}
                        alt="Referenced content"
                        className="w-full rounded"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                <div>
                  <div className="text-sm text-muted-foreground">点赞</div>
                  <div className="text-2xl font-bold">
                    {selectedComment.likes}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">回复</div>
                  <div className="text-2xl font-bold">
                    {selectedComment.replies}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">状态</div>
                  <Badge
                    className="mt-1"
                    variant={
                      selectedComment.status === "visible"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {selectedComment.status === "visible" ? "可见" : "隐藏"}
                  </Badge>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">创建时间: </span>
                  {formatDate(selectedComment.createdAt)}
                </div>
                <div>
                  <span className="text-muted-foreground">IP地址: </span>
                  {selectedComment.ipAddress || "未知"}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  handleVisibilityToggle(
                    selectedComment.id,
                    "comment",
                    selectedComment.status,
                  )
                }
              >
                {selectedComment.status === "visible" ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    隐藏评论
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    显示评论
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
