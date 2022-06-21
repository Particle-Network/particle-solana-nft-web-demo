import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { createApiStandardResponse, signTransaction } from './utils';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { programs } from '@metaplex/js';
import { IApiStandardResponse, NFT_MINT_FEE_LAMPORTS_COST, RPC_METHOD } from './common-types';
import connectionService from './connection-service';
import marketDatabase from './market-database';
import { ParticleNetwork } from '@particle-network/provider';

export async function mintNFT(
  provider: ParticleNetwork,
  config: any,
  fromData: FormData
): Promise<IApiStandardResponse> {
  const address = provider.auth.userInfo()!.address;
  console.log(`mintNFT:${address}`, config, fromData);

  const balance = await connectionService.getConnection().getBalance(new PublicKey(address));
  if (balance < NFT_MINT_FEE_LAMPORTS_COST) {
    return createApiStandardResponse(
      `Insufficient balance, please make sure your balance greater or equal to ${
        NFT_MINT_FEE_LAMPORTS_COST / LAMPORTS_PER_SOL
      } SOL`
    );
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

  const responseMintNFT = await connectionService.rpcRequest(RPC_METHOD.NFT_MINT, address, config);
  if (responseMintNFT.error) {
    return createApiStandardResponse(responseMintNFT.error);
  }

  const responseSigned = await signTransaction(
    provider,
    responseMintNFT.result.transaction.serialized
  );

  if (responseSigned.error) {
    return createApiStandardResponse(responseSigned.error);
  }

  const responseConfirm = await connectionService.rpcRequest(
    RPC_METHOD.SEND_AND_CONFIRM_RAW_TRANSACTION,
    bs58.encode(Buffer.from(responseSigned.result, 'base64')),
    {
      commitment: 'recent',
    }
  );

  if (responseConfirm.error) {
    return createApiStandardResponse(responseConfirm.error);
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
  const metadataAI = await connectionService.getConnection().getAccountInfo(metadata);
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
