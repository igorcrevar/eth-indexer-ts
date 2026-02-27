import 'dotenv/config';
import {
  Config,
  EthersEthClient,
  Indexer,
  PinoLogger,
  SqliteDatabase,
} from '../src/index';

const config = new Config();
const logger = new PinoLogger(config.getLoggerOptions());

async function main() {
  const idx = new Indexer(
    config,
    new EthersEthClient(config.getRpcUrl()),
    new SqliteDatabase(config.getDbPath()),
    logger,
    async (db) => {
      const lastId = (db.getLastProcessedEvent() ?? -1) + 1;
      const events = db.getEvents(lastId);
      if (events?.length) {
        logger.info({ events }, 'Unprocessed events');
        db.setLastProcessedEvent(events[events.length - 1].id);
      }
    },
  );
  logger.info({ config }, 'Starting indexer');
  await idx.init();
  await idx.start();
}

main().catch((e) => {
  logger.error({ err: e }, 'Fatal error');
  process.exit(1);
});
