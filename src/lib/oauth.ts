import crypto from "node:crypto";
import { all, get, run } from "./db";
import { encryptSecret } from "./crypto";
import type { SocialAccount } from "./types";

export type OAuthPlatform = "meta" | "google" | "linkedin" | "x" | "tiktok" | "mock";

export const OAUTH_PLATFORMS: OAuthPlatform[] = ["meta", "google", "linkedin", "x", "tiktok", "mock"];

export function isOAuthPlatform(value: string): value is OAuthPlatform {
  return (OAUTH_PLATFORMS as string[]).includes(value);
}

export function oauthProviderConfigured(platform: OAuthPlatform): boolean {
  switch (platform) {
    case "meta":
      return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
    case "google":
      return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    case "linkedin":
      return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
    case "x":
      return Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET);
    case "tiktok":
      return Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
    case "mock":
      return true;
  }
}

export type OAuthState = {
  state: string;
  brand_id: string;
  platform: string;
  code_verifier: string | null;
  redirect_to: string | null;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

export function oauthBaseUrl(request: Request): string {
  return (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export function callbackUrl(request: Request, platform: OAuthPlatform): string {
  return `${oauthBaseUrl(request)}/api/oauth/${platform}/callback`;
}

export function createOAuthState(input: {
  brandId: string;
  platform: OAuthPlatform;
  codeVerifier?: string;
  redirectTo?: string;
}): OAuthState {
  const state = crypto.randomBytes(24).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000);
  run(
    `INSERT INTO oauth_states (state, brand_id, platform, code_verifier, redirect_to, created_at, expires_at, used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      state,
      input.brandId,
      input.platform,
      input.codeVerifier ?? null,
      input.redirectTo ?? null,
      now.toISOString(),
      expires.toISOString(),
    ]
  );
  return {
    state,
    brand_id: input.brandId,
    platform: input.platform,
    code_verifier: input.codeVerifier ?? null,
    redirect_to: input.redirectTo ?? null,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
    used_at: null,
  };
}

export function consumeOAuthState(state: string, platform: OAuthPlatform): OAuthState | undefined {
  const row = get<OAuthState>("SELECT * FROM oauth_states WHERE state = ? AND platform = ?", [
    state,
    platform,
  ]);
  if (!row) return undefined;
  if (row.used_at) return undefined;
  if (new Date(row.expires_at).getTime() < Date.now()) return undefined;
  run("UPDATE oauth_states SET used_at = ? WHERE state = ?", [new Date().toISOString(), state]);
  return row;
}

function env(name: string): string {
  return process.env[name] || "";
}

function requireEnv(name: string, label: string): string {
  const value = env(name);
  if (!value) throw new Error(`${label} is not configured. Add ${name} to .env.local.`);
  return value;
}

function base64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

function pkce(): { verifier: string; challenge: string } {
  const verifier = base64Url(crypto.randomBytes(48));
  const challenge = base64Url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function buildAuthorizationUrl(
  platform: OAuthPlatform,
  state: string,
  request: Request
): { url: string; codeVerifier?: string } {
  const redirectUri = callbackUrl(request, platform);
  if (platform === "mock") {
    return {
      url: `${oauthBaseUrl(request)}/api/oauth/mock/callback?state=${encodeURIComponent(state)}&code=mock-code`,
    };
  }
  if (platform === "meta") {
    const clientId = requireEnv("META_APP_ID", "Meta App ID");
    const configId = env("META_LOGIN_CONFIG_ID");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      response_type: "code",
    });
    if (configId) params.set("config_id", configId);
    else
      params.set(
        "scope",
        [
          "pages_show_list",
          "pages_read_engagement",
          "pages_manage_posts",
          "pages_manage_engagement",
          "read_insights",
          "business_management",
          "instagram_basic",
          "instagram_content_publish",
          "instagram_manage_comments",
          "instagram_manage_insights",
          "instagram_manage_engagement",
        ].join(",")
      );
    return { url: `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}` };
  }
  if (platform === "google") {
    const clientId = requireEnv("GOOGLE_CLIENT_ID", "Google Client ID");
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
        "https://www.googleapis.com/auth/yt-analytics.readonly",
      ].join(" "),
    });
    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  }
  if (platform === "linkedin") {
    const clientId = requireEnv("LINKEDIN_CLIENT_ID", "LinkedIn Client ID");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: ["openid", "profile", "w_member_social", "r_organization_social", "w_organization_social"].join(
        " "
      ),
    });
    return { url: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}` };
  }
  if (platform === "x") {
    const clientId = requireEnv("X_CLIENT_ID", "X Client ID");
    const pair = pkce();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: ["tweet.read", "tweet.write", "users.read", "offline.access", "like.write"].join(" "),
      code_challenge: pair.challenge,
      code_challenge_method: "S256",
    });
    return { url: `https://twitter.com/i/oauth2/authorize?${params.toString()}`, codeVerifier: pair.verifier };
  }
  const clientKey = requireEnv("TIKTOK_CLIENT_KEY", "TikTok client key");
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: "code",
    scope: ["user.info.basic", "video.publish", "video.upload", "video.list"].join(","),
    redirect_uri: redirectUri,
    state,
  });
  return { url: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}` };
}

type TokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  raw: Record<string, unknown>;
};

async function jsonOrThrow(response: Response, label: string): Promise<Record<string, unknown>> {
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!response.ok) {
    const error = typeof data.error === "string" ? data.error : `HTTP ${response.status}`;
    throw new Error(`${label} failed: ${error}`);
  }
  return data;
}

async function exchangeMeta(code: string, redirectUri: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: requireEnv("META_APP_ID", "Meta App ID"),
    client_secret: requireEnv("META_APP_SECRET", "Meta App Secret"),
    redirect_uri: redirectUri,
    code,
  });
  const response = await fetch(`https://graph.facebook.com/v23.0/oauth/access_token?${params.toString()}`, {
    cache: "no-store",
  });
  const data = await jsonOrThrow(response, "Meta token exchange");
  return {
    accessToken: String(data.access_token ?? ""),
    expiresIn: Number(data.expires_in ?? 0) || undefined,
    raw: data,
  };
}

