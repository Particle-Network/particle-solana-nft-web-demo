import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { createApiStandardResponse, signTransaction } from './utils';
import { IApiStandardResponse, RPC_METHOD } from './common-types';
import connectionService from './connection-service';
import { ParticleNetwork } from '@particle-network/provider';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, NATIVE_MINT } from '@particle/spl-token';

export async function withdrawWSOLAccount(
  provider: ParticleNetwork
): Promise<IApiStandardResponse> {
  const address = provider.auth
    .userInfo()
    .wallets.filter((w) => w.chain_name === 'solana')[0].public_address;
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

  const responseSigned = await signTransaction(
    provider,
    responseNFTWithdraw.result.transaction.serialized
  );

  if (responseSigned.error) {
    return createApiStandardResponse(responseSigned.error);
  }

  const responseConfirm = await connectionService.rpcRequest(
    RPC_METHOD.SEND_AND_CONFIRM_RAW_TRANSACTION,
    bs58.encode(Buffer.from(responseSigned.result, 'base64')),
    {
      commitment: 'recent',
    }
  );

  if (responseConfirm.error) {
    return createApiStandardResponse(responseConfirm.error);
  }

  return createApiStandardResponse();
}
