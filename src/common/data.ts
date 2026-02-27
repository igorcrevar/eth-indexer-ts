export type Block = {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  txHashes: string[];
};

export type LogEvent = {
  id: number;
  blockNumber: number;
  logIndex: number;
  address: string;
  topics: string[];
  data: string;
};

export type ReceiptLog = {
  address: string;
  topics: string[];
  data: string;
  logIndex: number;
};