async function exchangeGoogle(code: string, redirectUri: string): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID", "Google Client ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET", "Google Client Secret"),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const data = await jsonOrThrow(response, "Google token exchange");
  return {
    accessToken: String(data.access_token ?? ""),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    expiresIn: Number(data.expires_in ?? 0) || undefined,
    raw: data,
  };
}

async function exchangeLinkedIn(code: string, redirectUri: string): Promise<TokenResponse> {
  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: requireEnv("LINKEDIN_CLIENT_ID", "LinkedIn Client ID"),
      client_secret: requireEnv("LINKEDIN_CLIENT_SECRET", "LinkedIn Client Secret"),
    }),
    cache: "no-store",
  });
  const data = await jsonOrThrow(response, "LinkedIn token exchange");
  return {
    accessToken: String(data.access_token ?? ""),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    expiresIn: Number(data.expires_in ?? 0) || undefined,
    raw: data,
  };
}

async function exchangeX(code: string, redirectUri: string, verifier: string): Promise<TokenResponse> {
  const clientId = requireEnv("X_CLIENT_ID", "X Client ID");
  const clientSecret = requireEnv("X_CLIENT_SECRET", "X Client Secret");
  const response = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  const data = await jsonOrThrow(response, "X token exchange");
  return {
    accessToken: String(data.access_token ?? ""),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    expiresIn: Number(data.expires_in ?? 0) || undefined,
    raw: data,
  };
}

async function exchangeTikTok(code: string, redirectUri: string): Promise<TokenResponse> {
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: requireEnv("TIKTOK_CLIENT_KEY", "TikTok client key"),
      client_secret: requireEnv("TIKTOK_CLIENT_SECRET", "TikTok client secret"),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  const data = await jsonOrThrow(response, "TikTok token exchange");
  return {
    accessToken: String(data.access_token ?? ""),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    expiresIn: Number(data.expires_in ?? 0) || undefined,
    raw: data,
  };
}

type AccountInput = {
  platform: string;
  externalId: string;
  accountName: string;
  accountHandle: string;
  pageId?: string | null;
  scopes: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  metadata?: Record<string, unknown>;
};

function defaultCapabilities(platform: string): Record<string, boolean> {
  switch (platform) {
    case "facebook":
      return { publish: true, firstComment: true, reply: true, likeComment: false, analytics: true, webhooks: true };
    case "instagram":
      return { publish: true, firstComment: true, reply: true, likeComment: false, analytics: true, webhooks: true };
    case "youtube":
      return { publish: true, firstComment: true, reply: true, likeComment: false, analytics: true, webhooks: true };
    case "linkedin":
      return { publish: true, firstComment: true, reply: true, likeComment: true, analytics: true, webhooks: true };
    case "x":
      return { publish: true, firstComment: true, reply: true, likeComment: true, analytics: true, webhooks: true };
    case "tiktok":
      return { publish: true, firstComment: false, reply: false, likeComment: false, analytics: true, webhooks: false };
    default:
      return { publish: false, firstComment: false, reply: false, likeComment: false, analytics: false, webhooks: false };
  }
}

