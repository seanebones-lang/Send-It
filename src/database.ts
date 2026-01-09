import sqlite3 from 'sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { promisify } from 'util';
import * as fs from 'fs';

export interface FrameworkAnalysis {
  id?: number;
  repoUrl: string;
  repoPath: string;
  framework: string;
  scores: string; // JSON string of Record<AnalysisPlatform, number>
  analyzedAt: string;
}

import type { AnalysisPlatform } from './types/ipc';

export class Database {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPathOverride?: string) {
    // Use provided path or get from app
    if (dbPathOverride) {
      this.dbPath = dbPathOverride;
    } else {
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      this.dbPath = path.join(userDataPath, 'send-it.db');
    }
    this.initialize();
  }

  private initialize(): void {
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        this.initializeTables();
      }
    });
  }

  private initializeTables(): void {
    if (!this.db) return;
    const run = promisify(this.db.run.bind(this.db));
    
    run(`
      CREATE TABLE IF NOT EXISTS framework_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_url TEXT NOT NULL,
        repo_path TEXT NOT NULL,
        framework TEXT NOT NULL,
        scores TEXT NOT NULL,
        analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).catch((err) => {
      console.error('Error creating table:', err);
    });
  }

  async saveAnalysis(analysis: FrameworkAnalysis): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');
    const run = promisify(this.db.run.bind(this.db));
    const result = await run(
      `INSERT INTO framework_analyses (repo_url, repo_path, framework, scores, analyzed_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        analysis.repoUrl,
        analysis.repoPath,
        analysis.framework,
        analysis.scores,
        analysis.analyzedAt || new Date().toISOString(),
      ]
    );
    return (result as any).lastID;
  }

  async getAnalyses(): Promise<FrameworkAnalysis[]> {
    if (!this.db) throw new Error('Database not initialized');
    const all = promisify(this.db.all.bind(this.db));
    return (await all('SELECT * FROM framework_analyses ORDER BY analyzed_at DESC')) as FrameworkAnalysis[];
  }

  async getAnalysisByRepoUrl(repoUrl: string): Promise<FrameworkAnalysis | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    const get = promisify(this.db.get.bind(this.db));
    return (await get('SELECT * FROM framework_analyses WHERE repo_url = ?', [repoUrl])) as FrameworkAnalysis | undefined;
  }

  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}

// Platform type exported from types/ipc.d.ts
