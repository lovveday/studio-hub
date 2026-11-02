"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Upload, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";

export function VoiceRecorder() {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function upload(blob: Blob, name: string) {
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", new File([blob], name, { type: blob.type || "audio/webm" }));
      const response = await fetch("/api/knowledge/voice", { method: "POST", body: formData });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) throw new Error(payload.error || "Upload failed.");
      router.push(`/knowledge/${payload.id}`);
      router.refresh();
    } catch (uploadError) {
      setError((uploadError as Error).message);
    } finally {
      setBusy(false);
      setRecording(false);
      setSeconds(0);
    }
  }

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) await upload(blob, `voice-note-${Date.now()}.webm`);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch (recordError) {
      setError(`Microphone unavailable: ${(recordError as Error).message}`);
    }
  }

  function stop() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stop();
  }

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void upload(file, file.name);
    event.target.value = "";
  }

  return (
    <div className="rounded-2xl border border-line bg-cream/40 p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {!recording ? (
          <Button type="button" variant="coral" size="sm" onClick={start} disabled={busy}>
            <Mic className="h-3.5 w-3.5" />
            Record voice note
          </Button>
        ) : (
          <Button type="button" variant="primary" size="sm" onClick={stop}>
            <Square className="h-3.5 w-3.5" />
            Stop &amp; transcribe · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </Button>
        )}
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[11px] font-semibold text-ink hover:bg-cream/60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload WhatsApp voice note
          <input
            type="file"
            accept=".opus,.ogg,.oga,.m4a,.mp3,.wav,.aac,.amr,.webm,audio/*"
            className="hidden"
            onChange={onFile}
            disabled={busy}
          />
        </label>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        WhatsApp voice notes are Opus/OGG, usually mono at 16 kHz. Forwards as .m4a, .mp3 or .amr also work.
        Audio is transcribed and then deleted after 7 days unless pinned.
      </p>
      {error ? (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] font-medium text-red-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
