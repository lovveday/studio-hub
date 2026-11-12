export type ViralityStatus = "processing" | "ready" | "failed";
export type ViralitySourceType = "upload" | "url" | "text" | "sample";
export type ViralityMode = "video" | "vision" | "text" | "metadata" | "demo" | "sample";
export type Confidence = "low" | "medium" | "high";

export type TimelineBeat = {
  start: number;
  end: number;
  label: string;
  beat: string;
  visual: string;
  on_screen_text: string;
  audio: string;
  purpose: string;
};

export type TranscriptLine = {
  start: number;
  end: number;
  text: string;
};

export type Hypothesis = {
  claim: string;
  evidence: string;
  confidence: Confidence;
};

export type Hook = {
  text: string;
  start: number;
  end: number;
  device: string;
  why: string;
};

export type Teardown = {
  title: string;
  duration_seconds: number;
  hook: Hook;
  timeline: TimelineBeat[];
  transcript: TranscriptLine[];
  pacing: {
    cuts_per_minute: number;
    average_shot_seconds: number;
    notes: string;
  };
  cta: {
    text: string;
    type: string;
    placement: string;
  };
  keywords: string[];
  hashtags: string[];
  why_it_worked: Hypothesis[];
  risks: string[];
  confidence: Confidence;
  limitations: string;
};

export type ScriptBeat = {
  start: number;
  end: number;
  beat: string;
  line: string;
  shot: string;
  on_screen_text: string;
};

export type Shot = {
  shot: string;
  framing: string;
  action: string;
  seconds: number;
};

export type TestVariant = {
  name: string;
  change: string;
  hypothesis: string;
};

export type Adaptation = {
  angle: string;
  hook: string;
  script_outline: ScriptBeat[];
  shot_list: Shot[];
  cta: string;
  caption: string;
  hashtags: string;
  test_plan: {
    variant_a: TestVariant;
    variant_b: TestVariant;
    metric: string;
    window: string;
  };
  facts_used: string[];
  guardrails: string[];
};

export type Similarity = {
  score: number;
  level: "low" | "watch" | "high";
  matches: string[];
  note: string;
  comparable: boolean;
};

export type StoredFrame = {
  time: number;
  path: string;
};

export type ViralityRow = {
  id: string;
  brand_id: string;
  status: ViralityStatus;
  stage: string;
  source_type: ViralitySourceType;
  source_url: string | null;
  source_title: string;
  platform: string;
  creator: string;
  caption: string;
  transcript: string;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  mime_type: string | null;
  file_path: string | null;
  poster_path: string | null;
  frames_json: string;
  metadata_json: string;
  teardown_json: string;
  adaptation_json: string;
  similarity_json: string;
  mode: ViralityMode | null;
  confidence: Confidence | null;
  error: string | null;
  source_deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ViralityAnalysis = ViralityRow & {
  teardown: Teardown | null;
  adaptation: Adaptation | null;
  similarity: Similarity | null;
  frames: StoredFrame[];
  metadata: Record<string, unknown>;
};

export const VIRALITY_STAGES = [
  {
    key: "saving-source",
    label: "Saving the source",
    detail: "The clip or link is stored just long enough to read it.",
  },
  {
    key: "reading-source",
    label: "Reading the source",
    detail: "Hook, speech, cuts, on-screen text and the CTA.",
  },
  {
    key: "writing-teardown",
    label: "Writing the teardown",
    detail: "A timestamped structure and the hypotheses behind it.",
  },
  {
    key: "grounding-brief",
    label: "Grounding the brief",
    detail: "Approved brand facts, offers and banned claims.",
  },
  {
    key: "checking-wording",
    label: "Checking the wording",
    detail: "The draft is compared against the source for copied phrasing.",
  },
  {
    key: "ready",
    label: "Ready to adapt",
    detail: "Teardown, brief and wording check saved.",
  },
] as const;

export function stageIndex(stage: string): number {
  const index = VIRALITY_STAGES.findIndex((item) => item.key === stage);
  return index === -1 ? 0 : index;
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export const VIRALITY_PLATFORMS = [
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
  "linkedin",
  "x",
] as const;
