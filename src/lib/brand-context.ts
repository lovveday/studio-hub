import { cookies } from "next/headers";
import { resolveActiveBrand } from "./data";
import type { Brand } from "./types";

export const BRAND_COOKIE = "smh_brand";

export async function getActiveBrand(): Promise<Brand> {
  const store = await cookies();
  const brand = resolveActiveBrand(store.get(BRAND_COOKIE)?.value);
  if (!brand) {
    throw new Error("No brand exists yet. Create a brand first.");
  }
  return brand;
}
