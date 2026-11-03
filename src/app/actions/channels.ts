"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import { deleteSocialAccount } from "@/lib/oauth";
import { logActivity } from "@/lib/data";

export async function disconnectChannelAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  const id = String(formData.get("accountId") ?? "");
  const deleted = deleteSocialAccount(id, brand.id);
  logActivity({
    brandId: brand.id,
    userId: user.id,
    action: deleted ? "Disconnected channel" : "Disconnect skipped",
    entity: "social_account",
    entityId: id,
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?disconnected=1");
}
