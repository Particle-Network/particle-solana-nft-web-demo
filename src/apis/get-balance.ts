import connectionService from './connection-service';
import { getAssociatedTokenAddress, NATIVE_MINT } from '@particle/spl-token';
import { ParticleNetwork } from '@particle-network/provider';
import { PublicKey } from '@solana/web3.js';
import { getProviderSolanaAddress } from './utils';

export async function getBalance(provider: ParticleNetwork) {
  return await connectionService.getConnection().getBalance(new PublicKey(getProviderSolanaAddress(provider)));
}

export async function getWSOLBalance(provider: ParticleNetwork) {
  const ata = await getAssociatedTokenAddress(NATIVE_MINT, new PublicKey(getProviderSolanaAddress(provider)));

  return await connectionService.getConnection().getBalance(ata);
}
