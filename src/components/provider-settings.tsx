import { ExternalLink, RefreshCw, Trash2, Upload } from "lucide-react";
import type { Brand } from "@/lib/types";
import type {
  ProviderProfileView,
  ProviderUsageView,
} from "@/lib/providers/uploadpost";
import { Badge, Button, Card, CardHeader, Field, Input, Notice, Progress } from "@/components/ui";
import {
  connectProviderProfileAction,
  refreshProviderProfileAction,
  removeProviderProfileAction,
} from "@/app/actions/provider";

function defaultUsername(brand: Brand): string {
  const base = brand.handle.replace(/^@/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${base || "brand"}-${brand.id.slice(-6)}`.slice(0, 80);
}

export function ProviderSettings({
  brand,
  profile,
  usage,
  configured,
  profilesCount,
}: {
  brand: Brand;
  profile?: ProviderProfileView;
  usage: ProviderUsageView;
  configured: boolean;
  profilesCount: number;
}) {
  const reset = new Date(usage.nextReset).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const percent = usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0;
  const freeProfileLimitReached = usage.plan === "free" && profilesCount >= 2 && !profile;

  return (
    <Card>
      <CardHeader
        title="Automatic publishing"
        description="Upload-Post carries the platform approvals. Assisted mode is always the fallback."
        action={
          <Badge tone={configured && profile ? "teal" : configured ? "gold" : "neutral"}>
            {!configured ? "No API key" : profile ? "Connected" : "Key only"}
          </Badge>
        }
      />
      <div className="space-y-5 p-5">
        {!configured ? (
          <Notice tone="info">
            Add <code>UPLOADPOST_API_KEY</code> to <code>.env.local</code> to turn on automatic
            posting. Until then every channel uses the assisted kit. The key stays server-side.
          </Notice>
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[11px] font-semibold text-ink">
                  {usage.plan === "free" ? "Free uploads this month" : "Upload-Post plan usage"}
                </p>
                <p className="text-[11px] tabular-nums text-muted">
                  {usage.plan === "free" ? `${usage.used} / ${usage.limit}` : `${usage.used} used`}
                </p>
              </div>
              {usage.plan === "free" ? (
                <>
                  <Progress value={percent} className="mt-2" />
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted">
                    <span>Resets {reset}</span>
                    {usage.exhausted ? (
                      <span className="font-semibold text-gold">
                        Limit reached — posts fall back to assisted
                      </span>
                    ) : (
                      <span>{Math.max(0, usage.limit - usage.used)} uploads left</span>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  Paid plan: the lab still falls back to assisted if a channel is not connected.
                </p>
              )}
            </div>

            {usage.plan === "free" ? (
              <p className="rounded-xl bg-cream/60 px-3 py-2 text-[10px] leading-relaxed text-muted">
                Free plan: <strong>10 uploads/month</strong>, <strong>2 profiles</strong>, and TikTok
                is not available. One multi-platform post counts as one upload. When the limit is
                reached, the hub continues with the assisted kit until {reset}.
              </p>
            ) : null}

            {profile ? (
              <div className="rounded-xl border border-line bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-ink">
                      {profile.display_name || profile.profile_username}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted">
                      Profile: {profile.profile_username}
                    </p>
                  </div>
                  <Badge tone={profile.status === "connected" ? "teal" : "gold"}>
                    {profile.status === "connected" ? "Connected" : "Needs reconnect"}
                  </Badge>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.connectedPlatforms.length ? (
                    profile.connectedPlatforms.map((platform) => (
                      <span
                        key={platform}
                        className="rounded-md bg-cream px-1.5 py-1 text-[9px] font-semibold capitalize text-ink/70"
                      >
                        {platform}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-muted">
                      No social accounts connected yet. Use the connect link.
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={connectProviderProfileAction}>
                    <input type="hidden" name="username" value={profile.profile_username} />
                    <input type="hidden" name="displayName" value={profile.display_name} />
                    <Button type="submit" variant="outline" size="sm">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Manage connections
                    </Button>
                  </form>
                  <form action={refreshProviderProfileAction}>
                    <Button type="submit" variant="outline" size="sm">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Refresh
                    </Button>
                  </form>
                  <form action={removeProviderProfileAction}>
                    <Button type="submit" variant="ghost" size="sm" className="text-muted hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </form>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-muted">
                  “Manage connections” opens Upload-Post&apos;s secure page. When you return, press
                  Refresh.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-white p-3">
                <p className="text-[11px] font-semibold text-ink">Connect {brand.name}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  Create one Upload-Post profile per brand. The free plan allows two; a third brand
                  stays on assisted mode.
                </p>
                {freeProfileLimitReached ? (
                  <Notice tone="warning" className="mt-3">
                    Both free profiles are already mapped. Remove one above, or upgrade Upload-Post,
                    before adding {brand.name}.
                  </Notice>
                ) : (
                  <form action={connectProviderProfileAction} className="mt-3 space-y-3">
                    <Field
                      label="Upload-Post profile username"
                      htmlFor="provider-username"
                      hint="Letters, numbers, _ and -. It becomes the user value on every upload."
                    >
                      <Input
                        id="provider-username"
                        name="username"
                        defaultValue={defaultUsername(brand)}
                        required
                        maxLength={80}
                      />
                    </Field>
                    <Field label="Display name" htmlFor="provider-display-name">
                      <Input
                        id="provider-display-name"
                        name="displayName"
                        defaultValue={brand.name}
                        maxLength={100}
                      />
                    </Field>
                    <Button type="submit" variant="coral" size="sm">
                      <Upload className="h-3.5 w-3.5" />
                      Create profile &amp; connect accounts
                    </Button>
                  </form>
                )}
              </div>
            )}

            <p className="text-[10px] leading-relaxed text-muted">
              Automatic posting handles one multi-platform post per upload. Any channel that is not
              connected in Upload-Post, TikTok on Free, or a post after the monthly limit is recorded
              as an assisted task with the reason in the publish log. The setup note lives in{" "}
              <code>docs/UPLOAD-POST.md</code>.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
