export function Signature({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[10px] leading-relaxed tracking-[0.02em] text-muted/75 ${className}`}>
      Built by{" "}
      <span className="display text-[12px] tracking-[-0.01em] text-ink/75">
        Osekhuemen Peter-imoisili
      </span>{" "}
      · 2026
    </p>
  );
}
