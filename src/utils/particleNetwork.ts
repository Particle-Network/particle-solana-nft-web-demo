import { isServer } from './env-util';
import { ParticleNetwork } from '@particle-network/auth';
import { ParticleProvider } from '@particle-network/provider';
import { SolanaWallet } from '@particle-network/solana-wallet';
import Web3 from 'web3';
import { CHAIN_ID } from '../apis/common-types';
import connectionService from '../apis/connection-service';
import { checkHasInitializedStore, checkHasSetWhitelistedCreator, initializStoreAndSetCreator } from '@/apis/index';

let pn: any = {};

if (!isServer()) {
  try {
    const chainId = CHAIN_ID.DEVNET;

    pn = new ParticleNetwork({
      projectId: process.env.NEXT_PUBLIC_PROJECT_ID as string,
      clientKey: process.env.NEXT_PUBLIC_PROJECT_CLIENT_KEY as string,
      appId: process.env.NEXT_PUBLIC_PROJECT_APP_ID as string,
      // chainName: 'ethereum',
      // chainId: 42,
      chainName: 'Solana',
      chainId,
      // rpcUrl: (process.env.NEXT_PUBLIC_BASE_URL || 'https://api.particle.network') as string,
      authUrl: (process.env.NEXT_PUBLIC_AUTH_URL || 'https://auth.particle.network') as string,
    });

    // examples https://github.com/solana-labs/solana/blob/master/web3.js/examples/get_account_info.js
    // window.web3 = new solanaWeb3.Connection(process.env.NEXT_PUBLIC_AUTH_URL, pn.getSolanaProvider);

    connectionService.setChainId(chainId);
    connectionService.setProject(process.env.NEXT_PUBLIC_PROJECT_ID as string, process.env.NEXT_PUBLIC_PROJECT_CLIENT_KEY as string);

    const evmProvider: any = new ParticleProvider(pn.auth);

    window.web3 = new Web3(evmProvider);
    window.web3.currentProvider.isParticleNetwork; // => true
    window.solanaWallet = new SolanaWallet(pn?.auth);
  } catch (error) {
    console.error(error);
  }
}

export const connectWallet = () => {
  return pn.auth
    .login()
    .then(() => {
      return Promise.all([checkHasInitializedStore(window.solanaWallet), checkHasSetWhitelistedCreator(window.solanaWallet, window.solanaWallet?.publicKey?.toBase58())]);
    })
    .then((res: any) => {
      if (typeof res.find((item: any) => !!item.error || item.result == false) != 'undefined') {
        return false;
      } else {
        return true;
      }
    });
};

export const isLogin = () => {
  return pn.auth.isLogin();
};

export const getUserInfo = () => {
  return pn.auth.userInfo();
};

export const getBalance = async () => {
  const accounts = await window.web3.eth.getAccounts();
  window.web3.eth.getBalance(accounts[0]).then((value: string) => {
    console.log('getBalance', window.web3.utils.fromWei(value, 'ether'));
  });
};

export const getChainId = () => {
  window.web3.eth.getChainId((error: Error, chainId: string) => {
    if (error) throw error;
    console.log('chainId', chainId);
  });
};

export const getAccounts = () => {
  return new Promise((resolve, reject) => {
    window.web3.eth.getAccounts((error: Error, accounts: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(accounts);
      }
    });
  });
};

export const logout = () => {
  return pn.auth.logout();
};
