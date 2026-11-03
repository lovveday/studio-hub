import { get } from "@/lib/db";
import { aiStatus } from "@/lib/ai";
import { oauthProviderConfigured } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const counts = {
    users: Number(get<{ c: number }>("SELECT count(*) AS c FROM users")?.c ?? 0),
    brands: Number(get<{ c: number }>("SELECT count(*) AS c FROM brands")?.c ?? 0),
    posts: Number(get<{ c: number }>("SELECT count(*) AS c FROM posts")?.c ?? 0),
    knowledge: Number(get<{ c: number }>("SELECT count(*) AS c FROM knowledge_items")?.c ?? 0),
    reports: Number(get<{ c: number }>("SELECT count(*) AS c FROM reports")?.c ?? 0),
    assets: Number(get<{ c: number }>("SELECT count(*) AS c FROM assets")?.c ?? 0),
    connections: Number(get<{ c: number }>("SELECT count(*) AS c FROM social_accounts")?.c ?? 0),
  };
  return Response.json({
    ok: true,
    time: new Date().toISOString(),
    ai: aiStatus(),
    oauth: {
      meta: oauthProviderConfigured("meta"),
      google: oauthProviderConfigured("google"),
      linkedin: oauthProviderConfigured("linkedin"),
      x: oauthProviderConfigured("x"),
      tiktok: oauthProviderConfigured("tiktok"),
    },
    counts,
  });
}
