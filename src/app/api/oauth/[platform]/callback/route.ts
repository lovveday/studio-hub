import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { get } from "@/lib/db";
import { consumeOAuthState, completeOAuth, isOAuthPlatform } from "@/lib/oauth";
import type { SocialAccount } from "@/lib/types";

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

  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(providerError)}`, request.url)
    );
  }
  if (!state || !code) {
    return NextResponse.redirect(
      new URL("/settings?error=The+provider+did+not+return+a+code.", request.url)
    );
  }

  const stateRecord = consumeOAuthState(state, platform);
  if (!stateRecord) {
    return NextResponse.redirect(
      new URL("/settings?error=This+connection+link+expired+or+was+already+used.", request.url)
    );
  }

  // The user must be signed in to the same brand that started the flow.
  const brand = await getActiveBrand();
  if (brand.id !== stateRecord.brand_id) {
    return NextResponse.redirect(
      new URL("/settings?error=That+connection+belongs+to+another+brand.", request.url)
    );
  }

  try {
    const accounts = await completeOAuth({ platform, code, request, state: stateRecord });
    const names = accounts.map((account: SocialAccount) => account.account_name).join(", ");
    return NextResponse.redirect(
      new URL(
        `/settings?connected=${accounts.length}&accounts=${encodeURIComponent(names)}`,
        request.url
      )
    );
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(message)}`, request.url));
  }
}
