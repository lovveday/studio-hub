import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getBrand } from "@/lib/data";
import { refreshSocialApiProfile } from "@/lib/providers/socialapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const url = new URL(request.url);
  const brandId = url.searchParams.get("state") || url.searchParams.get("brand_id") || "";
  const brand = brandId ? getBrand(brandId) : undefined;
  if (!brand) {
    redirect("/settings?provider=error&providerMessage=SocialAPI+returned+an+unknown+brand.");
  }
  try {
    await refreshSocialApiProfile(brand.id);
    redirect("/settings?provider=connected&providerMessage=SocialAPI+accounts+refreshed.");
  } catch (error) {
    redirect(`/settings?provider=error&providerMessage=${encodeURIComponent((error as Error).message)}`);
  }
}