export function saveSocialAccount(brandId: string, account: AccountInput): SocialAccount {
  const now = new Date().toISOString();
  const expiresAt = account.expiresIn
    ? new Date(Date.now() + account.expiresIn * 1000).toISOString()
    : null;
  const accessEncrypted = account.accessToken ? encryptSecret(account.accessToken) : null;
  const refreshEncrypted = account.refreshToken ? encryptSecret(account.refreshToken) : null;
  const existing = get<SocialAccount>(
    "SELECT * FROM social_accounts WHERE brand_id = ? AND platform = ? AND external_id = ?",
    [brandId, account.platform, account.externalId]
  );
  const id = existing?.id ?? crypto.randomUUID();
  run(
    `INSERT INTO social_accounts
     (id, brand_id, platform, external_id, account_name, account_handle, page_id, scopes,
      access_token_encrypted, refresh_token_encrypted, token_expires_at, status,
      capabilities_json, metadata_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'connected', ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       account_name = excluded.account_name,
       account_handle = excluded.account_handle,
       page_id = excluded.page_id,
       scopes = excluded.scopes,
       access_token_encrypted = excluded.access_token_encrypted,
       refresh_token_encrypted = excluded.refresh_token_encrypted,
       token_expires_at = excluded.token_expires_at,
       status = 'connected',
       capabilities_json = excluded.capabilities_json,
       metadata_json = excluded.metadata_json,
       updated_at = excluded.updated_at`,
    [
      id,
      brandId,
      account.platform,
      account.externalId,
      account.accountName,
      account.accountHandle,
      account.pageId ?? null,
      account.scopes,
      accessEncrypted,
      refreshEncrypted,
      expiresAt,
      JSON.stringify(defaultCapabilities(account.platform)),
      JSON.stringify(account.metadata ?? {}),
      now,
      now,
    ]
  );
  return get<SocialAccount>("SELECT * FROM social_accounts WHERE id = ?", [id]) as SocialAccount;
}

async function metaAccounts(token: TokenResponse, scopes: string): Promise<AccountInput[]> {
  const graph = "https://graph.facebook.com/v23.0";
  const meResponse = await fetch(`${graph}/me?fields=id,name&access_token=${encodeURIComponent(token.accessToken)}`, {
    cache: "no-store",
  });
  const me = await jsonOrThrow(meResponse, "Meta profile");
  const accounts: AccountInput[] = [];
  const pagesResponse = await fetch(
    `${graph}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${encodeURIComponent(token.accessToken)}`,
    { cache: "no-store" }
  );
  const pages = await jsonOrThrow(pagesResponse, "Meta pages");
  const pageList = Array.isArray(pages.data) ? (pages.data as Array<Record<string, unknown>>) : [];
  for (const page of pageList.slice(0, 10)) {
    const pageToken = String(page.access_token ?? token.accessToken);
    const pageId = String(page.id ?? "");
    const pageName = String(page.name ?? "Facebook Page");
    accounts.push({
      platform: "facebook",
      externalId: pageId,
      accountName: pageName,
      accountHandle: pageName,
      pageId,
      scopes,
      accessToken: pageToken,
      expiresIn: token.expiresIn,
      metadata: { provider: "meta", kind: "facebook_page" },
    });
    const ig = page.instagram_business_account as Record<string, unknown> | undefined;
    if (ig?.id) {
      accounts.push({
        platform: "instagram",
        externalId: String(ig.id),
        accountName: `${pageName} · @${String(ig.username ?? "instagram")}`,
        accountHandle: `@${String(ig.username ?? "")}`,
        pageId,
        scopes,
        accessToken: pageToken,
        expiresIn: token.expiresIn,
        metadata: { provider: "meta", kind: "instagram_business" },
      });
    }
  }
  if (accounts.length === 0) {
    accounts.push({
      platform: "facebook",
      externalId: String(me.id ?? "meta-user"),
      accountName: String(me.name ?? "Meta user"),
      accountHandle: String(me.name ?? ""),
      scopes,
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
      metadata: { provider: "meta", kind: "meta_user" },
    });
  }
  return accounts;
}

async function googleAccounts(token: TokenResponse, scopes: string): Promise<AccountInput[]> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
    { headers: { Authorization: `Bearer ${token.accessToken}` }, cache: "no-store" }
  );
  const data = await jsonOrThrow(response, "YouTube channel");
  const items = Array.isArray(data.items) ? (data.items as Array<Record<string, unknown>>) : [];
  const channel = items[0];
  const snippet = (channel?.snippet ?? {}) as Record<string, unknown>;
  return [
    {
      platform: "youtube",
      externalId: String(channel?.id ?? "youtube-account"),
      accountName: String(snippet.title ?? "YouTube channel"),
      accountHandle: String(snippet.customUrl ?? ""),
      scopes,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresIn: token.expiresIn,
      metadata: { provider: "google", kind: "youtube_channel" },
    },
  ];
}

