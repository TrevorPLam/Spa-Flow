import crypto from "crypto";
import { getEnv } from "./env";
import { logger } from "./logger";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Gets the Key Encryption Key (KEK) from environment configuration
 * The KEK is used to encrypt Data Encryption Keys (DEKs)
 *
 * @returns The KEK as a Buffer
 * @throws Error if ENCRYPTION_KEY is not 32 bytes (256 bits)
 */
function getKek(): Buffer {
  const key = getEnv().ENCRYPTION_KEY;
  const buf = Buffer.from(key, "base64");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be 32 bytes (256 bits) base64-encoded, got ${buf.length} bytes`);
  }
  return buf;
}

/**
 * Encrypts plaintext using AES-256-GCM with the provided key
 *
 * @param plaintext - The plaintext to encrypt
 * @param key - The encryption key (32 bytes for AES-256)
 * @returns Base64-encoded ciphertext with IV and auth tag
 */
function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]);
  return payload.toString("base64");
}

/**
 * Decrypts ciphertext using AES-256-GCM with the provided key
 *
 * @param ciphertext - Base64-encoded ciphertext with IV and auth tag
 * @param key - The decryption key (32 bytes for AES-256)
 * @returns The decrypted plaintext
 */
function decryptWithKey(ciphertext: string, key: Buffer): string {
  const payload = Buffer.from(ciphertext, "base64");
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/**
 * Represents an encrypted field with its encrypted Data Encryption Key
 */
export interface EncryptedField {
  /** Base64-encoded ciphertext (IV + auth tag + encrypted data) */
  ciphertext: string;
  /** Data Encryption Key (DEK) encrypted by KEK, base64-encoded */
  dek: string;
}

/**
 * Encrypts a field using envelope encryption pattern
 * Generates a random DEK, encrypts the plaintext with it, then encrypts the DEK with the KEK
 *
 * @param plaintext - The plaintext to encrypt
 * @returns Encrypted field with ciphertext and encrypted DEK
 */
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

/**
 * Decrypts a field using envelope encryption pattern
 * Decrypts the DEK with the KEK, then decrypts the ciphertext with the DEK
 *
 * @param ciphertext - Base64-encoded ciphertext
 * @param encryptedDek - Base64-encoded DEK encrypted by KEK
 * @returns The decrypted plaintext
 */
export function decryptField(ciphertext: string, encryptedDek: string): string {
  const kek = getKek();
  // Decrypt the DEK using the KEK
  const dekBase64 = decryptWithKey(encryptedDek, kek);
  const dek = Buffer.from(dekBase64, "base64");
  // Decrypt the plaintext with the DEK
  return decryptWithKey(ciphertext, dek);
}

/**
 * Safely decrypts a field, returning null on failure
 * Use this when decryption failures should not break the application flow
 *
 * @param ciphertext - Base64-encoded ciphertext (or null/undefined)
 * @param dek - Base64-encoded DEK encrypted by KEK (or null/undefined)
 * @returns The decrypted plaintext, or null if decryption fails or inputs are null
 */
export function maybeDecrypt(ciphertext: string | null | undefined, dek: string | null | undefined): string | null {
  if (!ciphertext || !dek) return null;
  try {
    return decryptField(ciphertext, dek);
  } catch (err) {
    logger.error({ err, ciphertextLength: ciphertext.length, dekLength: dek.length }, 'Decryption failed in maybeDecrypt');
    return null;
  }
}
