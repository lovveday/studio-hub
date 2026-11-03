"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";

export function AssetUploader({ postId }: { postId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    try {
      let index = 0;
      for (const file of Array.from(files)) {
        index += 1;
        setProgress(`Uploading ${index} of ${files.length}: ${file.name}`);
        const formData = new FormData();
        formData.append("postId", postId);
        formData.append("file", file);
        const response = await fetch("/api/assets", { method: "POST", body: formData });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error || "Upload failed.");
      }
      setProgress("");
      router.refresh();
    } catch (uploadError) {
      setError((uploadError as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-line bg-cream/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[10px] font-bold uppercase tracking-[0.06em] text-ink hover:bg-cream/60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Add image / video
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(event) => void upload(event.target.files)}
          />
        </label>
        <p className="text-[10px] leading-relaxed text-muted">
          Up to 50 MB per file. Stored locally under `storage/assets`.
        </p>
      </div>
      {progress ? <p className="mt-2 text-[10px] font-medium text-muted">{progress}</p> : null}
      {error ? (
        <p className="mt-2 flex items-start gap-1.5 text-[10px] font-medium text-red-600">
          <X className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
