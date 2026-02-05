"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, LogIn, Music, VolumeX, Headphones } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useAppContext } from "@/shared/contexts/app";

interface ChatMessage {
  id: string;
  content: string;
  type: "user" | "admin";
  createdAt: string;
}

/**
 * Floating Action Button Widget
 * Combines Music Player and Chat Support in one expandable widget
 * - Default: Shows main FAB button
 * - Expanded: Shows Music and Chat options
 * - Chat opens chat window
 * - Music toggles background worship music
 */
export function FloatingWidget() {
  const { user, setIsShowSignModal } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Music state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(
      "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=soft-piano-100-bpm-121529.mp3"
    );
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;
    audioRef.current.preload = "auto";

    audioRef.current.addEventListener("canplaythrough", () => {
      setIsLoaded(true);
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Chat messages polling
  useEffect(() => {
    if (!isChatOpen || !user) return;
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
  }, [isChatOpen, user]);

  useEffect(() => {
    if (isChatOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isChatOpen, messages]);

  const toggleMusic = () => {
    if (!audioRef.current || !isLoaded) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsMuted(true);
    } else {
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch((error) => {
        console.log("Audio playback failed:", error);
      });
      setIsPlaying(true);
      setIsMuted(false);
    }
  };

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

  const openChat = () => {
    setIsChatOpen(true);
    setIsExpanded(false);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  return (
    <>
      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-4 z-50 overflow-hidden rounded-2xl bg-white shadow-2xl h-[400px] w-[320px] sm:h-[450px] sm:w-[380px]">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b bg-primary px-4 py-3">
              <span className="font-semibold text-white">Support Chat</span>
              <button
                onClick={closeChat}
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
        </div>
      )}

      {/* Expanded Options */}
      {isExpanded && !isChatOpen && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-3">
          {/* Music Button */}
          <button
            onClick={toggleMusic}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all hover:scale-110",
              isPlaying && !isMuted
                ? "bg-amber-100 text-amber-700 border-2 border-amber-300"
                : "bg-white text-amber-600 border border-amber-200 hover:bg-amber-50"
            )}
            title={isPlaying && !isMuted ? "Pause worship music" : "Play worship music"}
          >
            {isPlaying && !isMuted ? (
              <div className="relative">
                <Music className="h-5 w-5 animate-pulse" />
                <span className="absolute -right-1 -top-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </div>
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>

          {/* Chat Button */}
          <button
            onClick={openChat}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:scale-110 hover:bg-primary/90"
            title="Open support chat"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all hover:scale-110",
          isExpanded || isChatOpen
            ? "bg-gray-800 text-white"
            : "bg-gradient-to-br from-amber-400 to-amber-600 text-white hover:from-amber-500 hover:to-amber-700"
        )}
      >
        {isExpanded || isChatOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Headphones className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
