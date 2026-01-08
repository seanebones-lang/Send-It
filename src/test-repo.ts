/**
 * Test script for repo cloning and framework analysis
 * This can be called from the main process or used as a reference
 */

import { app } from 'electron';
import * as path from 'path';

// Example test function - can be called via IPC or directly
export async function testRepoAnalysis() {
  const testRepoUrl = 'https://github.com/vercel/next.js.git';
  const testRepoPath = path.join(app.getPath('userData'), 'repos', 'nextjs-test');

  try {
    // Import handlers (these would normally be in the main process)
    // For testing, you can call the IPC handlers directly
    console.log('Testing repo cloning and analysis...');
    console.log('Repo URL:', testRepoUrl);
    console.log('Target path:', testRepoPath);

    // In a real scenario, these would be called via IPC from the renderer
    // For now, this serves as documentation of the expected flow:
    // 1. window.electronAPI.repo.clone(testRepoUrl)
    // 2. window.electronAPI.repo.analyzeFramework(testRepoPath, testRepoUrl)

    return {
      message: 'Test setup complete. Use IPC handlers from renderer process.',
      exampleUsage: {
        clone: 'window.electronAPI.repo.clone("https://github.com/vercel/next.js.git")',
        analyze: 'window.electronAPI.repo.analyzeFramework(repoPath, repoUrl)',
      },
    };
  } catch (error) {
    console.error('Test error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
