"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Circle, Loader2 } from "lucide-react";
import { Notice } from "@/components/ui";
import { stageIndex, VIRALITY_STAGES } from "@/lib/virality-types";

type Status = {
  status: "processing" | "ready" | "failed";
  stage: string;
  error: string | null;
  title?: string;
};

export function ViralityProcessing({
  id,
  initialStage = "saving-source",
  redirectOnReady = false,
}: {
  id: string;
  initialStage?: string;
  redirectOnReady?: boolean;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(initialStage);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let nextTimer: number | undefined;
    let failures = 0;

    async function tick() {
      try {
        const response = await fetch(`/api/virality/${id}`, { cache: "no-store" });
        const data = (await response.json()) as Status & { error?: string };
        if (cancelled) return;
        if (!response.ok) {
          failures += 1;
          if (failures >= 3) {
            setFailed(true);
            setError(data.error || "Could not read the analysis status.");
            return;
          }
          nextTimer = window.setTimeout(tick, 2500);
          return;
        }
        failures = 0;
        setStage(data.stage);
        if (data.status === "ready") {
          if (redirectOnReady) router.push(`/virality/${id}`);
          else router.refresh();
          return;
        }
        if (data.status === "failed") {
          setFailed(true);
          setError(data.error || "The analysis stopped before it finished.");
          return;
        }
        nextTimer = window.setTimeout(tick, 1500);
      } catch {
        failures += 1;
        if (failures >= 3) {
          setFailed(true);
          setError("Lost contact with the lab. Check the server and try again.");
          return;
        }
        nextTimer = window.setTimeout(tick, 2500);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (nextTimer) window.clearTimeout(nextTimer);
    };
  }, [id, redirectOnReady, router]);

  const current = stageIndex(stage);

  if (failed) {
    return (
      <div className="space-y-4">
        <Notice tone="error">
          <span className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" />
            This analysis did not finish.
          </span>
          <span className="mt-1 block">{error}</span>
        </Notice>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Link href="/virality" className="font-semibold text-coral hover:underline">
            Back to the lab
          </Link>
          <span className="text-muted">·</span>
          <Link href="/virality/new" className="font-semibold text-coral hover:underline">
            Start a new teardown
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Reading the clip…</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            The lab is watching the hook, the cuts and the ask. A short clip usually takes 30–90
            seconds; a long upload can take a few minutes.
          </p>
        </div>
        <p className="text-[11px] font-semibold tabular-nums text-muted">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed
        </p>
      </div>

      <ol className="mt-5 space-y-0">
        {VIRALITY_STAGES.map((item, index) => {
          const done = index < current || stage === "ready";
          const active = index === current && stage !== "ready";
          return (
            <li key={item.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    done
                      ? "border-teal bg-teal-soft text-teal"
                      : active
                        ? "border-coral bg-coral-soft text-coral"
                        : "border-line bg-white text-muted/50"
                  }`}
                >
                  {done ? (
                    <Check className="h-3 w-3" />
                  ) : active ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Circle className="h-2.5 w-2.5" />
                  )}
                </span>
                {index < VIRALITY_STAGES.length - 1 ? (
                  <span className={`my-1 w-px flex-1 ${done ? "bg-teal/30" : "bg-line"}`} />
                ) : null}
              </div>
              <div className={`pb-4 ${active ? "" : "opacity-70"}`}>
                <p
                  className={`text-xs font-semibold ${
                    active ? "text-ink" : done ? "text-ink/80" : "text-muted"
                  }`}
                >
                  {item.label}
                </p>
                {active ? (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{item.detail}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-xl bg-cream/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
        Uploaded clips are analysed once, then deleted from this app’s storage. Frames and the
        written teardown are kept so the brief still makes sense later.
      </div>
    </div>
  );
}
