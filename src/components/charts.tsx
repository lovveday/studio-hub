import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  color = "#FF5A36",
  className,
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  if (data.length < 2) {
    return <div className={cn("h-16 rounded-lg bg-cream/70", className)} />;
  }
  const width = 300;
  const height = 70;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / range) * (height - 8) - 4;
    return [x, y] as const;
  });
  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const id = `spark-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn("h-16 w-full", className)} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BarList({
  items,
  valueLabel = "reach",
}: {
  items: Array<{ label: string; value: number; color: string }>;
  valueLabel?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="font-semibold capitalize text-ink/80">{item.label}</span>
            <span className="text-muted">
              {new Intl.NumberFormat("en-GB", { notation: "compact" }).format(item.value)} {valueLabel}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-cream">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(3, (item.value / max) * 100)}%`, backgroundColor: item.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Donut({
  value,
  label,
  color = "#FF5A36",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative flex h-24 w-24 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${clamped * 3.6}deg, #EFEAE0 0deg)`,
        }}
      >
        <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-white">
          <span className="display text-lg leading-none text-ink">{clamped.toFixed(1)}%</span>
          <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] text-muted">rate</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-ink">{label}</p>
        <p className="mt-1 max-w-[150px] text-[11px] leading-relaxed text-muted">
          Engagements divided by reach for the selected period.
        </p>
      </div>
    </div>
  );
}

export function WeekBars({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex h-16 items-end gap-1.5">
      {data.map((value, index) => (
        <div
          key={index}
          className="flex-1 rounded-t-sm bg-teal/70 transition-all hover:bg-teal"
          style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          title={String(value)}
        />
      ))}
    </div>
  );
}
