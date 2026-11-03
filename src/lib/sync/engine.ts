import { getEnvConfig } from '../config';
import { GarminClient } from '../garmin/client';
import { getSyncStore } from '../state';
import {
  ActivityRecord,
  BatchSyncOptions,
  BatchSyncResponse,
  GarminActivityRaw,
  GarminCredentials,
  SyncStateData,
} from '../types';

export class SyncEngine {
  private store = getSyncStore();

  /**
   * Resolve and connect both Garmin CN and Garmin Global clients
   */
  public async getConnectedClients(credentials?: {
    cn?: GarminCredentials;
    global?: GarminCredentials;
  }): Promise<{
    cnClient: GarminClient;
    globalClient: GarminClient;
    state: SyncStateData;
  }> {
    const env = getEnvConfig();
    const state = await this.store.getState();

    // Garmin CN Credentials
    const cnCreds: GarminCredentials = {
      username: credentials?.cn?.username || env.garminCnUsername,
      password: credentials?.cn?.password || env.garminCnPassword,
      session: credentials?.cn?.session || state.sessions?.cn,
    };

    // Garmin Global Credentials
    const globalCreds: GarminCredentials = {
      username: credentials?.global?.username || env.garminGlobalUsername,
      password: credentials?.global?.password || env.garminGlobalPassword,
      session: credentials?.global?.session || state.sessions?.global,
    };

    if (!cnCreds.username && !cnCreds.session?.token?.oauth1) {
      throw new Error('未配置 Garmin CN 账号或会话。请在页面设置中输入或配置环境变量 GARMIN_CN_USERNAME。');
    }
    if (!globalCreds.username && !globalCreds.session?.token?.oauth1) {
      throw new Error('未配置 Garmin 国际区账号或会话。请在页面设置中输入或配置环境变量 GARMIN_GLOBAL_USERNAME。');
    }

    const cnClient = new GarminClient('CN');
    const globalClient = new GarminClient('GLOBAL');

    // Connect both in parallel
    const [cnAuth, globalAuth] = await Promise.all([
      cnClient.connect(cnCreds),
      globalClient.connect(globalCreds),
    ]);

    // Persist any updated sessions
    await this.store.updateSessions({
      cn: cnAuth.session,
      global: globalAuth.session,
    });

    return { cnClient, globalClient, state };
  }

  /**
   * Run a single batch of synchronization (Vercel-friendly, finishes within 5-10s)
   */
  public async syncBatch(options: BatchSyncOptions = {}): Promise<BatchSyncResponse> {
    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      console.log(`[SyncEngine] ${msg}`);
    };

    const batchSize = Math.max(1, Math.min(options.batchSize || 5, 20));
    const cursor = Math.max(0, options.cursor || 0);
    const mode = options.mode || 'full';

    log(`开始执行同步批次: 模式=${mode}, 游标=${cursor}, 批次大小=${batchSize}`);

    const { cnClient, globalClient, state } = await this.getConnectedClients(options.credentials);
    log(`已成功连接 Garmin CN 与 Garmin 国际区`);

    let activitiesToProcess: GarminActivityRaw[] = [];
    let isFinished = false;
    let nextCursor: number | null = null;

    if (mode === 'retry_failed') {
      // Find all failed activities in state
      const failedRecords = Object.values(state.activities).filter(
        (a) => a.status === 'failed' && !a.permanent
      );
      const slice = failedRecords.slice(cursor, cursor + batchSize);
      activitiesToProcess = slice.map((f) => ({
        activityId: f.activityId,
        activityName: f.activityName,
        activityType: { typeKey: f.sport },
        startTimeGMT: f.startTime,
        distance: f.distance,
        duration: f.duration,
      }));

      if (cursor + batchSize >= failedRecords.length) {
        isFinished = true;
        nextCursor = null;
      } else {
        nextCursor = cursor + batchSize;
      }
      log(`重试模式: 本批次待重试 ${activitiesToProcess.length} 条活动 (总待重试: ${failedRecords.length})`);
    } else {
      // Incremental or Full History mode
      let startDate = options.startDate;
      if (mode === 'incremental' && !startDate) {
        if (state.lastSyncTime) {
          // Sync since last sync date (minus 1 day buffer)
          const lastDate = new Date(state.lastSyncTime);
          lastDate.setDate(lastDate.getDate() - 1);
          startDate = lastDate.toISOString().split('T')[0];
        } else {
          // If no previous sync, default to last 30 days
          const d = new Date();
          d.setDate(d.getDate() - 30);
          startDate = d.toISOString().split('T')[0];
        }
        log(`增量模式: 获取起始日期 ${startDate} 之后的活动`);
      }

      // Fetch a page of activities from Garmin CN (up to 50 to have enough candidate items)
      const fetchLimit = Math.max(batchSize * 2, 20);
      log(`从 Garmin CN 拉取活动列表: offset=${cursor}, limit=${fetchLimit}...`);
      const fetched = await cnClient.getActivities({
        start: cursor,
        limit: fetchLimit,
        startDate,
        endDate: options.endDate,
      });

      log(`Garmin CN 返回 ${fetched.length} 条活动`);
      if (fetched.length === 0) {
        isFinished = true;
        nextCursor = null;
      } else {
        activitiesToProcess = fetched;
        if (fetched.length < fetchLimit) {
          // Reached end of Garmin CN history
          isFinished = true;
          nextCursor = null;
        } else {
          nextCursor = cursor + fetched.length;
        }
      }
    }

