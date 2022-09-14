import connectionService from './connection-service';
import { getAssociatedTokenAddress, NATIVE_MINT } from '@particle/spl-token';
import { SolanaWallet } from '@particle-network/solana-wallet';
import { PublicKey } from '@solana/web3.js';

export async function getBalance(wallet: SolanaWallet) {
  return await connectionService.getConnection().getBalance(wallet.publicKey as PublicKey);
}

export async function getWSOLBalance(wallet: SolanaWallet) {
  const ata = await getAssociatedTokenAddress(NATIVE_MINT, wallet.publicKey as PublicKey);

  return await connectionService.getConnection().getBalance(ata);
}
