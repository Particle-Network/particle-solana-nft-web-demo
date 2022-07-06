import { SolanaWallet } from '@particle-network/solana-wallet';
import marketDatabase, { Auction } from './market-database';

export async function getAuctions(wallet: SolanaWallet): Promise<Auction[]> {
  return await marketDatabase.auctions
    .where({
      address: wallet.publicKey()?.toBase58(),
    })
    .toArray();
}