async function linkedinAccounts(token: TokenResponse, scopes: string): Promise<AccountInput[]> {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    cache: "no-store",
  });
  const data = await jsonOrThrow(response, "LinkedIn profile");
  return [
    {
      platform: "linkedin",
      externalId: String(data.sub ?? "linkedin-member"),
      accountName: String(data.name ?? "LinkedIn member"),
      accountHandle: String(data.email ?? ""),
      scopes,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresIn: token.expiresIn,
      metadata: { provider: "linkedin", kind: "member" },
    },
  ];
}

async function xAccounts(token: TokenResponse, scopes: string): Promise<AccountInput[]> {
  const response = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    cache: "no-store",
  });
  const data = await jsonOrThrow(response, "X profile");
  const user = (data.data ?? {}) as Record<string, unknown>;
  return [
    {
      platform: "x",
      externalId: String(user.id ?? "x-account"),
      accountName: String(user.name ?? "X account"),
      accountHandle: `@${String(user.username ?? "")}`,
      scopes,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresIn: token.expiresIn,
      metadata: { provider: "x", kind: "user" },
    },
  ];
}

async function tiktokAccounts(token: TokenResponse, scopes: string): Promise<AccountInput[]> {
  const response = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username",
    { headers: { Authorization: `Bearer ${token.accessToken}` }, cache: "no-store" }
  );
  const data = await jsonOrThrow(response, "TikTok profile");
  const user = ((data.data ?? {}) as Record<string, unknown>).user as Record<string, unknown> | undefined;
  return [
    {
      platform: "tiktok",
      externalId: String(user?.open_id ?? "tiktok-account"),
      accountName: String(user?.display_name ?? "TikTok account"),
      accountHandle: `@${String(user?.username ?? "")}`,
      scopes,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresIn: token.expiresIn,
      metadata: { provider: "tiktok", kind: "user" },
    },
  ];
}

export async function completeOAuth(input: {
  platform: OAuthPlatform;
  code: string;
  request: Request;
  state: OAuthState;
}): Promise<SocialAccount[]> {
  const redirectUri = callbackUrl(input.request, input.platform);
  if (input.platform === "mock") {
    const suffix = crypto.randomBytes(3).toString("hex");
    return [
      saveSocialAccount(input.state.brand_id, {
        platform: "facebook",
        externalId: `mock-facebook-${suffix}`,
        accountName: "Demo Facebook Page",
        accountHandle: "@demo_page",
        pageId: `mock-page-${suffix}`,
        scopes: "demo",
        accessToken: "",
        metadata: { provider: "mock", mock: true, kind: "facebook_page" },
      }),
      saveSocialAccount(input.state.brand_id, {
        platform: "instagram",
        externalId: `mock-instagram-${suffix}`,
        accountName: "Demo Instagram",
        accountHandle: "@demo_instagram",
        pageId: `mock-page-${suffix}`,
        scopes: "demo",
        accessToken: "",
        metadata: { provider: "mock", mock: true, kind: "instagram_business" },
      }),
    ];
  }

  const scopes = String(input.state.platform);
  if (input.platform === "meta") {
    const token = await exchangeMeta(input.code, redirectUri);
    const accounts = await metaAccounts(token, scopes);
    return accounts.map((account) => saveSocialAccount(input.state.brand_id, account));
  }
  if (input.platform === "google") {
    const token = await exchangeGoogle(input.code, redirectUri);
    const accounts = await googleAccounts(token, scopes);
    return accounts.map((account) => saveSocialAccount(input.state.brand_id, account));
  }
  if (input.platform === "linkedin") {
    const token = await exchangeLinkedIn(input.code, redirectUri);
    const accounts = await linkedinAccounts(token, scopes);
    return accounts.map((account) => saveSocialAccount(input.state.brand_id, account));
  }
  if (input.platform === "x") {
    const token = await exchangeX(input.code, redirectUri, input.state.code_verifier ?? "");
    const accounts = await xAccounts(token, scopes);
    return accounts.map((account) => saveSocialAccount(input.state.brand_id, account));
  }
  const token = await exchangeTikTok(input.code, redirectUri);
  const accounts = await tiktokAccounts(token, scopes);
  return accounts.map((account) => saveSocialAccount(input.state.brand_id, account));
}

export function deleteSocialAccount(id: string, brandId: string): boolean {
  const account = get<SocialAccount>("SELECT * FROM social_accounts WHERE id = ? AND brand_id = ?", [
    id,
    brandId,
  ]);
  if (!account) return false;
  run("DELETE FROM social_accounts WHERE id = ?", [id]);
  return true;
}

export function listAccountRows(brandId: string): SocialAccount[] {
  return all<SocialAccount>("SELECT * FROM social_accounts WHERE brand_id = ?", [brandId]);
}
