import { SolanaWallet } from '@particle-network/solana-wallet';
import { DATABASE_NAME } from './common-types';
import { createKeyHasInitializedStore, createKeyHasSetWhitelistedCreator } from './init-store';

export async function clearDB(wallet: SolanaWallet) {
    const address: any = wallet.publicKey()?.toBase58();

    indexedDB.deleteDatabase(DATABASE_NAME);
    localStorage.removeItem(createKeyHasInitializedStore(address));
    localStorage.removeItem(createKeyHasSetWhitelistedCreator(address));
}
