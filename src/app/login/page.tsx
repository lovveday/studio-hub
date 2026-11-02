import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Mic, Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { demoLoginAction, loginAction } from "@/app/actions/auth";
import { Button, Input, Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="grid min-h-dvh bg-paper lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-ink p-10 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 dot-grid opacity-[0.06]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral text-sm font-black text-white">
              S
            </span>
            <div>
              <p className="text-[13px] font-bold tracking-[0.18em]">STUDIO HUB</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-paper/40">Social command center</p>
            </div>
          </div>

          <div className="mt-24 max-w-xl">
            <p className="eyebrow text-coral">Less tab-switching. More signal.</p>
            <h1 className="display mt-5 text-balance text-[54px] leading-[0.98] tracking-[-0.03em]">
              Every brand.
              <br />
              Every channel.
              <br />
              One calm place.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-paper/60">
              Plan the calendar, turn voice notes into approved brand facts, write for six
              platforms, collect approvals, and ship the report — without living inside the apps.
            </p>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {[
            { icon: Mic, label: "Voice-first", detail: "WhatsApp notes become facts" },
            { icon: Sparkles, label: "Brand brain", detail: "Cited, versioned, current" },
            { icon: ArrowRight, label: "One loop", detail: "Plan → post → report" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <item.icon className="h-4 w-4 text-coral" />
              <p className="mt-3 text-xs font-semibold">{item.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-paper/40">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-sm font-black text-white">
              S
            </span>
            <p className="text-[13px] font-bold tracking-[0.18em] text-ink">STUDIO HUB</p>
          </div>

          <p className="eyebrow text-coral">Welcome back</p>
          <h2 className="display mt-2 text-balance text-[34px] leading-tight text-ink">Sign in to the studio.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your brands, calendar, knowledge inbox and reports are waiting.
          </p>

          {params.error ? (
            <Notice tone="error" className="mt-5">
              {params.error}
            </Notice>
          ) : null}

          <form action={loginAction} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-ink/80">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue="owner@studio.local"
                placeholder="you@studio.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-ink/80">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                defaultValue="password123"
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full">
              Enter the hub
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-5 rounded-2xl border border-line bg-cream/40 p-4">
            <p className="text-[11px] font-semibold text-ink/70">Demo workspace</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              `owner@studio.local` · `password123` — seeded with three brands, 12 posts, 35 days of
              metrics, comments and a WhatsApp voice note.
            </p>
            <form action={demoLoginAction} className="mt-3">
              <Button type="submit" variant="outline" size="sm" className="w-full">
                Open the demo workspace
              </Button>
            </form>
          </div>

          <p className="mt-8 text-[10px] leading-relaxed text-muted/70">
            Local-first demo. No platform API keys are connected yet, so publishing runs in assisted
            mode. AI falls back to demo templates until `GEMINI_API_KEY` is set.
          </p>
        </div>
      </section>
    </main>
  );
}
