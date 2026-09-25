import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

class EncryptionConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionConfigurationError";
  }
}

function getEncryptionKey(): Buffer {
  const raw = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new EncryptionConfigurationError(
      "SOCIAL_TOKEN_ENCRYPTION_KEY is not configured."
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new EncryptionConfigurationError(
      "SOCIAL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key."
    );
  }

  return key;
}

export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSecret(payload: string): string {
  const key = getEncryptionKey();
  const buffer = Buffer.from(payload, "base64url");
  const iv = buffer.subarray(0, IV_LENGTH);
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function signPayload(payload: string): string {
  const key = getEncryptionKey();
  const signature = createHmac("sha256", key)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySignedPayload(signed: string): string | null {
  const separator = signed.lastIndexOf(".");
  if (separator === -1) return null;

  const payload = signed.slice(0, separator);
  const signature = signed.slice(separator + 1);
  const key = getEncryptionKey();
  const expected = createHmac("sha256", key)
    .update(payload)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  return payload;
}

export { EncryptionConfigurationError };
