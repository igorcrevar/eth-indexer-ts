import { LogEvent } from "./common/data";
import { Config } from "./config";
import { IDatabase } from "./interfaces/database";
import { IEthLogsClient } from "./interfaces/ethClient";
import { ILogger } from "./interfaces/logger";

export class LogsProcessor {
  constructor(
    private readonly config: Config,
    private readonly db: IDatabase,
    private readonly client: IEthLogsClient,
    private readonly logger: ILogger,
  ) {
  }

  async process(): Promise<LogEvent[] | undefined> {
    const lastProccesedBlock = this.db.getLastProcessedBlock() ?? -1;
    const unprocessedBlocks = this.db.getBlocks(lastProccesedBlock + 1);
    if (!unprocessedBlocks.length) {
      return undefined;
    }

    const fromBlock = unprocessedBlocks[0].number;
    const toBlock = unprocessedBlocks[unprocessedBlocks.length - 1].number;
    const newLogs = [];

    for (let blockNum = fromBlock; blockNum <= toBlock; blockNum += this.config.getMaxBatchSize()) {
      const batchTo = Math.min(blockNum + this.config.getMaxBatchSize() - 1, toBlock);

      this.logger.info({ fromBlock, toBlock: batchTo }, 'Processing logs for blocks');

      const logs = await this.client.getLogs(
        this.config.getAddresses(), blockNum, batchTo);
      const dbLogs = logs
        .map((log) => ({
          blockNumber: blockNum,
          address: log.address,
          logIndex: isNaN(log.logIndex) ? -1 : log.logIndex,
          topics: log.topics,
          data: log.data,
        } as LogEvent))
        .filter(x => {
          if (!this.config.getTopics()?.length) {
            return true;
          }

          const idx = (this.config.getAddresses() || []).findIndex((y) => x.address.toLowerCase() === y.toLowerCase());
          if (idx === -1 || idx >= this.config.getTopics()!.length) {
            return true;
          }
          return this.config.getTopics()![idx].includes(x.topics[0]);
        });
      // save to db
      this.db.insertEventAndSetLastProcessedBlock(dbLogs, batchTo);

      newLogs.push(...dbLogs);
    }

    return newLogs;
  }
}