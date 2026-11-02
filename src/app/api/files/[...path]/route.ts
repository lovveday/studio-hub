import fs from "node:fs";
import path from "node:path";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mime: Record<string, string> = {
  ".opus": "audio/ogg",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".webm": "audio/webm",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".amr": "audio/amr",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { path: segments } = await params;
  const root = path.resolve(process.cwd(), "storage");
  const fullPath = path.resolve(root, ...segments);
  if (!fullPath.startsWith(root + path.sep) || !fs.existsSync(fullPath)) {
    return new Response("Not found", { status: 404 });
  }
  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) return new Response("Not found", { status: 404 });
  const buffer = fs.readFileSync(fullPath);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mime[path.extname(fullPath).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": String(stat.size),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
