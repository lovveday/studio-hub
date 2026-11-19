import { getSessionUser } from "@/lib/auth";
import { transcribeAudio } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "No audio received." }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return Response.json({ error: "Audio must be under 25 MB." }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await transcribeAudio(buffer, file.type || "audio/webm", "Browser dictation");
    if (!result.text) {
      return Response.json(
        { error: result.error || "Could not transcribe that recording.", mode: result.mode },
        { status: 422 }
      );
    }
    return Response.json({ text: result.text, mode: result.mode });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
