import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, Smartphone, TriangleAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { listAssets } from "@/lib/data";
import { assetUrl } from "@/lib/assets";
import { Card, Notice, PageHeader } from "@/components/ui";
import { StoryForm } from "@/components/stories/story-form";

export const dynamic = "force-dynamic";

export default async function NewStoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const brand = await getActiveBrand();
  const params = await searchParams;
  const assets = listAssets(brand.id, 40)
    .filter((asset) => asset.kind === "image" || asset.kind === "video")
    .map((asset) => ({
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      url: assetUrl(asset.file_path, asset.storage_provider),
    }));

  return (
    <div className="space-y-6 fade-up">
      <Link
        href="/stories"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to stories
      </Link>

      <PageHeader
        eyebrow={`${brand.name} · new story`}
        title="Schedule a story plan"
        description="Queue the 9:16 creative and the sticker script. You add the interactive sticker natively at the scheduled time."
      />

      {params.error ? <Notice tone="error">{params.error}</Notice> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.7fr)]">
        <Card className="overflow-hidden">
          <StoryForm assets={assets} />
        </Card>

        <div className="space-y-5">
          <Card className="bg-ink text-paper">
            <div className="p-5">
              <p className="eyebrow text-coral">The hard limit</p>
              <h2 className="display mt-2 text-[22px] leading-[1.1]">
                APIs can schedule the Story, not the sticker.
              </h2>
              <p className="mt-2 text-[11px] leading-relaxed text-paper/55">
                Instagram does not allow API publishing of link, poll or location stickers. TikTok
                does not support Story publishing through its API at all. Any tool that promises
                otherwise is either using a reminder workflow or breaking the platform rules.
              </p>
              <p className="mt-3 border-t border-white/10 pt-3 text-[10px] leading-relaxed text-paper/40">
                This planner is honest: it schedules everything except the native tap.
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <p className="eyebrow text-muted">What you get at the due time</p>
              <ul className="mt-3 space-y-2.5">
                {[
                  "The 9:16 creative ready to download or save.",
                  "The exact poll, question, quiz, event or link copy.",
                  "A production note for music, tags and safe area.",
                  "An in-app reminder and a one-tap “Open Instagram/TikTok”.",
                  "A posted record for the client report.",
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-teal" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <p className="eyebrow text-muted">Creative notes</p>
              <ul className="mt-3 space-y-2">
                {[
                  "9:16 vertical; 1080 × 1920 is the safe target.",
                  "Keep the lower third clear for the poll or question sticker.",
                  "Under 50 MB; a short MP4 or a JPG/PNG.",
                  "Bake any non-interactive text into the creative.",
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                    <Smartphone className="mt-0.5 h-3 w-3 shrink-0 text-coral" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex gap-1.5 text-[10px] leading-relaxed text-gold">
                <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                The worker must be running for the reminder and status change.
              </p>
            </div>
          </Card>

          <Card className="bg-cream/50">
            <div className="flex items-center gap-2 p-4">
              <Camera className="h-4 w-4 text-coral" />
              <p className="text-[10px] leading-relaxed text-muted">
                One primary sticker per story keeps the plan readable. Use the production notes for
                secondary stickers or tags.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
