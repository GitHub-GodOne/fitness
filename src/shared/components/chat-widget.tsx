"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, LogIn } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAppContext } from "@/shared/contexts/app";

interface ChatMessage {
  id: string;
  content: string;
  type: "user" | "admin";
  createdAt: string;
}

export function ChatWidget() {
  const { user, setIsShowSignModal } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    const fetchMessages = async () => {
      const res = await fetch("/api/support-chat/messages");
      const data = await res.json();
      if (data.code === 0) setMessages(data.data);
    };
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isOpen, messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !user) return;
    setIsLoading(true);
    const res = await fetch("/api/support-chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: inputValue.trim() }),
    });
    const data = await res.json();
    if (data.code === 0) {
      setMessages((prev) => [...prev, data.data]);
      setInputValue("");
    }
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      <div
        className={cn(
          "mb-3 overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300",
          isOpen
            ? "h-[400px] w-[320px] opacity-100 sm:h-[450px] sm:w-[380px]"
            : "h-0 w-0 opacity-0",
        )}
      >
        {isOpen && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b bg-primary px-4 py-3">
              <span className="font-semibold text-white">Support Chat</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
              {!user ? (
                <div className="flex h-full flex-col items-center justify-center gap-4">
                  <p className="text-gray-500">Please sign in to chat</p>
                  <button
                    onClick={() => setIsShowSignModal(true)}
                    className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-white hover:bg-primary/90"
                  >
                    <LogIn className="h-4 w-4" /> Sign In
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-gray-400 text-sm">
                      Start a conversation...
                    </p>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.type === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                          msg.type === "user"
                            ? "bg-primary text-white"
                            : "bg-white shadow-sm",
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            {user && (
              <div className="border-t bg-white p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    className="flex-1 min-w-0 rounded-full border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isLoading}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50 active:scale-95 transition-transform hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110",
          isOpen
            ? "bg-gray-800 text-white"
            : "bg-primary text-white hover:bg-primary/90",
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
