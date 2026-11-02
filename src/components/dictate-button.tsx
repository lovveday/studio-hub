"use client";

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

export function DictateButton({ targetId, label = "Dictate" }: { targetId: string; label?: string }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");

  function start() {
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    const target = document.getElementById(targetId) as HTMLTextAreaElement | null;
    if (!Recognition) {
      window.alert(
        "Speech recognition is not available in this browser. Use Chrome or Edge, or record a voice note in Knowledge."
      );
      return;
    }
    if (!target) return;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-NG";
    baseRef.current = target.value;
    let finalText = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += `${result[0].transcript} `;
        else interim += result[0].transcript;
      }
      target.value = `${baseRef.current}${baseRef.current ? " " : ""}${finalText}${interim}`.trimStart();
      target.dispatchEvent(new Event("input", { bubbles: true }));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold uppercase tracking-[0.06em] transition-colors ${
        listening
          ? "border-coral bg-coral text-white"
          : "border-line bg-white text-muted hover:bg-cream/60 hover:text-ink"
      }`}
      title="Dictate into this field"
    >
      {listening ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
      {listening ? "Stop" : label}
    </button>
  );
}
