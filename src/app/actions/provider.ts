"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, canManageBrand } from "@/lib/auth";
import { getActiveBrand } from "@/lib/brand-context";
import {
  UploadPostError,
  createRemoteProfile,
  deleteProviderProfile,
  fetchRemoteProfile,
  generateConnectUrl,
  providerProfileForBrand,
  saveProviderProfile,
  uploadPostConfigured,
} from "@/lib/providers/uploadpost";

function settingsRedirect(message: string, tone: "saved" | "error" | "removed" | "refreshed"): never {
  redirect(`/settings?provider=${tone}&providerMessage=${encodeURIComponent(message)}`);
}

export async function connectProviderProfileAction(formData: FormData) {
  const user = await requireUser();
  if (!canManageBrand(user)) redirect("/settings?provider=error&providerMessage=Only+owners+and+managers+can+connect+publishing.");
  const brand = await getActiveBrand();
  if (!uploadPostConfigured()) {
    settingsRedirect("Add UPLOADPOST_API_KEY to .env.local first.", "error");
  }
  const username = String(formData.get("username") ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_@-]/g, "-")
    .slice(0, 80);
  const displayName = String(formData.get("displayName") ?? brand.name).trim().slice(0, 100);
  if (!username) settingsRedirect("Choose a profile username first.", "error");

  let remote;
  try {
    remote = await createRemoteProfile(username, displayName || brand.name);
  } catch (error) {
    if (error instanceof UploadPostError && error.status === 409) {
      try {
        remote = await fetchRemoteProfile(username);
      } catch (fetchError) {
        settingsRedirect((fetchError as Error).message, "error");
      }
    } else {
      const message =
        error instanceof UploadPostError && error.code === "PROFILE_LIMIT_REACHED"
          ? "The free plan allows 2 Upload-Post profiles. Use one of the existing profiles or upgrade the plan."
          : (error as Error).message;
      settingsRedirect(message, "error");
    }
  }

  if (!remote) {
    settingsRedirect("Could not create or read that Upload-Post profile.", "error");
    throw new Error("Upload-Post profile unavailable.");
  }

  try {
    saveProviderProfile({
      brandId: brand.id,
      username,
      displayName: displayName || remote.displayName || username,
      connectedPlatforms: remote.connectedPlatforms,
      status: remote.needsReconnect ? "needs_reconnect" : "connected",
    });
  } catch {
    settingsRedirect(
      "That Upload-Post profile is already mapped to another brand. Use a different profile username.",
      "error"
    );
  }

  let accessUrl: string | null = null;
  try {
    accessUrl = await generateConnectUrl(username);
  } catch (error) {
    settingsRedirect((error as Error).message, "error");
  }
  if (!accessUrl) settingsRedirect("Upload-Post did not return a connect URL.", "error");
  revalidatePath("/settings");
  redirect(accessUrl);
}

export async function refreshProviderProfileAction() {
  await requireUser();
  const brand = await getActiveBrand();
  const profile = providerProfileForBrand(brand.id);
  if (!profile) {
    settingsRedirect("Connect an Upload-Post profile first.", "error");
    throw new Error("No provider profile.");
  }
  try {
    const remote = await fetchRemoteProfile(profile.profile_username);
    saveProviderProfile({
      brandId: brand.id,
      username: remote.username || profile.profile_username,
      displayName: remote.displayName || profile.display_name,
      connectedPlatforms: remote.connectedPlatforms,
      status: remote.needsReconnect ? "needs_reconnect" : "connected",
    });
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    settingsRedirect(
      remote.connectedPlatforms.length
        ? `Connected: ${remote.connectedPlatforms.join(", ")}.`
        : "Profile found, but no social accounts are connected yet.",
      "refreshed"
    );
  } catch (error) {
    settingsRedirect((error as Error).message, "error");
  }
}

export async function removeProviderProfileAction() {
  await requireUser();
  const brand = await getActiveBrand();
  deleteProviderProfile(brand.id);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  settingsRedirect("Upload-Post removed from this brand. The remote profile was not deleted.", "removed");
}
