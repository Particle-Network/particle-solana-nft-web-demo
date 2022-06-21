import { createApiStandardResponse } from './utils';
import connectionService from './connection-service';
import { IApiStandardResponse, RETRY_TRANSACTION_TYPE } from './common-types';
import { afterListNFT, processTransactions } from './list-nft';
import marketDatabase from './market-database';
import { ParticleNetwork } from '@particle-network/provider';
import { v4 as uuid } from 'uuid';
import { afterBuyNFT } from './buy-nft';

export async function retryTransaction(
  provider: ParticleNetwork,
  retryTransactionUuid: string
): Promise<IApiStandardResponse> {
  const address = provider.auth.userInfo()!.address;
  console.log(`retryTransaction:${address}`, retryTransactionUuid);

  const retryTransactionEntity = await marketDatabase.retryTransactions
    .where({ uuid: retryTransactionUuid })
    .first();
  if (!retryTransactionEntity) {
    return createApiStandardResponse('transaction not found');
  }
  if (retryTransactionEntity.address !== address) {
    return createApiStandardResponse('the transaction is not for you');
  }

  const recentBlockhash = await connectionService.getConnection().getLatestBlockhash();
  const responseProcessTransactions = await processTransactions(
    provider,
    retryTransactionEntity.transactions,
    0,
    recentBlockhash.blockhash
  );

  if (responseProcessTransactions.error) {
    const currentProcessTransactionIndex = responseProcessTransactions.result;
    await marketDatabase.retryTransactions.add({
      uuid: uuid(),
      address,
      type: retryTransactionEntity.type,
      transactions: retryTransactionEntity.transactions.slice(currentProcessTransactionIndex),
      data: retryTransactionEntity.data,
    });

    return responseProcessTransactions;
  }

  await marketDatabase.retryTransactions.where({ uuid: retryTransactionUuid }).delete();

  switch (retryTransactionEntity.type) {
    case RETRY_TRANSACTION_TYPE.NFT_BUY:
      await afterBuyNFT(provider, retryTransactionEntity.data);
      break;
    case RETRY_TRANSACTION_TYPE.NFT_LIST:
      await afterListNFT(provider, retryTransactionEntity.data);
      break;
  }

  return createApiStandardResponse();
}
