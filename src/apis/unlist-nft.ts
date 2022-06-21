import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { createApiStandardResponse, signTransaction } from './utils';
import {
  IApiStandardResponse,
  RPC_METHOD,
  SOLANA_FEE_LAMPORTS_COST_PER_TRANSACTION,
} from './common-types';
import connectionService from './connection-service';
import { ParticleNetwork } from '@particle-network/provider';
import marketDatabase from './market-database';

export async function unlistNFT(
  provider: ParticleNetwork,
  auctionManagerAddress: string
): Promise<IApiStandardResponse> {
  const address = provider.auth.userInfo()!.address;
  console.log(`unlistNFT:${address}`, auctionManagerAddress);

  const balance = await connectionService.getConnection().getBalance(new PublicKey(address));
  if (balance < SOLANA_FEE_LAMPORTS_COST_PER_TRANSACTION) {
    return createApiStandardResponse(
      `Insufficient balance, please make sure your balance greater or equal to ${
        SOLANA_FEE_LAMPORTS_COST_PER_TRANSACTION / LAMPORTS_PER_SOL
      } SOL`
    );
  }

  const auctionEntity = await marketDatabase.auctions
    .where({ auctionManager: auctionManagerAddress })
    .first();
  if (!auctionEntity) {
    return createApiStandardResponse('Auction not found in local');
  }

  const auctionManagerAI = await connectionService
    .getConnection()
    .getAccountInfo(new PublicKey(auctionManagerAddress));
  if (!auctionManagerAI) {
    await marketDatabase.auctions.where({ auctionManager: auctionManagerAddress }).delete();

    return createApiStandardResponse('Auction not found on block chain');
  }

  // TODO check auctionManager state

  const responseNFTUnlist = await connectionService.rpcRequest(RPC_METHOD.NFT_UNLIST, {
    mint: auctionEntity.nft.mint,
    auctionManager: auctionManagerAddress,
  });

  if (responseNFTUnlist.error) {
    return createApiStandardResponse(responseNFTUnlist.error);
  }

  const responseSigned = await signTransaction(
    provider,
    responseNFTUnlist.result.transaction.serialized
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

  await marketDatabase.auctions.where({ auctionManager: auctionManagerAddress }).delete();

  return createApiStandardResponse();
}
