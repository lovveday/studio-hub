import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { IntegrationAccountView } from "@/lib/types";
import type { ProviderUsageView } from "@/lib/providers/uploadpost";
import type { SocialApiProfile, SocialApiUsageView } from "@/lib/providers/socialapi";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Notice,
  Progress,
  Select,
} from "@/components/ui";
import {
  connectSocialApiAction,
  refreshSocialApiAction,
  removeIntegrationAction,
  saveIntegrationAction,
  savePublicUrlAction,
  saveTranscriptionPreferenceAction,
  testIntegrationAction,
} from "@/app/actions/integrations";

type Props = {
  views: IntegrationAccountView[];
  primaryUsage: ProviderUsageView;
  secondaryUsage: SocialApiUsageView;
  socialProfile?: SocialApiProfile;
  publicUrl: string;
  supportEmail: string;
  canManage: boolean;
};

const SOCIAL_PLATFORMS = ["instagram", "facebook", "tiktok", "x", "linkedin", "youtube"];

function statusTone(view?: IntegrationAccountView): "teal" | "gold" | "neutral" {
  if (view?.configured) return "teal";
  return "neutral";
}

function KeyForm({
  view,
  children,
  canManage,
  showTest = true,
}: {
  view?: IntegrationAccountView;
  children?: React.ReactNode;
  canManage: boolean;
  showTest?: boolean;
}) {
  if (!view) return null;
  return (
    <form action={saveIntegrationAction} className="space-y-3">
      <input type="hidden" name="provider" value={view.provider} />
      <Field label={`${view.label} ${view.role === "primary" ? "key" : "key"}`} htmlFor={`${view.provider}-secret`}>
        <Input
          id={`${view.provider}-secret`}
          name="secret"
          type="password"
          autoComplete="off"
          placeholder={view.configured ? `${view.masked} — leave blank to keep` : "Paste the key"}
          required={!view.configured}
          disabled={!canManage}
        />
      </Field>
      {children}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="coral" size="sm" disabled={!canManage}>
          <KeyRound className="h-3.5 w-3.5" />
          Save key
        </Button>
        {view.configured ? (
          <Button
            type="submit"
            formAction={testIntegrationAction}
            variant="outline"
            size="sm"
            disabled={!canManage || !showTest}
          >
            Test
          </Button>
        ) : null}
      </div>
      {view.configured ? (
        <p className="text-[10px] text-muted">
          Source: {view.source === "environment" ? "environment fallback" : "encrypted vault"} · {view.masked}
        </p>
      ) : null}
    </form>
  );
}

function RemoveKey({ view, canManage }: { view?: IntegrationAccountView; canManage: boolean }) {
  if (!view?.configured || !canManage) return null;
  return (
    <form action={removeIntegrationAction}>
      <input type="hidden" name="provider" value={view.provider} />
      <button
        type="submit"
        className="inline-flex h-7 items-center gap-1 text-[10px] font-semibold text-muted hover:text-red-600"
      >
        <Trash2 className="h-3 w-3" />
        Remove
      </button>
    </form>
  );
}

