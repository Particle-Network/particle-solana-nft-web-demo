import marketDatabase, { Settle } from './market-database';
import { ParticleNetwork } from '@particle-network/provider';
import { getProviderSolanaAddress } from './utils';

export async function getSettles(provider: ParticleNetwork): Promise<Settle[]> {
  return await marketDatabase.settles
    .where({
      address: getProviderSolanaAddress(provider),
    })
    .toArray();
}
