"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { get, run } from "@/lib/db";
import { requireUser, canManageBrand } from "@/lib/auth";
import { getActiveBrand, BRAND_COOKIE } from "@/lib/brand-context";
import { getBrand, getBrandProfile, logActivity } from "@/lib/data";
import { hashPassword, uuid } from "@/lib/password";

function linesToJson(value: string): string {
  return JSON.stringify(
    value
      .split(/\n|,/)
      .map((line) => line.trim())
      .filter(Boolean)
  );
}

export async function switchBrandAction(formData: FormData) {
  const user = await requireUser();
  const brandId = String(formData.get("brandId") ?? "");
  const brand = getBrand(brandId);
  if (!brand) redirect("/dashboard");
  const store = await cookies();
  store.set(BRAND_COOKIE, brandId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  logActivity({ brandId, userId: user.id, action: "Switched brand", entity: "brand", entityId: brandId });
  revalidatePath("/", "layout");
  redirect(String(formData.get("next") ?? "/dashboard"));
}

export async function createBrandAction(formData: FormData) {
  const user = await requireUser();
  if (!canManageBrand(user)) redirect("/settings?error=Only owners and managers can create brands.");
  const name = String(formData.get("name") ?? "").trim();
  const handle = String(formData.get("handle") ?? "").trim();
  const niche = String(formData.get("niche") ?? "").trim();
  const color = String(formData.get("color") ?? "#FF5A36");
  if (!name) redirect("/settings?error=Brand name is required.");

  const id = `brand-${uuid().slice(0, 8)}`;
  const now = new Date().toISOString();
  run(
    `INSERT INTO brands (id, name, handle, niche, timezone, color, created_at, created_by)
     VALUES (?, ?, ?, ?, 'Africa/Lagos', ?, ?, ?)`,
    [id, name, handle || `@${name.toLowerCase().replace(/\s+/g, "")}`, niche || "New brand", color, now, user.id]
  );
  run(
    `INSERT INTO brand_profiles
     (brand_id, tone, audience, pillars, offers, banned_claims, hashtags, ctas, competitors, notes, updated_at)
     VALUES (?, '', '', '[]', '', '', '', '', '', '', ?)`,
    [id, now]
  );
  const store = await cookies();
  store.set(BRAND_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  logActivity({ brandId: id, userId: user.id, action: "Created brand", entity: "brand", entityId: id, detail: name });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function updateBrandProfileAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  if (!canManageBrand(user)) redirect("/settings?error=You do not have permission to edit this brand.");
  const existing = getBrandProfile(brand.id);
  const now = new Date().toISOString();
  const values = {
    tone: String(formData.get("tone") ?? ""),
    audience: String(formData.get("audience") ?? ""),
    pillars: linesToJson(String(formData.get("pillars") ?? "")),
    offers: String(formData.get("offers") ?? ""),
    banned_claims: String(formData.get("bannedClaims") ?? ""),
    hashtags: String(formData.get("hashtags") ?? ""),
    ctas: String(formData.get("ctas") ?? ""),
    competitors: String(formData.get("competitors") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
  if (existing) {
    run(
      `UPDATE brand_profiles SET tone=?, audience=?, pillars=?, offers=?, banned_claims=?, hashtags=?, ctas=?, competitors=?, notes=?, updated_at=? WHERE brand_id=?`,
      [
        values.tone,
        values.audience,
        values.pillars,
        values.offers,
        values.banned_claims,
        values.hashtags,
        values.ctas,
        values.competitors,
        values.notes,
        now,
        brand.id,
      ]
    );
  } else {
    run(
      `INSERT INTO brand_profiles (brand_id, tone, audience, pillars, offers, banned_claims, hashtags, ctas, competitors, notes, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        brand.id,
        values.tone,
        values.audience,
        values.pillars,
        values.offers,
        values.banned_claims,
        values.hashtags,
        values.ctas,
        values.competitors,
        values.notes,
        now,
      ]
    );
  }
  logActivity({ brandId: brand.id, userId: user.id, action: "Updated brand profile", entity: "brand", entityId: brand.id });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function inviteUserAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/settings?error=Only the owner can add teammates.");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "editor");
  const password = String(formData.get("password") ?? "password123");
  if (!name || !email) redirect("/settings?error=Name and email are required.");
  const exists = get<{ id: string }>("SELECT id FROM users WHERE lower(email) = ?", [email]);
  if (exists) redirect("/settings?error=That email already has an account.");
  run(
    `INSERT INTO users (id, name, email, password_hash, role, avatar_color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), name, email, hashPassword(password), role, "#0FA3A3", new Date().toISOString()]
  );
  logActivity({ userId: user.id, action: "Added teammate", entity: "user", detail: `${name} (${role})` });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function updateBrandBasicsAction(formData: FormData) {
  const user = await requireUser();
  const brand = await getActiveBrand();
  if (!canManageBrand(user)) redirect("/settings?error=You do not have permission.");
  const name = String(formData.get("name") ?? brand.name).trim();
  const handle = String(formData.get("handle") ?? brand.handle).trim();
  const niche = String(formData.get("niche") ?? brand.niche).trim();
  const color = String(formData.get("color") ?? brand.color);
  run("UPDATE brands SET name=?, handle=?, niche=?, color=? WHERE id=?", [
    name,
    handle,
    niche,
    color,
    brand.id,
  ]);
  logActivity({ brandId: brand.id, userId: user.id, action: "Updated brand", entity: "brand", entityId: brand.id });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  redirect("/settings?saved=1");
}
