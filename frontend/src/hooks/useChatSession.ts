"use client";

import { useRef, useState } from "react";

export interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  dataVersion?: string;
  timestamp: Date;
  streaming?: boolean;
}

type SseHandler = {
  onMeta?: (data: { session_id: string; data_version: string }) => void;
  onStatus?: (message: string) => void;
  onToken?: (text: string) => void;
  onDone?: (data: {
    answer: string;
    session_id: string;
    data_version: string;
  }) => void;
  onError?: (message: string) => void;
};

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split("\n");
  let event = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

async function consumeChatSse(
  res: Response,
  handlers: SseHandler,
): Promise<void> {
  if (!res.body) throw new Error("No response body for SSE stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const parsed = parseSseBlock(block);
      if (!parsed) continue;

      let payload: unknown = null;
      try {
        payload = JSON.parse(parsed.data);
      } catch {
        continue;
      }

      const data = payload as Record<string, unknown>;
      if (parsed.event === "meta") {
        handlers.onMeta?.(data as { session_id: string; data_version: string });
      } else if (parsed.event === "status") {
        handlers.onStatus?.(String(data.message || ""));
      } else if (parsed.event === "token") {
        handlers.onToken?.(String(data.text || ""));
      } else if (parsed.event === "done") {
        handlers.onDone?.(
          data as {
            answer: string;
            session_id: string;
            data_version: string;
          },
        );
      } else if (parsed.event === "error") {
        handlers.onError?.(String(data.message || "Stream error"));
      }
    }
  }
}

/**
 * Multi-turn chat against POST /api/chat/stream (SSE).
 * session_id lives in a ref so it persists without extra re-renders.
 */
export function useChatSession() {
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  async function sendMessage(text: string): Promise<string | null> {
    const userEntry: ChatEntry = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    const assistantId = crypto.randomUUID();
    const assistantEntry: ChatEntry = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      streaming: true,
    };

    setHistory((prev) => [...prev, userEntry, assistantEntry]);
    setIsLoading(true);
    setChatError(null);
    setStatusMessage(null);

    let finalAnswer: string | null = null;
    let accumulated = "";
    let streamError: string | null = null;

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: text,
          session_id: sessionIdRef.current,
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Chat error ${res.status}: ${detail}`);
      }

      await consumeChatSse(res, {
        onMeta: (meta) => {
          sessionIdRef.current = meta.session_id;
          setHistory((prev) =>
            prev.map((e) =>
              e.id === assistantId
                ? { ...e, dataVersion: meta.data_version }
                : e,
            ),
          );
        },
        onStatus: (message) => setStatusMessage(message),
        onToken: (token) => {
          setStatusMessage(null);
          accumulated += token;
          setHistory((prev) =>
            prev.map((e) =>
              e.id === assistantId
                ? { ...e, content: accumulated, streaming: true }
                : e,
            ),
          );
        },
        onDone: (data) => {
          sessionIdRef.current = data.session_id;
          finalAnswer = data.answer || accumulated;
          accumulated = finalAnswer;
          setHistory((prev) =>
            prev.map((e) =>
              e.id === assistantId
                ? {
                    ...e,
                    content: finalAnswer || "",
                    dataVersion: data.data_version,
                    streaming: false,
                  }
                : e,
            ),
          );
        },
        onError: (message) => {
          streamError = message;
        },
      });

      if (streamError) throw new Error(streamError);

      if (!finalAnswer) {
        finalAnswer = accumulated || null;
        setHistory((prev) =>
          prev.map((e) =>
            e.id === assistantId ? { ...e, streaming: false } : e,
          ),
        );
      }

      return finalAnswer;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setChatError(msg);
      setHistory((prev) =>
        prev.map((e) =>
          e.id === assistantId
            ? {
                ...e,
                content: e.content || "Sorry — the assistant could not respond.",
                streaming: false,
              }
            : e,
        ),
      );
      return null;
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  }

  function clearSession() {
    setHistory([]);
    sessionIdRef.current = null;
    setChatError(null);
    setStatusMessage(null);
  }

  return {
    history,
    isLoading,
    statusMessage,
    chatError,
    sendMessage,
    clearSession,
  };
}
