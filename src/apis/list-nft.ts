import { createApiStandardResponse, signAllTransactions } from './utils';
import { Store } from '@metaplex-foundation/mpl-metaplex';
import { Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import connectionService from './connection-service';
import { ERROR_MESSAGE_BLOCK_HASH_NOT_FOUND, IApiStandardResponse, IApiStandardTransaction, NFT_LIST_ESTIMATED_FEE_LAMPORTS_COST, RETRY_TRANSACTION_TYPE, RPC_METHOD } from './common-types';
import bs58 from 'bs58';
import marketDatabase from './market-database';
import { v4 as uuid } from 'uuid';
import { SolanaWallet } from '@particle-network/solana-wallet';

/**
 * @param wallet Seller
 * @param marketManagerAddress The address of market administrator
 * @param mintAddress The mint address of the NFT to sell
 * @param price Seller's price (sol), such as 0.1 sol
 */
export async function listNFT(wallet: SolanaWallet, marketManagerAddress: string, mintAddress: string, price: number) {
  const address: any = wallet.publicKey()?.toBase58();
  console.log(`listNFT:${address}`, mintAddress, price);

  const balance = await connectionService.getConnection().getBalance(new PublicKey(address));
  if (balance < NFT_LIST_ESTIMATED_FEE_LAMPORTS_COST) {
    return createApiStandardResponse(`Insufficient balance, please make sure your balance greater or equal to ${NFT_LIST_ESTIMATED_FEE_LAMPORTS_COST / LAMPORTS_PER_SOL} SOL`);
  }

  const nftEntity = await marketDatabase.nfts.where({ mint: mintAddress }).first();
  if (!nftEntity) {
    return createApiStandardResponse('NFT not found');
  }

  if (nftEntity.address !== address) {
    return createApiStandardResponse('NFT not yours');
  }

  const store = await Store.getPDA(new PublicKey(marketManagerAddress));
  const responseNFTList = await connectionService.rpcRequest(RPC_METHOD.NFT_LIST, {
    seller: address,
    mint: mintAddress,
    market: store.toBase58(),
    price: price * LAMPORTS_PER_SOL,
  });

  if (responseNFTList.error) {
    return createApiStandardResponse(responseNFTList.error);
  }

  const auctionManagerAddress = responseNFTList.result.auctionManager;

  const responseProcessTransactions = await processTransactions(wallet, responseNFTList.result.transactions);

  const data = {
    mint: mintAddress,
    auctionManager: auctionManagerAddress,
    price,
    nft: nftEntity.nft,
  };

  if (responseProcessTransactions.error) {
    /**
     * Transactions failed, so we check if we need to retry
     *
     * transactions structure:
     * 0. create external priceAccount, if failed, we don't need to finish the rest of transactions
     * 1. create vault, if failed, we don't need to finish the rest of transactions
     * 2. add nft to vault, if failed, we don't need to finish the rest of transactions
     * 3. close vault
     * 4. make auction
     * 5. start auction
     *
     * the transactions after add nft to vault, if failed, we need to retry
     * because the tokens are not in provider's account, we must finish the rest of transactions
     * otherwise, the nft will be lost
     *
     * more info: https://docs.metaplex.com/architecture/basic_flow
     */
    const toRetryTransactionIndex = 3;
    const currentProcessTransactionIndex = responseProcessTransactions.result;
    const needRetry = currentProcessTransactionIndex >= toRetryTransactionIndex;
    if (needRetry) {
      await marketDatabase.retryTransactions.add({
        uuid: uuid(),
        address,
        type: RETRY_TRANSACTION_TYPE.NFT_LIST,
        transactions: responseNFTList.result.transactions.slice(currentProcessTransactionIndex),
        data,
      });
    }

    return responseProcessTransactions;
  }

  await afterListNFT(wallet, data);

  return createApiStandardResponse();
}

export async function afterListNFT(wallet: SolanaWallet, args: any) {
  const address: any = wallet.publicKey()?.toBase58();

  await marketDatabase.nfts.where({ address, mint: args.mint }).delete();

  await marketDatabase.auctions.add({
    auctionManager: args.auctionManager,
    address,
    price: args.price,
    nft: args.nft,
  });
}

/**
 * @param wallet which one to sign all of transactions
 * @param transactions transactions which has been partial signed except the provider
 * @param currentProcessTransactionIndex which transaction to process, start from 0
 * @param blockhash if assigned, the transaction will be replaced with this blockhash
 */
export async function processTransactions(
  wallet: SolanaWallet,
  transactions: IApiStandardTransaction[],
  currentProcessTransactionIndex: number = 0,
  blockhash?: string
): Promise<IApiStandardResponse> {
  console.log('processTransactions');

  try {
    const signedTransactions = new Array(transactions.length).fill(null);

    const unsignedTransactions = [];
    for (let index = currentProcessTransactionIndex; index < transactions.length; index++) {
      if (blockhash) {
        const transaction = Transaction.from(bs58.decode(transactions[index].serialized));

        const newTransaction = new Transaction().add(...transaction.instructions);
        newTransaction.feePayer = wallet.publicKey()!;
        newTransaction.recentBlockhash = blockhash;

        const signers = transactions[index].signers.map((s: string) => Keypair.fromSecretKey(bs58.decode(s)));

        if (signers.length > 0) {
          newTransaction.partialSign(...signers);
        }

        unsignedTransactions.push(bs58.encode(newTransaction.serialize({ requireAllSignatures: false })));
      } else {
        unsignedTransactions.push(transactions[index].serialized);
      }
    }

    const responseSigned = await signAllTransactions(wallet, unsignedTransactions);
    if (responseSigned.error) {
      console.error(responseSigned.error);

      throw new Error(responseSigned.error.message);
    }

    for (let index = transactions.length - 1; index >= currentProcessTransactionIndex; index--) {
      signedTransactions[index] = responseSigned.result.pop();
    }

    for (let index = currentProcessTransactionIndex; index < signedTransactions.length; index++) {
      const signedTransaction = signedTransactions[index];
      if (!signedTransaction) {
        continue;
      }

      currentProcessTransactionIndex = index;

      const responseConfirm = await connectionService.rpcRequest(RPC_METHOD.SEND_AND_CONFIRM_RAW_TRANSACTION, bs58.encode(Buffer.from(signedTransaction?.serialize(), 'base64')), {
        commitment: 'recent',
      });

      console.log('confirm transaction', responseConfirm);

      if (responseConfirm.error) {
        console.error(responseConfirm.error);

        throw new Error(responseConfirm.error?.data?.extraMessage?.message ?? responseConfirm.error?.message);
      }
    }

    return createApiStandardResponse();
  } catch (error: any) {
    console.log('processTransactions error', error);

    // if the error is block hash not found, we can update the block hash and continue with the rest of transactions
    if (error.message === ERROR_MESSAGE_BLOCK_HASH_NOT_FOUND) {
      const recentBlockhash = await connectionService.getConnection().getLatestBlockhash();

      return await processTransactions(wallet, transactions, currentProcessTransactionIndex, recentBlockhash.blockhash);
    }

    return createApiStandardResponse(error, currentProcessTransactionIndex);
  }
}
