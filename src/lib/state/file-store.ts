import fs from 'node:fs/promises';
import path from 'node:path';
import { ActivityRecord, SavedSession, SyncStateData } from '../types';
import { createInitialState, ISyncStore } from './store';

export class FileSyncStore implements ISyncStore {
  private filePath: string;
  private memoryCache: SyncStateData | null = null;

  constructor(baseDir: string = process.cwd()) {
    this.filePath = path.join(baseDir, '.data', 'sync_state.json');
  }

  private async ensureDir(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true }).catch(() => {});
  }

  public async getState(): Promise<SyncStateData> {
    if (this.memoryCache) return this.memoryCache;

    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.activities === 'object') {
        this.memoryCache = parsed;
        return parsed;
      }
    } catch {
      // File not found or invalid JSON
    }

    const initial = createInitialState();
    this.memoryCache = initial;
    await this.saveState(initial).catch(() => {});
    return initial;
  }

  public async saveState(state: SyncStateData): Promise<void> {
    this.memoryCache = state;
    try {
      await this.ensureDir();
      await fs.writeFile(this.filePath, JSON.stringify(state, null, 2), 'utf-8');
    } catch (err) {
      console.warn('FileSyncStore: Failed to persist to disk:', err);
    }
  }

  public async isSynced(activityId: string): Promise<boolean> {
    const state = await this.getState();
    const item = state.activities[activityId];
    return item?.status === 'uploaded' || item?.status === 'already_exists';
  }

  public async recordActivity(activity: ActivityRecord): Promise<void> {
    const state = await this.getState();
    state.activities[activity.activityId] = activity;
    state.lastSyncTime = new Date().toISOString();
    await this.saveState(state);
  }

  public async updateSessions(sessions: {
    cn?: SavedSession;
    global?: SavedSession;
  }): Promise<void> {
    const state = await this.getState();
    if (!state.sessions) state.sessions = {};
    if (sessions.cn) state.sessions.cn = sessions.cn;
    if (sessions.global) state.sessions.global = sessions.global;
    await this.saveState(state);
  }

  public async reset(): Promise<void> {
    const fresh = createInitialState();
    this.memoryCache = fresh;
    await this.saveState(fresh);
  }
}
