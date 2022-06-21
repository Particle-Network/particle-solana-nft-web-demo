import connectionService from './connection-service';
import { getAssociatedTokenAddress, NATIVE_MINT } from '@particle/spl-token';
import { ParticleNetwork } from '@particle-network/provider';
import { PublicKey } from '@solana/web3.js';

export async function getBalance(provider: ParticleNetwork) {
  return await connectionService
    .getConnection()
    .getBalance(
      new PublicKey(
        provider.auth.userInfo().wallets.filter((w) => w.chain_name === 'solana')[0].public_address
      )
    );
}

export async function getWSOLBalance(provider: ParticleNetwork) {
  const ata = await getAssociatedTokenAddress(
    NATIVE_MINT,
    new PublicKey(
      provider.auth.userInfo().wallets.filter((w) => w.chain_name === 'solana')[0].public_address
    )
  );
  return await connectionService.getConnection().getBalance(ata);
}
