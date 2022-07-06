import connectionService from './connection-service';
import { getAssociatedTokenAddress, NATIVE_MINT } from '@particle/spl-token';
import { SolanaWallet } from '@particle-network/solana-wallet';

export async function getBalance(wallet: SolanaWallet) {
  return await connectionService.getConnection().getBalance(wallet.publicKey()!);
}

export async function getWSOLBalance(wallet: SolanaWallet) {
  const ata = await getAssociatedTokenAddress(NATIVE_MINT, wallet.publicKey()!);

  return await connectionService.getConnection().getBalance(ata);
}
