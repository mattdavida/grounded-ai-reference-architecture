"use client";

import { useRef, useState } from "react";

export interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  dataVersion?: string;
  timestamp: Date;
}

interface BackendChatResponse {
  answer: string;
  data_version: string;
  session_id: string;
}

/**
 * Multi-turn chat against POST /api/chat.
 * session_id lives in a ref so it persists without extra re-renders.
 */
export function useChatSession() {
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  async function sendMessage(text: string): Promise<string | null> {
    const userEntry: ChatEntry = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setHistory((prev) => [...prev, userEntry]);
    setIsLoading(true);
    setChatError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionIdRef.current,
        }),
      });

      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Chat error ${res.status}: ${detail}`);
      }

      const data: BackendChatResponse = await res.json();
      sessionIdRef.current = data.session_id;

      const assistantEntry: ChatEntry = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        dataVersion: data.data_version,
        timestamp: new Date(),
      };

      setHistory((prev) => [...prev, assistantEntry]);
      return data.answer;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setChatError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  function clearSession() {
    setHistory([]);
    sessionIdRef.current = null;
    setChatError(null);
  }

  return { history, isLoading, chatError, sendMessage, clearSession };
}
