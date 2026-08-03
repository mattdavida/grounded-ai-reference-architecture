"use client";

import { useEffect, useRef, useState } from "react";

export interface SpeechToken {
  token: string;
  region: string;
}

const REFRESH_MS = 9 * 60 * 1000; // 9 minutes — Azure token expires at 10

/**
 * Fetches a short-lived Azure Speech token from the backend and auto-refreshes
 * it before expiry. The raw API key never touches the browser.
 */
export function useSpeechToken() {
  const [speechToken, setSpeechToken] = useState<SpeechToken | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchToken() {
    try {
      const res = await fetch("/api/speech/token");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Speech token fetch failed (${res.status}): ${text}`);
      }
      const data: SpeechToken = await res.json();
      setSpeechToken(data);
      setError(null);
      timerRef.current = setTimeout(fetchToken, REFRESH_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch speech token");
    }
  }

  useEffect(() => {
    fetchToken();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { speechToken, speechTokenError: error };
}
