import { SyncEngine } from '../lib/sync/engine';
import { SyncMode } from '../lib/types';

async function main() {
  const args = process.argv.slice(2);
  const modeArg = (args[0] || 'full') as SyncMode;
  const batchSize = parseInt(args[1] || '10', 10);

  console.log('====================================================');
  console.log(`FitSync: Garmin CN -> Garmin Global 历史数据同步 (CLI)`);
  console.log(`模式: ${modeArg}, 批次大小: ${batchSize}`);
  console.log('====================================================\n');

  const engine = new SyncEngine();
  let cursor: number | null = 0;
  let batchIndex = 1;
  let totalUploaded = 0;
  let totalDuplicates = 0;
  let totalFailed = 0;

  try {
    while (cursor !== null) {
      console.log(`\n--- 正在执行第 ${batchIndex} 批次 (游标: ${cursor}) ---`);
      const res = await engine.syncBatch({
        mode: modeArg,
        cursor,
        batchSize,
      });

      for (const log of res.logs) {
        console.log(log);
      }

      totalUploaded += res.batchResults.filter((r) => r.status === 'uploaded').length;
      totalDuplicates += res.batchResults.filter((r) => r.status === 'already_exists').length;
      totalFailed += res.batchResults.filter((r) => r.status === 'failed').length;

      console.log(
        `批次 ${batchIndex} 完成: 本批处理 ${res.batchResults.length} 条 | 累计新同步: ${totalUploaded}, 已存在: ${totalDuplicates}, 失败: ${totalFailed}`
      );

      if (res.isFinished || res.nextCursor === null) {
        console.log('\n====================================================');
        console.log('全量数据同步已完成！');
        console.log(`总发现/处理: ${res.summary.totalDiscovered}`);
        console.log(`新上传: ${res.summary.syncedCount}`);
        console.log(`已存在: ${res.summary.duplicateCount}`);
        console.log(`失败: ${res.summary.failedCount}`);
        console.log('====================================================');
        break;
      }

      cursor = res.nextCursor;
      batchIndex++;

      // Short delay between batches
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } catch (error: any) {
    console.error('\n同步过程中发生严重错误:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
