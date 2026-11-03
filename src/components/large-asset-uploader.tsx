"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";

type Part = { partNumber: number; url: string };

type UploadState = {
  name: string;
  size: number;
  progress: number;
  speed: number;
  status: "init" | "uploading" | "completing" | "done" | "error";
  error?: string;
};

const MAX_BYTES = 300 * 1024 * 1024;

async function uploadPartWithRetry(url: string, blob: Blob, signal: AbortSignal) {
  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "PUT",
        body: blob,
        signal,
        headers: { "Content-Type": "application/octet-stream" },
      });
      if (!response.ok) {
        lastError = `Part failed with ${response.status}`;
        continue;
      }
      const etag = response.headers.get("etag") || response.headers.get("ETag");
      if (!etag) {
        lastError = "Missing ETag. Check the R2 CORS rule exposes ETag.";
        continue;
      }
      return etag;
    } catch (error) {
      if (signal.aborted) throw new Error("Upload cancelled.");
      lastError = (error as Error).message;
      await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
    }
  }
  throw new Error(lastError || "Part upload failed.");
}

export function LargeAssetUploader({ postId }: { postId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<UploadState | null>(null);

  async function uploadFile(file: File) {
    if (file.size > MAX_BYTES) {
      throw new Error(`${file.name} is larger than 300 MB.`);
    }
    const signal = abortRef.current?.signal ?? new AbortController().signal;
    const started = Date.now();
    const initResponse = await fetch("/api/uploads/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        fileName: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
      }),
      signal,
    });
    const init = (await initResponse.json()) as {
      error?: string;
      mode?: "r2" | "local";
      assetId?: string;
      partSize?: number;
      partCount?: number;
      parts?: Part[];
      uploadPath?: string;
    };
    if (!initResponse.ok || !init.assetId || !init.mode) {
      throw new Error(init.error || "Could not start the upload.");
    }

    setState({
      name: file.name,
      size: file.size,
      progress: 0,
      speed: 0,
      status: "uploading",
    });

    try {
      if (init.mode === "r2") {
        const parts = init.parts ?? [];
        const partSize = init.partSize ?? 16 * 1024 * 1024;
        const etags: Array<{ partNumber: number; etag: string }> = new Array(parts.length);
        let completed = 0;
        let next = 0;

        async function worker() {
          while (next < parts.length) {
            const index = next;
            next += 1;
            const part = parts[index];
            const start = index * partSize;
            const blob = file.slice(start, Math.min(file.size, start + partSize));
            const etag = await uploadPartWithRetry(part.url, blob, signal);
            etags[index] = { partNumber: part.partNumber, etag };
            completed += blob.size;
            const elapsed = Math.max(0.25, (Date.now() - started) / 1000);
            setState({
              name: file.name,
              size: file.size,
              progress: Math.min(99, Math.round((completed / file.size) * 100)),
              speed: completed / elapsed,
              status: "uploading",
            });
          }
        }

        await Promise.all(Array.from({ length: Math.min(3, parts.length) }, () => worker()));
        setState((current) =>
          current ? { ...current, status: "completing", progress: 99 } : current
        );
        const completeResponse = await fetch("/api/uploads/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: init.assetId, parts: etags }),
          signal,
        });
        const complete = (await completeResponse.json()) as { error?: string };
        if (!completeResponse.ok) throw new Error(complete.error || "Could not complete the upload.");
      } else {
        const partSize = init.partSize ?? 8 * 1024 * 1024;
        const partCount = init.partCount ?? Math.ceil(file.size / partSize);
        const uploadPath = init.uploadPath ?? "";
        let completed = 0;
        for (let index = 0; index < partCount; index += 1) {
          const start = index * partSize;
          const blob = file.slice(start, Math.min(file.size, start + partSize));
          const response = await fetch(`${uploadPath}&index=${index}&total=${partCount}`, {
            method: "PUT",
            body: blob,
            signal,
            headers: { "Content-Type": "application/octet-stream" },
          });
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) throw new Error(payload.error || "Chunk upload failed.");
          completed += blob.size;
          const elapsed = Math.max(0.25, (Date.now() - started) / 1000);
          setState({
            name: file.name,
            size: file.size,
            progress: Math.min(99, Math.round((completed / file.size) * 100)),
            speed: completed / elapsed,
            status: "uploading",
          });
        }
        setState((current) =>
          current ? { ...current, status: "completing", progress: 99 } : current
        );
        const completeResponse = await fetch("/api/uploads/local/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: init.assetId }),
          signal,
        });
        const complete = (await completeResponse.json()) as { error?: string };
        if (!completeResponse.ok) throw new Error(complete.error || "Could not complete the upload.");
      }

      setState((current) =>
        current ? { ...current, status: "done", progress: 100 } : current
      );
      router.refresh();
    } catch (error) {
      if (!signal.aborted && init.assetId) {
        void fetch("/api/uploads/abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: init.assetId }),
        });
      }
      throw error;
    }
  }

  async function choose(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    abortRef.current = new AbortController();
    try {
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }
    } catch (error) {
      setState((current) =>
        current
          ? { ...current, status: "error", error: (error as Error).message }
          : {
              name: "Upload",
              size: 0,
              progress: 0,
              speed: 0,
              status: "error",
              error: (error as Error).message,
            }
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setBusy(false);
  }

  return (
    <div className="rounded-xl border border-dashed border-line bg-cream/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[10px] font-bold uppercase tracking-[0.06em] text-ink hover:bg-cream/60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Add up to 300 MB
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            multiple
            className="hidden"
            disabled={busy}
            onChange={(event) => void choose(event.target.files)}
          />
        </label>
        {busy ? (
          <button
            type="button"
            onClick={cancel}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-[10px] font-bold text-red-600 hover:bg-red-50"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        ) : null}
        <p className="text-[10px] leading-relaxed text-muted">
          Direct to R2 when configured; local chunked fallback in development.
        </p>
      </div>

      {state ? (
        <div className="mt-3 rounded-lg border border-line bg-white p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[10px] font-semibold text-ink">{state.name}</p>
            <p className="shrink-0 text-[9px] text-muted">
              {state.status === "done"
                ? "Done"
                : state.status === "error"
                  ? "Failed"
                  : `${state.progress}% · ${(state.speed / (1024 * 1024)).toFixed(1)} MB/s`}
            </p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream">
            <div
              className={`h-full rounded-full ${state.status === "error" ? "bg-red-500" : "bg-coral"}`}
              style={{ width: `${state.progress}%` }}
            />
          </div>
          {state.error ? <p className="mt-1.5 text-[10px] leading-relaxed text-red-600">{state.error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
