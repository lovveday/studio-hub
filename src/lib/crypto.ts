import crypto from "node:crypto";

const PREFIX = "v1";

function encryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw || raw.length < 16) {
    throw new Error(
      "APP_ENCRYPTION_KEY is not configured. Add a long random value to .env.local before connecting a real account."
    );
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function isEncryptionConfigured(): boolean {
  return Boolean(process.env.APP_ENCRYPTION_KEY);
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
