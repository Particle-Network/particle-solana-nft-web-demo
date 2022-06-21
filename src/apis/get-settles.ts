import marketDatabase, { Settle } from './market-database';
import { ParticleNetwork } from '@particle-network/provider';

export async function getSettles(provider: ParticleNetwork): Promise<Settle[]> {
  return await marketDatabase.settles
    .where({ address: provider.auth.userInfo()!.address })
    .toArray();
}
