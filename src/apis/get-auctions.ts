import { ParticleNetwork } from '@particle-network/provider';
import marketDatabase, { Auction } from './market-database';

export async function getAuctions(provider: ParticleNetwork): Promise<Auction[]> {
  return await marketDatabase.auctions
    .where({ address: provider.auth.userInfo()!.address })
    .toArray();
}
