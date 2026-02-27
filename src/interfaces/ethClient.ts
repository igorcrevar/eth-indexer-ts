import { Block, ReceiptLog } from '../common/data'

export interface IEthBlocksClient {
  getBlockByNumber(num: number): Promise<Block | null>;
  getLatestBlock(): Promise<Block | null>;
}

export interface IEthLogsClient {
  getLogs(
    address: string[],
    fromBlock: number,
    toBlock: number,
    topics?: (string | string[])[],
  ): Promise<ReceiptLog[]>;
}

export interface IEthClient extends IEthBlocksClient, IEthLogsClient {
}
