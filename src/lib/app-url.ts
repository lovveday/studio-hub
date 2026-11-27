import { getSetting } from "./data";

export function getAppUrl(): string {
  const stored = (getSetting("app.public_url", "") || "").trim();
  if (stored) return stored.replace(/\/$/, "");
  const env = (process.env.APP_URL || "").trim();
  if (env) return env.replace(/\/$/, "");
  return "http://localhost:3000";
}
