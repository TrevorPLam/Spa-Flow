// @ts-nocheck
import crypto from "crypto";
import { getEnv } from "./env";
import { logger } from "./logger";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKek(): Buffer {
  const key = getEnv().ENCRYPTION_KEY;
  const buf = Buffer.from(key, "base64");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be 32 bytes (256 bits) base64-encoded, got ${buf.length} bytes`);
  }
  return buf;
}

function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]);
  return payload.toString("base64");
}

function decryptWithKey(ciphertext: string, key: Buffer): string {
  const payload = Buffer.from(ciphertext, "base64");
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export interface EncryptedField {
  ciphertext: string;
  dek: string; // DEK encrypted by KEK, base64
}

export function encryptField(plaintext: string): EncryptedField {
  const kek = getKek();
  // Generate a random DEK for this field
  const dek = crypto.randomBytes(KEY_LENGTH);
  // Encrypt the plaintext with the DEK
  const ciphertext = encryptWithKey(plaintext, dek);
  // Encrypt the DEK with the KEK
  const encryptedDek = encryptWithKey(dek.toString("base64"), kek);
  return { ciphertext, dek: encryptedDek };
}

export function decryptField(ciphertext: string, encryptedDek: string): string {
  const kek = getKek();
  // Decrypt the DEK using the KEK
  const dekBase64 = decryptWithKey(encryptedDek, kek);
  const dek = Buffer.from(dekBase64, "base64");
  // Decrypt the plaintext with the DEK
  return decryptWithKey(ciphertext, dek);
}

export function maybeDecrypt(ciphertext: string | null | undefined, dek: string | null | undefined): string | null {
  if (!ciphertext || !dek) return null;
  try {
    return decryptField(ciphertext, dek);
  } catch (err) {
    logger.error({ err, ciphertextLength: ciphertext.length, dekLength: dek.length }, 'Decryption failed in maybeDecrypt');
    return null;
  }
}
