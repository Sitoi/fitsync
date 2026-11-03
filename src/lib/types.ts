export type GarminRegion = 'CN' | 'GLOBAL';

export interface SavedOAuthToken {
  oauth1: {
    oauth_token: string;
    oauth_token_secret: string;
    [key: string]: any;
  };
  oauth2?: {
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
    token_type?: string;
    [key: string]: any;
  };
}

export interface SavedSession {
  loginHash?: string;
  token: SavedOAuthToken;
}

export interface GarminCredentials {
  username?: string;
  password?: string;
  session?: SavedSession;
}

export interface GarminProfile {
  displayName: string;
  fullName?: string;
  profileId?: number | string;
  userName?: string;
  profileImageUrl?: string;
  region: GarminRegion;
}

export interface GarminActivityRaw {
  activityId: number | string;
  activityName: string;
  activityType: {
    typeKey: string;
    typeId?: number;
  };
  startTimeGMT?: string;
  startTimeLocal?: string;
  beginTimestamp?: number;
  distance?: number; // meters
  duration?: number; // seconds
  elapsedDuration?: number;
  elevationGain?: number;
  averageSpeed?: number;
  maxSpeed?: number;
  avgHR?: number;
  maxHR?: number;
  calories?: number;
}

export type SyncStatus = 'uploaded' | 'already_exists' | 'failed' | 'skipped';

export interface ActivityRecord {
  activityId: string;
  syncedAt: string;
  status: SyncStatus;
  activityName: string;
  sport: string;
  startTime: string;
  distance?: number;
  duration?: number;
  error?: string;
  retryCount?: number;
  permanent?: boolean;
}

export interface SyncStateData {
  version: number;
  platform: 'garmin_cn';
  targetPlatform: 'garmin_gl';
  lastSyncTime: string | null;
  totalDiscovered: number;
  sessions?: {
    cn?: SavedSession;
    global?: SavedSession;
  };
  activities: Record<string, ActivityRecord>;
}

export type SyncMode = 'full' | 'incremental' | 'retry_failed';
export type SyncDirection = 'newest_first' | 'oldest_first';

export interface BatchSyncOptions {
  cursor?: number;
  batchSize?: number;
  startDate?: string;
  endDate?: string;
  mode?: SyncMode;
  direction?: SyncDirection;
  credentials?: {
    cn?: GarminCredentials;
    global?: GarminCredentials;
  };
}

export interface BatchSyncResponse {
  cursor: number;
  nextCursor: number | null;
  isFinished: boolean;
  batchSize: number;
  batchResults: ActivityRecord[];
  summary: {
    totalDiscovered: number;
    syncedCount: number;
    duplicateCount: number;
    failedCount: number;
    totalProcessedInBatch: number;
  };
  logs: string[];
}
