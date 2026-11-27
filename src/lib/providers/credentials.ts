import crypto from "node:crypto";
import { get, run } from "../db";
import { getSetting } from "../data";
import { decryptSecret, encryptSecret } from "../crypto";
import type { IntegrationAccount, IntegrationAccountView, IntegrationKind } from "../types";

export type ProviderMeta = {
  provider: string;
  kind: IntegrationKind;
  label: string;
  role: "primary" | "secondary" | "default";
  envKeys: string[];
  secretLabel: string;
  description: string;
};

export const PROVIDER_META: Record<string, ProviderMeta> = {
  uploadpost: {
    provider: "uploadpost",
    kind: "publishing",
    label: "Upload-Post",
    role: "primary",
    envKeys: ["UPLOADPOST_API_KEY"],
    secretLabel: "API key",
    description: "Primary automatic publisher. One multi-platform post counts as one upload.",
  },
  socialapi: {
    provider: "socialapi",
    kind: "publishing",
    label: "SocialAPI.ai",
    role: "secondary",
    envKeys: ["SOCIALAPI_API_KEY"],
    secretLabel: "API key",
    description: "Fallback publisher. Hobby plan: 2 brands, 10 posts/month.",
  },
  gemini: {
    provider: "gemini",
    kind: "ai",
    label: "Google Gemini",
    role: "default",
    envKeys: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    secretLabel: "API key",
    description: "Writing, extraction, image understanding and Virality Lab video analysis.",
  },
  deepseek: {
    provider: "deepseek",
    kind: "ai",
    label: "DeepSeek",
    role: "default",
    envKeys: ["DEEPSEEK_API_KEY"],
    secretLabel: "API key",
    description: "Optional text-only fallback when Gemini is unavailable.",
  },
  deepgram: {
    provider: "deepgram",
    kind: "transcription",
    label: "Deepgram",
    role: "default",
    envKeys: ["DEEPGRAM_API_KEY", "deepgram_api_key"],
    secretLabel: "API key",
    description: "Preferred speech-to-text for voice notes and dictation fallback.",
  },
  whisper: {
    provider: "whisper",
    kind: "transcription",
    label: "Whisper (OpenAI-compatible)",
    role: "default",
    envKeys: ["WHISPER_API_KEY", "OPENAI_API_KEY"],
    secretLabel: "API key (optional for self-hosted)",
    description: "OpenAI, Groq or a self-hosted whisper.cpp/faster-whisper endpoint.",
  },
  r2: {
    provider: "r2",
    kind: "storage",
    label: "Cloudflare R2",
    role: "default",
    envKeys: ["R2_SECRET_ACCESS_KEY"],
    secretLabel: "Secret access key",
    description: "Optional storage for large media and public URLs. Local storage works without it.",
  },
  meta: {
    provider: "meta",
    kind: "oauth",
    label: "Meta (Facebook / Instagram)",
    role: "default",
    envKeys: ["META_APP_SECRET"],
    secretLabel: "App secret",
    description: "Optional direct OAuth. Upload-Post/SocialAPI do not need this.",
  },
  google: {
    provider: "google",
    kind: "oauth",
    label: "Google / YouTube",
    role: "default",
    envKeys: ["GOOGLE_CLIENT_SECRET"],
    secretLabel: "Client secret",
    description: "Optional direct OAuth for YouTube.",
  },
  linkedin: {
    provider: "linkedin",
    kind: "oauth",
    label: "LinkedIn",
    role: "default",
    envKeys: ["LINKEDIN_CLIENT_SECRET"],
    secretLabel: "Client secret",
    description: "Optional direct OAuth for LinkedIn.",
  },
  x: {
    provider: "x",
    kind: "oauth",
    label: "X / Twitter",
    role: "default",
    envKeys: ["X_CLIENT_SECRET"],
    secretLabel: "Client secret",
    description: "Optional direct OAuth for X.",
  },
  tiktok: {
    provider: "tiktok",
    kind: "oauth",
    label: "TikTok",
    role: "default",
    envKeys: ["TIKTOK_CLIENT_SECRET"],
    secretLabel: "Client secret",
    description: "Optional direct OAuth for TikTok.",
  },
};

function envSecret(provider: string): string {
  const meta = PROVIDER_META[provider];
  if (!meta) return "";
  for (const key of meta.envKeys) {
    const value = process.env[key];
    if (value) return value;
  }
  return "";
}

function accountRow(provider: string, kind?: IntegrationKind): IntegrationAccount | undefined {
  return get<IntegrationAccount>(
    kind
      ? "SELECT * FROM integration_accounts WHERE provider = ? AND kind = ?"
      : "SELECT * FROM integration_accounts WHERE provider = ?",
    kind ? [provider, kind] : [provider]
  );
}

