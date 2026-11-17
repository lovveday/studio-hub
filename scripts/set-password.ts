import "./load-env";
import { get, run } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

const email = String(process.argv[2] ?? "").trim().toLowerCase();
const password = String(process.argv[3] ?? "");

if (!email || password.length < 10) {
  console.error(
    "Usage: npm run passwd -- <email> <new-password>\nThe password must be at least 10 characters."
  );
  process.exit(1);
}

const user = get<{ id: string; email: string }>(
  "SELECT id, email FROM users WHERE lower(email) = ?",
  [email]
);
if (!user) {
  console.error(`No user found for ${email}.`);
  process.exit(1);
}

run("UPDATE users SET password_hash = ? WHERE id = ?", [hashPassword(password), user.id]);
console.log(`Password updated for ${user.email}.`);
