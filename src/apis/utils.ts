import { ParticleNetwork } from '@particle-network/provider';
import { IApiStandardResponse } from './common-types';

export function createBasicAuthString(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;
}

export function createApiStandardResponse(error: any = null, result: any = null): IApiStandardResponse {
  return { result, error };
}

export async function signAllTransactions(provider: ParticleNetwork, unsignedTransactions: string[]): Promise<IApiStandardResponse> {
  try {
    const signedTransactions = await provider.getSolanaProvider().signAllTransactions(unsignedTransactions);
    return createApiStandardResponse(null, signedTransactions);
  } catch (error) {
    return createApiStandardResponse(error);
  }
}

export async function signTransaction(provider: ParticleNetwork, unsignedTransaction: string): Promise<IApiStandardResponse> {
  try {
    const signedTransaction = await provider.getSolanaProvider().signTransaction(unsignedTransaction);
    return createApiStandardResponse(null, signedTransaction);
  } catch (error) {
    return createApiStandardResponse(error);
  }
}

export function getProviderSolanaAddress(provider: ParticleNetwork): string {
  const userInfo: any = provider.auth.userInfo();
  if (userInfo?.address) {
    return userInfo.address;
  }

  return userInfo?.wallets.filter((w: any) => w.chain_name === 'solana')[0].public_address;
}
