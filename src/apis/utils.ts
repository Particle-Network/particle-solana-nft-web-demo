import { IApiStandardResponse } from './common-types';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { Transaction } from '@solana/web3.js';
import { SolanaWallet } from '@particle-network/solana-wallet';

export function createBasicAuthString(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

export function createApiStandardResponse(error: any = null, result: any = null): IApiStandardResponse {
  return { result, error };
}

export async function signAllTransactions(wallet: SolanaWallet, unsignedTransactions: string[]): Promise<IApiStandardResponse> {
  try {
    const transactions = unsignedTransactions.map((val) => Transaction.from(bs58.decode(val)));
    const signedTransactions = await wallet.signAllTransactions(transactions);
    return createApiStandardResponse(null, signedTransactions);
  } catch (error) {
    return createApiStandardResponse(error);
  }
}

export async function signTransaction(wallet: SolanaWallet, unsignedTransaction: string): Promise<IApiStandardResponse> {
  try {
    const transaction = Transaction.from(bs58.decode(unsignedTransaction));
    const signedTransaction = await wallet.signTransaction(transaction);
    return createApiStandardResponse(null, signedTransaction);
  } catch (error) {
    console.error(error);
    return createApiStandardResponse(error);
  }
}
