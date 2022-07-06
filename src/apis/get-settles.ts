import marketDatabase, { Settle } from './market-database';
import { SolanaWallet } from '@particle-network/solana-wallet';

export async function getSettles(wallet: SolanaWallet): Promise<Settle[]> {
  return await marketDatabase.settles
    .where({
      address: wallet.publicKey()?.toBase58(),
    })
    .toArray();
}
