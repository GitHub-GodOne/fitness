"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Music } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

/**
 * Background Worship Music Player
 * - Plays soft worship music
 * - Muted by default
 * - User can click to play/pause
 * - Non-intrusive floating button
 */
export function BackgroundMusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element with a soft worship music URL
    // Using a peaceful instrumental worship track
    audioRef.current = new Audio(
      "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=soft-piano-100-bpm-121529.mp3"
    );
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3; // Soft volume
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

  const togglePlay = () => {
    if (!audioRef.current || !isLoaded) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((error) => {
        console.log("Audio playback failed:", error);
      });
      setIsPlaying(true);
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;

    if (isMuted) {
      // Unmute and play
      audioRef.current.volume = 0.3;
      if (!isPlaying) {
        audioRef.current.play().catch((error) => {
          console.log("Audio playback failed:", error);
        });
        setIsPlaying(true);
      }
      setIsMuted(false);
    } else {
      // Mute
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlay}
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-amber-100/80 hover:bg-amber-200/90 backdrop-blur-sm border border-amber-200/50 shadow-lg transition-all duration-300 group"
          >
            {isPlaying && !isMuted ? (
              <div className="relative">
                <Music className="h-5 w-5 text-amber-700 animate-pulse" />
                {/* Sound waves animation */}
                <span className="absolute -right-1 -top-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </div>
            ) : (
              <VolumeX className="h-5 w-5 text-amber-600 group-hover:text-amber-700" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-amber-50 border-amber-200">
          <p className="text-amber-800 text-sm">
            {isPlaying && !isMuted
              ? "Playing soft worship music 🎵"
              : "Click to play peaceful worship music"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
