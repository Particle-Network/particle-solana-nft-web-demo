import { createApiStandardResponse, signTransaction } from './utils';
import { IApiStandardResponse, RPC_METHOD } from './common-types';
import connectionService from './connection-service';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, NATIVE_MINT } from '@particle/spl-token';
import { SolanaWallet } from '@particle-network/solana-wallet';

export async function withdrawWSOLAccount(wallet: SolanaWallet): Promise<IApiStandardResponse> {
  const address: any = wallet?.publicKey?.toBase58();
  console.log(`withdrawWSOLAccount:${address}`);

  const wsolAta = await getAssociatedTokenAddress(NATIVE_MINT, new PublicKey(address));
  const wsolAtaInfo = await connectionService.getConnection().getAccountInfo(wsolAta);

  // ata account not exists, nothing happens
  if (!wsolAtaInfo) {
    return createApiStandardResponse();
  }

  const responseNFTWithdraw = await connectionService.rpcRequest(RPC_METHOD.NFT_WITHDRAW, address);

  if (responseNFTWithdraw.error) {
    return createApiStandardResponse(responseNFTWithdraw.error);
  }

  const responseSigned = await signTransaction(wallet, responseNFTWithdraw.result.transaction.serialized);

  if (responseSigned.error) {
    return createApiStandardResponse(responseSigned.error);
  }

  const connection = connectionService.getConnection();
  let txId: any;
  try {
    txId = await connection.sendRawTransaction(responseSigned.result?.serialize());
    console.log('txId', txId);
  } catch (error) {
    return createApiStandardResponse(`sendRawTransaction error: ${txId}`);
  }

  try {
    await connection.confirmTransaction(txId, 'recent');
  } catch (error) {
    // nothing
  }

  return createApiStandardResponse();
}
