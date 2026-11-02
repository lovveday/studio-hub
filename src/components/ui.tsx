import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { platformMeta } from "@/lib/platforms";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-line bg-white shadow-[0_1px_0_rgba(17,19,24,0.03),0_18px_40px_-32px_rgba(17,19,24,0.35)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

const buttonVariants = {
  primary: "bg-ink text-paper hover:bg-ink-soft border border-ink",
  coral: "bg-coral text-white hover:bg-[#e94b28] border border-coral",
  outline: "border border-line bg-white text-ink hover:bg-cream/60",
  ghost: "border border-transparent text-ink hover:bg-cream/70",
  danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
} as const;

const buttonSizes = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-5 text-sm rounded-xl gap-2",
} as const;

export function buttonClasses(
  variant: keyof typeof buttonVariants = "primary",
  size: keyof typeof buttonSizes = "md",
  className?: string
) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40",
    buttonVariants[variant],
    buttonSizes[size],
    className
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "coral" | "teal" | "gold" | "ink" | "red";
  className?: string;
}) {
  const tones = {
    neutral: "bg-cream text-ink/70 border-transparent",
    coral: "bg-coral-soft text-[#b5381c] border-transparent",
    teal: "bg-teal-soft text-[#086b6b] border-transparent",
    gold: "bg-gold-soft text-[#825718] border-transparent",
    ink: "bg-ink text-paper border-transparent",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const statusMap: Record<string, { label: string; tone: "neutral" | "coral" | "teal" | "gold" | "ink" | "red" }> = {
  draft: { label: "Draft", tone: "neutral" },
  needs_review: { label: "Needs review", tone: "gold" },
  approved: { label: "Approved", tone: "teal" },
  scheduled: { label: "Scheduled", tone: "ink" },
  ready: { label: "Ready to post", tone: "coral" },
  published: { label: "Published", tone: "teal" },
  failed: { label: "Failed", tone: "red" },
  needs_review_fact: { label: "Pending fact", tone: "gold" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMap[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={meta.tone} className={className}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </Badge>
  );
}

export function PlatformBadge({ platform, className }: { platform: string; className?: string }) {
  const meta = platformMeta(platform);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-cream/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink/70",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.short}
    </span>
  );
}

export function PlatformStack({ platforms, className }: { platforms: string[]; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {platforms.map((platform) => {
        const meta = platformMeta(platform);
        return (
          <span
            key={platform}
            title={meta.label}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white text-[9px] font-bold text-white shadow-sm"
            style={{ backgroundColor: meta.color }}
          >
            {meta.short}
          </span>
        );
      })}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-muted/60 focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-coral/15",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-muted/60 focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-coral/15",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full appearance-none rounded-xl border border-line bg-white px-3 text-sm text-ink focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-coral/15",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-ink/80">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] leading-relaxed text-muted">{hint}</p> : null}
    </div>
  );
}

export function Avatar({
  name,
  color = "#111318",
  size = "md",
}: {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold text-white", sizes[size])}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
}

export function Notice({
  children,
  tone = "info",
  className,
}: {
  children: ReactNode;
  tone?: "info" | "success" | "error" | "warning";
  className?: string;
}) {
  const tones = {
    info: "border-line bg-cream/60 text-ink/80",
    success: "border-teal/20 bg-teal-soft text-[#086b6b]",
    error: "border-red-200 bg-red-50 text-red-700",
    warning: "border-gold/30 bg-gold-soft text-[#7a5116]",
  };
  return (
    <div className={cn("rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed", tones[tone], className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2 text-coral">{eyebrow}</p> : null}
        <h1 className="display text-balance text-[30px] leading-[1.05] text-ink sm:text-[36px]">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-cream/30 px-6 py-12 text-center">
      {icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ink/60 shadow-sm">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("rounded-md bg-cream px-2 py-1 text-[11px] font-medium text-ink/70", className)}>
      {children}
    </span>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-cream", className)}>
      <div
        className="h-full rounded-full bg-coral transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
  tone = "ink",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "ink" | "coral" | "teal" | "gold";
}) {
  const accents = {
    ink: "bg-ink",
    coral: "bg-coral",
    teal: "bg-teal",
    gold: "bg-gold",
  };
  return (
    <Card className="relative overflow-hidden p-4">
      <span className={cn("absolute left-0 top-0 h-full w-1", accents[tone])} />
      <p className="eyebrow text-muted">{label}</p>
      <p className="display mt-2 text-[28px] leading-none tabular-nums text-ink">{value}</p>
      {detail ? <p className="mt-2 text-[11px] leading-relaxed text-muted">{detail}</p> : null}
    </Card>
  );
}