    const batchResults: ActivityRecord[] = [];
    let newlyProcessedCount = 0;

    for (const raw of activitiesToProcess) {
      const aid = String(raw.activityId);
      const name = raw.activityName || '未命名运动';
      const sport = raw.activityType?.typeKey || 'other';
      const startTime = raw.startTimeGMT || raw.startTimeLocal || new Date().toISOString();

      // Check if already synced
      if (mode !== 'retry_failed' && (await this.store.isSynced(aid))) {
        log(`活动 ${aid} (${name}) 已在本地记录为已同步，跳过`);
        const existing = state.activities[aid];
        if (existing) {
          batchResults.push(existing);
        }
        continue;
      }

      log(`正在同步活动 ${aid}: [${sport}] ${name} (${startTime})...`);

      try {
        // 1. Download original FIT from CN
        log(`[${aid}] 正在从 Garmin CN 下载原始活动文件...`);
        const downloaded = await cnClient.downloadActivity(aid);
        log(`[${aid}] 下载成功: ${downloaded.filename} (${(downloaded.buffer.length / 1024).toFixed(1)} KB)`);

        // 2. Upload to Global
        log(`[${aid}] 正在上传到 Garmin 国际区...`);
        const uploadRes = await globalClient.uploadActivity(
          downloaded.buffer,
          downloaded.filename,
          downloaded.format
        );

        if (uploadRes.status === 'already_exists') {
          log(`[${aid}] 国际区已存在该活动 (HTTP 409 Duplicate)`);
        } else if (uploadRes.success) {
          log(`[${aid}] 成功同步到国际区！`);
        } else {
          log(`[${aid}] 上传失败: ${uploadRes.error}`);
        }

        const record: ActivityRecord = {
          activityId: aid,
          syncedAt: new Date().toISOString(),
          status: uploadRes.status,
          activityName: name,
          sport,
          startTime,
          distance: raw.distance,
          duration: raw.duration,
          error: uploadRes.error,
          retryCount: (state.activities[aid]?.retryCount || 0) + (uploadRes.success ? 0 : 1),
          permanent: false,
        };

        await this.store.recordActivity(record);
        batchResults.push(record);
        newlyProcessedCount++;

        // If we processed batchSize items that needed network transfer, stop for this batch to avoid Vercel timeouts
        if (newlyProcessedCount >= batchSize) {
          log(`本批次已完成 ${newlyProcessedCount} 条活动的上传传输，准备返回响应`);
          break;
        }
      } catch (err: any) {
        log(`[${aid}] 同步异常: ${err.message}`);
        const record: ActivityRecord = {
          activityId: aid,
          syncedAt: new Date().toISOString(),
          status: 'failed',
          activityName: name,
          sport,
          startTime,
          distance: raw.distance,
          duration: raw.duration,
          error: err.message,
          retryCount: (state.activities[aid]?.retryCount || 0) + 1,
          permanent: Boolean(err.isPermanent),
        };
        await this.store.recordActivity(record);
        batchResults.push(record);
        newlyProcessedCount++;

        if (newlyProcessedCount >= batchSize) {
          break;
        }
      }
    }

    // Refresh state for summary
    const updatedState = await this.store.getState();
    const records = Object.values(updatedState.activities);
    const syncedCount = records.filter((r) => r.status === 'uploaded').length;
    const duplicateCount = records.filter((r) => r.status === 'already_exists').length;
    const failedCount = records.filter((r) => r.status === 'failed').length;

    log(
      `批次执行完毕: 新同步=${syncedCount}, 已存在=${duplicateCount}, 失败=${failedCount}, 是否结束=${isFinished}`
    );

    return {
      cursor,
      nextCursor: isFinished ? null : nextCursor,
      isFinished,
      batchSize,
      batchResults,
      summary: {
        totalDiscovered: records.length,
        syncedCount,
        duplicateCount,
        failedCount,
        totalProcessedInBatch: newlyProcessedCount,
      },
      logs,
    };
  }

  /**
   * Get current sync status & statistics
   */
  public async getStatus() {
    const state = await this.store.getState();
    const records = Object.values(state.activities).sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    const uploaded = records.filter((r) => r.status === 'uploaded').length;
    const duplicates = records.filter((r) => r.status === 'already_exists').length;
    const failed = records.filter((r) => r.status === 'failed').length;

    return {
      lastSyncTime: state.lastSyncTime,
      hasCnSession: Boolean(state.sessions?.cn?.token?.oauth1),
      hasGlobalSession: Boolean(state.sessions?.global?.token?.oauth1),
      stats: {
        total: records.length,
        uploaded,
        duplicates,
        failed,
      },
      recentActivities: records.slice(0, 100),
    };
  }

  /**
   * Reset sync state
   */
  public async resetState() {
    await this.store.reset();
  }
}
