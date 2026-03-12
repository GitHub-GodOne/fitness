"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Edit2, Trash2, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
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
import { Badge } from "@/shared/components/ui/badge";
import { TableCard } from "@/shared/blocks/table";
import { type Table } from "@/shared/types/blocks/table";

interface NotificationRecord {
  id: string;
  userId: string | null;
  type: string;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationManagementProps {
  type?: string;
  page?: number;
  limit?: number;
}

// PLACEHOLDER_COMPONENT

export function NotificationManagement({
  type,
  page: initialPage = 1,
  limit: initialLimit = 30,
}: NotificationManagementProps) {
  const t = useTranslations("admin.notifications");
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTargetType, setCreateTargetType] = useState<string>("all");
  const [createUserIds, setCreateUserIds] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createLink, setCreateLink] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingNotification, setEditingNotification] =
    useState<NotificationRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editLink, setEditLink] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (type && type !== "all") params.append("type", type);
      params.append("page", String(page));
      params.append("limit", String(limit));

      const response = await fetch(
        `/api/admin/notifications?${params.toString()}`,
      );
      const result = await response.json();

      if (result.code === 0) {
        setNotifications(result.data.notifications || []);
        setTotal(result.data.total || 0);
      } else {
        toast.error(result.message || "Failed to load notifications");
      }
    } catch (error: any) {
      console.error("[NotificationManagement] fetch failed:", error);
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [type, page, limit]);

// PLACEHOLDER_HANDLERS

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleCreate = async () => {
    if (!createTitle || !createContent) return;
    setIsCreating(true);
    try {
      const body: any = {
        targetType: createTargetType,
        title: createTitle,
        content: createContent,
        link: createLink || undefined,
      };
      if (createTargetType === "specific" && createUserIds) {
        body.targetUserIds = createUserIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);
      }

      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (result.code === 0) {
        toast.success(t("create.success"));
        setIsCreateOpen(false);
        resetCreateForm();
        fetchNotifications();
      } else {
        toast.error(result.message || t("create.failed"));
      }
    } catch (error: any) {
      toast.error(t("create.failed"));
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateTargetType("all");
    setCreateUserIds("");
    setCreateTitle("");
    setCreateContent("");
    setCreateLink("");
  };

  const handleEdit = (item: NotificationRecord) => {
    setEditingNotification(item);
    setEditTitle(item.title);
    setEditContent(item.content);
    setEditLink(item.link || "");
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingNotification) return;
    setIsUpdating(true);
    try {
      const response = await fetch(
        `/api/admin/notifications/${editingNotification.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editTitle,
            content: editContent,
            link: editLink || null,
          }),
        },
      );
      const result = await response.json();

      if (result.code === 0) {
        toast.success(t("edit.success"));
        setIsEditOpen(false);
        fetchNotifications();
      } else {
        toast.error(result.message || t("edit.failed"));
      }
    } catch (error: any) {
      toast.error(t("edit.failed"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/notifications/${deleteId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.code === 0) {
        toast.success(t("delete.success"));
        setIsDeleteOpen(false);
        setDeleteId(null);
        fetchNotifications();
      } else {
        toast.error(result.message || t("delete.failed"));
      }
    } catch (error: any) {
      toast.error(t("delete.failed"));
    } finally {
      setIsDeleting(false);
    }
  };

// PLACEHOLDER_TABLE

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "video_complete":
        return <Badge className="bg-green-500">Video</Badge>;
      case "system":
        return <Badge className="bg-orange-500">System</Badge>;
      case "announcement":
        return <Badge className="bg-blue-500">Announcement</Badge>;
      case "comment_reply":
        return <Badge className="bg-purple-500">Comment</Badge>;
      case "image_complete":
        return <Badge className="bg-pink-500">Image</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const table: Table = {
    columns: [
      {
        name: "type",
        title: t("fields.type"),
        callback: (item) => getTypeBadge(item.type),
      },
      { name: "title", title: t("fields.title") },
      {
        name: "content",
        title: t("fields.content"),
        callback: (item) => (
          <span className="line-clamp-1 max-w-[200px]">{item.content}</span>
        ),
      },
      {
        name: "userId",
        title: t("fields.user"),
        callback: (item) => (
          <span className="text-xs text-muted-foreground">
            {item.userId ? item.userId.substring(0, 8) + "..." : "-"}
          </span>
        ),
      },
      {
        name: "isRead",
        title: t("fields.is_read"),
        callback: (item) =>
          item.isRead ? (
            <Badge variant="outline">{t("status.read")}</Badge>
          ) : (
            <Badge variant="destructive">{t("status.unread")}</Badge>
          ),
      },
      { name: "createdAt", title: t("fields.created_at"), type: "time" },
      {
        name: "actions",
        title: t("fields.actions"),
        callback: (item) => (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => handleEdit(item)}
            >
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              {t("actions.edit")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-destructive"
              onClick={() => {
                setDeleteId(item.id);
                setIsDeleteOpen(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    data: notifications,
    pagination: { total, page, limit },
  };

// PLACEHOLDER_RENDER

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("create.button")}
        </Button>
      </div>

      <TableCard table={table} />

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("create.title")}</DialogTitle>
            <DialogDescription>{t("create.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("create.target_type")}</Label>
              <Select
                value={createTargetType}
                onValueChange={setCreateTargetType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("create.target_all")}
                  </SelectItem>
                  <SelectItem value="specific">
                    {t("create.target_specific")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createTargetType === "specific" && (
              <div>
                <Label>{t("create.user_ids")}</Label>
                <Input
                  value={createUserIds}
                  onChange={(e) => setCreateUserIds(e.target.value)}
                  placeholder={t("create.user_ids_placeholder")}
                />
              </div>
            )}
            <div>
              <Label>{t("create.notification_title")}</Label>
              <Input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder={t("create.notification_title_placeholder")}
              />
            </div>
            <div>
              <Label>{t("create.notification_content")}</Label>
              <Textarea
                value={createContent}
                onChange={(e) => setCreateContent(e.target.value)}
                placeholder={t("create.notification_content_placeholder")}
                className="min-h-24"
              />
            </div>
            <div>
              <Label>{t("create.notification_link")}</Label>
              <Input
                value={createLink}
                onChange={(e) => setCreateLink(e.target.value)}
                placeholder={t("create.notification_link_placeholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !createTitle || !createContent}
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isCreating ? t("actions.saving") : t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

// PLACEHOLDER_EDIT_DELETE_DIALOGS

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
            <DialogDescription>{t("edit.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("create.notification_title")}</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("create.notification_content")}</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-24"
              />
            </div>
            <div>
              <Label>{t("create.notification_link")}</Label>
              <Input
                value={editLink}
                onChange={(e) => setEditLink(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isUpdating}
            >
              {t("actions.cancel")}
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {isUpdating ? t("actions.saving") : t("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
            <DialogDescription>{t("delete.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {isDeleting ? t("actions.deleting") : t("actions.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
