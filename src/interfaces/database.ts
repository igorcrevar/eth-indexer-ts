import { Block, LogEvent } from '../common/data'

export interface IBlocksDatabase {
  getLastBlock(): Block | null;
  insertBlock(block: Block): void;
}

export interface ISubscriberDatabase {
  getLastProcessedEvent(): number | null;
  setLastProcessedEvent(number: number): void;
  getEvents(fromId: number, limit?: number): LogEvent[];
}

export interface ILogsDatabase {
  getBlocks(fromBlockNumber: number, limit?: number): Block[];
  getLastProcessedBlock(): number | null;
  insertEventAndSetLastProcessedBlock(events: LogEvent[], blockNumber: number): void;
}

export interface IDatabase extends ISubscriberDatabase, IBlocksDatabase, ILogsDatabase {
  initDb(): void;
}
