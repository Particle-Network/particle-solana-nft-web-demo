import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { createApiStandardResponse, signAllTransactions } from './utils';
import { IApiStandardResponse, RPC_METHOD, SOLANA_FEE_LAMPORTS_COST_PER_TRANSACTION } from './common-types';
import connectionService from './connection-service';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { SolanaWallet } from '@particle-network/solana-wallet';

export async function checkHasInitializedStore(wallet: SolanaWallet): Promise<IApiStandardResponse> {
  const address: any = wallet.publicKey()?.toBase58();

  const hasInitializedStore = localStorage.getItem(createKeyHasInitializedStore(address)) === '1';
  if (hasInitializedStore) {
    return createApiStandardResponse(null, true);
  }

  const response = await connectionService.rpcRequest(RPC_METHOD.NFT_CHECK_STORE_HAS_INITIALIZED, address);
  if (response.error) {
    return createApiStandardResponse(response.error);
  }

  const hasInitialized = response.result;
  if (hasInitialized) {
    localStorage.setItem(createKeyHasInitializedStore(address), '1');
  }

  return createApiStandardResponse(null, hasInitialized);
}

export async function checkHasSetWhitelistedCreator(wallet: SolanaWallet, marketManagerAddress: string): Promise<IApiStandardResponse> {
  const address: any = wallet.publicKey()?.toBase58();

  const hasSetWhitelistedCreator = localStorage.getItem(createKeyHasSetWhitelistedCreator(address)) === '1';
  if (hasSetWhitelistedCreator) {
    return createApiStandardResponse(null, true);
  }

  const response = await connectionService.rpcRequest(RPC_METHOD.NFT_CHECK_STORE_CREATOR_IS_ACTIVATED, {
    market: getMarketPDA(marketManagerAddress).toBase58(),
    creator: address,
  });

  if (response.error) {
    return createApiStandardResponse(response.error);
  }

  const isActivated = response.result;
  if (isActivated) {
    localStorage.setItem(createKeyHasInitializedStore(address), '1');
  }

  return createApiStandardResponse(null, isActivated);
}

export async function initializStoreAndSetCreator(wallet: SolanaWallet): Promise<IApiStandardResponse> {
  const address: any = wallet.publicKey()?.toBase58();

  const balance = await connectionService.getConnection().getBalance(new PublicKey(address));
  if (balance < SOLANA_FEE_LAMPORTS_COST_PER_TRANSACTION) {
    return createApiStandardResponse(`Insufficient balance, please make sure your balance greater or equal to ${SOLANA_FEE_LAMPORTS_COST_PER_TRANSACTION / LAMPORTS_PER_SOL} SOL`);
  }

  const hasInitializedStore = localStorage.getItem(createKeyHasInitializedStore(address)) === '1000';
  const hasSetWhitelistedCreator = localStorage.getItem(createKeyHasSetWhitelistedCreator(address)) === '1000';

  const unsignedTransactions = [];

  if (!hasInitializedStore) {
    const responseInitStore = await connectionService.rpcRequest(RPC_METHOD.NFT_INITIALIZE_STORE, address);
    if (responseInitStore.error) {
      return createApiStandardResponse(responseInitStore.error);
    }

    unsignedTransactions.push(responseInitStore.result.transaction.serialized);
  }

  if (!hasSetWhitelistedCreator) {
    const responseSetWhitelistedCreator = await connectionService.rpcRequest(RPC_METHOD.NFT_SET_WHITE_LISTED_CREATOR, {
      marketManager: address,
      creator: address,
      activated: true,
    });

    if (responseSetWhitelistedCreator.error) {
      return createApiStandardResponse(responseSetWhitelistedCreator.error);
    }

    unsignedTransactions.push(responseSetWhitelistedCreator.result.transaction.serialized);
  }

  if (unsignedTransactions.length <= 0) {
    return createApiStandardResponse();
  }

  const responseSigned = await signAllTransactions(wallet, unsignedTransactions);
  if (responseSigned.error) {
    return createApiStandardResponse(responseSigned.error);
  }

  const signedTransactions = responseSigned.result;
  for (const signedTransaction of signedTransactions) {
    const responseConfirm = await connectionService.rpcRequest(RPC_METHOD.SEND_AND_CONFIRM_RAW_TRANSACTION, bs58.encode(Buffer.from(signedTransaction?.serialize(), 'base64')), {
      commitment: 'recent',
    });

    if (responseConfirm.error) {
      return createApiStandardResponse(responseConfirm.error);
    }
  }

  localStorage.setItem(createKeyHasInitializedStore(address), '1');
  localStorage.setItem(createKeyHasSetWhitelistedCreator(address), '1');

  return createApiStandardResponse();
}

export function createKeyHasInitializedStore(address: string): string {
  return `particle_nft_market:${address}:has_initialized_store`;
}

export function createKeyHasSetWhitelistedCreator(address: string): string {
  return `particle_nft_market:${address}:has_set_whitelisted_creator`;
}

export function getMarketPDA(marketManager: string) {
  const metaplexProgram = new PublicKey('p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98');

  return PublicKey.findProgramAddressSync([Buffer.from('metaplex'), metaplexProgram.toBuffer(), new PublicKey(marketManager).toBuffer()], metaplexProgram)[0];
}
