import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { getBrandProfile, listFacts } from "@/lib/data";
import { canLoadSample } from "@/lib/virality-samples";
import { loadSampleTeardownAction } from "@/app/actions/virality";
import { Badge, Button, Card, Notice, PageHeader } from "@/components/ui";
import { NewTeardown } from "@/components/virality/new-teardown";

export const dynamic = "force-dynamic";

export default async function NewTeardownPage() {
  await requireUser();
  const brand = await getActiveBrand();
  const profile = getBrandProfile(brand.id);
  const facts = listFacts(brand.id);
  const approvedFacts = facts.filter((fact) => fact.status === "approved" && !fact.valid_to);
  const bannedClaims = (profile?.banned_claims ?? "")
    .split(",")
    .map((claim) => claim.trim())
    .filter(Boolean);
  const sampleAvailable = canLoadSample(brand.id);

  return (
    <div className="space-y-6 fade-up">
      <Link
        href="/virality"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to the lab
      </Link>

      <PageHeader
        eyebrow={`${brand.name} · new teardown`}
        title="Tear down a clip"
        description="Read the structure, not the creator's words. Upload a vertical clip, paste a public link, or start from a transcript."
        actions={
          sampleAvailable ? (
            <form action={loadSampleTeardownAction}>
              <Button type="submit" variant="outline" size="sm">
                <Sparkles className="h-3.5 w-3.5" />
                See a sample
              </Button>
            </form>
          ) : undefined
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,0.75fr)]">
        <Card className="overflow-hidden">
          <NewTeardown
            brandName={brand.name}
            niche={brand.niche}
            approvedFacts={approvedFacts.length}
            bannedClaims={bannedClaims.join(", ")}
            defaultPlatform="tiktok"
          />
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="p-5">
              <p className="eyebrow text-muted">What the lab returns</p>
              <div className="mt-3 space-y-3">
                {[
                  ["The hook", "The exact opening line, the device it uses and why it stops the scroll."],
                  ["Structure", "Timed beats, cuts per minute, on-screen text, audio and the ask."],
                  ["Evidence", "Hypotheses for why it worked, each tied to a quoted moment."],
                  ["Brief", "The same shape rebuilt around this brand, with script, shots and CTA."],
                  ["Wording check", "A percentage overlap and the exact phrases to rewrite."],
                  ["Test plan", "Two variants, one variable each, and the metric to watch."],
                ].map(([title, body]) => (
                  <div key={title} className="flex gap-2.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-coral" />
                    <div>
                      <p className="text-[11px] font-semibold text-ink">{title}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="bg-ink text-paper">
            <div className="p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-coral">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <h2 className="display mt-3 text-[21px] leading-[1.12]">
                The source is read once, then deleted.
              </h2>
              <p className="mt-2 text-[11px] leading-relaxed text-paper/55">
                Uploaded clips are sent to Gemini for the read and removed from this app’s storage as
                soon as the teardown is saved. Captured frames and the written teardown remain, so the
                brief still makes sense next month.
              </p>
              <ul className="mt-3 space-y-1.5 text-[10px] leading-relaxed text-paper/45">
                <li>No third-party video downloads.</li>
                <li>No reposting of the source clip.</li>
                <li>No performance numbers invented or implied.</li>
              </ul>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-muted">Adapting for</p>
                  <p className="display mt-1 text-[20px] leading-tight text-ink">{brand.name}</p>
                </div>
                <Badge tone="neutral">{approvedFacts.length} facts</Badge>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{brand.niche}</p>

              {bannedClaims.length ? (
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                    Banned claims
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {bannedClaims.slice(0, 5).map((claim) => (
                      <span
                        key={claim}
                        className="rounded-md bg-coral-soft px-1.5 py-1 text-[9px] font-medium text-[#b5381c]"
                      >
                        {claim}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <Notice tone="warning" className="mt-3">
                  No banned claims are set for this brand. Add them before generating client-facing
                  briefs.
                </Notice>
              )}

              <Link
                href="/settings"
                className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-coral hover:underline"
              >
                Review facts and guardrails
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
