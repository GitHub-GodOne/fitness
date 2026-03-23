"use client";

import { useCallback, useState } from "react";
import { Gift, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

interface VideoGiftButtonProps {
  taskId: string;
  videoUrl: string;
  prompt?: string | null;
  className?: string;
}

export function VideoGiftButton({
  taskId,
  videoUrl,
  prompt,
  className,
}: VideoGiftButtonProps) {
  const [open, setOpen] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleOpen = useCallback(() => {
    setRecipientEmail("");
    setGiftMessage("");
    setOpen(true);
  }, []);

  const handleSendGift = useCallback(async () => {
    if (!recipientEmail) {
      toast.error("Please enter a recipient email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setSending(true);
      const response = await fetch("/api/video/send-gift", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          recipientEmail,
          message: giftMessage,
          videoUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to send gift. Please try again.");
      }

      toast.success(
        "Gift sent successfully! They will receive an email with your blessing.",
      );
      setOpen(false);
      setRecipientEmail("");
      setGiftMessage("");
    } catch (error: any) {
      toast.error(error?.message || "Failed to send gift. Please try again.");
    } finally {
      setSending(false);
    }
  }, [giftMessage, recipientEmail, taskId, videoUrl]);

  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className={className}
        onClick={handleOpen}
        title="Send as Gift"
      >
        <Gift className="h-4 w-4" />
        <span className="sr-only">Send as Gift</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-500" />
              Share God's Blessing
            </DialogTitle>
            <DialogDescription>
              Send this personalized Bible video as a heartfelt gift to someone
              special.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={`gift-recipient-${taskId}`}>
                Recipient&apos;s Email Address *
              </Label>
              <Input
                id={`gift-recipient-${taskId}`}
                type="email"
                placeholder="e.g., friend@example.com"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`gift-message-${taskId}`}>
                Personal Message (Optional)
              </Label>
              <textarea
                id={`gift-message-${taskId}`}
                placeholder="Add a warm message to accompany this blessing..."
                value={giftMessage}
                onChange={(event) => setGiftMessage(event.target.value)}
                className="min-h-[100px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                This message will be included in the email sent to the recipient.
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm font-medium text-foreground">
                Video: {prompt?.slice(0, 50) || "Bible Verse Video"}
                {prompt && prompt.length > 50 ? "..." : ""}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendGift}
              disabled={sending || !recipientEmail}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Gift
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
