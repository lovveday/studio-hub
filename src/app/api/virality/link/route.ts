import { getSessionUser } from "@/lib/auth";
import { fetchLinkMetadata } from "@/lib/virality";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const body = (await request.json()) as { url?: string };
    const metadata = await fetchLinkMetadata(String(body.url ?? ""));
    return Response.json(metadata);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
