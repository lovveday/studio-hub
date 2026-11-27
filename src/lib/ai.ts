import type { BrandFact, BrandProfile, FactCandidate, PlatformVariantDraft } from "./types";
import { platformMeta } from "./platforms";
import {
  integrationSecret,
  transcriptionPreference,
  whisperConfig,
} from "./providers/credentials";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const MODEL_FALLBACKS = (process.env.GEMINI_MODEL_FALLBACKS || "gemini-3.6-flash,gemini-3.1-flash-lite")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function aiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    integrationSecret("gemini", "ai")
  );
}

export function deepseekKey(): string {
  return process.env.DEEPSEEK_API_KEY || integrationSecret("deepseek", "ai");
}

export function deepgramKey(): string {
  return (
    process.env.DEEPGRAM_API_KEY ||
    process.env.deepgram_api_key ||
    integrationSecret("deepgram", "transcription")
  );
}

function deepgramBase(): string {
  return (
    process.env.DEEPGRAM_BASE_URL ||
    process.env.deepgram_base_url ||
    "https://api.deepgram.com"
  ).replace(/\/+$/, "");
}

function deepgramModel(): string {
  return process.env.DEEPGRAM_MODEL || process.env.deepgram_model || "nova-3";
}

async function transcribeWithDeepgram(buffer: Buffer, mimeType: string): Promise<string> {
  const key = deepgramKey();
  if (!key) throw new Error("No Deepgram key configured.");
  const params = new URLSearchParams({
    model: deepgramModel(),
    smart_format: "true",
    punctuate: "true",
    diarize: "false",
  });
  const response = await fetch(`${deepgramBase()}/v1/listen?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${key}`,
      "Content-Type": (mimeType || "audio/webm").split(";")[0],
    },
    body: new Uint8Array(buffer),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Deepgram ${response.status}: ${body.slice(0, 300)}`);
  }
  const data = (await response.json()) as {
    results?: {
      channels?: Array<{
        alternatives?: Array<{ transcript?: string }>;
      }>;
    };
  };
  const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
  if (!text) throw new Error("Deepgram returned an empty transcript.");
  return text;
}

async function transcribeWithWhisper(buffer: Buffer, mimeType: string): Promise<string> {
  if (buffer.byteLength > 25 * 1024 * 1024) {
    throw new Error("This audio is over 25 MB; Whisper needs a smaller file.");
  }
  const config = whisperConfig();
  const url = new URL(config.baseUrl);
  const localHost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "::1" ||
    /^10\./.test(url.hostname) ||
    /^192\.168\./.test(url.hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && config.allowLocal && localHost)) {
    throw new Error("Whisper must use HTTPS unless a local endpoint is explicitly allowed.");
  }
  if (url.hostname === "169.254.169.254" || url.hostname.endsWith(".internal")) {
    throw new Error("That Whisper endpoint is not allowed.");
  }
  const key = integrationSecret("whisper", "transcription");
  const form = new FormData();
  const extension = (mimeType.split("/")[1] || "webm").split(";")[0];
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mimeType || "audio/webm" }), `audio.${extension}`);
  form.append("model", config.model);
  form.append("response_format", "json");
  const response = await fetch(`${config.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: key ? { Authorization: `Bearer ${key}` } : undefined,
    body: form,
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Whisper ${response.status}: ${body.slice(0, 300)}`);
  }
  const data = (await response.json()) as { text?: string };
  const text = data.text?.trim() ?? "";
  if (!text) throw new Error("Whisper returned an empty transcript.");
  return text;
}

export function aiStatus() {
  const gemini = Boolean(aiKey());
  const deepseek = Boolean(deepseekKey());
  if (gemini) {
    return { configured: true, mode: "gemini" as const, model: MODEL, label: "Gemini connected" };
  }
  if (deepseek) {
    return {
      configured: true,
      mode: "deepseek" as const,
      model: DEEPSEEK_MODEL,
      label: "DeepSeek connected",
    };
  }
  return {
    configured: false,
    mode: "mock" as const,
    model: "demo templates",
    label: "Demo AI mode",
  };
}

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { mimeType: string; fileUri: string } };

function geminiModels(): string[] {
  return [...new Set([MODEL, ...MODEL_FALLBACKS])];
}

async function callGeminiWithModel(
  model: string,
  parts: Part[],
  options?: { json?: boolean; temperature?: number }
) {
  const key = aiKey();
  if (!key) throw new Error("No Gemini API key configured.");
  const response = await fetch(
    `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          ...(options?.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(240_000),
    }
  );
  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Gemini ${response.status}: ${body.slice(0, 400)}`) as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

async function callGemini(parts: Part[], options?: { json?: boolean; temperature?: number }) {
  let lastError: unknown;
  for (const model of geminiModels()) {
    try {
      return await callGeminiWithModel(model, parts, options);
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number }).status;
      // A retired model (404), quota (429) or a capacity spike (5xx) is worth
      // trying on the next model. A malformed request is not.
      if (status !== 404 && status !== 429 && !(status && status >= 500)) throw error;
      console.warn(`[ai] ${model} unavailable (${status}); trying the next Gemini model.`);
    }
  }
  throw lastError;
}

export async function geminiGenerateJson<T>(
  parts: Part[],
  temperature = 0.55
): Promise<T> {
  const text = await callGemini(parts, { json: true, temperature });
  return parseJson<T>(text);
}

export function geminiConfigured(): boolean {
  return Boolean(aiKey());
}

async function callDeepSeek(parts: Part[], options?: { json?: boolean; temperature?: number }) {
  const key = deepseekKey();
  if (!key) throw new Error("No DeepSeek API key configured.");
  const text = parts
    .filter((part): part is { text: string } => "text" in part)
    .map((part) => part.text)
    .join("\n");
  if (!text) throw new Error("DeepSeek cannot read audio or images in this build.");
  const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: "user", content: text }],
      temperature: options?.temperature ?? 0.7,
      ...(options?.json ? { response_format: { type: "json_object" } } : {}),
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek ${response.status}: ${body.slice(0, 400)}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("DeepSeek returned an empty response.");
  return content;
}

async function callModel(parts: Part[], options?: { json?: boolean; temperature?: number }) {
  if (aiKey()) {
    try {
      return await callGemini(parts, options);
    } catch (error) {
      if (!deepseekKey()) throw error;
      console.warn("[ai] Gemini failed, falling back to DeepSeek:", (error as Error).message);
    }
  }
  if (deepseekKey()) return callDeepSeek(parts, options);
  throw new Error("No AI key configured.");
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const arrayStart = cleaned.indexOf("[");
  const sliceStart =
    start === -1 ? arrayStart : arrayStart === -1 ? start : Math.min(start, arrayStart);
  if (sliceStart > 0) return JSON.parse(cleaned.slice(sliceStart)) as T;
  return JSON.parse(cleaned) as T;
}

export async function generateText(prompt: string, temperature = 0.7): Promise<string> {
  try {
    return await callModel([{ text: prompt }], { temperature });
  } catch (error) {
    console.warn("[ai] generateText fallback:", (error as Error).message);
    return "";
  }
}

export async function generateJson<T>(prompt: string, fallback: T): Promise<T> {
  try {
    const text = await callModel([{ text: prompt }], { json: true, temperature: 0.55 });
    return parseJson<T>(text);
  } catch (error) {
    console.warn("[ai] generateJson fallback:", (error as Error).message);
    return fallback;
  }
}

export type TranscriptionResult = {
  text: string;
  mode: "deepgram" | "whisper" | "gemini" | "manual";
  error?: string;
};

export async function transcribeAudio(
  buffer: Buffer,
  mimeType: string,
  context = ""
): Promise<TranscriptionResult> {
  const preference = transcriptionPreference();
  const all = ["deepgram", "whisper", "gemini"] as const;
  const order = preference === "auto" ? [...all] : [preference, ...all.filter((p) => p !== preference)];
  const errors: string[] = [];
  const whisperReady = Boolean(
    integrationSecret("whisper", "transcription") ||
      process.env.WHISPER_BASE_URL ||
      process.env.WHISPER_API_KEY ||
      process.env.OPENAI_API_KEY
  );

  for (const provider of order) {
    if (provider === "deepgram") {
      if (!deepgramKey()) continue;
      try {
        return { text: await transcribeWithDeepgram(buffer, mimeType), mode: "deepgram" };
      } catch (error) {
        errors.push(`Deepgram: ${(error as Error).message}`);
      }
    }

    if (provider === "whisper") {
      if (!whisperReady) continue;
      try {
        return { text: await transcribeWithWhisper(buffer, mimeType), mode: "whisper" };
      } catch (error) {
        errors.push(`Whisper: ${(error as Error).message}`);
      }
    }

    if (provider === "gemini") {
      if (!aiKey()) continue;
      if (buffer.byteLength > 18 * 1024 * 1024) {
        errors.push("Gemini: audio is over 18 MB");
        continue;
      }
      try {
        const base64 = buffer.toString("base64");
        const text = await callGemini(
          [
            {
              text: `Transcribe this audio accurately. It may be a WhatsApp voice note or dictation about a client brand. Preserve names, handles, prices and dates exactly. Return only the transcript, no commentary. Brand context: ${context}`,
            },
            { inlineData: { mimeType: mimeType || "audio/ogg", data: base64 } },
          ],
          { temperature: 0.1 }
        );
        return { text: text.trim(), mode: "gemini" };
      } catch (error) {
        errors.push(`Gemini: ${(error as Error).message}`);
      }
    }
  }

  const configured = Boolean(deepgramKey() || whisperReady || aiKey());
  return {
    text: "",
    mode: "manual",
    error: configured
      ? `Could not transcribe automatically. ${errors.join(" | ")}`
      : "No transcription provider configured. Add Deepgram, Whisper or Gemini, or paste the transcript manually.",
  };
}

export async function describeImage(
  buffer: Buffer,
  mimeType: string,
  context = ""
): Promise<string> {
  if (!aiKey()) return "";
  try {
    return await callGemini(
      [
        {
          text: `Describe this image as a social media knowledge source. Extract any visible text, product names, offers, dates and brand cues. Be factual. Brand context: ${context}`,
        },
        { inlineData: { mimeType, data: buffer.toString("base64") } },
      ],
      { temperature: 0.2 }
    );
  } catch (error) {
    console.warn("[ai] describeImage fallback:", (error as Error).message);
    return "";
  }
}

export function brandContext(
  brandName: string,
  profile: BrandProfile | undefined,
  facts: BrandFact[]
): string {
  const lines = [
    `Brand: ${brandName}`,
    profile?.tone ? `Tone: ${profile.tone}` : "",
    profile?.audience ? `Audience: ${profile.audience}` : "",
    profile?.offers ? `Offers: ${profile.offers}` : "",
    profile?.pillars ? `Pillars (JSON): ${profile.pillars}` : "",
    profile?.banned_claims ? `Banned claims: ${profile.banned_claims}` : "",
    profile?.hashtags ? `Preferred hashtags: ${profile.hashtags}` : "",
    profile?.ctas ? `CTA style: ${profile.ctas}` : "",
    profile?.competitors ? `Competitors: ${profile.competitors}` : "",
    profile?.notes ? `Notes: ${profile.notes}` : "",
  ].filter(Boolean);
  const approved = facts
    .filter((fact) => fact.status === "approved" && !fact.valid_to)
    .slice(0, 12)
    .map((fact) => `- ${fact.subject}: ${fact.value}`);
  if (approved.length) lines.push(`Current approved facts:\n${approved.join("\n")}`);
  return lines.join("\n");
}

function pickHashtags(profile: BrandProfile | undefined, platform: string): string {
  const preferred = (profile?.hashtags ?? "")
    .split(/\s+/)
    .filter((tag) => tag.startsWith("#"));
  const count = platform === "x" ? 1 : platform === "linkedin" ? 2 : 4;
  if (preferred.length) return preferred.slice(0, count).join(" ");
  const generic = ["#BrandStory", "#BehindTheScenes", "#MadeInNigeria", "#SocialMedia"];
  return generic.slice(0, count).join(" ");
}

function trimForPlatform(caption: string, platform: string): string {
  const limit = platformMeta(platform).limit;
  if (caption.length <= limit) return caption;
  return `${caption.slice(0, limit - 1).trimEnd()}…`;
}

export function mockVariants(input: {
  brandName: string;
  idea: string;
  title: string;
  platforms: string[];
  profile?: BrandProfile;
}): PlatformVariantDraft[] {
  const { brandName, idea, title, platforms, profile } = input;
  const hashtags = profile?.hashtags ?? "";
  const cta = profile?.ctas ? profile.ctas.split(/[.!?]/)[0] : "Save this for later.";
  const seed = idea || title;
  const lowerTone = (profile?.tone ?? "").toLowerCase();
  const warm = lowerTone.includes("warm") || lowerTone.includes("friend");

  return platforms.map((platform) => {
    const tags = pickHashtags(profile, platform);
    let caption = "";
    let firstComment = "";

    switch (platform) {
      case "x":
        caption = trimForPlatform(
          `${title}\n\n${seed}${warm ? "\n\nWe keep it simple." : ""}\n\n${tags}`,
          platform
        );
        firstComment = "What would you add? Reply and we'll keep the thread going.";
        break;
      case "linkedin":
        caption = trimForPlatform(
          `${title}\n\n${seed}\n\nWe have been thinking about this a lot at ${brandName}. The short version: consistency beats intensity, and clarity beats cleverness.\n\n${cta}\n\n${tags}`,
          platform
        );
        firstComment = "Curious how other teams handle this. What has worked for you?";
        break;
      case "tiktok":
        caption = trimForPlatform(
          `${title} 👀\n\n${seed}\n\n${tags}`,
          platform
        );
        firstComment = "Part two? Comment the question you want answered next.";
        break;
      case "youtube":
        caption = trimForPlatform(
          `${title} | ${brandName}\n\n${seed}\n\nIn this video we break down the practical version, with no fluff. ${cta}\n\n${tags}`,
          platform
        );
        firstComment = "Have a question? Drop it here and we'll pin the answer.";
        break;
      case "facebook":
        caption = trimForPlatform(
          `${title}\n\n${seed}\n\n${warm ? "We would love to hear how this lands for you." : "Here is the practical version."}\n\n${cta}\n\n${tags}`,
          platform
        );
        firstComment = "Tell us where you are starting from. We reply to every comment.";
        break;
      case "instagram":
      default:
        caption = trimForPlatform(
          `${title}.\n\n${seed}\n\n${warm ? "This is your reminder that less, done consistently, is still a strategy." : "Here is the practical version."}\n\n${cta}\n\n${tags}`,
          platform
        );
        firstComment = "Which part of this do you want us to go deeper on? Tell us below 👇";
        break;
    }

    return {
      platform,
      caption,
      hashtags: hashtags || tags,
      firstComment,
    };
  });
}

export async function generateVariants(input: {
  brandName: string;
  profile?: BrandProfile;
  facts: BrandFact[];
  title: string;
  idea: string;
  platforms: string[];
  extraInstructions?: string;
}): Promise<{ variants: PlatformVariantDraft[]; mode: "gemini" | "mock" }> {
  const fallback = mockVariants(input);
  if (!aiKey()) return { variants: fallback, mode: "mock" };

  const limitLines = input.platforms
    .map((platform) => `- ${platform}: ${platformMeta(platform).limit} characters`)
    .join("\n");

  const prompt = `You are a senior social media strategist writing for ${input.brandName}.
Use the brand's facts, tone and guardrails. Never invent prices, certifications or claims.
Do not use banned claims. Keep each platform native.

${brandContext(input.brandName, input.profile, input.facts)}

Post title: ${input.title}
Post idea: ${input.idea}
Platforms: ${input.platforms.join(", ")}
Character limits:
${limitLines}
${input.extraInstructions ? `Extra instructions: ${input.extraInstructions}` : ""}

Return strict JSON:
{"variants":[{"platform":"instagram","caption":"...","hashtags":"#a #b","first_comment":"..."}]}
Rules:
- caption must fit the platform limit, including the hashtags line.
- hashtags: 1-4 platform-appropriate tags, space separated.
- first_comment: a genuine engagement question or context, not "link in bio".
- No markdown fences, no commentary outside JSON.`;

  try {
    const result = await callModel([{ text: prompt }], { json: true, temperature: 0.65 });
    const parsed = parseJson<{
      variants: Array<{
        platform: string;
        caption: string;
        hashtags: string;
        first_comment?: string;
        firstComment?: string;
      }>;
    }>(result);
    const variants = parsed.variants
      .filter((variant) => input.platforms.includes(variant.platform))
      .map((variant) => ({
        platform: variant.platform,
        caption: trimForPlatform(String(variant.caption ?? ""), variant.platform),
        hashtags: String(variant.hashtags ?? ""),
        firstComment: String(variant.first_comment ?? variant.firstComment ?? ""),
      }));
    if (variants.length === 0) return { variants: fallback, mode: "mock" };
    return { variants, mode: "gemini" };
  } catch (error) {
    console.warn("[ai] generateVariants fallback:", (error as Error).message);
    return { variants: fallback, mode: "mock" };
  }
}

export function mockExtractKnowledge(text: string, brandName: string): {
  summary: string;
  facts: FactCandidate[];
} {
  const clean = text.replace(/\s+/g, " ").trim();
  const summary = clean.length > 240 ? `${clean.slice(0, 239)}…` : clean;
  const facts: FactCandidate[] = [];
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 30);
  const seen = new Set<string>();
  const push = (candidate: FactCandidate) => {
    const key = `${candidate.subject}:${candidate.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    facts.push(candidate);
  };

  const priceSentence = sentences.find(
    (sentence) =>
      /(₦|ngn|naira|\b\d{4,}\b)/i.test(sentence) &&
      /(price|cost|stays|now|offer|discount|%|naira|₦|ngn)/i.test(sentence)
  );
  if (priceSentence) {
    push({
      subject: /discount|%|offer|black friday/i.test(priceSentence)
        ? "Offer / price update"
        : "Price update",
      value: priceSentence.slice(0, 240),
      confidence: 0.62,
      reason: "Price or offer language detected. Confirm the exact SKU before approving.",
    });
  }

  const bannedSentence = sentences.find((sentence) =>
    /(never say|stop saying|avoid saying|don't say|do not say|banned claim|do not use)/i.test(
      sentence
    )
  );
  if (bannedSentence) {
    push({
      subject: "Banned claim / wording",
      value: bannedSentence.slice(0, 240),
      confidence: 0.7,
      reason: "The client explicitly corrected the wording in this source.",
    });
  }

  const dateSentence = sentences.find((sentence) =>
    /\b(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})\b/i.test(
      sentence
    )
  );
  if (dateSentence && dateSentence !== priceSentence) {
    push({
      subject: "Key date",
      value: dateSentence.slice(0, 240),
      confidence: 0.6,
      reason: "A date or deadline was mentioned.",
    });
  }

  if (/black friday/i.test(clean) && !facts.some((fact) => /black friday/i.test(fact.value))) {
    push({
      subject: "Campaign",
      value: "Black Friday mentioned in the new source",
      confidence: 0.55,
      reason: "Campaign reference detected.",
    });
  }

  return { summary: summary || `New note for ${brandName}`, facts: facts.slice(0, 6) };
}

