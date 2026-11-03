import crypto from "node:crypto";
import { get, run } from "@/lib/db";
import { uuid } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSignedRequest(signed: string, secret: string): Record<string, unknown> | null {
  const [encodedSignature, encodedPayload] = signed.split(".");
  if (!encodedSignature || !encodedPayload) return null;
  const expected = crypto.createHmac("sha256", secret).update(encodedPayload).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(encodedSignature, "base64url");
  } catch {
    return null;
  }
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;
  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const secret = process.env.META_APP_SECRET || "";
  if (!secret) {
    return Response.json({ error: "Meta app secret is not configured." }, { status: 500 });
  }
  const form = await request.formData();
  const signed = String(form.get("signed_request") ?? "");
  const data = parseSignedRequest(signed, secret);
  if (!data) {
    return Response.json({ error: "Invalid signed_request." }, { status: 400 });
  }

  const code = crypto.randomBytes(8).toString("hex");
  const userId = data.user_id ? String(data.user_id) : null;
  run(
    `INSERT INTO deletion_requests (id, platform, external_user_id, confirmation_code, status, created_at)
     VALUES (?, 'meta', ?, ?, 'received', ?)`,
    [uuid(), userId, code, new Date().toISOString()]
  );

  const base = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  return Response.json({
    url: `${base}/data-deletion?code=${encodeURIComponent(code)}`,
    confirmation_code: code,
  });
}

export async function GET() {
  return Response.json({ ok: true, service: "My Social Hub data deletion callback" });
}
