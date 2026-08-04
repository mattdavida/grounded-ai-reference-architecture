"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bot,
  Maximize2,
  Minimize2,
  Send,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { useChatSession } from "@/hooks/useChatSession";
import { useSpeechRecognizer } from "@/hooks/useSpeechRecognizer";
import { useSpeechSynthesizer } from "@/hooks/useSpeechSynthesizer";
import { useSpeechToken } from "@/hooks/useSpeechToken";
import { ChatMessage } from "./ChatMessage";
import { MicButton, type VoiceState } from "./MicButton";
import "./voice.css";

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0] as const;
type Speed = (typeof SPEED_OPTIONS)[number];

const EXPANDED_KEY = "eaim.voice.expanded";

function readExpandedPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(EXPANDED_KEY) === "1";
  } catch {
    return false;
  }
}

function stripCitation(text: string) {
  return text.replace(/[\n\r]*Source:\s*[\s\S]+$/, "").trim();
}

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*_]{3,}$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function VoiceChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceMode, setVoiceMode] = useState(true);
  const [readSpeed, setReadSpeed] = useState<Speed>(1.0);
  const [interimText, setInterimText] = useState("");
  const [inputText, setInputText] = useState("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { speechToken } = useSpeechToken();
  const { startListening, stopListening } = useSpeechRecognizer();
  const { speak, stopSpeaking } = useSpeechSynthesizer();
  const { history, isLoading, statusMessage, chatError, sendMessage, clearSession } =
    useChatSession();

  useEffect(() => {
    setIsExpanded(readExpandedPreference());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, interimText, statusMessage, isExpanded]);

  useEffect(() => {
    if (chatError) showError(chatError);
  }, [chatError]);

  function toggleExpanded() {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(EXPANDED_KEY, next ? "1" : "0");
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  }

  function showError(msg: string) {
    setErrorBanner(msg);
    setTimeout(() => setErrorBanner(null), 5000);
  }

  async function handleMicClick() {
    if (voiceState === "speaking") {
      stopSpeaking();
      setVoiceState("idle");
      return;
    }

    if (voiceState === "listening" || voiceState === "connecting") {
      stopListening();
      setVoiceState("idle");
      setInterimText("");
      return;
    }

    if (!speechToken) {
      showError("Speech service unavailable — check backend configuration.");
      setVoiceState("error");
      setTimeout(() => setVoiceState("idle"), 3000);
      return;
    }

    setVoiceMode(true);
    setVoiceState("connecting");
    setInterimText("");

    await startListening(speechToken.token, speechToken.region, {
      onReady: () => setVoiceState("listening"),
      onInterim: (text) => setInterimText(text),
      onFinal: async (text) => {
        setInterimText("");
        setInputText("");
        await submitMessage(text, true);
      },
      onError: (err) => {
        setVoiceState("idle");
        setInterimText("");
        showError(err);
      },
    });
  }

  async function submitMessage(text: string, fromVoice = false) {
    if (!text.trim()) return;

    setVoiceState("processing");
    setInputText("");
    setInterimText("");

    const answer = await sendMessage(text.trim());

    if (!answer) {
      setVoiceState("idle");
      return;
    }

    const shouldSpeak = (fromVoice || voiceMode) && !!speechToken;

    if (shouldSpeak) {
      setVoiceState("speaking");
      await speak(
        stripMarkdown(stripCitation(answer)),
        speechToken!.token,
        speechToken!.region,
        readSpeed,
        () => setVoiceState("idle"),
      );
    } else {
      setVoiceState("idle");
    }
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    await submitMessage(inputText, false);
  }

  function handleClose() {
    setIsOpen(false);
    stopSpeaking();
    stopListening();
    setVoiceState("idle");
    setInterimText("");
  }

  const showWelcome = history.length === 0 && !isLoading;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open portfolio assistant"
          className="fixed bottom-6 right-6 z-[900] flex h-14 w-14 items-center justify-center rounded-full bg-ra-accent text-white shadow-lg transition-colors duration-200 hover:bg-ra-accent-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ra-accent"
        >
          <Bot size={26} />
        </button>
      )}

      {isOpen && (
        <div
          className={`voice-panel-enter fixed z-[900] flex flex-col overflow-hidden rounded-2xl shadow-2xl transition-[width,height,top,bottom] duration-200 ease-out ${
            isExpanded
              ? "bottom-4 right-4 top-[5.5rem] w-[min(520px,calc(100vw-2rem))] sm:bottom-6 sm:right-6"
              : "bottom-6 right-6 h-[520px] w-[460px] max-w-[calc(100vw-2rem)]"
          }`}
          style={{
            background: "var(--ra-navy-900)",
            border: "1px solid var(--ra-nav-border)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--ra-nav-border)" }}
          >
            <div className="flex items-center gap-2">
              <Bot size={18} className="text-ra-accent-light" />
              <span className="text-sm font-semibold text-ra-nav-text">
                Portfolio Assistant
              </span>
              {speechToken && (
                <span className="rounded-full bg-ra-green/20 px-2 py-0.5 text-[10px] font-medium text-ra-green">
                  Voice ready
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleExpanded}
                title={isExpanded ? "Collapse panel" : "Expand panel"}
                aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
                className="rounded p-1.5 text-ra-nav-text-muted transition-colors hover:bg-white/10 hover:text-ra-nav-text"
              >
                {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              {speechToken && (
                <button
                  type="button"
                  onClick={() => setVoiceMode((v) => !v)}
                  title={
                    voiceMode
                      ? "Auto-speak ON — click to turn off"
                      : "Auto-speak OFF — click to enable"
                  }
                  className={`rounded p-1.5 transition-colors ${
                    voiceMode
                      ? "text-ra-accent-light hover:bg-white/10"
                      : "text-ra-nav-text-muted hover:bg-white/10 hover:text-ra-nav-text"
                  }`}
                >
                  {voiceMode ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
              )}
              <button
                type="button"
                onClick={clearSession}
                title="Clear conversation"
                className="rounded p-1.5 text-ra-nav-text-muted transition-colors hover:bg-white/10 hover:text-ra-nav-text"
              >
                <Trash2 size={15} />
              </button>
              <button
                type="button"
                onClick={handleClose}
                title="Close panel"
                className="rounded p-1.5 text-ra-nav-text-muted transition-colors hover:bg-white/10 hover:text-ra-nav-text"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {errorBanner && (
            <div className="mx-3 mt-2 rounded-lg bg-ra-red/20 px-3 py-2 text-xs text-red-300">
              {errorBanner}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {showWelcome && (
              <div className="mt-8 flex flex-col items-center gap-3 text-center">
                <Bot size={36} className="text-ra-accent-light opacity-80" />
                <p className="text-sm font-medium text-ra-nav-text">
                  Ask me about the portfolio
                </p>
                <p className="max-w-[260px] text-xs text-ra-nav-text-muted">
                  Try: &ldquo;Which projects are blocked?&rdquo; or &ldquo;What&apos;s the
                  budget variance?&rdquo;
                </p>
              </div>
            )}

            {history.map((entry) => (
              <ChatMessage key={entry.id} entry={entry} />
            ))}

            {interimText && (
              <div className="mb-3 flex justify-end">
                <div
                  className="max-w-[88%] rounded-xl rounded-br-sm px-4 py-3 text-sm italic"
                  style={{
                    background: "var(--ra-nav-interim-bg)",
                    color: "var(--ra-nav-text-muted)",
                  }}
                >
                  {interimText}
                </div>
              </div>
            )}

            {statusMessage && (
              <p className="mb-2 px-1 text-[11px] text-ra-muted">{statusMessage}</p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {(voiceState !== "idle" || isLoading) && (
            <div className="px-4 py-1 text-center text-[11px] text-ra-nav-text-muted">
              {statusMessage
                ? statusMessage
                : {
                    connecting: "Connecting… ready in a moment",
                    listening: "Listening — speak now",
                    processing: "Streaming answer…",
                    speaking: "Speaking…",
                    error: "Error — please try again",
                    idle: isLoading ? "Streaming answer…" : "",
                  }[voiceState]}
            </div>
          )}

          <div
            className="px-3 pb-3 pt-2"
            style={{ borderTop: "1px solid var(--ra-nav-border)" }}
          >
            {voiceMode && (
              <div className="mb-2 flex items-center gap-1.5">
                <span className="text-[10px] text-ra-nav-text-muted">Speed:</span>
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReadSpeed(s)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      readSpeed === s
                        ? "bg-ra-accent text-white"
                        : "text-ra-nav-text-muted hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about the portfolio…"
                disabled={voiceState === "processing" || voiceState === "listening"}
                className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-sm text-ra-nav-text placeholder:text-ra-nav-text-muted focus:outline-none focus:ring-1 focus:ring-ra-accent disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading || voiceState === "listening"}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-ra-accent text-white transition-colors hover:bg-ra-accent-light disabled:cursor-not-allowed disabled:opacity-40"
                title="Send"
              >
                <Send size={15} />
              </button>
              <MicButton state={voiceState} onClick={handleMicClick} />
            </form>
          </div>
        </div>
      )}
    </>
  );
}