export async function extractKnowledge(input: {
  text: string;
  brandName: string;
  profile?: BrandProfile;
  facts: BrandFact[];
  sourceType: string;
}): Promise<{ summary: string; facts: FactCandidate[]; mode: "gemini" | "mock" }> {
  const fallback = mockExtractKnowledge(input.text, input.brandName);
  if (!aiKey() || !input.text.trim()) return { ...fallback, mode: "mock" };

  const prompt = `You are a meticulous brand knowledge editor for ${input.brandName}.
Read the source below and extract only information that is useful for future social media work.
Do not invent anything. If a price, date or claim is ambiguous, say so in the fact value.

${brandContext(input.brandName, input.profile, input.facts)}

Source type: ${input.sourceType}
Source:
"""
${input.text.slice(0, 14000)}
"""

Return strict JSON:
{
  "summary": "2-3 sentences in plain English",
  "facts": [
    {"subject": "Retail price", "value": "₦30,000 for the 30ml serum", "confidence": 0.0, "reason": "what in the source supports it"}
  ]
}
Only include facts that a social media manager should rely on: prices, offers, dates, product names, audience, tone rules, banned claims, contacts, CTAs. Max 6 facts. No markdown.`;

  try {
    const result = await callModel([{ text: prompt }], { json: true, temperature: 0.2 });
    const parsed = parseJson<{ summary: string; facts: FactCandidate[] }>(result);
    return {
      summary: parsed.summary || fallback.summary,
      facts: (parsed.facts ?? []).slice(0, 6).map((fact) => ({
        subject: String(fact.subject ?? "Note"),
        value: String(fact.value ?? ""),
        confidence: Math.max(0, Math.min(1, Number(fact.confidence ?? 0.6))),
        reason: fact.reason,
      })),
      mode: "gemini",
    };
  } catch (error) {
    console.warn("[ai] extractKnowledge fallback:", (error as Error).message);
    return { ...fallback, mode: "mock" };
  }
}

