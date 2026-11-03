import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileCheck2,
  Link2,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import {
  getBrand,
  getBrandProfile,
  getPost,
  getPostVariants,
  listPostAssets,
  listPublishAttempts,
  logActivity,
} from "@/lib/data";
import { aiStatus } from "@/lib/ai";
import { assetUrl } from "@/lib/assets";
import { fileSize, formatDate, formatDateTime } from "@/lib/utils";
import { platformMeta } from "@/lib/platforms";
import { PostVariantTabs } from "@/components/post-variant-tabs";
import { CopyButton } from "@/components/copy-button";
import { DictateButton } from "@/components/dictate-button";
import { LargeAssetUploader } from "@/components/large-asset-uploader";
import {
  approvePostAction,
  createShareLinkAction,
  deletePostAction,
  generateVariantsAction,
  markPublishedAction,
  markReadyAction,
  publishNowAction,
  removePostAssetAction,
  schedulePostAction,
  updatePostAction,
} from "@/app/actions/posts";
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  CardHeader,
  Notice,
  PageHeader,
  PlatformStack,
  StatusBadge,
} from "@/components/ui";

export const dynamic = "force-dynamic";

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function PostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    approved?: string;
    scheduled?: string;
    published?: string;
    shared?: string;
    generated?: string;
    ready?: string;
    error?: string;
    created?: string;
    media?: string;
    publish?: string;
  }>;
}) {
  const user = await requireUser();
  const activeBrand = await getActiveBrand();
  const { id } = await params;
  const query = await searchParams;
  const post = getPost(id);
  if (!post) notFound();
  const brand = getBrand(post.brand_id) ?? activeBrand;
  const profile = getBrandProfile(post.brand_id);
  const variants = getPostVariants(post.id);
  const media = listPostAssets(post.id);
  const publishAttempts = listPublishAttempts(post.id);
  const ai = aiStatus();
  const platforms = variants.map((variant) => variant.platform);
  const sharePath = post.share_token ? `/approvals/${post.share_token}` : "";
  const scheduled = post.scheduled_at ? new Date(post.scheduled_at) : null;
  const prepDeadline = scheduled
    ? new Date(scheduled.getTime() - post.prep_lead_hours * 60 * 60 * 1000)
    : null;
  const overdue = scheduled ? scheduled.getTime() < Date.now() && post.status !== "published" : false;

  const banned = (profile?.banned_claims ?? "")
    .split(",")
    .map((claim) => claim.trim().toLowerCase())
    .filter(Boolean);
  const safety = variants.map((variant) => {
    const total = [variant.caption, variant.hashtags].filter(Boolean).join("\n\n").length;
    const limit = platformMeta(variant.platform).limit;
    const text = `${variant.caption} ${variant.hashtags}`.toLowerCase();
    const hits = banned.filter((claim) => text.includes(claim));
    return {
      platform: variant.platform,
      over: total > limit,
      total,
      limit,
      noFirstComment: !variant.first_comment.trim(),
      bannedHits: hits,
    };
  });
  const issues = safety.filter((row) => row.over || row.noFirstComment || row.bannedHits.length > 0);

  return (
    <div className="space-y-6 fade-up">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Calendar
        </Link>
        <div className="flex items-center gap-2">
          <Badge tone={ai.configured ? "teal" : "gold"}>{ai.configured ? "Gemini writer" : "Demo writer"}</Badge>
          <StatusBadge status={post.status} />
        </div>
      </div>

      <PageHeader
        eyebrow={`${brand.name} · ${scheduled ? formatDateTime(scheduled) : "Unscheduled"}`}
        title={post.title}
        description={post.idea || "No brief yet."}
        actions={
          <>
            {post.status !== "published" ? (
              <>
                <form action={approvePostAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <Button type="submit" variant="outline" size="sm">
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                </form>
                <form action={markReadyAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <Button type="submit" variant="primary" size="sm">
                    <Send className="h-3.5 w-3.5" />
                    Build post kit
                  </Button>
                </form>
                <form action={publishNowAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <Button type="submit" variant="outline" size="sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    Run publisher
                  </Button>
                </form>
                <form action={markPublishedAction}>
                  <input type="hidden" name="postId" value={post.id} />
                  <Button type="submit" variant="coral" size="sm">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark posted
                  </Button>
                </form>
              </>
            ) : (
              <Badge tone="teal">Published</Badge>
            )}
            <form action={createShareLinkAction}>
              <input type="hidden" name="postId" value={post.id} />
              <Button type="submit" variant="outline" size="sm">
                <Share2 className="h-3.5 w-3.5" />
                {post.share_token ? "Refresh client link" : "Client link"}
              </Button>
            </form>
          </>
        }
      />

      {query.created ? <Notice tone="info">Draft generated. Review each platform, then approve.</Notice> : null}
      {query.saved ? <Notice tone="success">Post saved.</Notice> : null}
      {query.generated ? (
        <Notice tone="success">Variants regenerated with {query.generated === "gemini" ? "Gemini" : "demo templates"}.</Notice>
      ) : null}
      {query.approved ? <Notice tone="success">Approved. The client link now shows an approved post.</Notice> : null}
      {query.scheduled ? <Notice tone="success">Schedule updated.</Notice> : null}
      {query.published ? <Notice tone="success">Marked as posted. The engagement watcher would start here.</Notice> : null}
      {query.shared ? (
        <Notice tone="info">
          Client link ready: <span className="font-semibold">{sharePath}</span> — share it with the approver.
        </Notice>
      ) : null}
      {query.ready ? (
        <Notice tone="info">
          Post kit built. Copy each caption, open the platform, and mark the post when it is live.
        </Notice>
      ) : null}
      {query.media ? <Notice tone="success">Media updated.</Notice> : null}
      {query.publish ? (
        <Notice tone="info">
          Publisher ran: {query.publish} target{query.publish === "1" ? "" : "s"} handled. Demo accounts publish
          immediately; channels without a connected account stay as assisted tasks.
        </Notice>
      ) : null}
      {query.error ? <Notice tone="error">{query.error}</Notice> : null}
      {overdue ? (
        <Notice tone="warning">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            This post was scheduled for {formatDateTime(post.scheduled_at)} and is still {post.status.replace("_", " ")}.
          </span>
        </Notice>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Post content"
              description="Edit the brief and every platform variant. Character counts update live."
              action={
                <form action={generateVariantsAction} className="flex items-center gap-2">
                  <input type="hidden" name="postId" value={post.id} />
                  {platforms.map((platform) => (
                    <input key={platform} type="hidden" name="platforms" value={platform} />
                  ))}
                  <Button type="submit" variant="ghost" size="sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    Regenerate
                  </Button>
                </form>
              }
            />
            <form action={updatePostAction} className="space-y-5 p-5">
              <input type="hidden" name="postId" value={post.id} />
              <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-1.5">
                  <label htmlFor="title" className="text-xs font-semibold text-ink/80">
                    Title
                  </label>
                  <input
                    id="title"
                    name="title"
                    defaultValue={post.title}
                    className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral/15"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="scheduledAt" className="text-xs font-semibold text-ink/80">
                    Schedule
                  </label>
                  <input
                    id="scheduledAt"
                    name="scheduledAt"
                    type="datetime-local"
                    defaultValue={toLocalInput(post.scheduled_at)}
                    className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-coral/15"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="idea" className="text-xs font-semibold text-ink/80">
                    Brief / angle
                  </label>
                  <DictateButton targetId="idea" />
                </div>
                <textarea
                  id="idea"
                  name="idea"
                  defaultValue={post.idea}
                  rows={3}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm leading-relaxed text-ink focus:outline-none focus:ring-2 focus:ring-coral/15"
                />
              </div>

              <PostVariantTabs
                variants={variants}
                brandName={brand.name}
                brandHandle={brand.handle}
                brandColor={brand.color}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-[10px] leading-relaxed text-muted">
                  Saving updates the copy. It does not publish anything.
                </p>
                <div className="flex items-center gap-2">
                  <Button type="submit" variant="primary" size="sm">
                    Save changes
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Creative"
              description="The image, video or audio that goes with this post. Attach it before scheduling a real publish."
              action={<Badge tone="neutral">{media.length}</Badge>}
            />
            <div className="space-y-4 p-5">
              <LargeAssetUploader postId={post.id} />
              {media.length === 0 ? (
                <p className="text-[11px] leading-relaxed text-muted">
                  No media attached yet. The assisted kit will tell you what size each platform needs.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {media.map(({ id: mediaId, asset }) => {
                    const url = assetUrl(asset.file_path, asset.storage_provider);
                    return (
                      <div key={mediaId} className="overflow-hidden rounded-xl border border-line bg-white">
                        <div className="flex aspect-video items-center justify-center bg-cream/50">
                          {asset.kind === "image" ? (
                            <img src={url} alt={asset.alt_text || asset.name} className="h-full w-full object-cover" />
                          ) : asset.kind === "video" ? (
                            <video src={url} controls preload="metadata" className="h-full w-full object-cover" />
                          ) : asset.kind === "audio" ? (
                            <audio src={url} controls className="w-full px-4" />
                          ) : (
                            <div className="px-4 text-center">
                              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                                File
                              </p>
                              <p className="mt-1 text-[11px] text-ink/70">Use the download link below.</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-start gap-2 p-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-ink">{asset.name}</p>
                            <p className="mt-0.5 text-[9px] text-muted">
                              {asset.kind} · {fileSize(asset.size)}
                            </p>
                          </div>
                          <a
                            href={url}
                            download
                            className="inline-flex h-7 shrink-0 items-center rounded-lg border border-line bg-white px-2 text-[9px] font-bold text-ink hover:bg-cream/60"
                          >
                            Download
                          </a>
                          <form action={removePostAssetAction}>
                            <input type="hidden" name="postId" value={post.id} />
                            <input type="hidden" name="mediaId" value={mediaId} />
                            <button
                              type="submit"
                              aria-label={`Remove ${asset.name}`}
                              title="Remove media"
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Assisted post kit"
              description="No API connection yet. Copy the copy, open the app, attach the creative, paste the first comment."
              action={<Badge tone="coral">Assisted</Badge>}
            />
            <div className="divide-y divide-line/70">
              {variants.map((variant) => {
                const meta = platformMeta(variant.platform);
                const text = [variant.caption, variant.hashtags].filter(Boolean).join("\n\n");
                return (
                  <div key={variant.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                      <p className="text-xs font-semibold text-ink">{meta.label}</p>
                      <span className="text-[10px] text-muted">{meta.mediaSpec}</span>
                      <span className="ml-auto text-[10px] font-medium text-muted">
                        {text.length}/{meta.limit}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted">
                      {variant.caption}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <CopyButton text={text} label="Copy caption" />
                      <CopyButton text={variant.first_comment} label="Copy first comment" />
                      <a
                        href={meta.deepLink(text)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[11px] font-semibold text-ink hover:bg-cream/60"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open {meta.label}
                      </a>
                    </div>
                  </div>
                );
              })}
              {variants.length === 0 ? (
                <p className="px-5 py-6 text-xs text-muted">No variants yet. Generate them above.</p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Status & schedule" />
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Status</span>
                <StatusBadge status={post.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Scheduled</span>
                <span className="text-[11px] font-semibold text-ink">
                  {scheduled ? formatDateTime(scheduled) : "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Prep deadline</span>
                <span className="text-[11px] font-semibold text-ink">
                  {prepDeadline ? formatDate(prepDeadline) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">Approved</span>
                <span className="text-[11px] font-semibold text-ink">
                  {post.approved_at ? formatDate(post.approved_at) : "Not yet"}
                </span>
              </div>
              <form action={schedulePostAction} className="space-y-2 border-t border-line pt-3">
                <input type="hidden" name="postId" value={post.id} />
                <label htmlFor="reschedule" className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                  Reschedule
                </label>
                <input
                  id="reschedule"
                  name="scheduledAt"
                  type="datetime-local"
                  defaultValue={toLocalInput(post.scheduled_at)}
                  className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-xs text-ink focus:outline-none"
                />
                <Button type="submit" variant="outline" size="sm" className="w-full">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Update schedule
                </Button>
              </form>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Safety check"
              description="Limits, first comments and banned claims."
              action={<Badge tone={issues.length ? "gold" : "teal"}>{issues.length ? `${issues.length} to fix` : "Clear"}</Badge>}
            />
            <div className="divide-y divide-line/70">
              {safety.map((row) => {
                const meta = platformMeta(row.platform);
                const ok = !row.over && !row.noFirstComment && row.bannedHits.length === 0;
                return (
                  <div key={row.platform} className="flex items-start gap-2.5 px-5 py-3">
                    {ok ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-ink">{meta.label}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                        {row.over ? `Over the ${row.limit} character limit. ` : ""}
                        {row.noFirstComment ? "First comment is empty. " : ""}
                        {row.bannedHits.length ? `Banned claim: ${row.bannedHits.join(", ")}.` : ""}
                        {ok ? `${row.total}/${row.limit} characters · first comment ready.` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              {safety.length === 0 ? <p className="px-5 py-5 text-[11px] text-muted">No variants to check.</p> : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Publish log"
              description="Every target attempt: mock, live or assisted."
              action={<Badge tone="neutral">{publishAttempts.length}</Badge>}
            />
            <div className="divide-y divide-line/70">
              {publishAttempts.length === 0 ? (
                <p className="px-5 py-5 text-[11px] text-muted">
                  No publish attempts yet. Run the publisher after connecting a demo or real account.
                </p>
              ) : (
                publishAttempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-start gap-2.5 px-5 py-2.5">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: platformMeta(attempt.platform).color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-ink/70">
                          {platformMeta(attempt.platform).label}
                        </p>
                        <Badge
                          tone={
                            attempt.status === "published"
                              ? "teal"
                              : attempt.status === "failed"
                                ? "red"
                                : attempt.status === "assisted_required"
                                  ? "gold"
                                  : "neutral"
                          }
                        >
                          {attempt.status.replace("_", " ")}
                        </Badge>
                        <span className="text-[9px] text-muted">{formatDateTime(attempt.created_at)}</span>
                      </div>
                      {attempt.external_url ? (
                        <a
                          href={attempt.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium text-[#0A66C2] hover:underline"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          {attempt.external_id}
                        </a>
                      ) : null}
                      {attempt.error ? (
                        <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{attempt.error}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Client approval" description="A read-only link. No account needed." />
            <div className="space-y-3 p-5">
              {post.share_token ? (
                <>
                  <div className="rounded-lg border border-line bg-cream/40 px-3 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-muted">Approval link</p>
                    <p className="mt-1 break-all text-[11px] font-medium text-ink">{sharePath}</p>
                  </div>
                  <CopyButton text={sharePath} label="Copy link" size="md" className="w-full" />
                  <Link
                    href={sharePath}
                    target="_blank"
                    className={buttonClasses("outline", "sm", "w-full")}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Preview the client view
                  </Link>
                </>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted">
                  Create a link to let the client approve, request changes, or leave a note.
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="First comment" description="What goes live immediately after publishing." />
            <div className="space-y-3 p-5">
              {variants.slice(0, 3).map((variant) => (
                <div key={variant.id} className="rounded-xl border border-line bg-cream/30 p-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-3.5 w-3.5 text-muted" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                      {platformMeta(variant.platform).label}
                    </p>
                    <CopyButton text={variant.first_comment} label="Copy" className="ml-auto h-6 px-2 text-[9px]" />
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink/80">
                    {variant.first_comment || "No first comment yet."}
                  </p>
                </div>
              ))}
              {variants.length === 0 ? <p className="text-[11px] text-muted">Add a variant first.</p> : null}
            </div>
          </Card>

          <Card className="border-red-200/70">
            <CardHeader title="Remove this post" description="Deletes the draft and its variants." />
            <div className="p-5">
              <form action={deletePostAction}>
                <input type="hidden" name="postId" value={post.id} />
                <Button type="submit" variant="danger" size="sm" className="w-full">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete post
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
