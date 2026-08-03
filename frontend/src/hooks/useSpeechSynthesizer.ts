"use client";

import { useCallback, useRef } from "react";

const NEURAL_VOICE = "en-US-AriaNeural";

function toSsmlRate(multiplier: number): string {
  const pct = Math.round((multiplier - 1) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function buildSsml(text: string, rate: number): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="${NEURAL_VOICE}">
    <prosody rate="${toSsmlRate(rate)}">${escaped}</prosody>
  </voice>
</speak>`;
}

function getPrivAudio(synth: unknown): HTMLAudioElement | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audio = (synth as any)?.privAdapter?.privSessionAudioDestination?.privDestination
      ?.privAudio;
    return audio instanceof HTMLAudioElement ? audio : null;
  } catch {
    return null;
  }
}

function closeSafely(synth: unknown) {
  try {
    (synth as { close: () => void }).close();
  } catch {
    // ignore double-close
  }
}

export function useSpeechSynthesizer() {
  const synthRef = useRef<unknown>(null);

  const stop = useCallback(() => {
    const synth = synthRef.current;
    if (!synth) return;
    synthRef.current = null;

    try {
      const audio = getPrivAudio(synth);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    } catch {
      /* ignore */
    }

    closeSafely(synth);
  }, []);

  const speak = useCallback(
    async (
      text: string,
      token: string,
      region: string,
      rate: number = 1.0,
      onComplete?: () => void,
    ) => {
      stop();

      const sdk = await import("microsoft-cognitiveservices-speech-sdk");
      const speechConfig = sdk.SpeechConfig.fromAuthorizationToken(token, region);
      speechConfig.speechSynthesisVoiceName = NEURAL_VOICE;

      const synth = new sdk.SpeechSynthesizer(speechConfig);
      synthRef.current = synth;

      synth.speakSsmlAsync(
        buildSsml(text, rate),
        () => {
          const audio = getPrivAudio(synth);
          if (audio) {
            audio.onended = () => {
              if (synthRef.current === synth) synthRef.current = null;
              closeSafely(synth);
              onComplete?.();
            };
          } else {
            if (synthRef.current === synth) synthRef.current = null;
            closeSafely(synth);
            onComplete?.();
          }
        },
        (err: unknown) => {
          console.error("[TTS] synthesis error:", err);
          if (synthRef.current === synth) synthRef.current = null;
          closeSafely(synth);
          onComplete?.();
        },
      );
    },
    [stop],
  );

  return { speak, stopSpeaking: stop };
}
