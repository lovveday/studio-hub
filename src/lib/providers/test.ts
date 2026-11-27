import { getAppUrl } from "../app-url";
import { integrationConfig, integrationSecret, whisperConfig } from "./credentials";
import { testSocialApi } from "./socialapi";

export type IntegrationTestResult = { ok: boolean; message: string };

async function fetchJson(url: string, init: RequestInit, timeoutMs = 20_000): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

export async function testIntegration(provider: string): Promise<IntegrationTestResult> {
  const secret = integrationSecret(provider);
  if (!secret) return { ok: false, message: "No key saved for this provider." };

  try {
    if (provider === "uploadpost") {
      const base = (integrationConfig("uploadpost").baseUrl as string | undefined || "https://api.upload-post.com").replace(/\/$/, "");
      const response = await fetchJson(`${base}/api/uploadposts/users`, {
        headers: { Authorization: `Apikey ${secret}` },
      });
      if (!response.ok) return { ok: false, message: `Upload-Post rejected the key (${response.status}).` };
      const payload = (await response.json()) as { profiles?: unknown[] };
      return { ok: true, message: `Upload-Post connected. ${payload.profiles?.length ?? 0} profile(s) found.` };
    }

    if (provider === "socialapi") {
      const result = await testSocialApi();
      return { ok: result.ok, message: result.message };
    }

    if (provider === "gemini") {
      const response = await fetchJson(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(secret)}`,
        {}
      );
      return response.ok
        ? { ok: true, message: "Gemini key accepted." }
        : { ok: false, message: `Gemini rejected the key (${response.status}).` };
    }

    if (provider === "deepseek") {
      const base = String(integrationConfig("deepseek").baseUrl ?? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
      const response = await fetchJson(`${base}/models`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      return response.ok
        ? { ok: true, message: "DeepSeek key accepted." }
        : { ok: false, message: `DeepSeek rejected the key (${response.status}).` };
    }

    if (provider === "deepgram") {
      const base = String(integrationConfig("deepgram").baseUrl ?? process.env.DEEPGRAM_BASE_URL ?? "https://api.deepgram.com").replace(/\/$/, "");
      const response = await fetchJson(`${base}/v1/projects`, {
        headers: { Authorization: `Token ${secret}` },
      });
      return response.ok
        ? { ok: true, message: "Deepgram key accepted." }
        : { ok: false, message: `Deepgram rejected the key (${response.status}).` };
    }

    if (provider === "whisper") {
      const config = whisperConfig();
      const response = await fetchJson(`${config.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      return response.ok
        ? { ok: true, message: "Whisper endpoint accepted the key." }
        : { ok: false, message: `Whisper endpoint rejected the key (${response.status}).` };
    }

    return { ok: false, message: "This provider does not have an automatic test yet." };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}
