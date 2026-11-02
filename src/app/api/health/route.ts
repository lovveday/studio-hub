import { get } from "@/lib/db";
import { aiStatus } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const counts = {
    users: Number(get<{ c: number }>("SELECT count(*) AS c FROM users")?.c ?? 0),
    brands: Number(get<{ c: number }>("SELECT count(*) AS c FROM brands")?.c ?? 0),
    posts: Number(get<{ c: number }>("SELECT count(*) AS c FROM posts")?.c ?? 0),
    knowledge: Number(get<{ c: number }>("SELECT count(*) AS c FROM knowledge_items")?.c ?? 0),
    reports: Number(get<{ c: number }>("SELECT count(*) AS c FROM reports")?.c ?? 0),
  };
  return Response.json({
    ok: true,
    time: new Date().toISOString(),
    ai: aiStatus(),
    counts,
  });
}
