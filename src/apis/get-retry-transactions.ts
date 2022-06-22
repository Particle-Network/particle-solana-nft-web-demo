import { ParticleNetwork } from '@particle-network/provider';
import marketDatabase, { RetryTransaction } from './market-database';
import { getProviderSolanaAddress } from './utils';

export async function getRetryTransactions(provider: ParticleNetwork): Promise<RetryTransaction[]> {
  return await marketDatabase.retryTransactions
    .where({
      address: getProviderSolanaAddress(provider),
    })
    .toArray();
}
