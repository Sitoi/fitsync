import { Redis } from '@upstash/redis';
import { ActivityRecord, SavedSession, SyncStateData } from '../types';
import { createInitialState, ISyncStore } from './store';

const KV_STATE_KEY = 'fitsync:sync_state';

export class KvSyncStore implements ISyncStore {
  private redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token });
  }

  public async getState(): Promise<SyncStateData> {
    try {
      const data = await this.redis.get<SyncStateData>(KV_STATE_KEY);
      if (data && typeof data.activities === 'object') {
        return data;
      }
    } catch (err) {
      console.error('KvSyncStore: Failed to get state from Redis:', err);
    }

    const initial = createInitialState();
    await this.saveState(initial).catch(() => {});
    return initial;
  }

  public async saveState(state: SyncStateData): Promise<void> {
    try {
      await this.redis.set(KV_STATE_KEY, state);
    } catch (err) {
      console.error('KvSyncStore: Failed to save state to Redis:', err);
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
    await this.saveState(fresh);
  }
}
