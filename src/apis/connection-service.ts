import { Commitment, Connection } from '@solana/web3.js';
import { CHAIN_ID, IPFS_URL, RPC_METHOD, SOLANA_RPC_URL } from './common-types';
import { createBasicAuthString } from './utils';
import Axios from 'axios';

export default new (class ConnectionService {
  public chainId: CHAIN_ID = 103;
  public projectId: string = '';
  public projectClientKey: string = '';

  public setChainId(chainId: number) {
    this.chainId = chainId;
  }

  public setProject(projectId: string, projectClientKey: string) {
    console.log('setProject', projectId, projectClientKey);

    this.projectId = projectId;
    this.projectClientKey = projectClientKey;
  }

  public async rpcRequest(method: RPC_METHOD, ...params: any[]) {
    try {
      const { data } = await Axios.post(
        `${SOLANA_RPC_URL}?chainId=${this.chainId}`,
        {
          method: method,
          params,
        },
        {
          auth: {
            username: this.projectId,
            password: this.projectClientKey,
          },
        }
      );

      return data;
    } catch (error) {
      return { error };
    }
  }

  public async uploadFile(fromData: FormData) {
    try {
      let { data } = await Axios.post(IPFS_URL, fromData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        auth: {
          username: this.projectId,
          password: this.projectClientKey,
        },
      });

      return data;
    } catch (error) {
      return { error };
    }
  }

  public getConnection(commitment: Commitment = 'confirmed'): Connection {
    const wsEndpoint = SOLANA_RPC_URL.replace('https', 'wss').replace('http', 'ws');

    return new Connection(`${SOLANA_RPC_URL}?chainId=${this.chainId}`, {
      commitment,
      wsEndpoint: `${wsEndpoint}?chainId=${this.chainId}&projectUuid=${this.projectId}&projectKey=${this.projectClientKey}`,
      httpHeaders: {
        Authorization: createBasicAuthString(this.projectId, this.projectClientKey),
      },
    });
  }
})();