export function getIntegrationAccount(provider: string, kind?: IntegrationKind): IntegrationAccount | undefined {
  return accountRow(provider, kind);
}

export function integrationSecret(provider: string, kind?: IntegrationKind): string {
  const row = accountRow(provider, kind);
  if (row) {
    try {
      return decryptSecret(row.encrypted_secret);
    } catch {
      return "";
    }
  }
  return envSecret(provider);
}

export function integrationConfig(provider: string): Record<string, unknown> {
  const row = accountRow(provider);
  if (!row) return {};
  try {
    return JSON.parse(row.config_json || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function integrationConfigured(provider: string, kind?: IntegrationKind): boolean {
  return Boolean(integrationSecret(provider, kind));
}

export function maskedSecret(provider: string, kind?: IntegrationKind): string {
  const secret = integrationSecret(provider, kind);
  if (!secret) return "";
  if (secret.length <= 8) return "••••";
  return `••••${secret.slice(-4)}`;
}

export function integrationView(provider: string): IntegrationAccountView | null {
  const meta = PROVIDER_META[provider];
  if (!meta) return null;
  const row = accountRow(provider, meta.kind);
  const secret = integrationSecret(provider, meta.kind);
  return {
    id: row?.id ?? `env-${provider}`,
    kind: meta.kind,
    provider,
    role: row?.role ?? meta.role,
    label: row?.label ?? meta.label,
    config_json: row?.config_json ?? "{}",
    enabled: row?.enabled ?? 1,
    priority: row?.priority ?? 100,
    created_by: row?.created_by ?? null,
    created_at: row?.created_at ?? "",
    updated_at: row?.updated_at ?? "",
    configured: Boolean(secret),
    source: row ? "vault" : secret ? "environment" : "vault",
    masked: secret ? (row ? `••••${secret.slice(-4)}` : "Environment key") : "",
  };
}

export function listIntegrationViews(kinds?: IntegrationKind[]): IntegrationAccountView[] {
  return Object.keys(PROVIDER_META)
    .filter((provider) => !kinds || kinds.includes(PROVIDER_META[provider].kind))
    .map((provider) => integrationView(provider))
    .filter((view): view is IntegrationAccountView => Boolean(view));
}

export function saveIntegrationAccount(input: {
  kind: IntegrationKind;
  provider: string;
  role: "primary" | "secondary" | "default";
  label: string;
  secret: string;
  config?: Record<string, unknown>;
  userId: string;
}): IntegrationAccountView {
  const meta = PROVIDER_META[input.provider];
  if (!meta || meta.kind !== input.kind) throw new Error("Unknown provider for this integration type.");
  if (!input.secret.trim()) throw new Error("The API key cannot be empty.");
  const now = new Date().toISOString();
  const existing = accountRow(input.provider, input.kind);
  const id = existing?.id ?? crypto.randomUUID();
  const encrypted = encryptSecret(input.secret.trim());
  const config = JSON.stringify(input.config ?? {});
  run(
    `INSERT INTO integration_accounts
     (id, kind, provider, role, label, encrypted_secret, config_json, enabled, priority, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
     ON CONFLICT(kind, provider) DO UPDATE SET
       role = excluded.role,
       label = excluded.label,
       encrypted_secret = excluded.encrypted_secret,
       config_json = excluded.config_json,
       enabled = 1,
       updated_at = excluded.updated_at`,
    [
      id,
      input.kind,
      input.provider,
      input.role,
      input.label,
      encrypted,
      config,
      input.role === "primary" ? 1 : input.role === "secondary" ? 2 : 100,
      input.userId,
      now,
      now,
    ]
  );
  return integrationView(input.provider)!;
}

export function removeIntegrationAccount(provider: string): void {
  run("DELETE FROM integration_accounts WHERE provider = ?", [provider]);
}

export function clearIntegrationCache(): void {
  // Kept as a hook for callers; the vault reads SQLite directly.
}

export function whisperConfig(): {
  baseUrl: string;
  model: string;
  allowLocal: boolean;
} {
  const config = integrationConfig("whisper");
  const baseUrl =
    String(config.baseUrl ?? process.env.WHISPER_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  return {
    baseUrl,
    model: String(config.model ?? process.env.WHISPER_MODEL ?? "whisper-1"),
    allowLocal:
      config.allowLocal === true ||
      process.env.WHISPER_ALLOW_LOCAL === "true",
  };
}

export function transcriptionPreference(): "auto" | "deepgram" | "whisper" | "gemini" {
  const config = integrationConfig("whisper");
  const preferred = String(
    getSetting("transcription.preferred", process.env.TRANSCRIPTION_PROVIDER || "auto")
  ).toLowerCase();
  return preferred === "deepgram" || preferred === "whisper" || preferred === "gemini"
    ? preferred
    : "auto";
}
