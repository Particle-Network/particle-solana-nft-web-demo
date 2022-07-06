import { IApiStandardResponse, RPC_METHOD } from './common-types';
import marketDatabase from './market-database';
import connectionService from './connection-service';
import { createApiStandardResponse } from './utils';
import { SolanaWallet } from '@particle-network/solana-wallet';

export async function getNFTs(wallet: SolanaWallet, useCache: boolean = true): Promise<IApiStandardResponse> {
  const address: any = wallet.publicKey()?.toBase58();
  console.log(`getNFTs:${address}`);

  if (!useCache) {
    localStorage.removeItem(createKeyHasCacheNFTs(address));
  }

  if (useCache && localStorage.getItem(createKeyHasCacheNFTs(address)) === '1') {
    return createApiStandardResponse(null, await marketDatabase.nfts.where({ address }).toArray());
  }

  const responseGetTokenAndNFTs = await connectionService.rpcRequest(RPC_METHOD.GET_TOKENS_AND_NFTS, address);

  if (responseGetTokenAndNFTs.error) {
    return createApiStandardResponse(responseGetTokenAndNFTs.error);
  }

  await marketDatabase.nfts.where({ address }).delete();
  await marketDatabase.nfts.bulkPut(
    responseGetTokenAndNFTs.result.nfts.map((nft: any) => {
      return {
        mint: nft.mint,
        address,
        nft,
      };
    })
  );

  localStorage.setItem(createKeyHasCacheNFTs(address), '1');

  const nfts = await marketDatabase.nfts.where({ address }).toArray();

  return createApiStandardResponse(null, nfts);
}

export function createKeyHasCacheNFTs(address: string): string {
  return `particle_nft_market:${address}:has_cache_nfts`;
}
