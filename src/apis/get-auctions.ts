import { ParticleNetwork } from '@particle-network/provider';
import marketDatabase, { Auction } from './market-database';
import { getProviderSolanaAddress } from './utils';

export async function getAuctions(provider: ParticleNetwork): Promise<Auction[]> {
  return await marketDatabase.auctions
    .where({
      address: getProviderSolanaAddress(provider),
    })
    .toArray();
}
