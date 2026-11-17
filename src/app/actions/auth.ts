"use server";

import { redirect } from "next/navigation";
import { get } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { demoLoginEnabled, createSession, destroySession } from "@/lib/auth";
import type { User } from "@/lib/types";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    redirect("/login?error=Enter your email and password.");
  }
  const user = get<User>("SELECT * FROM users WHERE lower(email) = ?", [email]);
  if (!user || !verifyPassword(password, user.password_hash)) {
    redirect("/login?error=That email and password do not match.");
  }
  await createSession(user.id);
  redirect("/dashboard");
}

export async function demoLoginAction() {
  if (!demoLoginEnabled()) redirect("/login?error=Demo login is disabled on this deployment.");
  const user = get<User>("SELECT * FROM users WHERE email = ?", ["owner@studio.local"]);
  if (!user) redirect("/login?error=Demo account is missing.");
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
