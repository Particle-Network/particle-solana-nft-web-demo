import { SolanaWallet } from '@particle-network/solana-wallet';
import marketDatabase, { RetryTransaction } from './market-database';

export async function getRetryTransactions(wallet: SolanaWallet): Promise<RetryTransaction[]> {
  return await marketDatabase.retryTransactions
    .where({
      address: wallet.publicKey()?.toBase58(),
    })
    .toArray();
}
