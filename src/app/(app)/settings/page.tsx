import Link from "next/link";
import {
  Bot,
  Building2,
  CheckCircle2,
  Database,
  ExternalLink,
  HardDrive,
  KeyRound,
  Palette,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { requireUser, canManageBrand } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import {
  getBrandProfile,
  getRetentionStats,
  getSetting,
  listBrands,
  listSocialAccounts,
  listUsers,
} from "@/lib/data";
import { aiStatus } from "@/lib/ai";
import { isEncryptionConfigured } from "@/lib/crypto";
import { oauthProviderConfigured, type OAuthPlatform } from "@/lib/oauth";
import { r2Configured } from "@/lib/storage";
import { PLATFORM_ORDER, platformMeta } from "@/lib/platforms";
import { fileSize, safeJson } from "@/lib/utils";
import {
  listProviderProfiles,
  providerProfileForBrand,
  providerUsage,
  uploadPostConfigured,
} from "@/lib/providers/uploadpost";
import {
  createBrandAction,
  inviteUserAction,
  updateBrandBasicsAction,
  updateBrandProfileAction,
} from "@/app/actions/brand";
import { disconnectChannelAction } from "@/app/actions/channels";
import { runRetentionAction, saveRetentionAction } from "@/app/actions/settings";
import { ProviderSettings } from "@/components/provider-settings";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Notice,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    retentionDryRun?: string;
    notifications?: string;
    sessions?: string;
    pruned?: string;
    connected?: string;
    disconnected?: string;
    accounts?: string;
    provider?: string;
    providerMessage?: string;
  }>;
}) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const profile = getBrandProfile(brand.id);
  const brands = listBrands();
  const users = listUsers();
  const accounts = listSocialAccounts(brand.id);
  const retention = getRetentionStats();
  const hotDays = getSetting("retention.hot_days", "90");
  const voiceDays = getSetting("retention.voice_audio_days", "7");
  const ai = aiStatus();
  const params = await searchParams;
  const canManage = canManageBrand(user);
  const pillars = safeJson<string[]>(profile?.pillars, []).join("\n");
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const isLocalMeta = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");
  const encryptionReady = isEncryptionConfigured();
  const r2Ready = r2Configured();
  const providerProfile = providerProfileForBrand(brand.id);
  const providerUse = providerUsage();
  const providerProfiles = listProviderProfiles();
  const r2Public = Boolean(process.env.R2_PUBLIC_BASE_URL);

  function providerFor(platform: string): OAuthPlatform {
    if (platform === "facebook" || platform === "instagram") return "meta";
    if (platform === "youtube") return "google";
    if (platform === "linkedin" || platform === "x" || platform === "tiktok") return platform;
    return "mock";
  }

  return (
    <div className="space-y-6 fade-up">
      <PageHeader
        eyebrow={`${brand.name} · workspace settings`}
        title="Settings"
        description="Brand voice, channels, the team, AI keys and the data lifecycle. This is the part that keeps the hub honest."
        actions={<Badge tone={ai.configured ? "teal" : "gold"}>{ai.label}</Badge>}
      />

      {params.saved ? <Notice tone="success">Settings saved.</Notice> : null}
      {params.connected ? (
        <Notice tone="success">
          Connected {params.connected} account{params.connected === "1" ? "" : "s"}
          {params.accounts ? `: ${params.accounts}` : "."}
        </Notice>
      ) : null}
      {params.disconnected ? <Notice tone="info">Channel disconnected.</Notice> : null}
      {params.providerMessage ? (
        <Notice tone={params.provider === "error" ? "error" : "success"}>
          {params.providerMessage}
        </Notice>
      ) : null}
      {params.provider === "connected" && !params.providerMessage ? (
        <Notice tone="info">
          Back from Upload-Post. Press <strong>Refresh</strong> in Automatic publishing to pull the
          connected channels.
        </Notice>
      ) : null}
      {params.error ? <Notice tone="error">{params.error}</Notice> : null}
      {params.retentionDryRun ? (
        <Notice tone="info">
          Dry run: {params.notifications} notifications and {params.sessions} sessions would be removed.
          Nothing was deleted.
        </Notice>
      ) : null}
      {params.pruned ? (
        <Notice tone="success">
          Pruned {params.notifications} notifications and {params.sessions} sessions. Business records were
          untouched.
        </Notice>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Brand basics"
              description="The name, handle and colour used across the hub and reports."
              action={<Building2 className="h-4 w-4 text-muted" />}
            />
            <form action={updateBrandBasicsAction} className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Brand name" htmlFor="brand-name">
                <Input id="brand-name" name="name" defaultValue={brand.name} required />
              </Field>
              <Field label="Handle" htmlFor="brand-handle">
                <Input id="brand-handle" name="handle" defaultValue={brand.handle} />
              </Field>
              <Field label="Niche" htmlFor="brand-niche">
                <Input id="brand-niche" name="niche" defaultValue={brand.niche} />
              </Field>
              <Field label="Brand colour" htmlFor="brand-color" hint="Used in the UI and report covers.">
                <Input id="brand-color" name="color" type="color" defaultValue={brand.color} className="h-10 p-1" />
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" variant="primary" size="sm" disabled={!canManage}>
                  Save brand basics
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Brand voice & guardrails"
              description="This is what every generator reads before it writes a word."
              action={<Palette className="h-4 w-4 text-muted" />}
            />
            <form action={updateBrandProfileAction} className="space-y-4 p-5">
              <Field label="Tone" htmlFor="tone" hint="How the brand sounds. Be specific: rhythm, warmth, vocabulary.">
                <Textarea id="tone" name="tone" rows={3} defaultValue={profile?.tone ?? ""} />
              </Field>
              <Field label="Audience" htmlFor="audience" hint="Who it is for, where they are, what they care about.">
                <Textarea id="audience" name="audience" rows={2} defaultValue={profile?.audience ?? ""} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Content pillars" htmlFor="pillars" hint="One per line.">
                  <Textarea id="pillars" name="pillars" rows={5} defaultValue={pillars} />
                </Field>
                <Field label="Offers / products" htmlFor="offers">
                  <Textarea id="offers" name="offers" rows={5} defaultValue={profile?.offers ?? ""} />
                </Field>
              </div>
              <Field label="Banned claims / words" htmlFor="bannedClaims" hint="Comma separated. The safety check flags these.">
                <Textarea
                  id="bannedClaims"
                  name="bannedClaims"
                  rows={2}
                  defaultValue={profile?.banned_claims ?? ""}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preferred hashtags" htmlFor="hashtags">
                  <Textarea id="hashtags" name="hashtags" rows={2} defaultValue={profile?.hashtags ?? ""} />
                </Field>
                <Field label="CTA style" htmlFor="ctas">
                  <Textarea id="ctas" name="ctas" rows={2} defaultValue={profile?.ctas ?? ""} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Competitors" htmlFor="competitors">
                  <Input id="competitors" name="competitors" defaultValue={profile?.competitors ?? ""} />
                </Field>
                <Field label="Notes" htmlFor="notes" hint="Disclosure rules, approvals, anything the writer must remember.">
                  <Input id="notes" name="notes" defaultValue={profile?.notes ?? ""} />
                </Field>
              </div>
              <Button type="submit" variant="primary" size="sm" disabled={!canManage}>
                Save brand voice
              </Button>
            </form>
          </Card>

          <ProviderSettings
            brand={brand}
            profile={providerProfile}
            usage={providerUse}
            configured={uploadPostConfigured()}
            profilesCount={providerProfiles.length}
          />

          <Card>
            <CardHeader
              title="Channels"
              description="Connect the real accounts when the developer apps are ready, or connect demo accounts to test publishing now."
              action={
                <Badge tone={accounts.length ? "teal" : "gold"}>
                  {accounts.length ? `${accounts.length} connected` : "Assisted only"}
                </Badge>
              }
            />
            <div className="space-y-3 border-b border-line bg-cream/30 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                    OAuth redirect base
                  </p>
                  <code className="mt-1 block break-all rounded-lg bg-white px-2.5 py-1.5 text-[10px] text-ink">
                    {appUrl}/api/oauth/&lt;platform&gt;/callback
                  </code>
                </div>
                <Badge tone={isLocalMeta ? "coral" : "teal"}>
                  {isLocalMeta ? "Meta needs HTTPS" : "HTTPS ready"}
                </Badge>
              </div>
              <p className="text-[10px] leading-relaxed text-muted">
                Meta rejected the localhost callback, as expected. Set <code>APP_URL</code> to a tunnel or
                deployed HTTPS URL before connecting Meta; Google can use localhost. The app uses this same
                value when it builds every OAuth callback.
              </p>
              {!encryptionReady ? (
                <p className="text-[10px] font-semibold text-red-600">
                  Set <code>APP_ENCRYPTION_KEY</code> before connecting a real account. Demo connections work
                  without it.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/api/oauth/mock/start"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[10px] font-bold text-ink hover:bg-cream/60"
                >
                  <Wifi className="h-3 w-3" />
                  Connect demo accounts
                </Link>
                <span className="text-[10px] text-muted">
                  Demo accounts publish immediately and never touch a real platform.
                </span>
              </div>
            </div>
            <div className="divide-y divide-line/70">
              {PLATFORM_ORDER.map((platform) => {
                const meta = platformMeta(platform);
                const platformAccounts = accounts.filter((account) => account.platform === platform);
                const provider = providerFor(platform);
                const configured = oauthProviderConfigured(provider);
                const canConnect =
                  configured && (provider === "mock" || encryptionReady) && !(provider === "meta" && isLocalMeta);
                const blockedReason =
                  provider === "meta" && isLocalMeta
                    ? "Set APP_URL to HTTPS first"
                    : !encryptionReady
                      ? "Set APP_ENCRYPTION_KEY first"
                      : "Add credentials first";
                return (
                  <div key={platform} className="px-5 py-3.5">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        {meta.short}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-semibold text-ink">{meta.label}</p>
                          {platformAccounts.length > 0 ? (
                            <Badge tone="teal">{platformAccounts.length} connected</Badge>
                          ) : (
                            <Badge tone="gold">Assisted</Badge>
                          )}
                          {!configured ? (
                            <Badge tone="neutral">Add {provider} credentials</Badge>
                          ) : null}
                        </div>
                        {platformAccounts.length === 0 ? (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <p className="text-[10px] leading-relaxed text-muted">{meta.assistedNote}</p>
                            {canConnect ? (
                              <Link
                                href={`/api/oauth/${provider}/start`}
                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-line bg-white px-2 text-[9px] font-bold text-ink hover:bg-cream/60"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Connect
                              </Link>
                            ) : configured ? (
                              <span className="text-[9px] font-semibold text-muted">{blockedReason}</span>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-2 space-y-2">
                            {platformAccounts.map((account) => {
                              const metadata = safeJson<{ mock?: boolean; kind?: string }>(
                                account.metadata_json,
                                {}
                              );
                              return (
                                <div
                                  key={account.id}
                                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[11px] font-semibold text-ink">
                                      {account.account_name}
                                    </p>
                                    <p className="truncate text-[9px] text-muted">
                                      {account.account_handle}
                                      {metadata.kind ? ` · ${metadata.kind}` : ""}
                                      {account.status !== "connected" ? ` · ${account.status}` : ""}
                                    </p>
                                  </div>
                                  {metadata.mock ? <Badge tone="gold">Demo</Badge> : null}
                                  {canConnect ? (
                                    <Link
                                      href={`/api/oauth/${provider}/start`}
                                      className="inline-flex h-7 items-center rounded-lg border border-line bg-white px-2 text-[9px] font-bold text-ink hover:bg-cream/60"
                                    >
                                      Reconnect
                                    </Link>
                                  ) : (
                                    <span className="text-[9px] font-semibold text-muted">{blockedReason}</span>
                                  )}
                                  <form action={disconnectChannelAction}>
                                    <input type="hidden" name="accountId" value={account.id} />
                                    <button
                                      type="submit"
                                      className="inline-flex h-7 items-center rounded-lg border border-line bg-white px-2 text-[9px] font-bold text-muted hover:bg-red-50 hover:text-red-600"
                                    >
                                      Disconnect
                                    </button>
                                  </form>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-line bg-cream/30 px-5 py-3">
              <p className="text-[10px] leading-relaxed text-muted">
                Real tokens are encrypted with <code>APP_ENCRYPTION_KEY</code> before they touch the database.
                Capabilities are stored per channel, so unsupported actions stay assisted instead of failing
                silently.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Create another brand"
              description="For a new client or a second brand under the same client."
              action={<Plus className="h-4 w-4 text-muted" />}
            />
            <form action={createBrandAction} className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Name" htmlFor="new-name">
                <Input id="new-name" name="name" placeholder="e.g. Lumen Body" required />
              </Field>
              <Field label="Handle" htmlFor="new-handle">
                <Input id="new-handle" name="handle" placeholder="@lumenbody" />
              </Field>
              <Field label="Niche" htmlFor="new-niche">
                <Input id="new-niche" name="niche" placeholder="Body care" />
              </Field>
              <Field label="Colour" htmlFor="new-color">
                <Input id="new-color" name="color" type="color" defaultValue="#FF5A36" className="h-10 p-1" />
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" variant="coral" size="sm" disabled={!canManage}>
                  <Plus className="h-3.5 w-3.5" />
                  Create brand
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="AI & keys"
              description="The hub runs in demo mode until a key is present."
              action={<KeyRound className="h-4 w-4 text-muted" />}
            />
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-xl bg-cream/50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-ink/60" />
                  <div>
                    <p className="text-[11px] font-semibold text-ink">
                      {ai.configured ? "Gemini" : "Demo templates"}
                    </p>
                    <p className="text-[9px] text-muted">{ai.model}</p>
                  </div>
                </div>
                <Badge tone={ai.configured ? "teal" : "gold"}>{ai.configured ? "Live" : "Offline"}</Badge>
              </div>
              <div className="rounded-xl border border-line bg-white p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-muted">.env.local</p>
                <pre className="mt-2 overflow-x-auto text-[10px] leading-relaxed text-ink/70">{`GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...
SEARCH_API_KEY=...
META_APP_ID=...
GOOGLE_CLIENT_ID=...
LINKEDIN_CLIENT_ID=...
X_CLIENT_ID=...
TIKTOK_CLIENT_KEY=...
WHATSAPP_ACCESS_TOKEN=...
RESEND_API_KEY=...
S3_ENDPOINT=...`}</pre>
              </div>
              <p className="text-[10px] leading-relaxed text-muted">
                Gemini is used for writing, extraction and transcription. DeepSeek is wired as an
                OpenAI-compatible fallback in the provider layer. No key means the hub still works, with
                clearly labelled demo copy.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Team"
              description="Owner, manager, editor or viewer."
              action={<Users className="h-4 w-4 text-muted" />}
            />
            <div className="divide-y divide-line/70">
              {users.map((member) => (
                <div key={member.id} className="flex items-center gap-2.5 px-5 py-3">
                  <Avatar name={member.name} color={member.avatar_color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-ink">{member.name}</p>
                    <p className="truncate text-[9px] text-muted">{member.email}</p>
                  </div>
                  <Badge tone="neutral">{member.role}</Badge>
                </div>
              ))}
            </div>
            {user.role === "owner" ? (
              <form action={inviteUserAction} className="space-y-2.5 border-t border-line bg-cream/30 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">Add a teammate</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input name="name" placeholder="Name" required />
                  <Input name="email" type="email" placeholder="Email" required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select name="role" defaultValue="editor">
                    <option value="manager">Manager</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                  <Input name="password" type="text" placeholder="Temp password" defaultValue="password123" />
                </div>
                <Button type="submit" variant="outline" size="sm" className="w-full">
                  Add teammate
                </Button>
              </form>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              title="Data & retention"
              description="No monthly wipe. Archive and prune, with a preview first."
              action={<Database className="h-4 w-4 text-muted" />}
            />
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between rounded-xl bg-cream/50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-ink/60" />
                  <div>
                    <p className="text-[11px] font-semibold text-ink">Database size</p>
                    <p className="text-[9px] text-muted">SQLite · local storage</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-ink">{fileSize(retention.dbSize)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {retention.rows.slice(0, 8).map((row) => (
                  <div key={row.table} className="rounded-lg border border-line bg-white px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted">{row.table.replaceAll("_", " ")}</p>
                    <p className="mt-0.5 text-sm font-semibold text-ink">{row.count}</p>
                  </div>
                ))}
              </div>

              <form action={saveRetentionAction} className="space-y-2.5 border-t border-line pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Hot window (days)" htmlFor="hotDays">
                    <Input id="hotDays" name="hotDays" type="number" min={30} max={365} defaultValue={hotDays} />
                  </Field>
                  <Field label="Voice audio (days)" htmlFor="voiceDays">
                    <Input id="voiceDays" name="voiceDays" type="number" min={0} max={90} defaultValue={voiceDays} />
                  </Field>
                </div>
                <Button type="submit" variant="outline" size="sm" className="w-full">
                  Save retention settings
                </Button>
              </form>

              <div className="space-y-2 border-t border-line pt-3">
                {retention.prunable.map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-2">
                    <p className="text-[10px] leading-relaxed text-muted">{item.label}</p>
                    <span className="shrink-0 text-[10px] font-bold text-ink">{item.count}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={runRetentionAction}>
                  <input type="hidden" name="mode" value="dry-run" />
                  <Button type="submit" variant="outline" size="sm">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Dry run
                  </Button>
                </form>
                <form action={runRetentionAction}>
                  <input type="hidden" name="mode" value="prune" />
                  <Button type="submit" variant="danger" size="sm">
                    <Trash2 className="h-3.5 w-3.5" />
                    Prune transient
                  </Button>
                </form>
              </div>

              <div className="rounded-xl bg-ink p-3 text-paper">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-coral">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  The rule
                </p>
                <p className="mt-1.5 text-[10px] leading-relaxed text-paper/50">
                  Business records — posts, approvals, reports, audit — are never wiped monthly.
                  Transient data is pruned; old time-series data is archived first. Destructive actions
                  show a dry run and require confirmation.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Media storage"
              description="300 MB direct uploads, multipart when R2 is configured."
              action={<HardDrive className="h-4 w-4 text-muted" />}
            />
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-xl bg-cream/50 px-3 py-2.5">
                <div>
                  <p className="text-[11px] font-semibold text-ink">
                    {r2Ready ? "Cloudflare R2" : "Local fallback"}
                  </p>
                  <p className="text-[9px] text-muted">
                    {r2Ready
                      ? "Browser uploads directly to R2 with 16 MB multipart chunks."
                      : "Browser uploads 8 MB chunks to this server. Add R2 for direct-to-cloud uploads."}
                  </p>
                </div>
                <Badge tone={r2Ready ? "teal" : "gold"}>{r2Ready ? "R2" : "Local"}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line bg-white px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted">Max file</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">300 MB</p>
                </div>
                <div className="rounded-lg border border-line bg-white px-2.5 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-muted">Public previews</p>
                  <p className="mt-0.5 text-sm font-semibold text-ink">{r2Public ? "Yes" : "No"}</p>
                </div>
              </div>
              {!r2Ready ? (
                <p className="text-[10px] leading-relaxed text-muted">
                  Add <code>R2_ACCOUNT_ID</code>, <code>R2_ACCESS_KEY_ID</code>,{" "}
                  <code>R2_SECRET_ACCESS_KEY</code> and <code>R2_BUCKET</code> to switch to direct uploads.
                </p>
              ) : !r2Public ? (
                <p className="text-[10px] leading-relaxed text-amber-700">
                  Set <code>R2_PUBLIC_BASE_URL</code> so previews and the assisted kit can read the
                  uploaded files.
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Workspace" description="Switch between the brands you manage." />
            <div className="divide-y divide-line/70">
              {brands.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 px-5 py-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-ink">{item.name}</p>
                    <p className="truncate text-[9px] text-muted">{item.handle} · {item.timezone}</p>
                  </div>
                  {item.id === brand.id ? <Badge tone="teal">Active</Badge> : <span className="text-[9px] text-muted">—</span>}
                </div>
              ))}
            </div>
            <div className="border-t border-line bg-cream/30 px-5 py-3">
              <p className="flex items-center gap-1.5 text-[10px] text-muted">
                <Sparkles className="h-3 w-3 text-coral" />
                The notebook can be ingested later; it is not a dependency.
              </p>
            </div>
          </Card>

          <Link
            href="/knowledge"
            className="flex items-center justify-between rounded-2xl border border-dashed border-line bg-cream/30 px-4 py-3 text-[11px] font-semibold text-muted hover:text-ink"
          >
            <span className="flex items-center gap-2">
              <Wifi className="h-3.5 w-3.5" />
              Add the client’s newer information
            </span>
            <span>Open inbox →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
