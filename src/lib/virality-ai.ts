import { aiKey, brandContext, geminiGenerateJson, geminiConfigured } from "./ai";
import type { Brand, BrandFact, BrandProfile } from "./types";
import { platformMeta } from "./platforms";
import type {
  Adaptation,
  Confidence,
  Hook,
  Hypothesis,
  ScriptBeat,
  Shot,
  Similarity,
  StoredFrame,
  Teardown,
  TestVariant,
  TimelineBeat,
  TranscriptLine,
} from "./virality-types";

// The File API is the only way to send a clip larger than ~20 MB to Gemini.
// Clips are deleted from Google's side as soon as the teardown is written.
const FILE_UPLOAD_URL = "https://generativelanguage.googleapis.com/upload/v1beta/files";
const FILE_API = "https://generativelanguage.googleapis.com/v1beta";

export type AnalysisContext = {
  brand: Brand;
  profile?: BrandProfile;
  facts: BrandFact[];
  title: string;
  caption: string;
  transcript: string;
  platform: string;
  creator: string;
  durationSeconds: number;
  sourceType: string;
};

export type FrameInput = StoredFrame & { dataUrl: string };

type RawTeardown = Record<string, unknown>;
type RawAdaptation = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asConfidence(value: unknown, fallback: Confidence = "low"): Confidence {
  return value === "high" || value === "medium" || value === "low" ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, places = 1): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function normalizeHashtags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .map((item) => (item.startsWith("#") ? item : `#${item.replace(/^#+/, "")}`))
      .filter((item) => item.length > 1);
  }
  return asString(value)
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.startsWith("#") ? item : `#${item}`))
    .slice(0, 12);
}

function normalizeKeywords(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => asString(item)).filter(Boolean).slice(0, 12);
  return asString(value)
    .split(/[,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeTranscript(value: unknown, fallback: TranscriptLine[]): TranscriptLine[] {
  const lines = asArray(value)
    .map((entry) => {
      if (typeof entry === "string") {
        return { start: 0, end: 0, text: entry.trim() };
      }
      const item = entry as Record<string, unknown>;
      return {
        start: asNumber(item.start, 0),
        end: asNumber(item.end, 0),
        text: asString(item.text ?? item.line ?? item.speech),
      };
    })
    .filter((line) => line.text.length > 0);
  if (lines.length === 0) return fallback;
  return lines.map((line) => ({
    start: Math.max(0, line.start),
    end: Math.max(line.start + 0.5, line.end),
    text: line.text,
  }));
}

function normalizeTimeline(value: unknown, fallback: TimelineBeat[]): TimelineBeat[] {
  const beats = asArray(value)
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      return {
        start: Math.max(0, asNumber(item.start, 0)),
        end: Math.max(0, asNumber(item.end, 0)),
        label: asString(item.label, "Beat"),
        beat: asString(item.beat, ""),
        visual: asString(item.visual),
        on_screen_text: asString(item.on_screen_text ?? item.onScreenText),
        audio: asString(item.audio),
        purpose: asString(item.purpose),
      };
    })
    .filter((beat) => beat.end > beat.start)
    .sort((a, b) => a.start - b.start);
  if (beats.length < 2) return fallback;
  return beats.map((beat, index) => ({
    ...beat,
    end: index === beats.length - 1 ? Math.max(beat.end, beat.start + 0.5) : beat.end,
  }));
}

function normalizeHook(value: unknown, fallback: Hook): Hook {
  const item = (value ?? {}) as Record<string, unknown>;
  const start = Math.max(0, asNumber(item.start, fallback.start));
  const end = Math.max(1, asNumber(item.end, fallback.end));
  const text = asString(item.text);
  if (!text) return { ...fallback, start, end };
  return {
    text,
    start,
    end,
    device: asString(item.device, fallback.device),
    why: asString(item.why, fallback.why),
  };
}

function normalizeHypotheses(value: unknown, fallback: Hypothesis[]): Hypothesis[] {
  const items = asArray(value)
    .map((entry) => {
      if (typeof entry === "string") {
        return { claim: entry, evidence: "", confidence: "low" as Confidence };
      }
      const item = entry as Record<string, unknown>;
      return {
        claim: asString(item.claim ?? item.hypothesis),
        evidence: asString(item.evidence),
        confidence: asConfidence(item.confidence, "low"),
      };
    })
    .filter((item) => item.claim.length > 0);
  return items.length ? items.slice(0, 6) : fallback;
}

