import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PREFIX = "v1";
const KEY_FILE = path.join(process.cwd(), "data", ".app-key");

function keyFileValue(): string {
  try {
    if (!fs.existsSync(KEY_FILE)) return "";
    return fs.readFileSync(KEY_FILE, "utf8").trim();
  } catch {
    return "";
  }
}

function encryptionKey(): Buffer {
  const envKey = process.env.APP_ENCRYPTION_KEY;
  if (envKey && envKey.length >= 16) {
    return crypto.createHash("sha256").update(envKey).digest();
  }

  let raw = keyFileValue();
  if (!raw) {
    fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
    raw = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(KEY_FILE, `${raw}\n`, { mode: 0o600 });
  }
  if (raw.length < 16) {
    throw new Error("The local app encryption key is invalid. Replace data/.app-key.");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.APP_ENCRYPTION_KEY) || Boolean(keyFileValue());
}

export function encryptSecret(value: string): string {
  if (!value) return "";
  const key = encryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(
    ":"
  );
}

export function decryptSecret(value: string | null | undefined): string {
  if (!value) return "";
  const [prefix, ivRaw, tagRaw, dataRaw] = value.split(":");
  if (prefix !== PREFIX || !ivRaw || !tagRaw || !dataRaw) {
    throw new Error("Stored token has an unsupported format.");
  }
  const key = encryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, "base64url")), decipher.final()]).toString(
    "utf8"
  );
}
