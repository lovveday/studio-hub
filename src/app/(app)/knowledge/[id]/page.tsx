import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  FileAudio,
  FileText,
  Lightbulb,
  Sparkles,
  X,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { getKnowledge, listFacts } from "@/lib/data";
import { assetUrl } from "@/lib/assets";
import { formatDate, relativeTime, safeJson, truncate } from "@/lib/utils";
import type { FactCandidate } from "@/lib/types";
import {
  approveKnowledgeAction,
  deleteKnowledgeAction,
  rejectKnowledgeAction,
  reExtractKnowledgeAction,
  updateTranscriptAction,
} from "@/app/actions/knowledge";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Notice,
  PageHeader,
  StatusBadge,
  Textarea,
} from "@/components/ui";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

export default async function KnowledgeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; approved?: string; reextracted?: string; error?: string }>;
}) {
  await requireUser();
  const brand = await getActiveBrand();
  const { id } = await params;
  const query = await searchParams;
  const item = getKnowledge(id);
  if (!item || item.brand_id !== brand.id) notFound();
  const candidates = safeJson<FactCandidate[]>(item.facts_json, []);
  const relatedFacts = listFacts(brand.id, true).filter((fact) => fact.source_item_id === item.id);
  const fileUrl = item.file_path ? assetUrl(item.file_path) : "";

  return (
    <div className="mx-auto max-w-5xl space-y-6 fade-up">
      <Link
        href="/knowledge"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to knowledge inbox
      </Link>

      <PageHeader
        eyebrow={`${item.type} · ${item.source}`}
        title={item.title}
        description={`Added ${relativeTime(item.created_at)} · ${formatDate(item.created_at)}`}
        actions={
          item.status === "needs_review" ? (
            <>
              <form action={rejectKnowledgeAction}>
                <input type="hidden" name="id" value={item.id} />
                <Button type="submit" variant="outline" size="sm">
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </form>
              <form action={approveKnowledgeAction}>
                <input type="hidden" name="id" value={item.id} />
                <Button type="submit" variant="coral" size="sm">
                  <Check className="h-3.5 w-3.5" />
                  Approve into Brand Brain
                </Button>
              </form>
            </>
          ) : (
            <>
              <StatusBadge status={item.status} />
              {item.status === "rejected" ? (
                <form action={deleteKnowledgeAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <Button type="submit" variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                    <X className="h-3.5 w-3.5" />
                    Delete permanently
                  </Button>
                </form>
              ) : null}
            </>
          )
        }
      />

      {query.saved ? <Notice tone="success">Transcript saved. Re-extract the facts if the meaning changed.</Notice> : null}
      {query.reextracted ? (
        <Notice tone="success">
          Re-extracted {query.reextracted} fact candidate{query.reextracted === "1" ? "" : "s"}. Review them on the right.
        </Notice>
      ) : null}
      {query.error ? <Notice tone="error">{query.error}</Notice> : null}
      {query.approved ? (
        <Notice tone="success">
          Source approved. {query.approved} fact candidate{query.approved === "1" ? "" : "s"} created in the review queue.
        </Notice>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="What this source says"
              description="The extracted summary the writer will see first."
              action={<CopyButton text={item.summary || item.raw_text || item.transcript} label="Copy" />}
            />
            <div className="px-5 py-4">
              <p className="text-sm leading-relaxed text-ink">{item.summary || "No summary extracted yet."}</p>
              {fileUrl && item.type === "voice" ? (
                <div className="mt-4 rounded-xl border border-line bg-cream/40 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                    <FileAudio className="h-3.5 w-3.5" />
                    Audio source
                  </p>
                  <audio controls src={fileUrl} className="w-full" preload="none" />
                  <p className="mt-2 text-[10px] text-muted">
                    Audio is deleted after 7 days unless pinned. The transcript stays.
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={item.transcript ? "Transcript" : "No transcript yet"}
              description={
                item.transcript
                  ? "Edit the transcript if the transcription missed a name, price or date."
                  : "Automatic transcription was not available. Paste or type the transcript to extract facts."
              }
              action={<CopyButton text={item.transcript || item.raw_text} label="Copy text" />}
            />
            <form action={updateTranscriptAction} className="space-y-3 p-5">
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="brandId" value={item.brand_id} />
              <Textarea
                name="transcript"
                rows={8}
                defaultValue={item.transcript || item.raw_text}
                placeholder="Type the transcript here…"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="outline" size="sm">
                  Save transcript
                </Button>
              </div>
            </form>
            <form action={reExtractKnowledgeAction} className="border-t border-line bg-cream/30 px-5 py-3">
              <input type="hidden" name="id" value={item.id} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] leading-relaxed text-muted">
                  After editing, re-run extraction to turn the new transcript into fact candidates.
                </p>
                <Button type="submit" variant="coral" size="sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Re-extract facts
                </Button>
              </div>
            </form>
          </Card>

          {item.raw_text && item.raw_text !== item.transcript ? (
            <Card>
              <CardHeader title="Source text" description="The original extract, kept for traceability." />
              <div className="max-h-[360px] overflow-y-auto px-5 py-4">
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink/80">
                  {truncate(item.raw_text, 6000)}
                </p>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Extracted facts"
              description="Review each one. High-confidence facts can be approved in one click."
              action={<Badge tone="gold">{candidates.length}</Badge>}
            />
            <div className="divide-y divide-line/70">
              {candidates.length === 0 ? (
                <p className="px-5 py-6 text-xs text-muted">
                  No fact candidates. Add a transcript or use the manual fact form on the inbox page.
                </p>
              ) : (
                candidates.map((candidate, index) => {
                  const existing = relatedFacts.find(
                    (fact) => fact.subject === candidate.subject && fact.value === candidate.value
                  );
                  return (
                    <div key={`${candidate.subject}-${index}`} className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                          {candidate.subject}
                        </p>
                        <Badge tone={candidate.confidence >= 0.8 ? "teal" : candidate.confidence >= 0.6 ? "gold" : "coral"}>
                          {Math.round(candidate.confidence * 100)}%
                        </Badge>
                        {existing ? <Badge tone="neutral">{existing.status}</Badge> : null}
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink">{candidate.value}</p>
                      {candidate.reason ? (
                        <p className="mt-1.5 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted">
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" />
                          {candidate.reason}
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
            {item.status === "needs_review" ? (
              <div className="border-t border-line bg-cream/30 px-5 py-3">
                <p className="text-[10px] leading-relaxed text-muted">
                  Approving the source creates pending facts. They still need a second click in the
                  Brand Facts section before the writer can rely on them.
                </p>
              </div>
            ) : null}
          </Card>

          <Card className="bg-ink text-paper">
            <div className="p-5">
              <Sparkles className="h-4 w-4 text-coral" />
              <p className="display mt-3 text-xl leading-tight">Newer information wins.</p>
              <p className="mt-2 text-[11px] leading-relaxed text-paper/50">
                When a new fact conflicts with an approved one, the hub shows both values and asks you
                which one is current. The old value is kept in history.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Source details" />
            <dl className="divide-y divide-line/70 text-xs">
              {[
                ["Type", item.type],
                ["Status", item.status],
                ["Source", item.source],
                ["Added", formatDate(item.created_at)],
                ["File", item.file_path ? "Attached" : "None"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 px-5 py-2.5">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{label}</dt>
                  <dd className="text-right text-[11px] font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
