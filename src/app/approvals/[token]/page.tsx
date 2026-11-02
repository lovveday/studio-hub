import Link from "next/link";
import { CheckCircle2, Clock3, Eye, MessageSquare, Send, Sparkles } from "lucide-react";
import { get } from "@/lib/db";
import { getBrand, getPostVariants } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";
import { platformMeta } from "@/lib/platforms";
import {
  clientApproveAction,
  clientRequestChangesAction,
} from "@/app/actions/approvals";
import { Badge, Card, Notice, PlatformStack, StatusBadge } from "@/components/ui";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const post = get<Post>("SELECT * FROM posts WHERE share_token = ?", [token]);
  if (!post) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-paper px-5">
        <Card className="max-w-md p-8 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-coral" />
          <h1 className="display mt-4 text-2xl text-ink">This link is not valid.</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ask your social media manager for a fresh approval link.
          </p>
          <Link href="/login" className="mt-5 inline-block text-xs font-semibold text-coral">
            Go to Studio Hub →
          </Link>
        </Card>
      </main>
    );
  }

  const brand = getBrand(post.brand_id);
  const variants = getPostVariants(post.id);
  const done = query.done;

  return (
    <main className="min-h-dvh bg-paper px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-sm font-black text-white">
            S
          </span>
          <div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-ink">STUDIO HUB</p>
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted">Client approval</p>
          </div>
          <Badge tone="teal" className="ml-auto">
            <Eye className="h-3 w-3" />
            Read-only preview
          </Badge>
        </div>

        <Card className="overflow-hidden">
          <div className="bg-ink px-6 py-7 text-paper sm:px-8">
            <p className="eyebrow text-coral">{brand?.name ?? "Client"} · approval request</p>
            <h1 className="display mt-3 text-balance text-[32px] leading-tight sm:text-[40px]">{post.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/55">
              {post.idea || "No brief attached."}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <StatusBadge status={post.status} />
              <PlatformStack platforms={variants.map((variant) => variant.platform)} />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-paper/70">
                <Clock3 className="h-3 w-3" />
                {post.scheduled_at ? formatDateTime(post.scheduled_at) : "Not scheduled yet"}
              </span>
            </div>
          </div>

          {done === "approved" ? (
            <div className="border-b border-line bg-teal-soft px-6 py-4 text-sm text-[#086b6b] sm:px-8">
              <span className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Approved. The team will schedule it and send you the live link.
              </span>
            </div>
          ) : null}
          {done === "changes" ? (
            <div className="border-b border-line bg-gold-soft px-6 py-4 text-sm text-[#7a5116] sm:px-8">
              <span className="flex items-center gap-2 font-semibold">
                <MessageSquare className="h-4 w-4" />
                Changes requested. The team has your note.
              </span>
            </div>
          ) : null}
          {query.error ? (
            <div className="border-b border-line px-6 py-4 sm:px-8">
              <Notice tone="error">{query.error}</Notice>
            </div>
          ) : null}

          <div className="grid gap-0 lg:grid-cols-2">
            {variants.map((variant) => {
              const meta = platformMeta(variant.platform);
              return (
                <div key={variant.id} className="border-b border-line/70 px-6 py-5 lg:odd:border-r sm:px-8">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{meta.label}</p>
                    <span className="ml-auto text-[9px] text-muted">{meta.mediaSpec}</span>
                  </div>
                  <div className="mt-3 rounded-2xl border border-line bg-white p-4">
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{variant.caption}</p>
                    {variant.hashtags ? (
                      <p className="mt-2 text-[12px] font-medium text-[#0A66C2]">{variant.hashtags}</p>
                    ) : null}
                    {variant.first_comment ? (
                      <div className="mt-3 border-t border-line/70 pt-2">
                        <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-muted">
                          First comment
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-ink/70">{variant.first_comment}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-0 border-t border-line lg:grid-cols-2">
            <form action={clientApproveAction} className="space-y-3 px-6 py-6 sm:px-8">
              <input type="hidden" name="token" value={token} />
              <p className="text-sm font-semibold text-ink">Approve this post</p>
              <p className="text-[11px] leading-relaxed text-muted">
                It will be scheduled as-is. You can leave a note for the team.
              </p>
              <input
                name="name"
                placeholder="Your name"
                className="h-9 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-coral/15"
                required
              />
              <textarea
                name="note"
                rows={2}
                placeholder="Optional note"
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-coral/15"
              />
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-teal text-xs font-bold text-white transition-colors hover:bg-[#0b8b8b]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </button>
            </form>

            <form action={clientRequestChangesAction} className="space-y-3 border-t border-line bg-cream/30 px-6 py-6 lg:border-l lg:border-t-0 sm:px-8">
              <input type="hidden" name="token" value={token} />
              <p className="text-sm font-semibold text-ink">Request changes</p>
              <p className="text-[11px] leading-relaxed text-muted">
                Tell the team exactly what to change. They will re-send the post.
              </p>
              <textarea
                name="note"
                rows={4}
                placeholder="e.g. Please soften the opening line and move the price to the first comment."
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-coral/15"
                required
              />
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-xs font-bold text-ink transition-colors hover:bg-cream/60"
              >
                <Send className="h-4 w-4" />
                Send change request
              </button>
            </form>
          </div>
        </Card>

        <p className="pb-6 text-center text-[10px] leading-relaxed text-muted">
          This is a read-only approval link. It expires when the team refreshes it. No account needed.
        </p>
      </div>
    </main>
  );
}
