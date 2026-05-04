import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LogsProcessor } from '../src/logs_processor';
import { Block, LogEvent, ReceiptLog } from '../src/common/data';
import { Config } from '../src/config';
import { ILogger } from '../src/interfaces/logger';

const noopLogger: ILogger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
};

// ── helpers ──────────────────────────────────────────────────────────────────

function makeBlock(number: number): Block {
  return { number, hash: `hash${number}`, parentHash: `hash${number - 1}`, timestamp: 0, txHashes: [] };
}

function makeReceiptLog(address: string, topic0: string, txHash = '0xff', blockNum = 1): ReceiptLog {
  return { address, topics: [topic0], data: '0x', txHash, blockNum };
}

function makeConfig(overrides?: {
  maxBatchSize?: number;
  addresses?: string[];
  topics?: (string | string[])[] | undefined;
}): Config {
  return new Config({
    rpcUrl: 'http://localhost:8545',
    startBlockNumber: 0,
    confirmationBlocksCount: 12,
    maxBatchSize: overrides?.maxBatchSize ?? 10,
    pullBlockIntervalMs: 0,
    pullBlocksLoopIntervalMs: 0,
    pullLogsIntervalMs: 0,
    dbPath: ':memory:',
    addresses: overrides?.addresses ?? ['0xAAA'],
    topics: overrides?.topics,
  });
}

// ── mocks ────────────────────────────────────────────────────────────────────

class MockDB {
  private blocks: Block[] = [];
  private events: LogEvent[] = [];
  private lastProcessedBlock: number | null = null;
  private lastProcessedEvent: number | null = null;

  insertBlock(block: Block) { this.blocks.push(block); }
  getLastBlock() { return this.blocks.at(-1) ?? null; }
  getBlocks(fromBlockNumber: number, limit?: number): Block[] {
    const filtered = this.blocks.filter(b => b.number >= fromBlockNumber);
    return limit !== undefined ? filtered.slice(0, limit) : filtered;
  }
  getLastProcessedBlock() { return this.lastProcessedBlock; }
  insertEventAndSetLastProcessedBlock(events: LogEvent[], blockNumber: number) {
    this.events.push(...events);
    this.lastProcessedBlock = blockNumber;
  }
  getEvents(fromId: number, limit?: number) { return this.events.slice(fromId); }
  getLastProcessedEvent() { return this.lastProcessedEvent; }
  setLastProcessedEvent(n: number) { this.lastProcessedEvent = n; }
  initDb() {}

  getAllEvents() { return this.events; }
}

