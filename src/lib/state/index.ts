import { getEnvConfig } from '../config';
import { FileSyncStore } from './file-store';
import { KvSyncStore } from './kv-store';
import { ISyncStore } from './store';

let globalStore: ISyncStore | null = null;

export function getSyncStore(): ISyncStore {
  if (globalStore) return globalStore;

  const cfg = getEnvConfig();
  if (cfg.kvUrl && cfg.kvToken) {
    globalStore = new KvSyncStore(cfg.kvUrl, cfg.kvToken);
  } else {
    globalStore = new FileSyncStore();
  }

  return globalStore;
}
