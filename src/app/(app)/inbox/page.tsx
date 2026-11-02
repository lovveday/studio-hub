import {
  AlertTriangle,
  CheckCircle2,
  Heart,
  MessageCircle,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { commentCounts, listComments } from "@/lib/data";
import { relativeTime, truncate } from "@/lib/utils";
import { platformMeta } from "@/lib/platforms";
import {
  draftReplyAction,
  escalateCommentAction,
  likeCommentAction,
  sendReplyAction,
} from "@/app/actions/inbox";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  PageHeader,
  Textarea,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const sentimentTone: Record<string, "teal" | "gold" | "coral" | "neutral"> = {
  positive: "teal",
  question: "gold",
  neutral: "neutral",
  negative: "coral",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ drafted?: string; replied?: string; liked?: string; escalated?: string }>;
}) {
  await requireUser();
  const brand = await getActiveBrand();
  const params = await searchParams;
  const comments = listComments(brand.id, 100);
  const counts = commentCounts(brand.id);

  return (
    <div className="space-y-6 fade-up">
      <PageHeader
        eyebrow={`${brand.name} · ${counts.total} comments captured`}
        title="Engagement inbox"
        description="Every question, compliment and complaint in one queue. Draft in the brand voice, then reply, like, or escalate."
        actions={
          <>
            <Badge tone="gold">{counts.new} waiting</Badge>
            {counts.escalated > 0 ? <Badge tone="coral">{counts.escalated} escalated</Badge> : null}
          </>
        }
      />

      {params.drafted ? <Notice tone="info">Draft generated. Edit it before sending.</Notice> : null}
      {params.replied ? <Notice tone="success">Reply recorded. In a live account, this would be sent through the platform API.</Notice> : null}
      {params.liked ? <Notice tone="success">Comment liked. On YouTube this would be a one-tap assisted task.</Notice> : null}
      {params.escalated ? <Notice tone="warning">Escalated. A human must reply; the automation will not touch it.</Notice> : null}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader
            title="Queue"
            description="Newest first. Negative comments are never auto-replied."
            action={<Badge tone="neutral">{comments.length} items</Badge>}
          />
          <div className="divide-y divide-line/70">
            {comments.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<MessageCircle className="h-5 w-5" />}
                  title="No comments captured"
                  description="Once a channel is connected, comments will land here. Until then, add them manually from the seed data."
                />
              </div>
            ) : (
              comments.map((comment) => {
                const meta = platformMeta(comment.platform);
                return (
                  <div key={comment.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={comment.author} color={meta.color} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-ink">{comment.author}</p>
                          <span className="text-[10px] text-muted">{comment.author_handle}</span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-white"
                            style={{ backgroundColor: meta.color }}
                          >
                            {meta.short}
                          </span>
                          <Badge tone={sentimentTone[comment.sentiment] ?? "neutral"}>{comment.sentiment}</Badge>
                          {comment.status !== "new" ? <Badge tone="neutral">{comment.status}</Badge> : null}
                          <span className="ml-auto text-[10px] text-muted">{relativeTime(comment.created_at)}</span>
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{comment.text}</p>

                        <form action={sendReplyAction} className="mt-3 space-y-2">
                          <input type="hidden" name="commentId" value={comment.id} />
                          <Textarea
                            name="reply"
                            rows={2}
                            defaultValue={comment.reply_draft}
                            placeholder="Write the reply in the brand voice…"
                            className="min-h-16 text-xs"
                          />
                          <Button type="submit" variant="primary" size="sm">
                            <Send className="h-3.5 w-3.5" />
                            Mark replied
                          </Button>
                        </form>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <form action={draftReplyAction}>
                            <input type="hidden" name="commentId" value={comment.id} />
                            <Button type="submit" variant="outline" size="sm">
                              <Sparkles className="h-3.5 w-3.5" />
                              Draft with AI
                            </Button>
                          </form>
                          <form action={likeCommentAction}>
                            <input type="hidden" name="commentId" value={comment.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              <Heart className="h-3.5 w-3.5" />
                              Like
                            </Button>
                          </form>
                          <form action={escalateCommentAction}>
                            <input type="hidden" name="commentId" value={comment.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Escalate
                            </Button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="bg-ink text-paper">
            <div className="p-5">
              <Users className="h-4 w-4 text-coral" />
              <p className="display mt-3 text-xl leading-tight">The first 5 comments are the job.</p>
              <p className="mt-2 text-[11px] leading-relaxed text-paper/50">
                When a post goes live, the engagement window opens. The hub replies to the first five
                comments within the rules you set, likes the positive ones where the platform allows it,
                and escalates anything negative or legal.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  ["Window", "120 min"],
                  ["Max replies", "5"],
                  ["Like mode", "Positive"],
                  ["Escalate", "Negative"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
                    <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-paper/35">{label}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-paper/80">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="What is automated today" description="No live platform connection yet." />
            <div className="space-y-3 p-5">
              {[
                ["Draft generation", "Live", "teal"],
                ["Reply recording", "Live (local)", "teal"],
                ["Auto-like", "Assisted", "gold"],
                ["Auto-reply to first 5", "Queued for API access", "coral"],
                ["Crisis escalation", "Rule ready", "gold"],
              ].map(([label, status, tone]) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-[11px] text-ink/75">{label}</p>
                  <Badge tone={tone as "teal" | "gold" | "coral"}>{status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Rule of thumb" />
            <div className="space-y-3 p-5 text-[11px] leading-relaxed text-muted">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                Reply to questions with a specific answer, not a link.
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                Like praise when the platform supports it — it is the fastest acknowledgement.
              </p>
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                Never auto-reply to a complaint, refund, legal or health claim.
              </p>
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                Keep replies varied; duplicate text looks like spam to the algorithm.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Comment snapshot" />
            <div className="grid grid-cols-3 divide-x divide-line/70">
              {[
                ["Waiting", counts.new],
                ["Escalated", counts.escalated],
                ["Total", counts.total],
              ].map(([label, value]) => (
                <div key={String(label)} className="px-3 py-4 text-center">
                  <p className="display text-xl text-ink">{value}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