export function normalizeTeardown(
  raw: RawTeardown,
  context: AnalysisContext,
  fallback: Teardown
): Teardown {
  const duration = asNumber(raw.duration_seconds, context.durationSeconds || fallback.duration_seconds);
  const pacing = (raw.pacing ?? {}) as Record<string, unknown>;
  const timeline = normalizeTimeline(raw.timeline, fallback.timeline);
  const transcript = normalizeTranscript(raw.transcript, fallback.transcript);
  let hook = normalizeHook(raw.hook, fallback.hook);

  if (!hook.text.trim()) {
    const first = timeline[0];
    const visual = first?.on_screen_text
      ? `On screen: “${first.on_screen_text}”`
      : first?.visual;
    hook = {
      ...hook,
      text: `Visual opening — ${visual || "no spoken hook."}`,
      start: 0,
      end: Math.min(3, Math.max(1.5, first?.end ?? 3)),
      device: "Visual hook",
      why:
        hook.why ||
        "There is no spoken hook, so the opening has to hold attention with the frame and the sound.",
    };
  } else if (
    !transcript.length &&
    /^(visual opening|no speech|no on-screen)/i.test(hook.text)
  ) {
    hook = {
      ...hook,
      text: hook.text.startsWith("Visual opening — ")
        ? hook.text
        : `Visual opening — ${hook.text}`,
      device: "Visual hook",
      why:
        hook.why ||
        "There is no spoken hook, so the opening has to hold attention with the frame and the sound.",
    };
  }

  return {
    title: asString(raw.title, context.title || fallback.title),
    duration_seconds: Math.max(1, duration),
    hook,
    timeline,
    transcript,
    pacing: {
      cuts_per_minute: Math.max(
        0,
        asNumber(pacing.cuts_per_minute, fallback.pacing.cuts_per_minute)
      ),
      average_shot_seconds: Math.max(
        0,
        asNumber(pacing.average_shot_seconds, fallback.pacing.average_shot_seconds)
      ),
      notes: asString(pacing.notes, fallback.pacing.notes),
    },
    cta: {
      text: asString((raw.cta as Record<string, unknown> | undefined)?.text, fallback.cta.text),
      type: asString((raw.cta as Record<string, unknown> | undefined)?.type, fallback.cta.type),
      placement: asString(
        (raw.cta as Record<string, unknown> | undefined)?.placement,
        fallback.cta.placement
      ),
    },
    keywords: normalizeKeywords(raw.keywords).length
      ? normalizeKeywords(raw.keywords)
      : fallback.keywords,
    hashtags: normalizeHashtags(raw.hashtags).length
      ? normalizeHashtags(raw.hashtags)
      : fallback.hashtags,
    why_it_worked: normalizeHypotheses(raw.why_it_worked ?? raw.why_it_works, fallback.why_it_worked),
    risks: asArray(raw.risks)
      .map((item) => asString(item))
      .filter(Boolean)
      .slice(0, 6),
    confidence: asConfidence(raw.confidence, fallback.confidence),
    limitations: asString(raw.limitations, fallback.limitations),
  };
}

function normalizeScriptOutline(value: unknown, fallback: ScriptBeat[]): ScriptBeat[] {
  const beats = asArray(value)
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      return {
        start: Math.max(0, asNumber(item.start, 0)),
        end: Math.max(0, asNumber(item.end, 0)),
        beat: asString(item.beat, "Beat"),
        line: asString(item.line ?? item.script),
        shot: asString(item.shot),
        on_screen_text: asString(item.on_screen_text ?? item.onScreenText),
      };
    })
    .filter((beat) => beat.line.length > 0);
  return beats.length ? beats : fallback;
}

function normalizeShots(value: unknown, fallback: Shot[]): Shot[] {
  const shots = asArray(value)
    .map((entry) => {
      const item = entry as Record<string, unknown>;
      return {
        shot: asString(item.shot, "Shot"),
        framing: asString(item.framing),
        action: asString(item.action),
        seconds: Math.max(0.5, asNumber(item.seconds, 3)),
      };
    })
    .filter((shot) => shot.shot.length > 0);
  return shots.length ? shots : fallback;
}

function normalizeTestVariant(value: unknown, fallback: TestVariant): TestVariant {
  const item = (value ?? {}) as Record<string, unknown>;
  return {
    name: asString(item.name, fallback.name),
    change: asString(item.change, fallback.change),
    hypothesis: asString(item.hypothesis, fallback.hypothesis),
  };
}

