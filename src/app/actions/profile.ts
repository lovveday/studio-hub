"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { run } from "@/lib/db";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (name.length < 2) {
    redirect("/settings?error=Enter the name you want shown in the app.");
  }
  run("UPDATE users SET name = ? WHERE id = ?", [name, user.id]);
  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?profile=1");
}
