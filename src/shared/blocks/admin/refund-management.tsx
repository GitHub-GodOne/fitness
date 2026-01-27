"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, X, Loader2, Edit2 } from "lucide-react";
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
import { RefundRequestStatus } from "@/shared/types/refund";

interface RefundRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  reason: string;
  account: string;
  requestedCreditsAmount: number;
  approvedCreditsAmount: number | null;
  deductedCreditsAmount: number | null;
  description: string | null;
  status: string;
  remainingCredits: number | null;
  adminNotes: string | null;
  processedAt: string | null;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
  };
}

interface RefundManagementProps {
  status?: string;
  page?: number;
  limit?: number;
}

export function RefundManagement({
  status,
  page: initialPage = 1,
  limit: initialLimit = 30,
}: RefundManagementProps) {
  const t = useTranslations("admin.refunds");
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRequest, setEditingRequest] = useState<RefundRequest | null>(
    null,
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editApprovedCredits, setEditApprovedCredits] = useState<string>("");
  const [editDeductCredits, setEditDeductCredits] = useState<string>("");
  const [editAdminNotes, setEditAdminNotes] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status && status !== "all") {
        params.append("status", status);
      }
      params.append("page", String(page));
      params.append("limit", String(limit));

      const response = await fetch(`/api/refund/list?${params.toString()}`);
      const result = await response.json();

      if (result.code === 0) {
        setRequests(result.data.requests || []);
        setTotal(result.data.total || 0);
      } else {
        toast.error(result.message || "Failed to load refund requests");
      }
    } catch (error: any) {
      console.error("[RefundManagement] Failed to fetch requests:", error);
      toast.error("Failed to load refund requests");
    } finally {
      setIsLoading(false);
    }
  }, [status, page, limit]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleEdit = (request: RefundRequest) => {
    setEditingRequest(request);
    setEditStatus(request.status);
    const approvedAmount =
      request.approvedCreditsAmount?.toString() ||
      request.requestedCreditsAmount.toString();
    setEditApprovedCredits(approvedAmount);
    setEditDeductCredits(
      request.deductedCreditsAmount?.toString() || approvedAmount,
    );
    setEditAdminNotes(request.adminNotes || "");
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingRequest) return;

    setIsUpdating(true);
    try {
      const response = await fetch("/api/refund/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: editingRequest.id,
          status: editStatus,
          approvedCreditsAmount: editApprovedCredits
            ? parseInt(editApprovedCredits, 10)
            : null,
          deductCreditsAmount: editDeductCredits
            ? parseInt(editDeductCredits, 10)
            : 0,
          adminNotes: editAdminNotes || null,
        }),
      });

      const result = await response.json();

      if (result.code === 0) {
        toast.success(t("update.success"));
        setIsEditDialogOpen(false);
        fetchRequests();
      } else {
        toast.error(result.message || t("update.failed"));
      }
    } catch (error: any) {
      console.error("[RefundManagement] Failed to update:", error);
      toast.error(t("update.failed"));
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case RefundRequestStatus.PENDING:
        return <Badge variant="outline">{t("status.pending")}</Badge>;
      case RefundRequestStatus.COMPLETED:
        return (
          <Badge className="bg-green-500">{t("status.completed")} ✅</Badge>
        );
      case RefundRequestStatus.REJECTED:
        return <Badge variant="destructive">{t("status.rejected")} ❌</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const table: Table = {
    columns: [
      {
        name: "id",
        title: t("fields.id"),
        type: "copy",
      },
      {
        name: "user",
        title: t("fields.user"),
        type: "user",
      },
      {
        name: "userEmail",
        title: t("fields.user_email"),
      },
      {
        name: "reason",
        title: t("fields.reason"),
      },
      {
        name: "account",
        title: t("fields.account"),
      },
      {
        name: "requestedCreditsAmount",
        title: t("fields.requested_credits"),
        callback: (item) => (
          <span className="font-medium">{item.requestedCreditsAmount}</span>
        ),
      },
      {
        name: "approvedCreditsAmount",
        title: t("fields.approved_credits"),
        callback: (item) => (
          <span
            className={
              item.approvedCreditsAmount
                ? "font-medium text-green-600"
                : "text-muted-foreground"
            }
          >
            {item.approvedCreditsAmount ?? "-"}
          </span>
        ),
      },
      {
        name: "deductedCreditsAmount",
        title: t("fields.deducted_credits"),
        callback: (item) => (
          <span
            className={
              item.deductedCreditsAmount
                ? "font-medium text-red-600"
                : "text-muted-foreground"
            }
          >
            {item.deductedCreditsAmount ?? "-"}
          </span>
        ),
      },
      {
        name: "remainingCredits",
        title: t("fields.remaining_credits"),
        placeholder: "-",
      },
      {
        name: "status",
        title: t("fields.status"),
        callback: (item) => getStatusBadge(item.status),
      },
      {
        name: "adminNotes",
        title: t("fields.admin_notes"),
        placeholder: "-",
      },
      {
        name: "createdAt",
        title: t("fields.created_at"),
        type: "time",
      },
      {
        name: "processedAt",
        title: t("fields.processed_at"),
        type: "time",
        placeholder: "-",
      },
      {
        name: "actions",
        title: t("fields.actions"),
        callback: (item) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(item)}
            className="h-8"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1" />
            {t("actions.edit")}
          </Button>
        ),
      },
    ],
    data: requests,
    pagination: {
      total,
      page,
      limit,
    },
  };

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
      <TableCard table={table} />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
            <DialogDescription>{t("edit.description")}</DialogDescription>
          </DialogHeader>

          {editingRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("fields.user_email")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {editingRequest.userEmail}
                  </p>
                </div>
                <div>
                  <Label>{t("fields.requested_credits")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {editingRequest.requestedCreditsAmount}
                  </p>
                </div>
              </div>

              <div>
                <Label>{t("fields.reason")}</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {editingRequest.reason}
                </p>
              </div>

              <div>
                <Label>{t("fields.account")}</Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {editingRequest.account}
                </p>
              </div>

              {editingRequest.description && (
                <div>
                  <Label>{t("fields.description")}</Label>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {editingRequest.description}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="edit-status">{t("fields.status")} *</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RefundRequestStatus.PENDING}>
                      {t("status.pending")}
                    </SelectItem>
                    <SelectItem value={RefundRequestStatus.COMPLETED}>
                      {t("status.completed")} ✅
                    </SelectItem>
                    <SelectItem value={RefundRequestStatus.REJECTED}>
                      {t("status.rejected")} ❌
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-approved-credits">
                  {t("fields.approved_credits")}
                </Label>
                <Input
                  id="edit-approved-credits"
                  type="number"
                  min="0"
                  max={editingRequest.requestedCreditsAmount}
                  value={editApprovedCredits}
                  onChange={(e) => setEditApprovedCredits(e.target.value)}
                  placeholder={editingRequest.requestedCreditsAmount.toString()}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("edit.approved_credits_hint")}
                </p>
              </div>

              <div>
                <Label htmlFor="edit-deduct-credits">
                  {t("fields.deduct_credits")}
                </Label>
                <Input
                  id="edit-deduct-credits"
                  type="number"
                  min="0"
                  max={editingRequest.remainingCredits || 0}
                  value={editDeductCredits}
                  onChange={(e) => setEditDeductCredits(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("edit.deduct_credits_hint", {
                    available: editingRequest.remainingCredits || 0,
                  })}
                </p>
              </div>

              <div>
                <Label htmlFor="edit-admin-notes">
                  {t("fields.admin_notes")}
                </Label>
                <Textarea
                  id="edit-admin-notes"
                  value={editAdminNotes}
                  onChange={(e) => setEditAdminNotes(e.target.value)}
                  placeholder={t("edit.admin_notes_placeholder")}
                  className="min-h-24"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isUpdating}
            >
              {t("actions.cancel")}
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("actions.updating")}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t("actions.save")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
