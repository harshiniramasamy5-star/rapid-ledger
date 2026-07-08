// crypto.ts — AES-256-GCM helpers for encrypting sensitive columns at rest (e.g. User.totpSecret).
import crypto from "crypto";

const ENC_PREFIX = "enc:v1:"; // marks a value as encrypted with this scheme — lets us detect legacy plaintext rows

// Derived via scrypt so TOTP_ENCRYPTION_KEY can be any passphrase string in Railway env vars
// (no need to generate/paste a raw 32-byte key). Dev fallback is intentionally obvious so it's
// never mistaken for a real production value.
const KEY_PASSPHRASE = process.env.TOTP_ENCRYPTION_KEY ?? "rapid-ledger-dev-encryption-key-CHANGE-IN-PRODUCTION";
const KEY = crypto.scryptSync(KEY_PASSPHRASE, "rapid-ledger-totp-salt-v1", 32);

/** Encrypts a plaintext secret for storage. Output is safe to store directly in a String column. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV, recommended size for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/**
 * Decrypts a value produced by encryptSecret. If the value doesn't have the encrypted
 * prefix, it's assumed to be a legacy plaintext secret (pre-migration) and returned as-is
 * so existing TOTP users aren't locked out mid-rollout. Run the backfill script to close
 * that window — see scripts/migrate-encrypt-totp-secrets.ts.
 */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  const raw = Buffer.from(stored.slice(ENC_PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(ENC_PREFIX);
}