class MockLogsClient {
  getLogs = vi.fn((_addresses: string[], _from: number, _to: number): Promise<ReceiptLog[]> =>
    Promise.resolve([])
  );
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('LogsProcessor', () => {
  let db: MockDB;
  let client: MockLogsClient;

  beforeEach(() => {
    db = new MockDB();
    client = new MockLogsClient();
  });

  // ── no-op when nothing to process ─────────────────────────────────────────

  it('returns undefined when there are no unprocessed blocks', async () => {
    const processor = new LogsProcessor(makeConfig(), db as any, client, noopLogger);
    const result = await processor.process();
    expect(result).toBeUndefined();
  });

  it('returns undefined when all blocks were already processed', async () => {
    db.insertBlock(makeBlock(1));
    db.insertBlock(makeBlock(2));
    db.insertEventAndSetLastProcessedBlock([], 2); // mark block 2 as last processed
    const processor = new LogsProcessor(makeConfig(), db as any, client, noopLogger);
    const result = await processor.process();
    expect(result).toBeUndefined();
  });

  // ── single batch ───────────────────────────────────────────────────────────

  it('processes a single batch and returns logs', async () => {
    db.insertBlock(makeBlock(1));
    db.insertBlock(makeBlock(2));
    client.getLogs = vi.fn(() =>
      Promise.resolve([makeReceiptLog('0xAAA', '0xTOPIC1', '0xffcc', 10)])
    );
    const processor = new LogsProcessor(makeConfig({ maxBatchSize: 10 }), db as any, client, noopLogger);
    const result = await processor.process();
    expect(result).toHaveLength(1);
    expect(result![0].address).toBe('0xAAA'); // stored as-is from ReceiptLog, not lowercased
    expect(result![0].txHash).toBe('0xffcc');
    expect(result![0].blockNumber).toBe(10);
  });

  it('calls getLogs with correct address array, fromBlock and toBlock', async () => {
    db.insertBlock(makeBlock(5));
    db.insertBlock(makeBlock(6));
    const processor = new LogsProcessor(makeConfig({ maxBatchSize: 10, addresses: ['0xBBB'] }), db as any, client, noopLogger);
    await processor.process();
    expect(client.getLogs).toHaveBeenCalledWith(['0xbbb'], 5, 6);
  });

  it('saves logs and updates last processed block after each batch', async () => {
    db.insertBlock(makeBlock(1));
    const mockLog = makeReceiptLog('0xAAA', '0xTOPIC1');
    client.getLogs = vi.fn(() => Promise.resolve([mockLog]));
    const processor = new LogsProcessor(makeConfig(), db as any, client, noopLogger);
    await processor.process();
    expect(db.getAllEvents()).toHaveLength(1);
    expect(db.getLastProcessedBlock()).toBe(1);
  });

  // ── multi-batch ────────────────────────────────────────────────────────────

  it('splits into multiple batches when block range exceeds maxBatchSize', async () => {
    // blocks 1–5, maxBatchSize=2 → batches [1-2], [3-4], [5-5]
    for (let i = 1; i <= 5; i++) db.insertBlock(makeBlock(i));
    const processor = new LogsProcessor(makeConfig({ maxBatchSize: 2 }), db as any, client, noopLogger);
    await processor.process();
    expect(client.getLogs).toHaveBeenCalledTimes(3);
    expect(client.getLogs).toHaveBeenNthCalledWith(1, expect.any(Array), 1, 2);
    expect(client.getLogs).toHaveBeenNthCalledWith(2, expect.any(Array), 3, 4);
    expect(client.getLogs).toHaveBeenNthCalledWith(3, expect.any(Array), 5, 5);
  });

  it('accumulates logs from all batches', async () => {
    for (let i = 1; i <= 4; i++) db.insertBlock(makeBlock(i));
    client.getLogs = vi.fn(() =>
      Promise.resolve([makeReceiptLog('0xAAA', '0xTOPIC1')])
    );
    const processor = new LogsProcessor(makeConfig({ maxBatchSize: 2 }), db as any, client, noopLogger);
    const result = await processor.process();
    // 2 batches × 1 log each = 2
    expect(result).toHaveLength(2);
  });

  it('last processed block is set to batchTo of the final batch', async () => {
    for (let i = 1; i <= 5; i++) db.insertBlock(makeBlock(i));
    const processor = new LogsProcessor(makeConfig({ maxBatchSize: 2 }), db as any, client, noopLogger);
    await processor.process();
    expect(db.getLastProcessedBlock()).toBe(5);
  });

  // ── starts from lastProcessedBlock + 1 ────────────────────────────────────

  it('only processes blocks after lastProcessedBlock', async () => {
    for (let i = 1; i <= 4; i++) db.insertBlock(makeBlock(i));
    db.insertEventAndSetLastProcessedBlock([], 2); // blocks 1-2 already processed
    const processor = new LogsProcessor(makeConfig({ maxBatchSize: 10 }), db as any, client, noopLogger);
    await processor.process();
    expect(client.getLogs).toHaveBeenCalledWith(expect.any(Array), 3, 4);
    expect(client.getLogs).toHaveBeenCalledTimes(1);
  });

  // ── topic filtering ────────────────────────────────────────────────────────

  it('passes all logs through when no topics are configured', async () => {
    db.insertBlock(makeBlock(1));
    client.getLogs = vi.fn(() =>
      Promise.resolve([
        makeReceiptLog('0xAAA', '0xTOPIC_ANY_1'),
        makeReceiptLog('0xAAA', '0xTOPIC_ANY_2'),
      ])
    );
    const processor = new LogsProcessor(makeConfig({ topics: undefined }), db as any, client, noopLogger);
    const result = await processor.process();
    expect(result).toHaveLength(2);
  });

  it('passes all logs through when topics array is empty', async () => {
    db.insertBlock(makeBlock(1));
    client.getLogs = vi.fn(() =>
      Promise.resolve([makeReceiptLog('0xAAA', '0xTOPIC_ANY')])
    );
    const processor = new LogsProcessor(makeConfig({ topics: [] }), db as any, client, noopLogger);
    const result = await processor.process();
    expect(result).toHaveLength(1);
  });

  it('filters logs by topic when address matches', async () => {
    db.insertBlock(makeBlock(1));
    client.getLogs = vi.fn(() =>
      Promise.resolve([
        makeReceiptLog('0xAAA', '0xMATCH'),
        makeReceiptLog('0xAAA', '0xNO_MATCH'),
      ])
    );
    const processor = new LogsProcessor(
      makeConfig({ addresses: ['0xAAA'], topics: [['0xMATCH']] }),
      db as any,
      client,
      noopLogger
    );
    const result = await processor.process();
    expect(result).toHaveLength(1);
    expect(result![0].topics[0]).toBe('0xMATCH');
  });

  it('passes logs through when address is not in the configured address list (idx === -1)', async () => {
    db.insertBlock(makeBlock(1));
    client.getLogs = vi.fn(() =>
      Promise.resolve([makeReceiptLog('0xUNKNOWN', '0xANYTOPIC')])
    );
    const processor = new LogsProcessor(
      makeConfig({ addresses: ['0xAAA'], topics: [['0xMATCH']] }),
      db as any,
      client,
      noopLogger
    );
    const result = await processor.process();
    expect(result).toHaveLength(1);
  });



  // ── empty log list from client ─────────────────────────────────────────────

  it('returns empty array when getLogs returns no logs', async () => {
    db.insertBlock(makeBlock(1));
    client.getLogs = vi.fn(() => Promise.resolve([]));
    const processor = new LogsProcessor(makeConfig(), db as any, client, noopLogger);
    const result = await processor.process();
    expect(result).toEqual([]);
  });
});
