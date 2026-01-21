"use client";

import { useState, useEffect } from "react";
import { Loader2, Mail, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/core/i18n/navigation";

import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { useAppContext } from "@/shared/contexts/app";
import { useMediaQuery } from "@/shared/hooks/use-media-query";

interface RefundFormProps {
  className?: string;
}

export function RefundForm({ className }: RefundFormProps) {
  const t = useTranslations("refund");
  const { user } = useAppContext();
  const isMobile = !useMediaQuery("(min-width: 768px)");
  const [remainingCredits, setRemainingCredits] = useState<number>(0);
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);

  const [reason, setReason] = useState("");
  const [account, setAccount] = useState("");
  const [creditsAmount, setCreditsAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user credits
  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) {
        setIsLoadingCredits(false);
        return;
      }

      try {
        const response = await fetch("/api/user/get-user-credits", {
          method: "POST",
        });
        if (response.ok) {
          const result = await response.json();
          if (result.code === 0) {
            // API returns { remainingCredits: number }
            const credits = result.data?.remainingCredits ?? result.data ?? 0;
            setRemainingCredits(typeof credits === "number" ? credits : 0);
          }
        }
      } catch (error) {
        console.error("[RefundForm] Failed to fetch credits:", error);
      } finally {
        setIsLoadingCredits(false);
      }
    };

    fetchCredits();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t("sign_in_required"));
      return;
    }

    // Validate credits amount
    const creditsNum = parseInt(creditsAmount, 10);
    if (isNaN(creditsNum) || creditsNum <= 0) {
      toast.error(t("invalid_credits_amount"));
      return;
    }

    if (remainingCredits <= 3) {
      toast.error(t("insufficient_credits_for_refund"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/refund/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reason.trim(),
          account: account.trim(),
          creditsAmount: creditsNum,
          description: description.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.code !== 0) {
        throw new Error(result.message || t("submit_failed"));
      }

      toast.success(t("submit_success"));

      // Reset form
      setReason("");
      setAccount("");
      setCreditsAmount("");
      setDescription("");
    } catch (error: any) {
      console.error("[RefundForm] Submit error:", error);
      toast.error(error.message || t("submit_failed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingCredits) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("sign_in_required")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const canRefund = remainingCredits > 3;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Mail className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canRefund ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {String(t("insufficient_credits_message_prefix"))}{" "}
            {String(remainingCredits)}{" "}
            {String(t("insufficient_credits_message_suffix"))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="flex items-center gap-1">
                {t("fields.reason")}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("fields.reason_placeholder")}
                className="min-h-32 sm:min-h-24 text-sm sm:text-base"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account" className="flex items-center gap-1">
                {t("fields.account")}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="account"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={t("fields.account_placeholder")}
                className="min-h-28 sm:min-h-20 text-sm sm:text-base"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="credits-amount"
                className="flex items-center gap-1"
              >
                {t("fields.credits_amount")}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="credits-amount"
                type="number"
                min="1"
                max={remainingCredits}
                value={creditsAmount}
                onChange={(e) => setCreditsAmount(e.target.value)}
                placeholder={t("fields.credits_amount_placeholder")}
                className="text-sm sm:text-base"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                {t("fields.credits_amount_hint", {
                  current: remainingCredits,
                  max: remainingCredits,
                })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("fields.description")}</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("fields.description_placeholder")}
                className="min-h-28 sm:min-h-20 text-sm sm:text-base"
                disabled={isSubmitting}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !canRefund}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t("submit")}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {t("note")}
            </p>
          </form>
        )}

        {canRefund && (
          <div className="mt-6 border-t pt-4">
            <Link href="/refund/my-requests">
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                {t("view_my_requests")}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
