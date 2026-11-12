import type { Similarity } from "@/lib/virality-types";

export function SimilarityMeter({ similarity }: { similarity: Similarity }) {
  if (similarity.comparable === false) {
    return (
      <div className="rounded-xl bg-cream/60 p-3">
        <p className="text-[11px] font-semibold text-ink">No source text to compare</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">{similarity.note}</p>
      </div>
    );
  }
  const score = Math.max(0, Math.min(1, similarity.score));
  const percent = Math.round(score * 100);
  const label =
    similarity.level === "low"
      ? "Safe range"
      : similarity.level === "watch"
        ? "Check the echo"
        : "Rewrite before publishing";
  const color =
    similarity.level === "low"
      ? "text-teal"
      : similarity.level === "watch"
        ? "text-gold"
        : "text-coral";

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-ink">Wording overlap</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            How much of the draft repeats the source word for word.
          </p>
        </div>
        <p className={`display text-[30px] leading-none tabular-nums ${color}`}>
          {percent}
          <span className="ml-0.5 text-[13px]">%</span>
        </p>
      </div>

      <div className="mt-3">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-cream">
          <span className="absolute inset-y-0 left-0 w-[8%] bg-teal-soft" />
          <span className="absolute inset-y-0 left-[8%] w-[12%] bg-gold-soft" />
          <span className="absolute inset-y-0 left-[20%] right-0 bg-red-100" />
          <span
            className={`absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              similarity.level === "low"
                ? "bg-teal"
                : similarity.level === "watch"
                  ? "bg-gold"
                  : "bg-coral"
            }`}
            style={{ left: `${Math.max(1, Math.min(99, percent))}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
          <span>Safe · under 8%</span>
          <span>Watch · 8–20%</span>
          <span>Rewrite · over 20%</span>
        </div>
      </div>

      <p className={`mt-3 text-xs font-semibold ${color}`}>{label}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">{similarity.note}</p>

      {similarity.matches.length ? (
        <div className="mt-3 rounded-xl bg-cream/70 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
            Phrases the source also uses
          </p>
          <ul className="mt-2 space-y-1.5">
            {similarity.matches.map((match) => (
              <li key={match} className="text-[11px] leading-relaxed text-ink/80">
                “{match}”
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
