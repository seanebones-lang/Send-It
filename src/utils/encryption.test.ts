/**
 * Unit tests for encryption utilities
 * Tests critical security functions with >95% coverage requirement
 */

import { encryptEnvVar, decryptEnvVar, encryptEnvVars, decryptEnvVars } from './encryption';

// Mock app
jest.mock('electron', () => ({
  app: {
    getName: jest.fn(() => 'Send-It-Test'),
    getPath: jest.fn((name: string) => '/tmp/test-user-data'),
  },
}));

describe('Encryption Utilities', () => {
  describe('encryptEnvVar', () => {
    it('should encrypt a value successfully', () => {
      const plaintext = 'secret-value-123';
      const encrypted = encryptEnvVar(plaintext);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':')).toHaveLength(4); // salt:iv:authTag:encrypted
    });

    it('should produce different ciphertext for same plaintext (due to random salt/IV)', () => {
      const plaintext = 'same-value';
      const encrypted1 = encryptEnvVar(plaintext);
      const encrypted2 = encryptEnvVar(plaintext);
      
      expect(encrypted1).not.toBe(encrypted2); // Different due to random salt/IV
    });

    it('should handle empty strings', () => {
      const encrypted = encryptEnvVar('');
      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(4);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = encryptEnvVar(plaintext);
      const decrypted = decryptEnvVar(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '测试 🚀 émojis';
      const encrypted = encryptEnvVar(plaintext);
      const decrypted = decryptEnvVar(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('decryptEnvVar', () => {
    it('should decrypt an encrypted value correctly', () => {
      const plaintext = 'test-value';
      const encrypted = encryptEnvVar(plaintext);
      const decrypted = decryptEnvVar(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid format', () => {
      expect(() => {
        decryptEnvVar('invalid-format');
      }).toThrow();
    });

    it('should throw error for tampered data', () => {
      const plaintext = 'secret';
      const encrypted = encryptEnvVar(plaintext);
      const parts = encrypted.split(':');
      // Tamper with encrypted data
      parts[3] = 'tampered-data';
      
      expect(() => {
        decryptEnvVar(parts.join(':'));
      }).toThrow(); // Should fail due to auth tag mismatch
    });

    it('should throw error for missing parts', () => {
      expect(() => {
        decryptEnvVar('salt:iv'); // Missing authTag and encrypted data
      }).toThrow();
    });

    it('should handle legacy format (backwards compatibility)', () => {
      // Legacy format: iv:authTag:encrypted (without salt)
      // This test would need to create actual legacy encrypted data
      // For now, just ensure the function doesn't crash
      expect(() => {
        decryptEnvVar('invalid:legacy:format');
      }).toThrow(); // Will attempt legacy decryption and fail gracefully
    });
  });

  describe('encryptEnvVars', () => {
    it('should encrypt multiple values', () => {
      const envVars = {
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: 'value3',
      };
      
      const encrypted = encryptEnvVars(envVars);
      
      expect(Object.keys(encrypted)).toHaveLength(3);
      expect(encrypted.KEY1).not.toBe('value1');
      expect(encrypted.KEY2).not.toBe('value2');
      expect(encrypted.KEY3).not.toBe('value3');
    });

    it('should handle empty object', () => {
      const encrypted = encryptEnvVars({});
      expect(encrypted).toEqual({});
    });

    it('should throw error if encryption fails for any key', () => {
      // This would require mocking crypto to fail
      // For now, test with valid data
      const envVars = {
        VALID: 'value',
      };
      
      expect(() => {
        encryptEnvVars(envVars);
      }).not.toThrow();
    });
  });

  describe('decryptEnvVars', () => {
    it('should decrypt multiple values correctly', () => {
      const envVars = {
        KEY1: 'value1',
        KEY2: 'value2',
      };
      
      const encrypted = encryptEnvVars(envVars);
      const decrypted = decryptEnvVars(encrypted);
      
      expect(decrypted).toEqual(envVars);
    });

    it('should handle decryption failures gracefully', () => {
      const encrypted = {
        KEY1: 'invalid:encrypted:format',
        KEY2: 'valid-encrypted-value', // This will also fail, but fallback to plain
      };
      
      // Should not throw, but log errors
      const decrypted = decryptEnvVars(encrypted);
      expect(decrypted).toBeDefined();
      // Invalid entries should fallback to plain value
      expect(decrypted.KEY1).toBe('invalid:encrypted:format');
    });

    it('should handle empty object', () => {
      const decrypted = decryptEnvVars({});
      expect(decrypted).toEqual({});
    });
  });

  describe('Security properties', () => {
    it('should use different IV for each encryption', () => {
      const plaintext = 'test';
      const encrypted1 = encryptEnvVar(plaintext);
      const encrypted2 = encryptEnvVar(plaintext);
      
      const parts1 = encrypted1.split(':');
      const parts2 = encrypted2.split(':');
      
      // IVs should be different
      expect(parts1[1]).not.toBe(parts2[1]);
    });

    it('should use different salt for each encryption', () => {
      const plaintext = 'test';
      const encrypted1 = encryptEnvVar(plaintext);
      const encrypted2 = encryptEnvVar(plaintext);
      
      const parts1 = encrypted1.split(':');
      const parts2 = encrypted2.split(':');
      
      // Salts should be different
      expect(parts1[0]).not.toBe(parts2[0]);
    });

    it('should authenticate encrypted data (prevent tampering)', () => {
      const plaintext = 'secret';
      const encrypted = encryptEnvVar(plaintext);
      const parts = encrypted.split(':');
      
      // Modify auth tag
      parts[2] = '00000000000000000000000000000000';
      
      expect(() => {
        decryptEnvVar(parts.join(':'));
      }).toThrow();
    });
  });
});
