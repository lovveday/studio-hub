import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Mic, Sparkles, Wand2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { getBrandProfile, listFacts, listPosts } from "@/lib/data";
import { aiStatus } from "@/lib/ai";
import { PLATFORM_ORDER, platformMeta } from "@/lib/platforms";
import { createPostAction } from "@/app/actions/posts";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Notice,
  PageHeader,
  Textarea,
} from "@/components/ui";

export const dynamic = "force-dynamic";

function defaultSchedule(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function ComposerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const brand = await getActiveBrand();
  const profile = getBrandProfile(brand.id);
  const facts = listFacts(brand.id).filter((fact) => fact.status === "approved").slice(0, 5);
  const ai = aiStatus();
  const params = await searchParams;
  const recent = listPosts(brand.id, 5);
  const pillars = (() => {
    try {
      return JSON.parse(profile?.pillars ?? "[]") as string[];
    } catch {
      return [];
    }
  })();

  return (
    <div className="space-y-6 fade-up">
      <PageHeader
        eyebrow={`${brand.name} · ${ai.configured ? "Gemini writer" : "demo writer"}`}
        title="Compose a post"
        description="Start with a clear idea. The hub turns it into native copy for each channel, with a first comment and a schedule."
        actions={
          <Badge tone={ai.configured ? "teal" : "gold"}>
            <Sparkles className="h-3 w-3" />
            {ai.configured ? "AI connected" : "Demo templates"}
          </Badge>
        }
      />

      {params.error ? <Notice tone="error">{params.error}</Notice> : null}

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader
            title="The brief"
            description="A working title and the real idea are enough. The writer fills the rest from the Brand Brain."
          />
          <form action={createPostAction} className="space-y-5 p-5">
            <Field label="Working title" htmlFor="title" hint="Internal only — not necessarily the hook.">
              <Input id="title" name="title" placeholder="e.g. The 3-step night routine" required />
            </Field>

            <Field
              label="The idea / angle"
              htmlFor="idea"
              hint="What should the audience take away? Any proof, offer, date or CTA?"
            >
              <Textarea
                id="idea"
                name="idea"
                rows={5}
                placeholder="A calm, saveable carousel about doing less: cleanse, serum, seal. No fear-mongering. Push the saved-post CTA."
              />
            </Field>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-ink/80">Platforms</p>
                <p className="text-[10px] text-muted">Each gets a native variant.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PLATFORM_ORDER.map((platform) => {
                  const meta = platformMeta(platform);
                  return (
                    <label
                      key={platform}
                      className="group flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5 transition-colors has-[:checked]:border-ink has-[:checked]:bg-cream/40"
                    >
                      <input
                        type="checkbox"
                        name="platforms"
                        value={platform}
                        defaultChecked={["instagram", "facebook", "linkedin"].includes(platform)}
                        className="h-3.5 w-3.5 accent-ink"
                      />
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      <span className="text-xs font-semibold text-ink">{meta.label}</span>
                      <span className="ml-auto text-[9px] text-muted">{meta.limit.toLocaleString("en-GB")}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Schedule (optional)"
                htmlFor="scheduledAt"
                hint="Leave empty to keep it as an unscheduled draft."
              >
                <Input id="scheduledAt" name="scheduledAt" type="datetime-local" defaultValue={defaultSchedule()} />
              </Field>
              <Field label="Extra direction (optional)" htmlFor="instructions" hint="Tone, hook, words to avoid, campaign notes.">
                <Input id="instructions" name="instructions" placeholder="e.g. education-first, no discount language" />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <Button type="submit" variant="coral" size="lg">
                <Wand2 className="h-4 w-4" />
                Generate the draft
              </Button>
              <p className="text-[10px] leading-relaxed text-muted">
                Nothing publishes automatically. You review, approve and schedule first.
              </p>
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <Card className="bg-ink text-paper">
            <div className="p-5">
              <p className="eyebrow text-coral">What the writer knows</p>
              <p className="display mt-2 text-xl leading-tight">{brand.name}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-paper/45">{brand.niche}</p>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-paper/35">Tone</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-paper/75">
                    {profile?.tone || "No tone guide yet."}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-paper/35">Pillars</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {pillars.length ? (
                      pillars.slice(0, 5).map((pillar) => (
                        <span key={pillar} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-paper/70">
                          {pillar}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-paper/40">None yet</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-paper/35">Guardrail</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-paper/60">
                    {profile?.banned_claims || "Add banned claims in settings."}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Approved facts"
              description="The writer can use these. Pending facts are excluded."
              action={
                <Link href="/knowledge?factStatus=approved" className="text-[10px] font-semibold text-muted">
                  Manage
                </Link>
              }
            />
            <div className="divide-y divide-line/70">
              {facts.length === 0 ? (
                <p className="px-5 py-5 text-[11px] text-muted">No approved facts yet. Add some in Knowledge.</p>
              ) : (
                facts.map((fact) => (
                  <div key={fact.id} className="flex items-start gap-2 px-5 py-2.5">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">{fact.subject}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-ink">{fact.value}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="After you generate" />
            <ol className="space-y-3 p-5">
              {[
                ["Review every platform variant", "Edit the caption, hashtags and first comment."],
                ["Run the safety check", "Banned claims, limits, mention and link checks."],
                ["Approve and schedule", "Or send a magic link to the client."],
                ["Publish in assisted mode", "Copy, open the app, mark it posted."],
              ].map(([title, detail], index) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-[10px] font-bold text-ink">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-ink">{title}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardHeader title="Recent drafts" description="Pick up where you left off." />
            <div className="divide-y divide-line/70">
              {recent.length === 0 ? (
                <p className="px-5 py-5 text-[11px] text-muted">No drafts yet.</p>
              ) : (
                recent.slice(0, 4).map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="flex items-center gap-2 px-5 py-2.5 transition-colors hover:bg-cream/40"
                  >
                    <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink">{post.title}</span>
                    <ArrowRight className="h-3 w-3 text-muted/40" />
                  </Link>
                ))
              )}
            </div>
          </Card>

          <div className="rounded-2xl border border-dashed border-line bg-cream/30 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
              <Mic className="h-3.5 w-3.5 text-coral" />
              Prefer talking?
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              Dictation lands in the next slice. For now, record a voice note in Knowledge and the hub
              will turn it into facts the writer can use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
