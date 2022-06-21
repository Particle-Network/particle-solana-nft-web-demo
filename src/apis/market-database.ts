import { Dexie, Table } from 'dexie';
import { DATABASE_NAME, RETRY_TRANSACTION_TYPE } from './common-types';

export default new (class MarketDatabase extends Dexie {
  public nfts!: Table<NFT, number>;
  public retryTransactions!: Table<RetryTransaction, number>;
  public auctions!: Table<Auction, number>;
  public settles!: Table<Settle, number>;

  public constructor() {
    super(DATABASE_NAME);
    this.version(1).stores({
      nfts: 'mint,address',
      retryTransactions: 'uuid,address',
      auctions: 'auctionManager,address',
      settles: 'uuid,address',
    });
  }
})();

export interface NFT {
  mint: string;
  address: string;
  nft?: any;
}

export interface Auction {
  auctionManager: string;
  address: string;
  price: number;
  nft?: any;
}

export interface Settle {
  uuid: string;
  address: string;
  auctionManager: string;
  nft: any;
}

export interface RetryTransaction {
  uuid: string;
  address: string;
  type: RETRY_TRANSACTION_TYPE;
  transactions: any[];
  data: any;
}
