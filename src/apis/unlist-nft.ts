import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { createApiStandardResponse, signTransaction } from './utils';
import { IApiStandardResponse, RPC_METHOD, SOLANA_FEE_LAMPORTS_COST_PER_TRANSACTION } from './common-types';
import connectionService from './connection-service';
import marketDatabase from './market-database';
import { SolanaWallet } from '@particle-network/solana-wallet';

export async function unlistNFT(wallet: SolanaWallet, auctionManagerAddress: string): Promise<IApiStandardResponse> {
  const address: any = wallet?.publicKey?.toBase58();
  console.log(`unlistNFT:${address}`, auctionManagerAddress);

  const balance = await connectionService.getConnection().getBalance(new PublicKey(address));
  if (balance < SOLANA_FEE_LAMPORTS_COST_PER_TRANSACTION) {
    return createApiStandardResponse(`Insufficient balance, please make sure your balance greater or equal to ${SOLANA_FEE_LAMPORTS_COST_PER_TRANSACTION / LAMPORTS_PER_SOL} SOL`);
  }

  const auctionEntity = await marketDatabase.auctions.where({ auctionManager: auctionManagerAddress }).first();
  if (!auctionEntity) {
    return createApiStandardResponse('Auction not found in local');
  }

  const auctionManagerAI = await connectionService.getConnection().getAccountInfo(new PublicKey(auctionManagerAddress));
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

  const responseSigned = await signTransaction(wallet, responseNFTUnlist.result.transaction.serialized);

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

  await marketDatabase.auctions.where({ auctionManager: auctionManagerAddress }).delete();

  return createApiStandardResponse();
}
