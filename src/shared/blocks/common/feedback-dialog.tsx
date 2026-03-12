"use client";

import { useState } from "react";
import { useSession } from "@/core/auth/client";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels?: {
    title?: string;
    description?: string;
    emailLabel?: string;
    emailPlaceholder?: string;
    contentLabel?: string;
    contentPlaceholder?: string;
    submit?: string;
    cancel?: string;
    success?: string;
    errorRequired?: string;
    errorEmail?: string;
    errorSubmit?: string;
  };
}

export function FeedbackDialog({ open, onOpenChange, labels }: FeedbackDialogProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const t = {
    title: labels?.title || "Contact Support",
    description: labels?.description || "Describe your issue and we'll get back to you.",
    emailLabel: labels?.emailLabel || "Email",
    emailPlaceholder: labels?.emailPlaceholder || "your@email.com",
    contentLabel: labels?.contentLabel || "Description",
    contentPlaceholder: labels?.contentPlaceholder || "Please describe your issue...",
    submit: labels?.submit || "Submit",
    cancel: labels?.cancel || "Cancel",
    success: labels?.success || "Thank you! We'll get back to you soon.",
    errorRequired: labels?.errorRequired || "Please describe your issue.",
    errorEmail: labels?.errorEmail || "Please enter a valid email address.",
    errorSubmit: labels?.errorSubmit || "Failed to submit. Please try again.",
  };

  const handleSubmit = async () => {
    setError("");
    if (!content.trim()) {
      setError(t.errorRequired);
      return;
    }
    if (!isLoggedIn && (!email.trim() || !email.includes("@"))) {
      setError(t.errorEmail);
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          ...(!isLoggedIn && { email: email.trim() }),
        }),
      });
      const data = await resp.json();
      if (data.code !== 0) {
        setError(data.message || t.errorSubmit);
        return;
      }
      setSubmitted(true);
    } catch {
      setError(t.errorSubmit);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setEmail("");
      setContent("");
      setError("");
      setSubmitted(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <p className="text-sm text-green-600 dark:text-green-400 py-4">{t.success}</p>
        ) : (
          <div className="space-y-4">
            {!isLoggedIn && (
              <div className="space-y-2">
                <Label htmlFor="feedback-email">{t.emailLabel}</Label>
                <Input
                  id="feedback-email"
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="feedback-content">{t.contentLabel}</Label>
              <Textarea
                id="feedback-content"
                placeholder={t.contentPlaceholder}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        <DialogFooter>
          {!submitted && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>
                {t.cancel}
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "..." : t.submit}
              </Button>
            </>
          )}
          {submitted && (
            <Button onClick={() => handleClose(false)}>{t.cancel}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
