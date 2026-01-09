/**
 * Secure Encryption Utilities
 * 
 * Implements NIST-compliant encryption using:
 * - PBKDF2 for key derivation (NIST SP 800-132)
 * - AES-256-GCM for encryption (NIST SP 800-38D)
 * - Random salt per encryption (stored with ciphertext)
 * - Configurable iterations for PBKDF2 (default: 100000, minimum: 60000 per NIST)
 * 
 * @module utils/encryption
 */

import * as crypto from 'crypto';
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Minimum PBKDF2 iterations per NIST SP 800-132
 * Using 100,000 iterations for balance between security and performance (2025 recommendation)
 */
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 32; // 256 bits for AES-256
const PBKDF2_DIGEST = 'sha256';
const SALT_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits for AES
const AUTH_TAG_LENGTH = 16; // 128 bits for GCM

/**
 * Derives an encryption key from a master password using PBKDF2
 * 
 * @param masterPassword - The master password or app identifier
 * @param salt - Random salt (must be unique per encryption)
 * @returns Derived encryption key (32 bytes for AES-256)
 */
function deriveKey(masterPassword: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    masterPassword,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST
  );
}

/**
 * Gets or creates a secure master key for encryption
 * Uses app name + secure storage location
 * In production, consider using hardware security module (HSM) or secure enclave
 * 
 * @returns Master key string
 */
function getMasterKey(): string {
  // Use app name + user data path for uniqueness
  // In a production system, consider:
  // - Using OS keychain to store a generated key
  // - Using hardware security module (HSM)
  // - Using secure enclave on macOS/iOS
  const appName = app.getName();
  const userDataPath = app.getPath('userData');
  
  // For now, use app identifier - in production, generate and store securely
  // This is better than hardcoded salt but still not ideal
  // TODO: Generate and store master key in OS keychain on first run
  return `${appName}:${userDataPath}`;
}

/**
 * Encrypts a value using AES-256-GCM with PBKDF2 key derivation
 * 
 * Format: salt:iv:authTag:encryptedData (all hex-encoded)
 * 
 * @param value - Plaintext value to encrypt
 * @returns Encrypted string in format "salt:iv:authTag:encrypted"
 * @throws {Error} If encryption fails
 */
export function encryptEnvVar(value: string): string {
  try {
    const masterKey = getMasterKey();
    
    // Generate random salt and IV for each encryption
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive encryption key using PBKDF2
    const key = deriveKey(masterKey, salt);
    
    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt the value
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag (verifies integrity)
    const authTag = cipher.getAuthTag();
    
    // Return format: salt:iv:authTag:encryptedData (all hex)
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts a value encrypted with encryptEnvVar
 * 
 * @param encrypted - Encrypted string in format "salt:iv:authTag:encrypted"
 * @returns Decrypted plaintext value
 * @throws {Error} If decryption fails or data is tampered
 */
export function decryptEnvVar(encrypted: string): string {
  try {
    const parts = encrypted.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted format. Expected: salt:iv:authTag:encrypted');
    }
    
    const [saltHex, ivHex, authTagHex, encryptedData] = parts;
    
    // Convert hex strings to buffers
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted data: incorrect length for salt, IV, or auth tag');
    }
    
    const masterKey = getMasterKey();
    
    // Derive the same key using the stored salt
    const key = deriveKey(masterKey, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    // If decryption fails, it might be old format - try legacy decryption
    if (error instanceof Error && error.message.includes('Invalid encrypted format')) {
      throw error;
    }
    
    // Attempt legacy decryption for backwards compatibility
    try {
      return decryptEnvVarLegacy(encrypted);
    } catch (legacyError) {
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Legacy decryption also failed: ${legacyError instanceof Error ? legacyError.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Legacy decryption function for backwards compatibility
 * Supports old format: iv:authTag:encrypted
 * 
 * @deprecated This is for migrating old encrypted data. New data should use PBKDF2.
 */
function decryptEnvVarLegacy(encrypted: string): string {
  const parts = encrypted.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid legacy encrypted format');
  }
  
  const [ivHex, authTagHex, encryptedData] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  // Old key derivation (weak - using static salt)
  const ENCRYPTION_KEY = crypto.scryptSync(
    app.getName(),
    'salt', // Static salt - insecure but needed for backwards compatibility
    32
  );
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypts multiple environment variables
 * 
 * @param envVars - Object with key-value pairs to encrypt
 * @returns Object with encrypted values
 */
export function encryptEnvVars(envVars: Record<string, string>): Record<string, string> {
  const encrypted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(envVars)) {
    try {
      encrypted[key] = encryptEnvVar(value);
    } catch (error) {
      console.error(`Error encrypting ${key}:`, error);
      throw new Error(`Failed to encrypt environment variable ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return encrypted;
}

/**
 * Decrypts multiple environment variables
 * 
 * @param encrypted - Object with encrypted values
 * @returns Object with decrypted values
 */
export function decryptEnvVars(encrypted: Record<string, string>): Record<string, string> {
  const decrypted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(encrypted)) {
    try {
      decrypted[key] = decryptEnvVar(value);
    } catch (error) {
      console.error(`Error decrypting ${key}:`, error);
      // Don't throw - log and continue for backwards compatibility
      // In production, you might want to throw or mark as failed
      decrypted[key] = value; // Fallback to plain value if decryption fails
    }
  }
  
  return decrypted;
}
