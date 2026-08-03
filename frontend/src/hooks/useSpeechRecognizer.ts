"use client";

import { useCallback, useRef } from "react";

export interface RecognizerCallbacks {
  onReady?: () => void;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (error: string) => void;
}

/**
 * Azure Speech SDK SpeechRecognizer — single-shot recognition.
 * SDK loaded dynamically to keep it out of the SSR bundle.
 */
export function useSpeechRecognizer() {
  const recognizerRef = useRef<unknown>(null);

  const startListening = useCallback(
    async (token: string, region: string, callbacks: RecognizerCallbacks) => {
      const sdk = await import("microsoft-cognitiveservices-speech-sdk");

      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechRecognitionLanguage = "en-US";

      const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      recognizer.sessionStarted = () => {
        callbacks.onReady?.();
      };

      recognizer.recognizing = (_: unknown, e: { result: { text: string } }) => {
        if (e.result.text) callbacks.onInterim(e.result.text);
      };

      recognizer.recognizeOnceAsync(
        (result: { text: string }) => {
          recognizerRef.current = null;
          if (result.text) {
            callbacks.onFinal(result.text);
          } else {
            callbacks.onError("No speech detected — please try again.");
          }
          recognizer.close();
        },
        (err: unknown) => {
          recognizerRef.current = null;
          recognizer.close();
          callbacks.onError(String(err));
        },
      );
    },
    [],
  );

  const stopListening = useCallback(() => {
    if (recognizerRef.current) {
      (recognizerRef.current as { close: () => void }).close();
      recognizerRef.current = null;
    }
  }, []);

  return { startListening, stopListening };
}