export function IntegrationSettings({
  views,
  primaryUsage,
  secondaryUsage,
  socialProfile,
  publicUrl,
  supportEmail,
  canManage,
}: Props) {
  const byProvider = Object.fromEntries(views.map((view) => [view.provider, view]));
  const primary = byProvider.uploadpost;
  const secondary = byProvider.socialapi;
  const gemini = byProvider.gemini;
  const deepseek = byProvider.deepseek;
  const deepgram = byProvider.deepgram;
  const whisper = byProvider.whisper;
  const r2 = byProvider.r2;
  const secondaryPercent = secondaryUsage.limit
    ? Math.min(100, (secondaryUsage.used / secondaryUsage.limit) * 100)
    : 0;
  const connected = new Set(socialProfile?.connectedPlatforms ?? []);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="API connections"
          description="Keys are encrypted in this deployment and never sent to the browser after saving."
          action={<ShieldCheck className="h-4 w-4 text-muted" />}
        />
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-ink">Primary publishing</p>
                <p className="mt-0.5 text-[10px] text-muted">Upload-Post · key, plan and free limit</p>
              </div>
              <Badge tone={statusTone(primary)}>{primary?.configured ? "Configured" : "Required"}</Badge>
            </div>
            <KeyForm view={primary} canManage={canManage}>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Plan" htmlFor="uploadpost-plan">
                  <Select id="uploadpost-plan" name="plan" defaultValue={String((primary && JSON.parse(primary.config_json || "{}").plan) || "free")}>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </Select>
                </Field>
                <Field label="Free limit" htmlFor="uploadpost-limit">
                  <Input id="uploadpost-limit" name="freeLimit" type="number" min={1} max={1000} defaultValue={String((primary && JSON.parse(primary.config_json || "{}").freeLimit) || 10)} />
                </Field>
              </div>
            </KeyForm>
            <RemoveKey view={primary} canManage={canManage} />
            <p className="text-[10px] text-muted">
              {primaryUsage.used}/{primaryUsage.limit} uploads used this month · resets {new Date(primaryUsage.nextReset).toLocaleDateString("en-GB")}
            </p>
          </div>

          <div className="space-y-4 rounded-xl border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-ink">Secondary publishing</p>
                <p className="mt-0.5 text-[10px] text-muted">SocialAPI.ai Hobby · 2 brands / 10 posts</p>
              </div>
              <Badge tone={statusTone(secondary)}>{secondary?.configured ? "Configured" : "Optional"}</Badge>
            </div>
            <KeyForm view={secondary} canManage={canManage}>
              <Field label="Free post limit" htmlFor="socialapi-limit">
                <Input id="socialapi-limit" name="freeLimit" type="number" min={1} max={1000} defaultValue={String((secondary && JSON.parse(secondary.config_json || "{}").freeLimit) || 10)} />
              </Field>
            </KeyForm>
            <RemoveKey view={secondary} canManage={canManage} />
            <div>
              <div className="flex justify-between text-[10px] text-muted">
                <span>SocialAPI usage</span>
                <span>{secondaryUsage.used}/{secondaryUsage.limit}</span>
              </div>
              <Progress value={secondaryPercent} className="mt-1.5" />
            </div>
            {socialProfile ? (
              <div className="space-y-2 border-t border-line pt-3">
                <p className="text-[10px] font-semibold text-ink">
                  Brand: {socialProfile.display_name || socialProfile.profile_username}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {socialProfile.connectedPlatforms.length ? (
                    socialProfile.connectedPlatforms.map((platform) => (
                      <Badge key={platform} tone="teal">{platform}</Badge>
                    ))
                  ) : (
                    <p className="text-[10px] text-muted">No accounts linked yet.</p>
                  )}
                </div>
                <form action={refreshSocialApiAction}>
                  <Button type="submit" variant="outline" size="sm" disabled={!canManage}>
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh accounts
                  </Button>
                </form>
              </div>
            ) : null}
            {secondary?.configured ? (
              <div className="border-t border-line pt-3">
                <p className="text-[10px] font-semibold text-ink">Connect a SocialAPI account</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <form key={platform} action={connectSocialApiAction}>
                      <input type="hidden" name="platform" value={platform} />
                      <Button type="submit" variant="outline" size="sm" disabled={!canManage || connected.has(platform)}>
                        <ExternalLink className="h-3 w-3" />
                        {platform}
                      </Button>
                    </form>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted">
                  SocialAPI opens its own consent page. On Hobby, up to two brands can be linked.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="AI and voice"
          description="These keys power writing, image understanding, Virality Lab, voice notes and dictation."
          action={<KeyRound className="h-4 w-4 text-muted" />}
        />
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-line bg-white p-4">
            <p className="text-[11px] font-semibold text-ink">Gemini</p>
            <KeyForm view={gemini} canManage={canManage} />
            <RemoveKey view={gemini} canManage={canManage} />
            <p className="text-[10px] leading-relaxed text-muted">
              Required for AI vision and Virality Lab video analysis. Also a transcription fallback.
            </p>
          </div>
          <div className="space-y-3 rounded-xl border border-line bg-white p-4">
            <p className="text-[11px] font-semibold text-ink">DeepSeek</p>
            <KeyForm view={deepseek} canManage={canManage} />
            <RemoveKey view={deepseek} canManage={canManage} />
            <p className="text-[10px] leading-relaxed text-muted">Optional text-only fallback when Gemini is unavailable.</p>
          </div>
          <div className="space-y-3 rounded-xl border border-line bg-white p-4">
            <p className="text-[11px] font-semibold text-ink">Deepgram</p>
            <KeyForm view={deepgram} canManage={canManage} />
            <RemoveKey view={deepgram} canManage={canManage} />
            <p className="text-[10px] leading-relaxed text-muted">Preferred voice transcription when present.</p>
          </div>
          <div className="space-y-3 rounded-xl border border-line bg-white p-4">
            <p className="text-[11px] font-semibold text-ink">Whisper</p>
            <KeyForm view={whisper} canManage={canManage}>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Base URL" htmlFor="whisper-base">
                  <Input id="whisper-base" name="baseUrl" placeholder="https://api.openai.com/v1" defaultValue={String((whisper && JSON.parse(whisper.config_json || "{}").baseUrl) || "https://api.openai.com/v1")} />
                </Field>
                <Field label="Model" htmlFor="whisper-model">
                  <Input id="whisper-model" name="model" placeholder="whisper-1" defaultValue={String((whisper && JSON.parse(whisper.config_json || "{}").model) || "whisper-1")} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-[10px] text-muted">
                <input type="checkbox" name="allowLocal" defaultChecked={Boolean(whisper && JSON.parse(whisper.config_json || "{}").allowLocal)} />
                Allow a local/private Whisper endpoint (HTTP only for localhost/private IPs)
              </label>
            </KeyForm>
            <RemoveKey view={whisper} canManage={canManage} />
            <form action={saveTranscriptionPreferenceAction} className="space-y-2 border-t border-line pt-3">
              <Field label="Preferred transcription provider" htmlFor="transcription-preference">
                <Select id="transcription-preference" name="preferred" defaultValue="auto" disabled={!canManage}>
                  <option value="auto">Auto: Deepgram → Whisper → Gemini</option>
                  <option value="deepgram">Deepgram first</option>
                  <option value="whisper">Whisper first</option>
                  <option value="gemini">Gemini first</option>
                </Select>
              </Field>
              <Button type="submit" variant="outline" size="sm" disabled={!canManage}>
                Save preference
              </Button>
            </form>
            <p className="text-[10px] leading-relaxed text-muted">
              OpenAI, Groq, or a self-hosted whisper.cpp/faster-whisper endpoint with an OpenAI-compatible API.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Large media storage (optional)"
          description="R2 for large assets and public media URLs. Local storage remains the default."
          action={<ShieldCheck className="h-4 w-4 text-muted" />}
        />
        <form action={saveIntegrationAction} className="grid gap-3 p-5 sm:grid-cols-2">
          <input type="hidden" name="provider" value="r2" />
          <Field label="Account ID" htmlFor="r2-account">
            <Input id="r2-account" name="accountId" defaultValue={String((r2 && JSON.parse(r2.config_json || "{}").accountId) || "")} disabled={!canManage} />
          </Field>
          <Field label="Bucket" htmlFor="r2-bucket">
            <Input id="r2-bucket" name="bucket" defaultValue={String((r2 && JSON.parse(r2.config_json || "{}").bucket) || "")} disabled={!canManage} />
          </Field>
          <Field label="Access key ID" htmlFor="r2-access">
            <Input id="r2-access" name="accessKeyId" autoComplete="off" placeholder={r2?.configured ? "Saved — leave blank to keep" : ""} disabled={!canManage} />
          </Field>
          <Field label="Secret access key" htmlFor="r2-secret">
            <Input id="r2-secret" name="secretAccessKey" type="password" autoComplete="off" placeholder={r2?.configured ? "•••• saved — leave blank to keep" : ""} disabled={!canManage} />
          </Field>
          <Field label="Public base URL" htmlFor="r2-public" hint="Optional custom domain for public assets.">
            <Input id="r2-public" name="publicBaseUrl" defaultValue={String((r2 && JSON.parse(r2.config_json || "{}").publicBaseUrl) || "")} disabled={!canManage} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="outline" size="sm" disabled={!canManage}>
              Save R2 settings
            </Button>
          </div>
        </form>
        <div className="px-5 pb-5">
          <RemoveKey view={r2} canManage={canManage} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Direct platform apps (optional)"
          description="Only needed for direct OAuth, analytics and comment automation. Upload-Post/SocialAPI publishing does not require these."
          action={<ShieldCheck className="h-4 w-4 text-muted" />}
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {[
            ["meta", "Meta App ID"],
            ["google", "Google Client ID"],
            ["linkedin", "LinkedIn Client ID"],
            ["x", "X Client ID"],
            ["tiktok", "TikTok Client Key"],
          ].map(([provider, idLabel]) => {
            const view = byProvider[provider];
            if (!view) return null;
            const config = view ? JSON.parse(view.config_json || "{}") : {};
            return (
              <div key={provider} className="space-y-2 rounded-xl border border-line bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold text-ink">{view.label}</p>
                  <Badge tone={view.configured ? "teal" : "neutral"}>{view.configured ? "Saved" : "Optional"}</Badge>
                </div>
                <KeyForm view={view} canManage={canManage} showTest={false}>
                  <Field label={idLabel} htmlFor={`${provider}-client-id`}>
                    <Input id={`${provider}-client-id`} name="clientId" defaultValue={String(config.clientId || "")} disabled={!canManage} />
                  </Field>
                </KeyForm>
                <RemoveKey view={view} canManage={canManage} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="App URL and support"
          description="Used in provider redirects, approval links and legal pages."
          action={<CheckCircle2 className="h-4 w-4 text-muted" />}
        />
        <form action={savePublicUrlAction} className="grid gap-3 p-5 sm:grid-cols-2">
          <Field label="Public app URL" htmlFor="public-url" hint="For example your Tailscale or VPS HTTPS URL.">
            <Input id="public-url" name="publicUrl" defaultValue={publicUrl} placeholder="https://…" disabled={!canManage} />
          </Field>
          <Field label="Support email" htmlFor="support-email">
            <Input id="support-email" name="supportEmail" defaultValue={supportEmail} placeholder="you@example.com" disabled={!canManage} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" variant="outline" size="sm" disabled={!canManage}>
              Save app settings
            </Button>
          </div>
        </form>
      </Card>

      <Notice tone="info">
        Keys are encrypted at rest with the deployment key. Back up <code>data/</code> including{" "}
        <code>.app-key</code>; losing it means saved keys must be re-entered. A key never leaves the
        server after saving.
      </Notice>
    </div>
  );
}
