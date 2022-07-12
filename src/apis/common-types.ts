import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const BASE_API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://api.particle.network';
export const SOLANA_RPC_URL = `${BASE_API_URL}/solana/rpc`;
export const IPFS_URL = `${BASE_API_URL}/ipfs/upload`;
export const DATABASE_NAME: string = 'particle-nft-market';

export const ERROR_MESSAGE_BLOCK_HASH_NOT_FOUND: string = 'failed to send transaction: Transaction simulation failed: Blockhash not found';

export const NFT_LIST_ESTIMATED_FEE_LAMPORTS_COST: number = 0.0314398 * LAMPORTS_PER_SOL;
export const NFT_BUY_ESTIMATED_FEE_LAMPORTS_COST: number = 0.0144272 * LAMPORTS_PER_SOL;
export const NFT_MINT_FEE_LAMPORTS_COST: number = 0.0119812 * LAMPORTS_PER_SOL;
export const SOLANA_FEE_LAMPORTS_COST_PER_TRANSACTION: number = 0.000005 * LAMPORTS_PER_SOL;

export enum CHAIN_ID {
  MAINNET = 101,
  TESTNET = 102,
  DEVNET = 103,
}

export enum RETRY_TRANSACTION_TYPE {
  NFT_LIST,
  NFT_BUY,
}

export enum RPC_METHOD {
  AIRDROP = 'enhancedAirdrop',
  GET_ACCOUNT_INFO = 'getAccountInfo',
  NFT_INITIALIZE_STORE = 'NFT_MP_initializeMarket',
  NFT_CHECK_STORE_HAS_INITIALIZED = 'NFT_MP_isMarketInitialized',
  NFT_CHECK_STORE_CREATOR_IS_ACTIVATED = 'NFT_MP_isMarketCreatorActivated',
  NFT_SET_WHITE_LISTED_CREATOR = 'NFT_MP_setMarketCreator',
  NFT_MINT = 'NFT_mint',
  NFT_UPDATE = 'NFT_update',
  NFT_LIST = 'NFT_MP_list',
  NFT_UNLIST = 'NFT_MP_unlist',
  NFT_SETTLE = 'NFT_MP_settle',
  NFT_WITHDRAW = 'NFT_MP_withdraw',
  NFT_BUY = 'NFT_MP_buy',
  SEND_AND_CONFIRM_RAW_TRANSACTION = 'enhancedSendAndConfirmRawTransaction',
  GET_TOKENS_AND_NFTS = 'enhancedGetTokensAndNFTs',
}

export interface IApiStandardResponse {
  result: any;
  error: any;
}

export interface IApiStandardTransaction {
  hasPartialSign: boolean;
  serialized: string; // base58 encoded transaction serialized
  signers: string[]; // base58 encoded (secret key)
}
