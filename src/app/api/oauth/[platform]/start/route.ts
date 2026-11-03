import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { run } from "@/lib/db";
import {
  buildAuthorizationUrl,
  createOAuthState,
  isOAuthPlatform,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const { platform } = await params;
  if (!isOAuthPlatform(platform)) {
    return NextResponse.redirect(new URL("/settings?error=Unknown+platform", request.url));
  }

  try {
    const brand = await getActiveBrand();
    const stateRecord = createOAuthState({ brandId: brand.id, platform });
    const built = buildAuthorizationUrl(platform, stateRecord.state, request);
    if (built.codeVerifier) {
      run("UPDATE oauth_states SET code_verifier = ? WHERE state = ?", [
        built.codeVerifier,
        stateRecord.state,
      ]);
    }
    return NextResponse.redirect(built.url);
  } catch (error) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent((error as Error).message)}`, request.url)
    );
  }
}
