import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileText,
  Globe2,
  Inbox,
  Link2,
  Mic,
  Sparkles,
  StickyNote,
  Upload,
  X,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { listFacts, listKnowledge } from "@/lib/data";
import { formatDate, relativeTime, truncate } from "@/lib/utils";
import { VoiceRecorder } from "@/components/voice-recorder";
import {
  addManualFactAction,
  addNoteAction,
  addUrlAction,
  approveFactAction,
  rejectFactAction,
  uploadKnowledgeAction,
} from "@/app/actions/knowledge";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Notice,
  PageHeader,
  StatusBadge,
  Textarea,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const typeIcon: Record<string, typeof StickyNote> = {
  note: StickyNote,
  file: FileText,
  url: Globe2,
  voice: Mic,
  image: Upload,
  screenshot: Upload,
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    factStatus?: string;
    approved?: string;
    replaced?: string;
  }>;
}) {
  await requireUser();
  const brand = await getActiveBrand();
  const params = await searchParams;
  const items = listKnowledge(brand.id, 100);
  const facts = listFacts(brand.id, true);
  const factStatus = params.factStatus === "approved" ? "approved" : params.factStatus === "history" ? "history" : "pending";
  const visibleFacts =
    factStatus === "approved"
      ? facts.filter((fact) => fact.status === "approved" && !fact.valid_to)
      : factStatus === "history"
        ? facts
        : facts.filter((fact) => fact.status === "pending");
  const pendingCount = facts.filter((fact) => fact.status === "pending").length;
  const approvedCount = facts.filter((fact) => fact.status === "approved" && !fact.valid_to).length;

  return (
    <div className="space-y-6 fade-up">
      <PageHeader
        eyebrow={`${brand.name} · ${items.length} sources · ${approvedCount} approved facts`}
        title="Knowledge inbox"
        description="Add the newer information that never made it into the notebook. Paste it, upload it, forward a WhatsApp voice note, or drop a link. Nothing becomes a brand fact until you approve it."
        actions={
          <a href="#add-knowledge" className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-paper hover:bg-ink-soft">
            <Sparkles className="h-3.5 w-3.5" />
            Add knowledge
          </a>
        }
      />

      {params.error ? <Notice tone="error">{params.error}</Notice> : null}
      {params.approved ? (
        <Notice tone="success">
          Source approved. {params.approved} fact candidate{params.approved === "1" ? "" : "s"} moved into review below.
        </Notice>
      ) : null}
      {params.replaced ? (
        <Notice tone="success">The new fact replaced the old one. The previous value is kept in history.</Notice>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <Card>
          <CardHeader
            title="Sources"
            description="Everything the writer can cite, newest first."
            action={<Badge tone="neutral">{items.length} items</Badge>}
          />
          <div className="divide-y divide-line/70">
            {items.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<Inbox className="h-5 w-5" />}
                  title="The inbox is empty"
                  description="Add a note, upload the client brief, or record a voice note."
                />
              </div>
            ) : (
              items.map((item) => {
                const Icon = typeIcon[item.type] ?? FileText;
                return (
                  <Link
                    key={item.id}
                    href={`/knowledge/${item.id}`}
                    className="group flex gap-3.5 px-5 py-4 transition-colors hover:bg-cream/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-cream/50 text-ink/60">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-ink group-hover:text-coral">
                          {item.title}
                        </p>
                        <StatusBadge status={item.status} className="scale-90" />
                      </div>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.06em] text-muted">
                        {item.source} · {relativeTime(item.created_at)}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted">
                        {truncate(item.summary || item.transcript || item.raw_text || "No extract yet.", 180)}
                      </p>
                    </div>
                    <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted/30 transition-colors group-hover:text-coral" />
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        <div id="add-knowledge" className="space-y-5">
          <Card>
            <CardHeader
              title="Add a note"
              description="The fastest way to add a price change, a new offer, or a correction."
            />
            <form action={addNoteAction} className="space-y-3 p-5">
              <Field label="Title (optional)" htmlFor="note-title">
                <Input id="note-title" name="title" placeholder="e.g. Price update from call" />
              </Field>
              <Field label="What changed?" htmlFor="note-text">
                <Textarea
                  id="note-text"
                  name="text"
                  rows={5}
                  placeholder="From 1 November the 30ml serum is ₦30,000. The Discovery Set stays ₦45,000. Stop using ‘dermatologist-approved’."
                />
              </Field>
              <Button type="submit" variant="coral" size="sm" className="w-full">
                <StickyNote className="h-3.5 w-3.5" />
                Add to inbox
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Voice notes"
              description="Record here, or upload the WhatsApp .opus / .ogg file."
            />
            <div className="p-5">
              <VoiceRecorder />
            </div>
          </Card>

          <Card>
            <CardHeader title="Upload a file" description="PDF, DOCX, MD, TXT, HTML, image or audio." />
            <form action={uploadKnowledgeAction} className="space-y-3 p-5">
              <Field label="Title (optional)" htmlFor="file-title">
                <Input id="file-title" name="title" placeholder="e.g. November campaign brief" />
              </Field>
              <Field label="File" htmlFor="knowledge-file">
                <input
                  id="knowledge-file"
                  name="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.markdown,.html,.htm,.csv,image/*,audio/*,.opus,.ogg,.oga,.m4a,.mp3,.wav,.aac,.amr"
                  className="block w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-cream file:px-2.5 file:py-1.5 file:text-[11px] file:font-semibold file:text-ink"
                />
              </Field>
              <Button type="submit" variant="outline" size="sm" className="w-full">
                <Upload className="h-3.5 w-3.5" />
                Upload and extract
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Add a link" description="A competitor post, article or reference page." />
            <form action={addUrlAction} className="space-y-3 p-5">
              <Field label="URL" htmlFor="knowledge-url">
                <Input id="knowledge-url" name="url" type="url" placeholder="https://…" />
              </Field>
              <Button type="submit" variant="outline" size="sm" className="w-full">
                <Link2 className="h-3.5 w-3.5" />
                Fetch and extract
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Brand facts"
          description="The facts the writer is allowed to use. Newer information replaces older information; history is kept."
          action={
            <div className="flex items-center gap-1 rounded-lg bg-cream p-1">
              <Link
                href="/knowledge?factStatus=pending"
                className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${
                  factStatus === "pending" ? "bg-white text-ink shadow-sm" : "text-muted"
                }`}
              >
                Pending {pendingCount}
              </Link>
              <Link
                href="/knowledge?factStatus=approved"
                className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${
                  factStatus === "approved" ? "bg-white text-ink shadow-sm" : "text-muted"
                }`}
              >
                Approved {approvedCount}
              </Link>
              <Link
                href="/knowledge?factStatus=history"
                className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${
                  factStatus === "history" ? "bg-white text-ink shadow-sm" : "text-muted"
                }`}
              >
                History
              </Link>
            </div>
          }
        />

        <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="divide-y divide-line/70">
            {visibleFacts.length === 0 ? (
              <p className="px-5 py-8 text-xs text-muted">
                Nothing here yet. Approve a source above to create fact candidates.
              </p>
            ) : (
              visibleFacts.map((fact) => (
                <div key={fact.id} className="flex flex-wrap items-start gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{fact.subject}</p>
                      <Badge
                        tone={
                          fact.status === "approved"
                            ? "teal"
                            : fact.status === "pending"
                              ? "gold"
                              : fact.status === "superseded"
                                ? "neutral"
                                : "red"
                        }
                      >
                        {fact.status}
                      </Badge>
                      {fact.confidence < 0.7 ? <Badge tone="coral">low confidence</Badge> : null}
                      {fact.valid_to ? (
                        <span className="text-[10px] text-muted">expired {formatDate(fact.valid_to)}</span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{fact.value}</p>
                    <p className="mt-1 text-[10px] text-muted">
                      Valid from {formatDate(fact.valid_from)}
                      {fact.supersedes_id ? " · replaces an earlier fact" : ""}
                    </p>
                  </div>
                  {fact.status === "pending" ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <form action={approveFactAction}>
                        <input type="hidden" name="id" value={fact.id} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-teal px-2.5 text-[10px] font-bold text-white hover:bg-[#0b8b8b]"
                        >
                          <Check className="h-3 w-3" /> Approve
                        </button>
                      </form>
                      <form action={rejectFactAction}>
                        <input type="hidden" name="id" value={fact.id} />
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-[10px] font-bold text-muted hover:bg-cream"
                        >
                          <X className="h-3 w-3" /> Reject
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-line bg-cream/30 p-5 lg:border-l lg:border-t-0">
            <p className="eyebrow text-muted">Add a fact manually</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">
              For things you already know — no source needed. It becomes approved immediately.
            </p>
            <form action={addManualFactAction} className="mt-3 space-y-2.5">
              <Input name="subject" placeholder="Subject, e.g. Retail price" required />
              <Textarea name="value" rows={3} placeholder="Value, e.g. ₦30,000 for the 30ml serum" required />
              <Button type="submit" variant="primary" size="sm" className="w-full">
                Add approved fact
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
