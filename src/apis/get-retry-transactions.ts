import { ParticleNetwork } from '@particle-network/provider';
import marketDatabase, { RetryTransaction } from './market-database';

export async function getRetryTransactions(provider: ParticleNetwork): Promise<RetryTransaction[]> {
  return await marketDatabase.retryTransactions
    .where({ address: provider.auth.userInfo()!.address })
    .toArray();
}
