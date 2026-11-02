import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { get, run } from "./db";
import { randomToken } from "./password";
import type { User } from "./types";

export const SESSION_COOKIE = "smh_session";
const SESSION_DAYS = 30;

export async function createSession(userId: string) {
  const token = randomToken(32);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  run("DELETE FROM sessions WHERE expires_at < ?", [now.toISOString()]);
  run(
    "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [token, userId, expires.toISOString(), now.toISOString()]
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    run("DELETE FROM sessions WHERE id = ?", [token]);
  }
  store.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | undefined> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return undefined;
  const user = get<User>(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ?`,
    [token, new Date().toISOString()]
  );
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export function canManageBrand(user: User): boolean {
  return user.role === "owner" || user.role === "manager";
}

export function canApprove(user: User): boolean {
  return user.role === "owner" || user.role === "manager";
}
