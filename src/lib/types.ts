export type UserRole = "owner" | "manager" | "editor" | "viewer";

export type User = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  avatar_color: string;
  created_at: string;
};

export type Brand = {
  id: string;
  name: string;
  handle: string;
  niche: string;
  timezone: string;
  color: string;
  created_at: string;
  created_by: string;
};

export type BrandProfile = {
  brand_id: string;
  tone: string;
  audience: string;
  pillars: string;
  offers: string;
  banned_claims: string;
  hashtags: string;
  ctas: string;
  competitors: string;
  notes: string;
  updated_at: string;
};

export type BrandFact = {
  id: string;
  brand_id: string;
  subject: string;
  value: string;
  status: "pending" | "approved" | "rejected" | "superseded";
  confidence: number;
  source_item_id: string | null;
  valid_from: string;
  valid_to: string | null;
  supersedes_id: string | null;
  created_at: string;
};

export type KnowledgeType = "note" | "file" | "url" | "voice" | "image" | "screenshot";

export type KnowledgeItem = {
  id: string;
  brand_id: string;
  type: KnowledgeType;
  title: string;
  source: string;
  status: "needs_review" | "approved" | "rejected" | "processing" | "failed";
  raw_text: string;
  file_path: string | null;
  mime_type: string | null;
  size: number;
  transcript: string;
  summary: string;
  facts_json: string;
  created_by: string;
  created_at: string;
};

export type PostStatus =
  | "draft"
  | "needs_review"
  | "approved"
  | "scheduled"
  | "ready"
  | "published"
  | "failed";

export type Post = {
  id: string;
  brand_id: string;
  title: string;
  idea: string;
  status: PostStatus;
  scheduled_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  share_token: string | null;
  prep_lead_hours: number;
  created_at: string;
  updated_at: string;
};

export type PostVariant = {
  id: string;
  post_id: string;
  platform: string;
  caption: string;
  hashtags: string;
  first_comment: string;
  media_path: string | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  brand_id: string | null;
  type: string;
  title: string;
  body: string;
  link: string | null;
  dedupe_key: string | null;
  read_at: string | null;
  created_at: string;
};

export type CommentRow = {
  id: string;
  brand_id: string;
  post_id: string | null;
  platform: string;
  author: string;
  author_handle: string;
  text: string;
  sentiment: "positive" | "neutral" | "question" | "negative";
  status: "new" | "replied" | "liked" | "escalated";
  reply_draft: string;
  created_at: string;
};

export type ReportRow = {
  id: string;
  brand_id: string;
  title: string;
  period_start: string;
  period_end: string;
  metrics_json: string;
  pptx_path: string;
  pdf_path: string;
  created_at: string;
};

export type MetricRow = {
  id: string;
  brand_id: string;
  platform: string;
  date: string;
  followers: number;
  reach: number;
  impressions: number;
  engagements: number;
  clicks: number;
};

export type ActivityRow = {
  id: string;
  brand_id: string | null;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string;
  created_at: string;
};

export type FactCandidate = {
  subject: string;
  value: string;
  confidence: number;
  reason?: string;
};

export type PlatformVariantDraft = {
  platform: string;
  caption: string;
  hashtags: string;
  firstComment: string;
};

export type AssetRow = {
  id: string;
  brand_id: string;
  name: string;
  file_path: string;
  mime_type: string;
  size: number;
  kind: "image" | "video" | "audio" | "file";
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  alt_text: string;
  tags: string;
  checksum: string;
  storage_provider: "local" | "r2";
  upload_status: "uploading" | "ready" | "failed";
  upload_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type SocialAccount = {
  id: string;
  brand_id: string;
  platform: string;
  external_id: string;
  account_name: string;
  account_handle: string;
  page_id: string | null;
  scopes: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  status: "connected" | "needs_reconnect" | "disconnected";
  capabilities_json: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};

export type PublishAttempt = {
  id: string;
  post_id: string;
  platform: string;
  social_account_id: string | null;
  status: "published" | "failed" | "assisted_required" | "retrying";
  attempt: number;
  external_id: string | null;
  external_url: string | null;
  error: string | null;
  request_json: string;
  response_json: string;
  created_at: string;
};
