import { createApiStandardResponse } from './utils';
import connectionService from './connection-service';
import { IApiStandardResponse, NFT_BUY_ESTIMATED_FEE_LAMPORTS_COST, RETRY_TRANSACTION_TYPE, RPC_METHOD } from './common-types';
import { processTransactions } from './list-nft';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import marketDatabase from './market-database';
import { programs } from '@metaplex/js';
import { v4 as uuid } from 'uuid';
import { tryAddOrUpdateNFT } from './mint-nft';
import { uniq } from 'lodash';
import { SolanaWallet } from '@particle-network/solana-wallet';

export async function buyNFT(wallet: SolanaWallet, auctionManagerAddress: string): Promise<IApiStandardResponse> {
  const address: any = wallet?.publicKey?.toBase58();
  console.log(`buyNFT:${address}`, auctionManagerAddress);

  const auctionEntity = await marketDatabase.auctions.where({ auctionManager: auctionManagerAddress }).first();
  if (!auctionEntity) {
    return createApiStandardResponse('Auction not found in local');
  }

  const balanceNeeded = NFT_BUY_ESTIMATED_FEE_LAMPORTS_COST + auctionEntity.price * LAMPORTS_PER_SOL;
  const balance = await connectionService.getConnection().getBalance(new PublicKey(address));
  if (balance < balanceNeeded) {
    return createApiStandardResponse(`Insufficient balance, please make sure your balance greater or equal to ${balanceNeeded / LAMPORTS_PER_SOL} SOL`);
  }

  const auctionManagerAI = await connectionService.getConnection().getAccountInfo(new PublicKey(auctionManagerAddress));
  if (!auctionManagerAI) {
    await marketDatabase.auctions.where({ auctionManager: auctionManagerAddress }).delete();

    return createApiStandardResponse('Auction not found on block chain');
  }

  const auctionManagerData = programs.metaplex.AuctionManagerV2Data.deserialize(auctionManagerAI.data);
  const auction = auctionManagerData.auction;
  const auctionAI = await connectionService.getConnection().getAccountInfo(new PublicKey(auction));
  const auctionData = programs.auction.AuctionData.deserialize(auctionAI!.data);
  if (auctionData.state !== programs.auction.AuctionState.Started) {
    await marketDatabase.auctions.where({ auctionManager: auctionManagerAddress }).delete();

    return createApiStandardResponse('Auction not in started state');
  }

  const responseNFTBuy = await connectionService.rpcRequest(RPC_METHOD.NFT_BUY, {
    buyer: address,
    mint: auctionEntity.nft.mint,
    auctionManager: auctionManagerAddress,
  });

  if (responseNFTBuy.error) {
    return createApiStandardResponse(responseNFTBuy.error);
  }

  const data = {
    authority: auctionManagerData.authority,
    mint: auctionEntity.nft.mint,
    auctionManager: auctionManagerAddress,
    nft: auctionEntity.nft,
  };

  const responseProcessTransactions = await processTransactions(wallet, responseNFTBuy.result.transactions);
  if (responseProcessTransactions.error) {
    /**
     * Transactions failed, so we check if we need to retry
     *
     * transactions structure:
     * 0. place bid, if failed, we don't need to finish the rest of transactions
     * 1. redeem bid & claim bid
     *
     * the transactions after place bid, if failed, we need to retry
     * because we spend our money but the nft still not be transfered to our account, we must finish the rest of transactions
     * otherwise, the nft will be lost
     *
     * more info: https://docs.metaplex.com/architecture/basic_flow
     */
    const toRetryTransactionIndex = 1;
    const currentProcessTransactionIndex = responseProcessTransactions.result;
    const needRetry = currentProcessTransactionIndex >= toRetryTransactionIndex;
    if (needRetry) {
      await marketDatabase.retryTransactions.add({
        uuid: uuid(),
        address,
        type: RETRY_TRANSACTION_TYPE.NFT_BUY,
        transactions: responseNFTBuy.result.transactions.slice(currentProcessTransactionIndex),
        data,
      });
    }

    return responseProcessTransactions;
  }

  await afterBuyNFT(wallet, data);

  return createApiStandardResponse();
}

export async function afterBuyNFT(wallet: SolanaWallet, args: any) {
  const address: any = wallet?.publicKey?.toBase58();

  await marketDatabase.auctions.where({ auctionManager: args.auctionManager }).delete();
  await tryAddOrUpdateNFT(address, args.nft);

  const settlers: string[] = [args.authority];
  if (args.nft.sellerFeeBasisPoints > 0) {
    for (const creator of args.nft.metadata.data.creators) {
      if (creator.share > 0) {
        settlers.push(creator);
      }
    }
  }

  for (const settler of uniq(settlers)) {
    await marketDatabase.settles.add({
      uuid: uuid(),
      address: settler,
      auctionManager: args.auctionManager,
      nft: args.nft,
    });
  }
}
