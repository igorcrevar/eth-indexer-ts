import { JsonRpcProvider } from 'ethers';
import { Block as EthersBlock } from 'ethers';
import { Block, BlockNumberType, ReceiptLog } from './common/data';
import { IEthClient } from './interfaces/ethClient';

export class EthersEthClient implements IEthClient {
  private readonly provider: JsonRpcProvider;
  private readonly latestBlockStrategy: BlockNumberType;

  constructor(rpcUrl: string, latestBlockStrategy: BlockNumberType) {
    this.provider = new JsonRpcProvider(rpcUrl);
    this.latestBlockStrategy = latestBlockStrategy;
  }

  async getBlockByNumber(num: number): Promise<Block | null> {
    const block = await this.provider.getBlock(num);
    return toBlock(block);
  }

  async getLatestBlock(): Promise<Block | null> {
    const block = await this.provider.getBlock(this.latestBlockStrategy);
    return toBlock(block);
  }

  async getLogs(
    address: string[],
    fromBlock: number,
    toBlock: number,
    topics?: (string | string[])[],
  ): Promise<ReceiptLog[]> {
    const logs = await this.provider.getLogs({
      address,
      topics,
      fromBlock,
      toBlock
    });
    return logs.map((l: any) => ({
      address: l.address,
      topics: Array.isArray(l.topics) ? l.topics.map(String) : [],
      data: l.data,
      logIndex: typeof l.logIndex === 'number' ? l.logIndex : Number(l.logIndex)
    }));
  }
}

export default EthersEthClient;

function toBlock(block: EthersBlock | null): Block | null {
  if (!block) {
    return null;
  }
  return {
    number: block.number,
    hash: block.hash,
    parentHash: block.parentHash,
    timestamp: block.timestamp,
    txHashes: block.transactions
  } as Block;
}