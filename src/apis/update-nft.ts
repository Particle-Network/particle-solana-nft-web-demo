import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { PublicKey } from '@solana/web3.js';
import { IApiStandardResponse, RPC_METHOD } from './common-types';
import connectionService from './connection-service';
import { createApiStandardResponse, signTransaction } from './utils';
import { getNFTByMint, tryAddOrUpdateNFT } from './mint-nft';
import { SolanaWallet } from '@particle-network/solana-wallet';

export async function updateNFT(wallet: SolanaWallet, mintAddress: string, config: any): Promise<IApiStandardResponse> {
  const address: any = wallet.publicKey()?.toBase58();
  console.log(`updateNFT:${address}`, mintAddress, config);

  const responseNFTUpdate = await connectionService.rpcRequest(RPC_METHOD.NFT_UPDATE, mintAddress, config);

  if (responseNFTUpdate.error) {
    return createApiStandardResponse(responseNFTUpdate.error);
  }

  const responseSigned = await signTransaction(wallet, responseNFTUpdate.result.transaction.serialized);

  if (responseSigned.error) {
    return createApiStandardResponse(responseSigned.error);
  }

  const responseConfirm = await connectionService.rpcRequest(RPC_METHOD.SEND_AND_CONFIRM_RAW_TRANSACTION, bs58.encode(Buffer.from(responseSigned.result?.serialize(), 'base64')), {
    commitment: 'recent',
  });

  if (responseConfirm.error) {
    return createApiStandardResponse(responseConfirm.error);
  }

  const mint = new PublicKey(mintAddress);
  const nft = await getNFTByMint(mint);
  await tryAddOrUpdateNFT(address, nft);

  return createApiStandardResponse();
}
