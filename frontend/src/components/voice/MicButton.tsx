"use client";

import { Loader2, Mic, MicOff, Volume2 } from "lucide-react";

export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

interface Props {
  state: VoiceState;
  onClick: () => void;
  size?: "sm" | "lg";
}

const ICON_SIZE = { sm: 18, lg: 22 };

export function MicButton({ state, onClick, size = "sm" }: Props) {
  const sz = ICON_SIZE[size];

  const label: Record<VoiceState, string> = {
    idle: "Start listening",
    connecting: "Connecting…",
    listening: "Stop listening",
    processing: "Processing…",
    speaking: "Stop speaking",
    error: "Try again",
  };

  const ringClass: Record<VoiceState, string> = {
    idle: "",
    connecting: "",
    listening: "voice-pulse-ring",
    processing: "",
    speaking: "voice-breathe-ring",
    error: "",
  };

  const bgClass: Record<VoiceState, string> = {
    idle: "bg-ra-accent hover:bg-ra-accent-light",
    connecting: "bg-ra-navy-700",
    listening: "bg-ra-red",
    processing: "bg-ra-navy-700",
    speaking: "bg-ra-green",
    error: "bg-ra-red",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "processing" || state === "connecting"}
      aria-label={label[state]}
      title={label[state]}
      className={`
        relative flex items-center justify-center rounded-full text-white
        transition-colors duration-200 focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-ra-accent
        disabled:cursor-not-allowed
        ${size === "lg" ? "h-14 w-14" : "h-9 w-9"}
        ${bgClass[state]}
      `}
    >
      {(state === "listening" || state === "connecting" || state === "speaking") && (
        <span
          className={`pointer-events-none absolute inset-0 rounded-full ${bgClass[state]} opacity-60 ${ringClass[state]}`}
        />
      )}

      {state === "processing" || state === "connecting" ? (
        <Loader2 size={sz} className="animate-spin" />
      ) : state === "listening" ? (
        <MicOff size={sz} />
      ) : state === "speaking" ? (
        <Volume2 size={sz} />
      ) : (
        <Mic size={sz} />
      )}
    </button>
  );
}