export function normalizeAdaptation(
  raw: RawAdaptation,
  fallback: Adaptation,
  facts: BrandFact[],
  profile?: BrandProfile
): Adaptation {
  const testPlan = (raw.test_plan ?? {}) as Record<string, unknown>;
  const approved = facts.filter((fact) => fact.status === "approved" && !fact.valid_to);
  const returnedFacts = asArray(raw.facts_used)
    .map((item) => asString(item))
    .filter(Boolean);
  const grounded = returnedFacts
    .map((returned) => {
      const needle = returned.toLowerCase();
      return approved.find(
        (fact) =>
          fact.value.toLowerCase().includes(needle) ||
          needle.includes(fact.value.toLowerCase())
      );
    })
    .filter((fact): fact is BrandFact => Boolean(fact))
    .map((fact) => fact.value);

  const adaptation: Adaptation = {
    angle: asString(raw.angle, fallback.angle),
    hook: asString(raw.hook, fallback.hook),
    script_outline: normalizeScriptOutline(raw.script_outline, fallback.script_outline),
    shot_list: normalizeShots(raw.shot_list ?? raw.shots, fallback.shot_list),
    cta: asString(raw.cta, fallback.cta),
    caption: asString(raw.caption, fallback.caption),
    hashtags: asString(raw.hashtags, fallback.hashtags),
    test_plan: {
      variant_a: normalizeTestVariant(testPlan.variant_a, fallback.test_plan.variant_a),
      variant_b: normalizeTestVariant(testPlan.variant_b, fallback.test_plan.variant_b),
      metric: asString(testPlan.metric, fallback.test_plan.metric),
      window: asString(testPlan.window, fallback.test_plan.window),
    },
    facts_used: [...new Set(grounded)].slice(0, 5),
    guardrails: asArray(raw.guardrails)
      .map((item) => asString(item))
      .filter(Boolean)
      .slice(0, 8),
  };

  const banned = (profile?.banned_claims ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allCopy = [
    adaptation.hook,
    adaptation.caption,
    ...adaptation.script_outline.map((beat) => beat.line),
  ].join(" ");
  const hits = banned.filter((claim) => allCopy.toLowerCase().includes(claim.toLowerCase()));
  if (hits.length) {
    adaptation.guardrails = [
      `Remove banned claim wording: ${hits.join(", ")}.`,
      ...adaptation.guardrails,
    ].slice(0, 8);
  }
  if (!adaptation.facts_used.length && approved.length) {
    adaptation.guardrails.push("No approved fact survived the grounding check; add one before publishing.");
  }
  const approvedText = approved.map((fact) => fact.value).join(" ");
  const efficacy = [
    ...new Set(
      allCopy.match(
        /\b(calms?|calmed|heals?|cures?|repairs?|reduces?|eliminates?|boosts?|clears?|treats?|soothes?|strengthens?)\b[^.!?\n]*/gi
      ) ?? []
    ),
  ].filter((phrase) => !approvedText.toLowerCase().includes(phrase.toLowerCase()));
  if (efficacy.length) {
    adaptation.guardrails.push(
      `Review efficacy wording that is not in an approved fact: “${efficacy[0].trim().slice(0, 100)}”.`
    );
  }
  const prices = [...new Set(allCopy.match(/₦\s?[\d,]+/g) ?? [])].filter(
    (price) => !approvedText.replace(/\s/g, "").includes(price.replace(/\s/g, ""))
  );
  if (prices.length) {
    adaptation.guardrails.push(
      `Price check: ${prices.join(", ")} ${prices.length === 1 ? "is" : "are"} not in an approved fact.`
    );
  }
  if (!adaptation.guardrails.some((item) => /source footage|copy|wording/i.test(item))) {
    adaptation.guardrails.push("Do not reuse the source creator's footage, voice or phrasing.");
  }
  adaptation.guardrails = adaptation.guardrails.slice(0, 8);
  return adaptation;
}

/* -------------------------------------------------------------------------- */
/* Deterministic fallback — the lab still works when Gemini is unavailable.    */
/* -------------------------------------------------------------------------- */

const STOPWORDS = new Set(
  `a about above after again against all am an and any are as at be because been before being below between both but by can did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my myself no nor not now of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why will with you your yours yourself yourselves`.split(
    /\s+/
  )
);

function sentencesFrom(text: string): string[] {
  const clean = text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  if (!clean) return [];
  const rough = clean
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const output: string[] = [];
  for (const sentence of rough) {
    if (sentence.split(/\s+/).length <= 26) {
      output.push(sentence);
      continue;
    }
    const pieces = sentence
      .split(/(?<=[,;])\s+/)
      .map((piece) => piece.trim())
      .filter(Boolean);
    if (pieces.length <= 1) {
      output.push(sentence);
    } else {
      let buffer = "";
      for (const piece of pieces) {
        const next = buffer ? `${buffer} ${piece}` : piece;
        if (next.split(/\s+/).length > 22 && buffer) {
          output.push(buffer);
          buffer = piece;
        } else {
          buffer = next;
        }
      }
      if (buffer) output.push(buffer);
    }
  }
  return output;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function allocateTimings(sentences: string[], duration: number): TranscriptLine[] {
  const weights = sentences.map((sentence) => Math.max(2, wordCount(sentence)));
  const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  let cursor = 0;
  return sentences.map((text, index) => {
    const span = (weights[index] / total) * duration;
    const start = cursor;
    const end = index === sentences.length - 1 ? duration : cursor + span;
    cursor = end;
    return { start: round(start, 1), end: round(end, 1), text };
  });
}

function ctaFrom(text: string): { text: string; type: string; placement: string } {
  const match = text.match(
    /(save this|save it|save for|follow|comment|link in bio|shop|send this|share this|tag|dm|subscribe|get yours|book|download)[^.!?\n]*/i
  );
  if (!match) {
    return { text: "", type: "none detected", placement: "no explicit CTA" };
  }
  const cue = match[1].toLowerCase();
  const type = /save/.test(cue)
    ? "save"
    : /comment|dm/.test(cue)
      ? "comment"
      : /share|send|tag/.test(cue)
        ? "share"
        : /follow|subscribe/.test(cue)
          ? "follow"
          : "link";
  return {
    text: match[0].trim().slice(0, 180),
    type,
    placement: /^(save|follow|comment)/i.test(match[0].trim()) ? "end" : "caption / end",
  };
}

function hookDevice(line: string): { device: string; why: string } {
  const lower = line.toLowerCase();
  if (line.trim().endsWith("?")) {
    return {
      device: "Question hook",
      why: "A question makes the viewer answer silently before they decide to keep watching.",
    };
  }
  if (/^(stop|don'?t|never|nobody|no one|quit)\b/i.test(lower)) {
    return {
      device: "Pattern interrupt",
      why: "A command that contradicts the expected advice interrupts the scroll.",
    };
  }
  if (/\b(myth|wrong|mistake|lie|misunderstood)\b/.test(lower)) {
    return {
      device: "Myth correction",
      why: "Naming a common belief as wrong creates a gap the viewer wants closed.",
    };
  }
  if (/\byou\b|\byour\b/.test(lower)) {
    return {
      device: "Direct address",
      why: "Second-person wording puts the viewer inside the first frame.",
    };
  }
  if (/\b\d+\b/.test(lower)) {
    return {
      device: "Specific number",
      why: "A concrete number reads as evidence and sets an expectation for the payoff.",
    };
  }
  return {
    device: "Bold claim",
    why: "A short, confident claim promises a payoff with little setup cost.",
  };
}

function beatForSentence(
  sentence: string,
  index: number,
  total: number
): { label: string; beat: string; purpose: string } {
  const lower = sentence.toLowerCase();
  if (index === 0) {
    return { label: "Hook", beat: "hook", purpose: "Stop the scroll and set the promise." };
  }
  if (index === total - 1) {
    if (/(save|follow|comment|link|shop|send|tag|dm|subscribe|book)/i.test(lower)) {
      return { label: "Close and CTA", beat: "cta", purpose: "Convert attention into one action." };
    }
    return { label: "Close", beat: "close", purpose: "Land the takeaway." };
  }
  if (/\b(but|stop|wrong|mistake|myth|problem|actually|nobody|never)\b/.test(lower)) {
    return {
      label: "Turn",
      beat: "tension",
      purpose: "Reframe the problem so the method feels necessary.",
    };
  }
  if (/\b(here'?s|how|first|then|next|step|start|try|do this|routine)\b/.test(lower)) {
    return { label: "Method", beat: "method", purpose: "Make the fix concrete and repeatable." };
  }
  if (/\b(result|worked|changed|later|week|month|now|felt|notice)\b/.test(lower)) {
    return { label: "Payoff", beat: "proof", purpose: "Show what changed without overclaiming." };
  }
  return {
    label: index < total / 2 ? "Setup" : "Payoff",
    beat: index < total / 2 ? "setup" : "payoff",
    purpose: "Carry the viewer to the next beat.",
  };
}

function topKeywords(text: string, limit = 8): string[] {
  const counts = new Map<string, number>();
  for (const word of text.toLowerCase().match(/[a-z][a-z'-]{3,}/g) ?? []) {
    if (STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function hashtagsIn(text: string): string[] {
  return [...new Set(text.match(/#[\p{L}\p{N}_]+/gu) ?? [])].slice(0, 10);
}

export function fallbackTeardown(context: AnalysisContext): Teardown {
  const source = [context.transcript, context.caption, context.title]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
  const sentences = source ? sentencesFrom(source) : [];
  const words = wordCount(source);
  const duration = Math.max(
    8,
    context.durationSeconds || round(Math.min(90, Math.max(12, words / 2.6 + 3)), 1)
  );
  const lines = sentences.length ? allocateTimings(sentences, duration) : [];
  const timeline: TimelineBeat[] = lines.length
    ? lines.map((line, index) => {
        const meta = beatForSentence(line.text, index, lines.length);
        return {
          start: line.start,
          end: line.end,
          label: meta.label,
          beat: meta.beat,
          visual: "Not measured — text-only source.",
          on_screen_text: "",
          audio: "Speech from the supplied transcript.",
          purpose: meta.purpose,
        };
      })
    : [
        {
          start: 0,
          end: duration,
          label: "Visual opening",
          beat: "hook",
          visual: "No speech or on-screen text was supplied for this clip.",
          on_screen_text: "",
          audio: "No speech detected.",
          purpose: "Carry the opening without a spoken hook.",
        },
      ];
  const hookLine =
    lines[0]?.text ??
    (timeline[0]?.visual
      ? `Visual opening — ${timeline[0].visual}`
      : "Visual opening — no spoken hook.");
  const device = lines.length
    ? hookDevice(hookLine)
    : {
        device: "Visual hook",
        why: "There is no spoken hook, so the opening has to hold attention with the frame and the sound.",
      };
  const cta = ctaFrom(source);

  const hypotheses: Hypothesis[] = [];
  const add = (claim: string, evidence: string, confidence: Confidence = "medium") => {
    if (evidence.trim()) hypotheses.push({ claim, evidence, confidence });
  };
  if (lines.length) {
    if (wordCount(hookLine) <= 14) {
      add(
        "The first line is short enough to land before the viewer decides to scroll.",
        `"${hookLine}" is ${wordCount(hookLine)} words.`
      );
    }
    if (/\byou\b|\byour\b/i.test(hookLine)) {
      add(
        "Direct address puts the viewer inside the first frame.",
        `The hook says: "${hookLine}".`
      );
    }
    if (/\b\d+\b/.test(hookLine)) {
      add(
        "A specific number gives the hook a proof-like edge.",
        `The number appears in the first line: "${hookLine}".`
      );
    }
  }
  if (timeline.some((beat) => beat.beat === "tension")) {
    add(
      "A turn against the expected advice creates an open loop.",
      `The structure includes a turn: "${timeline.find((beat) => beat.beat === "tension")?.label}".`
    );
  }
  if (cta.text) {
    add(
      "One explicit ask at the close removes the guesswork.",
      `The CTA reads: "${cta.text}".`,
      "high"
    );
  }
  if (hypotheses.length === 0) {
    add(
      "The opening relies on the visual and the sound, not a spoken promise.",
      "No speech or on-screen text was supplied, so there is no line to quote.",
      "low"
    );
  }

  const risks: string[] = [];
  if (/\b(cure|heal|treat|diagnos|medical|dermatolog|guarantee|permanent|before.?after)\b/i.test(source)) {
    risks.push("Health, outcome or before/after language is present. Do not repeat it in the adaptation.");
  }
  if (/\b(price|₦|ngn|naira|\$\d)/i.test(source)) {
    risks.push("The source mentions a price or offer. The adaptation must use the brand's current approved figure.");
  }
  if (!source) {
    risks.push("No transcript, caption or title was supplied. The teardown is visual-only.");
  }
  if (risks.length === 0) {
    risks.push("Structure and pacing are safe to adapt; do not reuse the creator's footage, voice or wording.");
  }

  return {
    title: context.title || (context.caption ? context.caption.slice(0, 80) : "Untitled teardown"),
    duration_seconds: duration,
    hook: {
      text: hookLine.slice(0, 280),
      start: 0,
      end: Math.min(3, Math.max(1.5, lines[0]?.end ?? 3)),
      device: device.device,
      why: device.why,
    },
    timeline,
    transcript: lines,
    pacing: {
      cuts_per_minute: lines.length ? round((lines.length / duration) * 60, 1) : 0,
      average_shot_seconds: lines.length ? round(duration / Math.max(1, lines.length), 1) : 0,
      notes: lines.length
        ? "Estimated from transcript beats, not measured cuts."
        : "No speech to pace; the clip was not measured for cuts.",
    },
    cta,
    keywords: topKeywords(source),
    hashtags: hashtagsIn(source),
    why_it_worked: hypotheses.slice(0, 5),
    risks,
    confidence: "low",
    limitations: source
      ? "Built from the supplied text only. Visual pacing, on-screen text and audio cues were not measured."
      : "No transcript, caption or title was supplied. The teardown is based on the video alone.",
  };
}

function brandCategory(brand: Brand): string {
  const niche = brand.niche.toLowerCase();
  if (/(skin|beauty|cosmetic|serum|spa)/.test(niche)) return "skincare";
  if (/(jewel|jewell|earring|accessor)/.test(niche)) return "jewellery";
  if (/(fit|gym|strength|training|coach|wellness|health)/.test(niche)) return "training";
  if (/(fashion|style|cloth|apparel)/.test(niche)) return "styling";
  if (/(food|restaurant|cafe|bakery|drink)/.test(niche)) return "food";
  if (/(travel|tour|hotel)/.test(niche)) return "travel";
  return "content";
}

function pickFact(facts: BrandFact[], matcher: RegExp): BrandFact | undefined {
  return facts.find(
    (fact) => fact.status === "approved" && !fact.valid_to && matcher.test(fact.subject)
  );
}

export function fallbackAdaptation(
  context: AnalysisContext,
  teardown: Teardown
): Adaptation {
  const { brand, profile } = context;
  const category = brandCategory(brand);
  const approved = context.facts.filter((fact) => fact.status === "approved" && !fact.valid_to);
  const banned = (profile?.banned_claims ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const safeFacts = approved.filter(
    (fact) => !banned.some((claim) => fact.value.toLowerCase().includes(claim.toLowerCase()))
  );
  const heroFact =
    pickFact(safeFacts, /price|offer|retail/i) ??
    pickFact(safeFacts, /product|hero|signature/i) ??
    safeFacts[0];
  const product =
    (profile?.offers ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)[0] ?? brand.niche;
  const cta =
    (profile?.ctas ?? "")
      .split(/[.!?]/)
      .map((item) => item.trim())
      .filter(Boolean)[0] ?? "Save this for later.";

  const device = teardown.hook.device.toLowerCase();
  const hook =
    device.includes("question")
      ? `What if the problem isn't you — it's the ${category} advice you were given?`
      : device.includes("myth")
        ? `Most ${category} advice gets this backwards.`
        : device.includes("pattern")
          ? `Stop before you add another ${category} step.`
          : device.includes("direct")
            ? `If your ${category} routine feels heavy, this is why.`
            : `The ${category} advice that finally made sense.`;

  const factLine = heroFact ? `${heroFact.subject}: ${heroFact.value}.` : "";
  const methodLine = heroFact
    ? `For ${brand.name}, the proof sits in one approved fact — ${heroFact.value}. Keep the demo on the ${product}.`
    : `For ${brand.name}, keep the demo on ${product}. No price or claim goes in the script until it is approved.`;

  const script_outline: ScriptBeat[] = teardown.timeline.map((beat, index) => {
    const kind = `${beat.beat} ${beat.label}`.toLowerCase();
    const isTension = /tension|problem|turn|myth|wrong|pain/.test(kind);
    const isMethod = /method|solution|instruction|how|step|routine|rule|execution/.test(kind);
    const isProof = /proof|payoff|result|outcome|change/.test(kind);
    const isCta = /cta|close|ask|save|follow/.test(kind) || index === teardown.timeline.length - 1;
    const methodIndex = teardown.timeline
      .slice(0, index)
      .filter((item) => /method|solution|instruction|how|step|routine|rule|execution/.test(`${item.beat} ${item.label}`.toLowerCase())).length;

    let line = "";
    if (index === 0) line = hook;
    else if (isCta) line = cta;
    else if (isTension) line = "The instinct is to add another step. That is usually the problem.";
    else if (isMethod)
      line =
        methodIndex === 0
          ? methodLine
          : `Keep the demo to ${product} and one supporting step. No extra claim.`;
    else if (isProof) line = factLine || "Nothing dramatic. Just a routine that fits the day you actually have.";
    else line = `Here is the ${category} version, in the same order as the source.`;

    return {
      start: beat.start,
      end: beat.end,
      beat: beat.label,
      line,
      shot:
        index === 0
          ? "Talking head, tight crop, direct to camera."
          : isMethod
            ? `Close product shots of ${product}.`
            : isCta
              ? "Final frame with the ask as on-screen text."
              : "B-roll of the routine or the product in use.",
      on_screen_text: index === 0 ? hook.slice(0, 60) : isCta ? cta : "",
    };
  });

  const shot_list: Shot[] = [
    { shot: "Hook", framing: "Tight vertical talking head", action: "Deliver the first line before any logo or intro.", seconds: 3 },
    { shot: "Tension", framing: "Medium, same setup", action: "Name the thing the audience is doing wrong.", seconds: 4 },
    { shot: "Demo", framing: "Close-up hands / product", action: `Show the ${product} in use, one step per cut.`, seconds: 10 },
    { shot: "Proof", framing: "Medium or text card", action: "State one approved fact. No unsupported outcome.", seconds: 5 },
    { shot: "Close", framing: "Tight talking head", action: `Say or show: ${cta}`, seconds: 3 },
  ];

  const hashtags =
    (profile?.hashtags ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5)
      .join(" ") || `#${brand.niche.replace(/[^a-z0-9]+/gi, "")}`;

  const caption = `${hook}\n\n${factLine ? `${factLine}\n\n` : ""}${cta}\n\n${hashtags}`;
  const limit = platformMeta(context.platform).limit;

  const adaptation: Adaptation = {
    angle: `${brand.name} keeps the source's ${teardown.timeline.length}-beat shape but replaces the story with a ${category} demonstration built around ${product}.`,
    hook,
    script_outline,
    shot_list,
    cta,
    caption: caption.length > limit ? `${caption.slice(0, limit - 1).trimEnd()}…` : caption,
    hashtags,
    test_plan: {
      variant_a: {
        name: "Hook-first",
        change: "Lead with the rewritten hook, then the same method.",
        hypothesis: "A sharper first three seconds lifts the hold rate.",
      },
      variant_b: {
        name: "Proof-first",
        change: "Open on the product demo, then deliver the hook as a caption.",
        hypothesis: "Showing the product before the claim lowers the bounce among buyers.",
      },
      metric: "3-second hold rate and saves per reach",
      window: "7 days, same posting slot",
    },
    facts_used: heroFact ? [heroFact.value] : [],
    guardrails: [
      ...(banned.length ? [`Do not use: ${banned.join(", ")}.`] : []),
      "Do not reuse the source creator's footage, voice or phrasing.",
      ...(approved.length === 0 ? ["No approved facts exist for this brand; the script avoids specific claims."] : []),
    ].slice(0, 8),
  };
  return adaptation;
}

/* -------------------------------------------------------------------------- */
/* Similarity guardrail                                                       */
/* -------------------------------------------------------------------------- */

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 || /^\d+$/.test(token));
}

function grams(tokensIn: string[], size: number): string[] {
  const output: string[] = [];
  for (let index = 0; index <= tokensIn.length - size; index += 1) {
    output.push(tokensIn.slice(index, index + size).join(" "));
  }
  return output;
}

export function compareWording(sourceText: string, adaptationText: string): Similarity {
  const source = tokens(sourceText);
  const draft = tokens(adaptationText);
  if (source.length < 8 || draft.length < 8) {
    return {
      score: 0,
      level: "low",
      matches: [],
      note: "Not enough source text to compare. Read the draft against the source by hand.",
      comparable: false,
    };
  }
  const size = 4;
  const sourceGrams = new Set(grams(source, size));
  const draftGrams = grams(draft, size);
  const covered = new Array(draft.length).fill(false);
  const matchTokens: string[] = [];

  draftGrams.forEach((gram, index) => {
    if (!sourceGrams.has(gram)) return;
    for (let offset = 0; offset < size; offset += 1) covered[index + offset] = true;
    matchTokens.push(gram);
  });

  const coveredWords = covered.filter(Boolean).length;
  const score = coveredWords / draft.length;
  const matches: string[] = [];
  for (const gram of matchTokens) {
    const phrase = gram;
    const existing = matches.findIndex((item) => item.includes(phrase) || phrase.includes(item));
    if (existing === -1) matches.push(phrase);
    else if (phrase.length > matches[existing].length) matches[existing] = phrase;
  }
  const level: Similarity["level"] = score >= 0.2 ? "high" : score >= 0.08 ? "watch" : "low";
  const note =
    level === "high"
      ? "Too much of the draft follows the source word for word. Tighten it before publishing."
      : level === "watch"
        ? "Some phrasing still echoes the source. Check the highlighted lines before publishing."
        : "The structure is borrowed; the words are not. This is inside the safe range.";

  return {
    score: round(score, 3),
    level,
    matches: [...new Set(matches)].slice(0, 6),
    note,
    comparable: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Gemini prompts and calls                                                   */
/* -------------------------------------------------------------------------- */

async function uploadFileToGemini(
  buffer: Buffer,
  mimeType: string,
  displayName: string
): Promise<{ name: string; uri: string; mimeType: string }> {
  const key = aiKey();
  if (!key) throw new Error("No Gemini key configured.");
  const start = await fetch(`${FILE_UPLOAD_URL}?uploadType=resumable`, {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "Content-Type": "application/json",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(buffer.byteLength),
      "X-Goog-Upload-Header-Content-Type": mimeType,
    },
    body: JSON.stringify({ file: { displayName } }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!start.ok) {
    const body = await start.text();
    throw new Error(`Gemini file start ${start.status}: ${body.slice(0, 300)}`);
  }
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini did not return an upload URL.");

  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(buffer.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(buffer),
    signal: AbortSignal.timeout(180_000),
  });
  if (!upload.ok) {
    const body = await upload.text();
    throw new Error(`Gemini file upload ${upload.status}: ${body.slice(0, 300)}`);
  }
  const payload = (await upload.json()) as {
    file?: { name?: string; uri?: string; mimeType?: string; state?: string };
  };
  const file = payload.file;
  if (!file?.name || !file.uri) throw new Error("Gemini did not return a file reference.");

  for (let attempt = 0; attempt < 45; attempt += 1) {
    const status = await fetch(`${FILE_API}/${file.name}?key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await status.json()) as {
      state?: string;
      file?: { state?: string };
    };
    const state = data.file?.state ?? data.state;
    if (state === "ACTIVE") {
      return { name: file.name, uri: file.uri, mimeType: file.mimeType ?? mimeType };
    }
    if (state === "FAILED") throw new Error("Gemini could not process that video file.");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Gemini is still processing the clip. Try a shorter clip.");
}

async function deleteGeminiFile(name: string): Promise<void> {
  const key = aiKey();
  if (!key || !name) return;
  try {
    await fetch(`${FILE_API}/${name}?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Best effort; Gemini expires uploaded files after 48 hours anyway.
  }
}

function contextBlock(context: AnalysisContext): string {
  return [
    `Platform: ${context.platform || "unknown"}`,
    `Creator: ${context.creator || "unknown"}`,
    `Title: ${context.title || "(none)"}`,
    `Caption supplied: ${context.caption ? context.caption.slice(0, 1200) : "(none)"}`,
    `Duration supplied: ${context.durationSeconds ? `${round(context.durationSeconds, 1)}s` : "unknown"}`,
  ].join("\n");
}

const TEARDOWN_SHAPE = `{
  "title": "short working title",
  "duration_seconds": 0,
  "hook": {"text": "exact first line or on-screen words", "start": 0, "end": 3, "device": "question / pattern interrupt / myth correction / direct address / specific number / bold claim", "why": "one sentence"},
  "timeline": [{"start": 0, "end": 3, "label": "Hook", "beat": "hook", "visual": "what is on screen", "on_screen_text": "exact text or empty", "audio": "speech / music / sound", "purpose": "why this beat exists"}],
  "transcript": [{"start": 0, "end": 3, "text": "verbatim speech"}],
  "pacing": {"cuts_per_minute": 0, "average_shot_seconds": 0, "notes": "measured or estimated"},
  "cta": {"text": "exact ask", "type": "save / comment / share / follow / link / none", "placement": "end / caption / overlay"},
  "keywords": ["..."],
  "hashtags": ["#..."],
  "why_it_worked": [{"claim": "hypothesis, not a performance claim", "evidence": "quoted moment and timestamp", "confidence": "low / medium / high"}],
  "risks": ["what would be unsafe or unfair to copy"],
  "confidence": "low / medium / high",
  "limitations": "what you could not tell from the source"
}`;

function videoPrompt(context: AnalysisContext): string {
  return `You are a social video analyst. Watch the attached clip and write a teardown that a creative team can adapt without copying it.

${contextBlock(context)}

Hard rules:
- Describe only what you can see or hear. Never invent views, likes, saves or any performance number.
- Quote on-screen text exactly. If there is none, use an empty string.
- Timestamps are seconds from the start of the clip. Timeline beats must be ordered, cover the whole clip and not overlap.
- Use 3 to 8 beats. Split on visual, text, audio or argument changes; even a single continuous shot has an opening, a development and a close.
- The hook is the first 3 seconds (or the first visual beat if longer). Quote its exact words.
- Transcript: verbatim speech with start/end. Empty array if there is no speech.
- Pacing: count cuts if you can; otherwise estimate and say so in notes.
- why_it_worked: 3 to 5 hypotheses. Each needs a quoted moment with a timestamp as evidence. These are hypotheses, not proof.
- cta: the exact ask, not an interpretation.
- risks: claims or techniques that would be unsafe, unfair or non-compliant to copy.
- confidence: how well the evidence supports the teardown. limitations: what you could not tell.

Also note the platform's native conventions if they are visible in the clip.

Return strict JSON only, matching this shape:
${TEARDOWN_SHAPE}`;
}

function textPrompt(context: AnalysisContext): string {
  return `You are a social video analyst. You do NOT have the video; you only have the supplied caption or transcript. Write a teardown that a creative team can adapt without copying it.

${contextBlock(context)}

Source text:
"""
${(context.transcript || context.caption || context.title).slice(0, 14_000)}
"""

Hard rules:
- Do not claim to have seen visuals. For visual fields write "Not visible — text-only source".
- Use 3 to 8 beats, even when the source is a single paragraph; split on turns in the argument.
- Timestamps are estimates from word count, not measured. Say so in pacing.notes and limitations.
- Quote the source exactly in the hook and transcript.
- Never invent views, likes, saves or performance numbers.
- why_it_worked: 2 to 4 evidence-backed hypotheses using exact quotes.
- risks: claims or techniques that would be unsafe or unfair to copy.
- confidence must be low or medium, never high.

Return strict JSON only, matching this shape:
${TEARDOWN_SHAPE}`;
}

function visionPrompt(context: AnalysisContext, frames: StoredFrame[]): string {
  const times = frames.map((frame) => `${round(frame.time, 1)}s`).join(", ");
  return `You are a social video analyst. You have ${frames.length} frames sampled from a clip at ${times}. You do not have the motion or audio. Reconstruct a teardown from the frames plus the supplied transcript/caption, and mark uncertain visual claims in limitations.

${contextBlock(context)}

Hard rules:
- The frames are the only visual evidence. Do not invent motion, cuts or audio.
- Use 3 to 8 beats, split where the frames or the transcript change.
- For pacing, estimate only if the frames clearly show a change of scene; say it is estimated from stills.
- Quote on-screen text exactly where legible.
- Never invent performance numbers.
- why_it_worked: 2 to 4 hypotheses with evidence pointing to a frame time or quote.
- confidence must be low or medium.

Source transcript/caption:
"""
${(context.transcript || context.caption || context.title).slice(0, 10_000)}
"""

Return strict JSON only, matching this shape:
${TEARDOWN_SHAPE}`;
}

function adaptationPrompt(
  context: AnalysisContext,
  teardown: Teardown,
  feedback?: { phrases: string[] }
): string {
  return `You are a senior creative director adapting a proven short-video structure for ${context.brand.name}. Structure may be borrowed. Words, footage, voice and examples must be new.

SOURCE TEARDOWN
${JSON.stringify(teardown)}

BRAND
${brandContext(context.brand.name, context.profile, context.facts)}

Hard rules:
- Keep the source's beat sequence and approximate timing, but replace every line, visual and example with the brand's own.
- Do not reuse any run of 4 or more words from the source. Rewrite the same idea from scratch.${feedback?.phrases.length ? `\n- The previous draft repeated these phrases: ${feedback.phrases.map((phrase) => `"${phrase}"`).join(", ")}. Do not use them again.` : ""}
- Use only the approved facts above. Never invent prices, certifications, outcomes, testimonials, ingredients or dates.
- Respect the banned claims. No health, medical or before/after claims.
- Script lines must be speakable inside their beat at about 2.5 words per second.
- The caption must fit ${context.platform} and stay native to it.
- The 2-variant test must change one variable per variant and keep the structure constant.
- facts_used must list the exact approved fact values you used, or an empty array.
- guardrails must name the brand rules that matter for this brief.

Return strict JSON only:
{
  "angle": "one sentence naming the creative angle",
  "hook": "the first spoken line",
  "script_outline": [{"start": 0, "end": 3, "beat": "Hook", "line": "spoken line", "shot": "what the camera sees", "on_screen_text": "text or empty"}],
  "shot_list": [{"shot": "Hook", "framing": "tight vertical", "action": "what happens", "seconds": 3}],
  "cta": "the exact ask",
  "caption": "the post caption",
  "hashtags": "#a #b",
  "test_plan": {"variant_a": {"name": "...", "change": "...", "hypothesis": "..."}, "variant_b": {"name": "...", "change": "...", "hypothesis": "..."}, "metric": "...", "window": "..."},
  "facts_used": ["exact value"],
  "guardrails": ["..."]
}`;
}

export async function analysisWithVideo(
  context: AnalysisContext,
  file: { uri: string; mimeType: string }
): Promise<Teardown> {
  const raw = await geminiGenerateJson<RawTeardown>(
    [
      { text: videoPrompt(context) },
      { fileData: { mimeType: file.mimeType, fileUri: file.uri } },
    ],
    0.35
  );
  return normalizeTeardown(raw, context, fallbackTeardown(context));
}

export async function analysisWithFrames(
  context: AnalysisContext,
  frames: Array<StoredFrame & { dataUrl: string }>
): Promise<Teardown> {
  const usable = frames.filter((frame) => frame.dataUrl.startsWith("data:image/")).slice(0, 8);
  if (usable.length === 0) throw new Error("No frames available for vision analysis.");
  const parts = [
    { text: visionPrompt(context, usable) },
    ...usable.map((frame) => ({
      inlineData: {
        mimeType: frame.dataUrl.slice(5, frame.dataUrl.indexOf(";")),
        data: frame.dataUrl.slice(frame.dataUrl.indexOf(",") + 1),
      },
    })),
  ];
  const raw = await geminiGenerateJson<RawTeardown>(parts, 0.35);
  return normalizeTeardown(raw, context, fallbackTeardown(context));
}

export async function analysisWithText(context: AnalysisContext): Promise<Teardown> {
  const raw = await geminiGenerateJson<RawTeardown>([{ text: textPrompt(context) }], 0.35);
  return normalizeTeardown(raw, context, fallbackTeardown(context));
}

export async function adaptationWithGemini(
  context: AnalysisContext,
  teardown: Teardown,
  feedback?: { phrases: string[] }
): Promise<Adaptation> {
  const fallback = fallbackAdaptation(context, teardown);
  const raw = await geminiGenerateJson<RawAdaptation>(
    [{ text: adaptationPrompt(context, teardown, feedback) }],
    0.5
  );
  return normalizeAdaptation(raw, fallback, context.facts, context.profile);
}

export function adaptationFallback(context: AnalysisContext, teardown: Teardown): Adaptation {
  return fallbackAdaptation(context, teardown);
}

export function teardownFallback(context: AnalysisContext): Teardown {
  return fallbackTeardown(context);
}

export function geminiReady(): boolean {
  return geminiConfigured();
}

export async function uploadSourceToGemini(
  buffer: Buffer,
  mimeType: string,
  displayName: string
) {
  return uploadFileToGemini(buffer, mimeType, displayName);
}

export async function removeGeminiFile(name: string) {
  return deleteGeminiFile(name);
}
