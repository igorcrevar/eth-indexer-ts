# ethereum-indexer-ts

A TypeScript library for indexing Ethereum logs. It connects to an RPC node, tracks confirmed blocks with reorg handling, fetches raw logs filtered by contract address and/or topic, and persists everything to SQLite. Consumers read unprocessed events from the database either via the optional callback or through their own external routine/loop

## Installation

### Prerequisites

`better-sqlite3` requires native compilation:

```bash
sudo apt install build-essential libsqlite3-dev
```

### Install the library

```bash
npm install ethereum-indexer-ts
```

## Usage

```typescript
import 'dotenv/config'; // load .env before constructing Config
import {
  Indexer,
  Config,
  PinoLogger,
  SqliteDatabase,
  EthersEthClient,
} from 'ethereum-indexer-ts';

const config = new Config();
const logger = new PinoLogger(config.getLoggerOptions());

const indexer = new Indexer(
  config,
  new EthersEthClient(config.getRpcUrl()),
  new SqliteDatabase(config.getDbPath()),
  logger,
  async (db) => {
    // optional callback — called after each batch of logs is confirmed
    const lastId = (db.getLastProcessedEvent() ?? -1) + 1;
    const events = db.getEvents(lastId);
    if (events?.length) {
      logger.info({ events }, 'New events');
      db.setLastProcessedEvent(events[events.length - 1].id);
    }
  },
);

await indexer.init();
await indexer.start();
```

> **Note:** `Config` reads from `process.env`. Call `dotenv.config()` (or `import 'dotenv/config'`) **before** constructing `Config` if you use a `.env` file.

## Configuration

All options are set via environment variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `RPC_URL` | ✅ | — | WebSocket or HTTP RPC endpoint |
| `ADDRESSES` | ✅ | — | Comma-separated contract addresses to watch |
| `START_BLOCK_NUMBER` | ✅ | — | Block number to start indexing from |
| `TOPICS` | | — | Comma-separated topic filters; use `\|` for OR within a position |
| `CONFIRMATION_BLOCKS_COUNT` | | `8` | Blocks required before a block is considered confirmed |
| `MAX_BATCH_SIZE` | | `40` | Max blocks fetched per log-polling batch |
| `PULL_BLOCK_INTERVAL_MS` | | `3000` | Interval between new-block polls (ms) |
| `PULL_BLOCKS_LOOP_INTERVAL_MS` | | `250` | Interval between block-processing loop ticks (ms) |
| `PULL_LOGS_INTERVAL_MS` | | `4000` | Interval between log-fetching polls (ms) |
| `LATEST_BLOCK_STRATEGY` | | `latest` | Strategy for determining the latest block: `latest` (default), `safe`, or `finalized` (if supported by your RPC provider). |
| `DB_PATH` | | `./indexer.db` | SQLite database file path |
| `LOG_LEVEL` | | `info` | Pino log level: `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` |
| `LOG_PRETTY` | | `false` | `true` for human-readable output, `false` for JSON |
| `LOG_FILE` | | — | File path for log rotation sink (stdout always active). Supports date tokens, e.g. `./logs/app.%Y-%m-%d.log` |
| `LOG_FILE_SIZE` | | — | Rotate when file exceeds this size, e.g. `10m`, `100m` |
| `LOG_FILE_FREQUENCY` | | — | Time-based rotation: `daily` \| `hourly` |
| `LOG_FILE_MAX_FILES` | | `0` (unlimited) | Max number of rotated files to keep |


## Custom implementations

All major components are interface-driven and replaceable:

| Interface | Default implementation | Description |
|---|---|---|
| `IEthClient` | `EthersEthClient` | Ethereum RPC client (ethers v6) |
| `IDatabase` | `SqliteDatabase` | Persistent storage (better-sqlite3) |
| `ILogger` | `PinoLogger` | Structured logger (pino) |

## Contributing / local development

```bash
git clone <repo>
cd fluxion-indexer
npm install
```

### Running the example

The repository includes a runnable example at [`examples/basic.ts`](examples/basic.ts) that mirrors the Usage section above.

1. Create a `.env` file in the project root (see [Configuration](#configuration) for all variables):

```
RPC_URL=https://rpc.nexus.testnet.apexfusion.org
START_BLOCK_NUMBER=12444887
CONFIRMATION_BLOCKS_COUNT=8
MAX_BATCH_SIZE=40
PULL_BLOCK_INTERVAL_MS=3000
PULL_BLOCKS_LOOP_INTERVAL_MS=250
PULL_LOGS_INTERVAL_MS=4000
DB_PATH=./indexer.db
ADDRESSES=0x53F9124643E3D15f8d753733C5d908CD6aA65178
TOPICS=0x5346f1615d0f5d79989c2d9c7deb07d6a9e52196a209ec7abfbebabb8d346a69
```

2. Start the example (auto-restarts on file changes):

```bash
npm run start-example
```

The `start-example` script runs `examples/basic.ts` directly via `ts-node-dev`, which imports from `../src/index` — no build step required.

### Build

```bash
npm run build
```

## Tests

Tests use [Vitest](https://vitest.dev/) and are mostly generated with Copilot.

Run in watch mode:

```bash
npm test
```

Single run:

```bash
npx vitest run
```

With coverage:

```bash
npm run test-coverage
```
