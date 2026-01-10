/**
 * DEPRECATED: This file is kept for backwards compatibility
 * 
 * For web-only deployments, use WebDeploymentService directly instead
 * @see src/services/WebDeploymentService.ts
 * 
 * WebDeploymentService calls platform APIs directly from the browser - no backend needed!
 */

// Re-export types for convenience
export type { DeployConfig as DeploymentConfig } from '../types/ipc';
export type { DeployResult as DeploymentResult } from '../types/ipc';

// This file is deprecated - use WebDeploymentService instead
// All deployments now happen directly from the browser using fetch()
