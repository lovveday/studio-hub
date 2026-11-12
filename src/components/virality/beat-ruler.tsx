import { formatTimecode } from "@/lib/virality-types";
import type { TimelineBeat } from "@/lib/virality-types";

const SHORT_LABELS: Record<string, string> = {
  hook: "Hook",
  tension: "Turn",
  method: "Method",
  proof: "Proof",
  cta: "Ask",
  close: "Close",
  setup: "Setup",
  payoff: "Payoff",
};

const TONES: Record<string, string> = {
  hook: "bg-coral text-white",
  tension: "bg-cream text-ink",
  method: "bg-gold-soft text-ink",
  proof: "bg-teal-soft text-ink",
  cta: "bg-coral text-white",
  close: "bg-ink text-paper",
  setup: "bg-cream text-ink",
  payoff: "bg-gold-soft text-ink",
};

export function BeatRuler({
  beats,
  duration,
  compact = false,
  className = "",
}: {
  beats: TimelineBeat[];
  duration: number;
  compact?: boolean;
  className?: string;
}) {
  if (!beats.length) return null;
  const total = Math.max(1, duration || beats[beats.length - 1].end);
  return (
    <div className={className}>
      <div
        className={`flex w-full overflow-hidden rounded-lg ${compact ? "h-8" : "h-11"}`}
        role="img"
        aria-label={`Structure: ${beats.map((beat) => beat.label).join(", ")}`}
      >
        {beats.map((beat, index) => {
          const width = Math.max(3, ((beat.end - beat.start) / total) * 100);
          const tone = TONES[beat.beat] ?? TONES[beat.label.toLowerCase()] ?? "bg-cream text-ink";
          const label =
            beat.label.length <= 12 ? beat.label : SHORT_LABELS[beat.beat] ?? beat.label;
          return (
            <div
              key={`${beat.label}-${index}`}
              style={{ width: `${width}%` }}
              className={`flex min-w-0 items-center overflow-hidden border-r-2 border-white/70 px-2 last:border-r-0 ${tone}`}
              title={`${formatTimecode(beat.start)}–${formatTimecode(beat.end)} ${beat.label}`}
            >
              {!compact && width > 12 ? (
                <span className="truncate text-[9px] font-bold uppercase tracking-[0.08em]">
                  {label}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      {!compact ? (
        <div className="mt-1.5 flex items-center justify-between text-[10px] tabular-nums text-muted">
          <span>0:00</span>
          <span>{formatTimecode(total)} runtime</span>
        </div>
      ) : null}
    </div>
  );
}
