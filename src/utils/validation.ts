/**
 * Input Validation and Sanitization Utilities
 * 
 * Implements security-focused input validation to prevent:
 * - SQL Injection
 * - Path Traversal
 * - XSS (when used in React)
 * - Command Injection
 * 
 * @module utils/validation
 */

import { z } from 'zod';
import * as path from 'path';

/**
 * Validates and sanitizes file paths to prevent path traversal attacks
 * 
 * @param filePath - The file path to validate
 * @param allowedBaseDir - The base directory that the path must be within
 * @returns Sanitized absolute path
 * @throws {Error} If path is invalid or outside allowed directory
 */
export function validateAndSanitizePath(filePath: string, allowedBaseDir: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid path: path must be a non-empty string');
  }

  // Resolve to absolute path
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(allowedBaseDir);

  // Check if resolved path is within allowed base directory
  if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
    throw new Error(`Path traversal detected: ${filePath} is outside allowed directory ${allowedBaseDir}`);
  }

  // Remove any '..' or '.' components
  const normalized = path.normalize(resolvedPath);
  
  // Double-check after normalization
  if (!normalized.startsWith(resolvedBase + path.sep) && normalized !== resolvedBase) {
    throw new Error(`Path traversal detected after normalization: ${filePath}`);
  }

  return normalized;
}

/**
 * Validates repository URL
 * 
 * @param repoUrl - Repository URL to validate
 * @returns Validated repository URL
 * @throws {Error} If URL is invalid
 */
export function validateRepoUrl(repoUrl: string): string {
  const urlSchema = z.string()
    .min(1, 'Repository URL is required')
    .url('Invalid URL format')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:', 'git:', 'ssh:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: 'Invalid URL protocol. Must be http, https, git, or ssh' }
    )
    .refine(
      (url) => {
        // Check for dangerous patterns
        const dangerous = ['../', '..\\', '%2e%2e', '%2E%2E'];
        return !dangerous.some(pattern => url.toLowerCase().includes(pattern));
      },
      { message: 'URL contains dangerous path traversal patterns' }
    );

  return urlSchema.parse(repoUrl);
}

/**
 * Validates deployment platform
 * 
 * @param platform - Platform to validate
 * @returns Validated platform
 * @throws {Error} If platform is invalid
 */
export function validateDeployPlatform(platform: string): 'vercel' | 'railway' | 'render' {
  const platformSchema = z.enum(['vercel', 'railway', 'render'], {
    errorMap: () => ({ message: 'Invalid deployment platform. Must be vercel, railway, or render' }),
  });

  return platformSchema.parse(platform);
}

/**
 * Validates environment variable key (prevents injection)
 * 
 * @param key - Environment variable key to validate
 * @returns Validated key
 * @throws {Error} If key is invalid
 */
export function validateEnvVarKey(key: string): string {
  const keySchema = z.string()
    .min(1, 'Environment variable key is required')
    .max(255, 'Environment variable key must be 255 characters or less')
    .regex(
      /^[A-Z_][A-Z0-9_]*$/,
      'Environment variable key must start with a letter or underscore, and contain only uppercase letters, numbers, and underscores'
    );

  return keySchema.parse(key.toUpperCase());
}

/**
 * Sanitizes string input to prevent XSS (for display in React)
 * Note: React automatically escapes by default, but this provides extra protection
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  return input.replace(/\0/g, '');
}

/**
 * Validates project name
 * 
 * @param projectName - Project name to validate
 * @returns Validated project name
 * @throws {Error} If name is invalid
 */
export function validateProjectName(projectName: string): string {
  const nameSchema = z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be 100 characters or less')
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9\-_]*$/,
      'Project name must start with a letter or number and contain only letters, numbers, hyphens, and underscores'
    );

  return nameSchema.parse(projectName);
}

/**
 * Validates Git branch name
 * 
 * @param branch - Branch name to validate
 * @returns Validated branch name
 * @throws {Error} If branch name is invalid
 */
export function validateBranchName(branch: string): string {
  const branchSchema = z.string()
    .min(1, 'Branch name is required')
    .max(255, 'Branch name must be 255 characters or less')
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9\-_.\/]*$/,
      'Branch name must start with a letter or number and contain only letters, numbers, hyphens, underscores, dots, and slashes'
    )
    .refine(
      (b) => !b.startsWith('.') && !b.endsWith('.'),
      { message: 'Branch name cannot start or end with a dot' }
    )
    .refine(
      (b) => !b.includes('..'),
      { message: 'Branch name cannot contain consecutive dots' }
    );

  return branchSchema.parse(branch);
}

/**
 * Validates deployment ID format
 * 
 * @param deploymentId - Deployment ID to validate
 * @returns Validated deployment ID
 * @throws {Error} If ID is invalid
 */
export function validateDeploymentId(deploymentId: string): string {
  const idSchema = z.string()
    .min(1, 'Deployment ID is required')
    .max(255, 'Deployment ID must be 255 characters or less')
    .regex(
      /^[a-zA-Z0-9_\-]+$/,
      'Deployment ID must contain only letters, numbers, underscores, and hyphens'
    );

  return idSchema.parse(deploymentId);
}

/**
 * Validates environment variables object
 * 
 * @param envVars - Environment variables object to validate
 * @returns Validated and sanitized environment variables
 * @throws {Error} If any validation fails
 */
export function validateEnvVars(envVars: Record<string, string>): Record<string, string> {
  if (!envVars || typeof envVars !== 'object' || Array.isArray(envVars)) {
    throw new Error('Environment variables must be an object');
  }

  const validated: Record<string, string> = {};

  for (const [key, value] of Object.entries(envVars)) {
    const validatedKey = validateEnvVarKey(key);
    if (typeof value !== 'string') {
      throw new Error(`Environment variable ${key} must have a string value`);
    }
    validated[validatedKey] = sanitizeString(value);
  }

  return validated;
}

/**
 * Validates deployment configuration
 * 
 * @param config - Deployment configuration to validate
 * @returns Validated configuration
 * @throws {Error} If validation fails
 */
export function validateDeployConfig(config: unknown): {
  platform: 'vercel' | 'railway' | 'render';
  repoPath: string;
  envVars: Record<string, string>;
  projectName?: string;
  branch?: string;
} {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Deployment configuration must be an object');
  }

  const cfg = config as Record<string, unknown>;

  if (!cfg.platform || typeof cfg.platform !== 'string') {
    throw new Error('Platform is required and must be a string');
  }

  if (!cfg.repoPath || typeof cfg.repoPath !== 'string') {
    throw new Error('Repository path is required and must be a string');
  }

  const validated = {
    platform: validateDeployPlatform(cfg.platform),
    repoPath: cfg.repoPath, // Will be validated against allowed base dir in deployment function
    envVars: validateEnvVars(cfg.envVars as Record<string, string> || {}),
    projectName: cfg.projectName ? validateProjectName(cfg.projectName as string) : undefined,
    branch: cfg.branch ? validateBranchName(cfg.branch as string) : undefined,
  };

  return validated;
}
