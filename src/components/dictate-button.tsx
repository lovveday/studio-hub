"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

type SpeechResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type Status = "idle" | "listening" | "recording" | "transcribing";

export function DictateButton({ targetId, label = "Dictate" }: { targetId: string; label?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const baseRef = useRef("");
  const finalRef = useRef("");
  const gotSpeechRef = useRef(false);
  const stoppedByUserRef = useRef(false);
  const fallbackStartedRef = useRef(false);

  function target(): HTMLTextAreaElement | null {
    return document.getElementById(targetId) as HTMLTextAreaElement | null;
  }

  function appendTranscript(text: string) {
    const el = target();
    if (!el) return;
    const clean = text.trim();
    if (!clean) return;
    const base = baseRef.current.trimEnd();
    el.value = `${base}${base ? " " : ""}${clean}`;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecorder(note = "") {
    const el = target();
    if (!el) return;
    fallbackStartedRef.current = true;
    setError(note);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) {
          setStatus("idle");
          setError("No audio captured. Try again.");
          return;
        }
        setStatus("transcribing");
        setError("");
        try {
          const form = new FormData();
          form.append("file", new File([blob], `dictation-${Date.now()}.webm`, { type: blob.type }));
          const response = await fetch("/api/transcribe", { method: "POST", body: form });
          const payload = (await response.json()) as { text?: string; error?: string };
          if (!response.ok || !payload.text) {
            throw new Error(payload.error || "Transcription failed.");
          }
          appendTranscript(payload.text);
          setStatus("idle");
        } catch (recordError) {
          setStatus("idle");
          setError((recordError as Error).message);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setStatus("recording");
    } catch (recordError) {
      setStatus("idle");
      setError(`Microphone unavailable: ${(recordError as Error).message}`);
    }
  }

  function startSpeech() {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    const el = target();
    if (!el) return;
    if (!Recognition) {
      void startRecorder("Browser speech recognition is unavailable. Recording for server transcription instead.");
      return;
    }

    setError("");
    stoppedByUserRef.current = false;
    fallbackStartedRef.current = false;
    gotSpeechRef.current = false;
    finalRef.current = "";
    baseRef.current = el.value;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language?.startsWith("en") ? "en-GB" : navigator.language || "en-US";

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalRef.current += `${result[0].transcript} `;
          gotSpeechRef.current = true;
        } else {
          interim += result[0].transcript;
          if (result[0].transcript.trim()) gotSpeechRef.current = true;
        }
      }
      const el = target();
      if (!el) return;
      const base = baseRef.current.trimEnd();
      el.value = `${base}${base ? " " : ""}${finalRef.current}${interim}`.trimStart();
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };

    recognition.onerror = (event) => {
      const code = event.error || "unknown";
      recognitionRef.current = null;
      setStatus("idle");
      if (stoppedByUserRef.current) return;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setError("Microphone or browser speech permission was denied. Allow the microphone and try again.");
        return;
      }
      if (code === "network" || code === "language-not-supported") {
        void startRecorder("Browser speech service is unavailable. Recording for server transcription instead.");
        return;
      }
      if (code === "no-speech") {
        if (!fallbackStartedRef.current) {
          void startRecorder("Browser speech heard nothing. Recording for server transcription instead.");
        }
        return;
      }
      setError(`Speech recognition stopped (${code}).`);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (recorderRef.current) return;
      setStatus("idle");
      if (!stoppedByUserRef.current && !gotSpeechRef.current && !fallbackStartedRef.current) {
        void startRecorder("Browser speech captured nothing. Recording for server transcription instead.");
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setStatus("listening");
    } catch (startError) {
      setError(`Could not start speech recognition: ${(startError as Error).message}`);
      void startRecorder("Starting the server transcription fallback…");
    }
  }

  function start() {
    if (status !== "idle") return;
    setError("");
    startSpeech();
  }

  function stop() {
    stoppedByUserRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setStatus("idle");
      return;
    }
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
  }

  const busy = status === "transcribing";
  const active = status === "listening" || status === "recording";

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={active ? stop : start}
        disabled={busy}
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors ${
          active
            ? "border-coral bg-coral text-white"
            : "border-line bg-white text-muted hover:bg-cream/60 hover:text-ink"
        } ${busy ? "opacity-70" : ""}`}
        title={
          status === "recording"
            ? "Stop recording and transcribe on the server"
            : "Dictate into this field"
        }
      >
        {busy ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : active ? (
          <Square className="h-3 w-3" />
        ) : (
          <Mic className="h-3 w-3" />
        )}
        {status === "transcribing"
          ? "Transcribing…"
          : status === "recording"
            ? "Stop & transcribe"
            : status === "listening"
              ? "Stop"
              : label}
      </button>
      {error ? (
        <span className="max-w-[240px] text-[9px] leading-snug text-red-600">{error}</span>
      ) : null}
    </span>
  );
}
