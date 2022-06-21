import marketDatabase, { Settle } from './market-database';
import { ParticleNetwork } from '@particle-network/provider';

export async function getSettles(provider: ParticleNetwork): Promise<Settle[]> {
  return await marketDatabase.settles
    .where({
      address: provider.auth.userInfo().wallets.filter((w) => w.chain_name === 'solana')[0]
        .public_address,
    })
    .toArray();
}
