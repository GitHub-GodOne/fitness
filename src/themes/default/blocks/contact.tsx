"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Input } from "@/shared/components/ui/input";
import { useAppContext } from "@/shared/contexts/app";
import { toast } from "sonner";

interface ContactSection {
  id?: string;
  title?: string;
  description?: string;
  submit?: {
    action?: string;
    input?: { placeholder?: string };
    message?: { placeholder?: string };
    button?: { title?: string };
  };
  success_message?: string;
  className?: string;
}

export function Contact({ section }: { section: ContactSection }) {
  const { user } = useAppContext();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!user && !email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(section.submit?.action || "/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user ? undefined : email, message }),
      });
      const data = await res.json();
      if (data.code === 0) {
        toast.success(section.success_message || "Message sent!");
        setEmail("");
        setMessage("");
      } else {
        toast.error(data.message || "Failed to send message");
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id={section.id}
      className={`py-16 md:py-24 ${section.className || ""}`}
    >
      <div className="mx-auto max-w-2xl px-4 text-center">
        {section.title && (
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {section.title}
          </h2>
        )}
        {section.description && (
          <p className="mt-4 text-lg text-muted-foreground">
            {section.description}
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
          {!user && (
            <Input
              type="email"
              required
              placeholder={section.submit?.input?.placeholder || "Your email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
          <Textarea
            required
            rows={5}
            placeholder={section.submit?.message?.placeholder || "Your message"}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "..." : section.submit?.button?.title || "Send"}
          </Button>
        </form>
      </div>
    </section>
  );
}
