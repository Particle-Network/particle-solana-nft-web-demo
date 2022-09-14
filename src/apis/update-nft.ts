import { PublicKey } from '@solana/web3.js';
import { IApiStandardResponse, RPC_METHOD } from './common-types';
import connectionService from './connection-service';
import { createApiStandardResponse, signTransaction } from './utils';
import { getNFTByMint, tryAddOrUpdateNFT } from './mint-nft';
import { SolanaWallet } from '@particle-network/solana-wallet';

export async function updateNFT(wallet: SolanaWallet, mintAddress: string, config: any): Promise<IApiStandardResponse> {
  const address: any = wallet?.publicKey?.toBase58();
  console.log(`updateNFT:${address}`, mintAddress, config);

  const responseNFTUpdate = await connectionService.rpcRequest(RPC_METHOD.NFT_UPDATE, {
    mint: mintAddress,
    metadata: config,
  });

  if (responseNFTUpdate.error) {
    return createApiStandardResponse(responseNFTUpdate.error);
  }

  const responseSigned = await signTransaction(wallet, responseNFTUpdate.result.transaction.serialized);

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

  const mint = new PublicKey(mintAddress);
  const nft = await getNFTByMint(mint);
  await tryAddOrUpdateNFT(address, nft);

  return createApiStandardResponse();
}
