"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { setSetting, logActivity } from "@/lib/data";
import {
  PROVIDER_META,
  removeIntegrationAccount,
  saveIntegrationAccount,
  integrationSecret,
} from "@/lib/providers/credentials";
import {
  refreshSocialApiProfile,
  socialApiConnectUrl,
} from "@/lib/providers/socialapi";
import { testIntegration } from "@/lib/providers/test";

function ownerOrRedirect() {
  return requireUser().then((user) => {
    if (user.role !== "owner") {
      redirect("/settings?provider=error&providerMessage=Only+the+owner+can+manage+API+keys.");
    }
    return user;
  });
}

function messageRedirect(message: string, ok: boolean): never {
  redirect(`/settings?provider=${ok ? "success" : "error"}&providerMessage=${encodeURIComponent(message)}`);
}

export async function saveIntegrationAction(formData: FormData) {
  const user = await ownerOrRedirect();
  const provider = String(formData.get("provider") ?? "");
  const meta = PROVIDER_META[provider];
  if (!meta) messageRedirect("Unknown provider.", false);

  const secret = String(formData.get("secret") ?? "").trim();
  let resolvedSecret = secret;
  if (provider === "r2") {
    const accessKeyId = String(formData.get("accessKeyId") ?? "").trim();
    const secretAccessKey = String(formData.get("secretAccessKey") ?? "").trim();
    if (accessKeyId || secretAccessKey) {
      if (!accessKeyId || !secretAccessKey) messageRedirect("R2 needs both the access key ID and secret.", false);
      resolvedSecret = JSON.stringify({ accessKeyId, secretAccessKey });
    }
  }
  const existing = integrationSecret(provider, meta.kind);
  if (!resolvedSecret && !existing) messageRedirect("Paste the API key first.", false);

  const config: Record<string, unknown> = {};
  if (provider === "uploadpost") {
    config.plan = String(formData.get("plan") ?? "free") === "paid" ? "paid" : "free";
    config.freeLimit = Math.max(1, Math.min(1000, Number(formData.get("freeLimit") ?? 10) || 10));
  }
  if (provider === "socialapi") {
    config.freeLimit = Math.max(1, Math.min(1000, Number(formData.get("freeLimit") ?? 10) || 10));
  }
  if (provider === "whisper") {
    config.baseUrl = String(formData.get("baseUrl") ?? "https://api.openai.com/v1").trim();
    config.model = String(formData.get("model") ?? "whisper-1").trim();
    config.allowLocal = String(formData.get("allowLocal") ?? "") === "on";
  }
  if (provider === "deepgram") {
    const base = String(formData.get("baseUrl") ?? "").trim();
    if (base) config.baseUrl = base;
  }
  if (provider === "r2") {
    config.accountId = String(formData.get("accountId") ?? "").trim();
    config.bucket = String(formData.get("bucket") ?? "").trim();
    config.publicBaseUrl = String(formData.get("publicBaseUrl") ?? "").trim();
  }
  if (meta.kind === "oauth") {
    config.clientId = String(formData.get("clientId") ?? "").trim();
  }

  try {
    saveIntegrationAccount({
      kind: meta.kind,
      provider,
      role: meta.role,
      label: String(formData.get("label") ?? meta.label).trim() || meta.label,
      secret: resolvedSecret || existing,
      config,
      userId: user.id,
    });
    if (provider === "whisper") {
      const preferred = String(formData.get("preferred") ?? "").trim();
      if (preferred) setSetting("transcription.preferred", preferred);
    }
    if (provider === "deepgram") {
      const preferred = String(formData.get("preferred") ?? "").trim();
      if (preferred) setSetting("transcription.preferred", preferred);
    }
  } catch (error) {
    messageRedirect((error as Error).message, false);
  }

  logActivity({
    brandId: (await getActiveBrand()).id,
    userId: user.id,
    action: "Saved API key",
    entity: "integration",
    entityId: provider,
    detail: meta.label,
  });
  revalidatePath("/settings");
  messageRedirect(`${meta.label} key saved. Press Test to verify it.`, true);
}

export async function testIntegrationAction(formData: FormData) {
  const user = await ownerOrRedirect();
  const provider = String(formData.get("provider") ?? "");
  const result = await testIntegration(provider);
  logActivity({
    userId: user.id,
    action: "Tested API key",
    entity: "integration",
    entityId: provider,
    detail: result.ok ? "ok" : result.message.slice(0, 200),
  });
  messageRedirect(result.message, result.ok);
}

export async function removeIntegrationAction(formData: FormData) {
  const user = await ownerOrRedirect();
  const provider = String(formData.get("provider") ?? "");
  const meta = PROVIDER_META[provider];
  if (!meta) messageRedirect("Unknown provider.", false);
  removeIntegrationAccount(provider);
  logActivity({
    userId: user.id,
    action: "Removed API key",
    entity: "integration",
    entityId: provider,
    detail: meta.label,
  });
  revalidatePath("/settings");
  messageRedirect(`${meta.label} key removed.`, true);
}

export async function savePublicUrlAction(formData: FormData) {
  const user = await ownerOrRedirect();
  const url = String(formData.get("publicUrl") ?? "").trim().replace(/\/$/, "");
  if (url && !/^https?:\/\//i.test(url)) {
    messageRedirect("Public URL must start with http:// or https://.", false);
  }
  setSetting("app.public_url", url);
  const email = String(formData.get("supportEmail") ?? "").trim();
  if (email) setSetting("support.email", email);
  logActivity({ userId: user.id, action: "Updated app URL", entity: "settings", detail: url || "cleared" });
  revalidatePath("/settings");
  messageRedirect("Public app URL saved.", true);
}

export async function saveTranscriptionPreferenceAction(formData: FormData) {
  const user = await ownerOrRedirect();
  const preferred = String(formData.get("preferred") ?? "auto");
  if (!["auto", "deepgram", "whisper", "gemini"].includes(preferred)) {
    messageRedirect("Choose a valid transcription provider.", false);
  }
  setSetting("transcription.preferred", preferred);
  logActivity({ userId: user.id, action: "Updated transcription preference", entity: "settings", detail: preferred });
  revalidatePath("/settings");
  messageRedirect(`Transcription preference saved: ${preferred}.`, true);
}

export async function connectSocialApiAction(formData: FormData) {
  const user = await ownerOrRedirect();
  const brand = await getActiveBrand();
  const platform = String(formData.get("platform") ?? "");
  if (!platform) messageRedirect("Choose a platform to connect.", false);
  try {
    const url = await socialApiConnectUrl(brand.id, brand.name, platform);
    logActivity({
      brandId: brand.id,
      userId: user.id,
      action: "Started SocialAPI connection",
      entity: "provider",
      entityId: "socialapi",
      detail: platform,
    });
    redirect(url);
  } catch (error) {
    messageRedirect((error as Error).message, false);
  }
}

export async function refreshSocialApiAction() {
  const user = await ownerOrRedirect();
  const brand = await getActiveBrand();
  try {
    const profile = await refreshSocialApiProfile(brand.id);
    revalidatePath("/settings");
    messageRedirect(
      profile.connectedPlatforms.length
        ? `SocialAPI connected: ${profile.connectedPlatforms.join(", ")}.`
        : "SocialAPI brand found, but no social accounts are linked yet.",
      true
    );
  } catch (error) {
    messageRedirect((error as Error).message, false);
  }
}
