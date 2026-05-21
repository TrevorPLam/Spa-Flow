import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  encryptField,
  decryptField,
  maybeDecrypt,
} from './encryption';

describe('encryption', { tags: ['regression'] }, () => {
  const validKey = Buffer.alloc(32, 'a').toString('base64');

  beforeEach(() => {
    vi.stubEnv('ENCRYPTION_KEY', validKey);
  });

  describe('encryptField', () => {
    it('should encrypt a plaintext string', () => {
      const plaintext = 'Hello, World!';
      const result = encryptField(plaintext);
      
      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('dek');
      expect(result.ciphertext).toBeTypeOf('string');
      expect(result.dek).toBeTypeOf('string');
      expect(result.ciphertext).not.toBe(plaintext);
    });

    it('should encrypt empty string', () => {
      const plaintext = '';
      const result = encryptField(plaintext);
      
      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('dek');
    });

    it('should encrypt special characters', () => {
      const plaintext = 'Special: !@#$%^&*()[]{}|\\:";\'<>?,./';
      const result = encryptField(plaintext);
      
      expect(result.ciphertext).not.toBe(plaintext);
    });

    it('should encrypt unicode characters', () => {
      const plaintext = 'Unicode: 你好世界 🌍';
      const result = encryptField(plaintext);
      
      expect(result.ciphertext).not.toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Test message';
      const result1 = encryptField(plaintext);
      const result2 = encryptField(plaintext);
      
      expect(result1.ciphertext).not.toBe(result2.ciphertext);
      expect(result1.dek).not.toBe(result2.dek);
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      vi.stubEnv('ENCRYPTION_KEY', '');
      
      expect(() => encryptField('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('should throw error when ENCRYPTION_KEY is invalid length', () => {
      vi.stubEnv('ENCRYPTION_KEY', Buffer.alloc(16, 'a').toString('base64'));
      
      expect(() => encryptField('test')).toThrow('ENCRYPTION_KEY must be 32 bytes');
    });
  });

  describe('decryptField', () => {
    it('should decrypt a previously encrypted field', () => {
      const plaintext = 'Secret message';
      const encrypted = encryptField(plaintext);
      const decrypted = decryptField(encrypted.ciphertext, encrypted.dek);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt empty string', () => {
      const plaintext = '';
      const encrypted = encryptField(plaintext);
      const decrypted = decryptField(encrypted.ciphertext, encrypted.dek);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt special characters', () => {
      const plaintext = 'Special: !@#$%^&*()[]{}|\\:";\'<>?,./';
      const encrypted = encryptField(plaintext);
      const decrypted = decryptField(encrypted.ciphertext, encrypted.dek);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt unicode characters', () => {
      const plaintext = 'Unicode: 你好世界 🌍';
      const encrypted = encryptField(plaintext);
      const decrypted = decryptField(encrypted.ciphertext, encrypted.dek);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error when ciphertext is invalid', () => {
      expect(() => decryptField('invalid', 'invalid')).toThrow();
    });

    it('should throw error when DEK is invalid', () => {
      const plaintext = 'test';
      const encrypted = encryptField(plaintext);
      
      expect(() => decryptField(encrypted.ciphertext, 'invalid')).toThrow();
    });

    it('should throw error when ENCRYPTION_KEY is not set', () => {
      vi.stubEnv('ENCRYPTION_KEY', '');
      
      expect(() => encryptField('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });
  });

  describe('maybeDecrypt', () => {
    it('should decrypt valid ciphertext and DEK', () => {
      const plaintext = 'Secret message';
      const encrypted = encryptField(plaintext);
      const decrypted = maybeDecrypt(encrypted.ciphertext, encrypted.dek);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should return null when ciphertext is null', () => {
      const result = maybeDecrypt(null, 'valid');
      expect(result).toBeNull();
    });

    it('should return null when ciphertext is undefined', () => {
      const result = maybeDecrypt(undefined, 'valid');
      expect(result).toBeNull();
    });

    it('should return null when DEK is null', () => {
      const result = maybeDecrypt('valid', null);
      expect(result).toBeNull();
    });

    it('should return null when DEK is undefined', () => {
      const result = maybeDecrypt('valid', undefined);
      expect(result).toBeNull();
    });

    it('should return null when both are null', () => {
      const result = maybeDecrypt(null, null);
      expect(result).toBeNull();
    });

    it('should return null when decryption fails', () => {
      const result = maybeDecrypt('invalid', 'invalid');
      expect(result).toBeNull();
    });

    it('should return null when ciphertext is empty string', () => {
      const result = maybeDecrypt('', 'valid');
      expect(result).toBeNull();
    });
  });

  describe('round-trip encryption/decryption', () => {
    it('should handle multiple encryption/decryption cycles', () => {
      const plaintext = 'Test message';
      
      let current = plaintext;
      for (let i = 0; i < 5; i++) {
        const encrypted = encryptField(current);
        current = decryptField(encrypted.ciphertext, encrypted.dek);
      }
      
      expect(current).toBe(plaintext);
    });

    it('should handle long text', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encryptField(plaintext);
      const decrypted = decryptField(encrypted.ciphertext, encrypted.dek);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle newlines and whitespace', () => {
      const plaintext = 'Line 1\nLine 2\r\nLine 3\tTabbed';
      const encrypted = encryptField(plaintext);
      const decrypted = decryptField(encrypted.ciphertext, encrypted.dek);
      
      expect(decrypted).toBe(plaintext);
    });
  });
});
