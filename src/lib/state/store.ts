import { ActivityRecord, SavedSession, SyncStateData } from '../types';

export function createInitialState(): SyncStateData {
  return {
    version: 1,
    platform: 'garmin_cn',
    targetPlatform: 'garmin_gl',
    lastSyncTime: null,
    totalDiscovered: 0,
    sessions: {},
    activities: {},
  };
}

export interface ISyncStore {
  getState(): Promise<SyncStateData>;
  saveState(state: SyncStateData): Promise<void>;
  isSynced(activityId: string): Promise<boolean>;
  recordActivity(activity: ActivityRecord): Promise<void>;
  updateSessions(sessions: { cn?: SavedSession; global?: SavedSession }): Promise<void>;
  reset(): Promise<void>;
}
