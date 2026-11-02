import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { ingestVoiceNote } from "@/lib/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }
  try {
    const brand = await getActiveBrand();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "No audio file received." }, { status: 400 });
    }
    if (file.size > 30 * 1024 * 1024) {
      return Response.json({ error: "Audio must be under 30 MB." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestVoiceNote({
      brandId: brand.id,
      title: String(formData.get("title") ?? "") || file.name,
      buffer,
      fileName: file.name,
      mimeType: file.type || "audio/ogg",
      userId: user.id,
    });
    return Response.json({
      id: result.id,
      transcript: result.transcribed.text,
      warning: result.transcribed.error,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
