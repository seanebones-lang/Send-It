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
import * as keytar from 'keytar';

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

const SERVICE_NAME = 'send-it';
const MASTER_KEY_ACCOUNT = 'encryption-master-key';

/**
 * Gets or creates a secure master key for encryption
 * Stores master key in OS keychain for security
 * Falls back to legacy method for backwards compatibility
 * 
 * @returns Master key string
 */
async function getMasterKey(): Promise<string> {
  try {
    // Try to get master key from OS keychain
    let masterKey = await keytar.getPassword(SERVICE_NAME, MASTER_KEY_ACCOUNT);
    
    if (!masterKey) {
      // Generate new secure random master key (256 bits)
      masterKey = crypto.randomBytes(32).toString('hex');
      
      // Store in OS keychain
      try {
        await keytar.setPassword(SERVICE_NAME, MASTER_KEY_ACCOUNT, masterKey);
      } catch (keychainError) {
        // If keychain fails, fall back to legacy method
        console.warn('Failed to store master key in keychain, using legacy method:', keychainError);
        return getMasterKeyLegacy();
      }
    }
    
    return masterKey;
  } catch (error) {
    // If keychain access fails, fall back to legacy method
    console.warn('Keychain access failed, using legacy master key method:', error);
    return getMasterKeyLegacy();
  }
}

/**
 * Legacy master key derivation (for backwards compatibility)
 * Uses app name + user data path
 * 
 * @returns Legacy master key string
 */
function getMasterKeyLegacy(): string {
  const appName = app.getName();
  const userDataPath = app.getPath('userData');
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
export async function encryptEnvVar(value: string): Promise<string> {
  try {
    const masterKey = await getMasterKey();
    
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
export async function decryptEnvVar(encrypted: string): Promise<string> {
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
    
    const masterKey = await getMasterKey();
    
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
      return await decryptEnvVarLegacy(encrypted);
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
async function decryptEnvVarLegacy(encrypted: string): Promise<string> {
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
export async function encryptEnvVars(envVars: Record<string, string>): Promise<Record<string, string>> {
  const encrypted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(envVars)) {
    try {
      encrypted[key] = await encryptEnvVar(value);
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
export async function decryptEnvVars(encrypted: Record<string, string>): Promise<Record<string, string>> {
  const decrypted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(encrypted)) {
    try {
      decrypted[key] = await decryptEnvVar(value);
    } catch (error) {
      console.error(`Error decrypting ${key}:`, error);
      // Don't throw - log and continue for backwards compatibility
      // In production, you might want to throw or mark as failed
      decrypted[key] = value; // Fallback to plain value if decryption fails
    }
  }
  
  return decrypted;
}