export async function draftReply(input: {
  brandName: string;
  profile?: BrandProfile;
  facts: BrandFact[];
  comment: string;
  author: string;
  sentiment: string;
}): Promise<{ reply: string; mode: "gemini" | "mock" }> {
  const negative = input.sentiment === "negative";
  const fallback = negative
    ? `Hi ${input.author}, thank you for flagging this. We are sorry the experience did not meet your expectations. We are looking into it now and will follow up here shortly.`
    : input.sentiment === "question"
      ? `Hi ${input.author}, great question. ${input.comment.toLowerCase().includes("price") ? "The current price is in our latest approved facts; we will confirm the exact product and get back to you here." : "We will check the details and reply properly in a moment."}`
      : `Thank you, ${input.author}. We are glad this landed. Which part would you like us to go deeper on?`;
  if (!aiKey() || negative) return { reply: fallback, mode: "mock" };

  const prompt = `You are replying as ${input.brandName} on social media.
Match the brand voice. Be specific, warm and brief (max 280 characters). Do not invent facts.
${brandContext(input.brandName, input.profile, input.facts)}
Comment from ${input.author} (${input.sentiment}): "${input.comment}"
Return only the reply text, no quotes.`;

  try {
    const reply = await callModel([{ text: prompt }], { temperature: 0.6 });
    return { reply: reply.trim().slice(0, 500), mode: "gemini" };
  } catch (error) {
    console.warn("[ai] draftReply fallback:", (error as Error).message);
    return { reply: fallback, mode: "mock" };
  }
}
