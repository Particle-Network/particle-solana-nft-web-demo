import { Connection, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmRawTransaction } from '@solana/web3.js';
import { createApiStandardResponse, signTransaction } from './utils';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { programs } from '@metaplex/js';
import { IApiStandardResponse, NFT_MINT_FEE_LAMPORTS_COST, RPC_METHOD } from './common-types';
import connectionService from './connection-service';
import marketDatabase from './market-database';
import { SolanaWallet } from '@particle-network/solana-wallet';

export async function mintNFT(wallet: SolanaWallet, config: any, fromData: FormData): Promise<IApiStandardResponse> {
  const address: any = wallet?.publicKey?.toBase58();
  console.log(`mintNFT:${address}`, config, fromData);

  const balance = await connectionService.getConnection().getBalance(new PublicKey(address));
  if (balance < NFT_MINT_FEE_LAMPORTS_COST) {
    return createApiStandardResponse(`Insufficient balance, please make sure your balance greater or equal to ${NFT_MINT_FEE_LAMPORTS_COST / LAMPORTS_PER_SOL} SOL`);
  }

  const responseIpfs = await connectionService.uploadFile(fromData);
  console.log('responseIpfs', responseIpfs);

  if (responseIpfs.error) {
    return createApiStandardResponse(responseIpfs.error);
  }

  config.image = responseIpfs.url;
  config.properties = {
    category: 'image', // only support image for this demo
    creators: [
      {
        address,
        share: 100,
      },
    ],
  };

  const responseMintNFT = await connectionService.rpcRequest(RPC_METHOD.NFT_MINT, {
    owner: address,
    metadata: config,
  });
  if (responseMintNFT.error) {
    return createApiStandardResponse(responseMintNFT.error);
  }

  const responseSigned = await signTransaction(wallet, responseMintNFT.result.transaction.serialized);

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

  const mintAddress = responseMintNFT.result.mint;
  const mint = new PublicKey(mintAddress);
  const nft = await getNFTByMint(mint);

  await tryAddOrUpdateNFT(address, nft);

  return createApiStandardResponse();
}

export async function tryAddOrUpdateNFT(address: string, nft: any) {
  const updateCount = await marketDatabase.nfts.where({ mint: nft.mint }).modify({ nft });
  console.log('tryAddOrUpdateNFT updateCount', updateCount);

  if (updateCount === 0) {
    await marketDatabase.nfts.add({ address, mint: nft.mint });
  }

  return nft;
}

export async function getNFTByMint(mint: PublicKey): Promise<any> {
  const metadata = await Metadata.getPDA(mint);
  const metadataAI = await connectionService.getConnection('recent').getAccountInfo(metadata);
  const metadataData = programs.metadata.MetadataData.deserialize(metadataAI?.data as any);

  const nft = {
    mint: mint.toBase58(),
    name: metadataData.data.name,
    symbol: metadataData.data.symbol,
    sellerFeeBasisPoints: metadataData.data.sellerFeeBasisPoints,
    metadata: metadataData,
  };

  return nft;
}
