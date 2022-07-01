import React, { useEffect, useState } from 'react';
import { Tabs, Spin, Button, message, Badge } from 'antd';
import Header from './modules/header';
import NftList from './modules/nftList';
import MintNFT from './modules/mintNFT';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import connectionService from '@/apis/connection-service';
import {
  getNFTs,
  listNFT,
  getAuctions,
  getSettles,
  getRetryTransactions,
  getBalance,
  getWSOLBalance,
  checkHasSetWhitelistedCreator,
  checkHasInitializedStore,
  initializStoreAndSetCreator,
} from '@/apis/index';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { connectWallet, isLogin as isLoginHandle, getUserInfo } from '@/utils/index';
import {
  setUserInfo,
  setSpinning,
  selecteIsLogin,
  setLogin,
  selectSpinning,
  selectNftImageData,
  setNftList,
  setNftImageData,
  selecteChainId,
  selecteHasInitializedStore,
  setHasInitializedStore,
} from '@/store/nftSlice';
import { NftListType, UserInfoProp, NftData } from '@/types/types.d';
import { getProviderSolanaAddress } from '@/apis/utils';

const Index = () => {
  const dispatch = useAppDispatch();

  const [activeKey, setActiveKey] = useState<NftListType>(NftListType.MyNft);

  const isLogin = useAppSelector(selecteIsLogin);

  const spinning = useAppSelector(selectSpinning);

  const nftImageData = useAppSelector(selectNftImageData);

  const chainId = useAppSelector(selecteChainId);

  const hasInitializedStore = useAppSelector(selecteHasInitializedStore);

  /**
   * getNftImages
   * @param nftList
   */
  const getNftImages = async (nftList: Array<NftData>) => {
    const waitingList = nftList
      .map((item) => {
        return {
          mint: item.mint,
          uri: item.nft.metadata.data.uri,
        };
      })
      .filter((item) => !nftImageData[item.mint]);

    for (let i = 0; i < waitingList.length; i++) {
      try {
        const { mint, uri } = waitingList[i];
        if (!nftImageData[mint]) {
          try {
            const imgSrc: string = await fetch(uri)
              .then((res) => {
                return res.json();
              })
              .then((res) => {
                return res.image;
              });
            dispatch(setNftImageData({ mint, imgSrc }));
          } catch (error) {
            console.log(error);
          }
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  const getNftListHandle = (type: NftListType = activeKey) => {
    getBalanceHandle();
    if (type === NftListType.Market) {
      // Market
      dispatch(setSpinning(true));
      getAuctions(window.particle)
        .then((list: Array<any>) => {
          list = list.map((item) => {
            item.mint = item.nft.mint;
            return item;
          });
          dispatch(setNftList(list || []));
          getNftImages(list);
          dispatch(setSpinning(false));
        })
        .catch((error: Error) => {
          console.log(error);
          dispatch(setSpinning(false));
        });
    } else if (type === NftListType.MyNft) {
      // My NFT
      dispatch(setSpinning(true));
      getNFTs(window.particle, false)
        .then((res) => {
          if (res && !res.error) {
            dispatch(setNftList(res.result || []));
            getNftImages(res.result);
            dispatch(setSpinning(false));
          } else {
            throw new Error(res.error);
          }
        })
        .catch((error) => {
          message.error(error.message);
          dispatch(setSpinning(false));
        });
    } else if (type == NftListType.SettleAccounts) {
      // SettleAccounts
      dispatch(setSpinning(true));
      getSettles(window.particle)
        .then((list: any) => {
          list = list.map((item: any) => {
            item.mint = item.nft.mint;
            return item;
          });
          dispatch(setNftList(list));
          getNftImages(list);
          dispatch(setSpinning(false));
        })
        .catch((error: Error) => {
          message.error(error.message);
          dispatch(setSpinning(false));
        });
    } else if (type == NftListType.UncompletedTransaction) {
      // UncompletedTransaction
      getRetryTransactions(window.particle)
        .then((list: any) => {
          list = list.map((item: any) => {
            const { address, data, transactions, type, uuid } = item;
            return {
              address,
              ...data,
              transactions,
              type,
              uuid,
            };
          });
          dispatch(setNftList(list));
          getNftImages(list);
          dispatch(setSpinning(false));
        })
        .catch((error: Error) => {
          message.error(error.message);
          dispatch(setSpinning(false));
        });
    }
  };

  const [settleCount, setSettleCount] = useState(0);

  const getSettleCountHandle = () => {
    getSettles(window.particle)
      .then((list: any) => {
        setSettleCount(list.length);
      })
      .catch((error: Error) => {
        console.log(error);
      });
  };

  const settlesTab = (
    <div className="tab-wrapper seetles-tab-content">
      <i className="iconfont icon-mjiesuan"></i>
      <span>Settles</span>
      {settleCount ? (
        <div className="tab-badge-content">
          <Badge count={settleCount} size="small" />
        </div>
      ) : (
        ''
      )}
    </div>
  );

  const getBalanceHandle = () => {
    getBalance(window.particle)
      .then((balance: number) => {
        console.log(`balance`, balance);
        dispatch(setUserInfo({ balance: balance / LAMPORTS_PER_SOL } as UserInfoProp));
      })
      .catch((error: Error) => {
        console.log(error);
      });

    getWSOLBalance(window.particle)
      .then((balance: number) => {
        console.log(`wSOLBalance`, balance / LAMPORTS_PER_SOL);
        dispatch(
          setUserInfo({
            wsolBalance: balance / LAMPORTS_PER_SOL,
          } as UserInfoProp)
        );
      })
      .catch((error: Error) => {
        console.log(error);
      });
  };

  useEffect(() => {
    if (activeKey && isLogin) {
      getNftListHandle(activeKey);
    }
  }, [activeKey, isLogin]);

  useEffect(() => {
    connectionService.setChainId(chainId);
  }, [chainId]);

  useEffect(() => {
    if (isLogin) {
      Promise.all([checkHasInitializedStore(window.particle), checkHasSetWhitelistedCreator(window.particle, getProviderSolanaAddress(window.particle))]).then((res: any) => {
        if (typeof res.find((item: any) => !!item.error || item.result == false) != 'undefined') {
          dispatch(setHasInitializedStore(false));
        } else {
          dispatch(setHasInitializedStore(true));
        }
      });
    }
  }, [isLogin]);

  return (
    <div className="index-container">
      <Spin spinning={spinning}>
        <div className="wrapper">
          <Header getBalanceHandle={getBalanceHandle} />
          <div className="main">
            <div className="main-wrapper">
              {isLogin && !hasInitializedStore ? (
                <div className="connect-walllet-content">
                  {/* <h1>Connect your wallet to view your NFT</h1> */}
                  <Button
                    onClick={() => {
                      dispatch(setSpinning(true));
                      initializStoreAndSetCreator(window.particle).then((res) => {
                        if (res.error) {
                          message.error(res.error);
                          dispatch(setSpinning(false));
                        } else {
                          dispatch(setLogin(isLoginHandle()));
                          dispatch(setUserInfo(getUserInfo()));
                          dispatch(setSpinning(false));
                          dispatch(setHasInitializedStore(true));
                        }
                      });
                    }}
                  >
                    Initialize Store
                  </Button>
                </div>
              ) : isLogin ? (
                <Tabs size="large" activeKey={activeKey} centered={true} onChange={(activeKey: string) => setActiveKey(activeKey as NftListType)}>
                  <Tabs.TabPane
                    tab={
                      <div className="tab-wrapper">
                        {' '}
                        <i className="iconfont icon-mcaidan"></i>
                        <span>Market</span>
                      </div>
                    }
                    key={NftListType.Market}
                  >
                    {activeKey == NftListType.Market ? <NftList type={NftListType.Market} getNftListHandle={getNftListHandle} getSettleCountHandle={getSettleCountHandle} /> : ''}
                  </Tabs.TabPane>
                  <Tabs.TabPane
                    tab={
                      <div className="tab-wrapper">
                        {' '}
                        <i className="iconfont icon-myewubiaodan"></i>
                        <span>Mint NFT</span>
                      </div>
                    }
                    key={NftListType.MintNft}
                  >
                    {activeKey == NftListType.MintNft ? <MintNFT type={NftListType.MintNft} setActiveKey={setActiveKey} /> : ''}
                  </Tabs.TabPane>
                  <Tabs.TabPane
                    tab={
                      <div className="tab-wrapper">
                        {' '}
                        <i className="iconfont icon-m31wode"></i>
                        <span>My NFTs</span>
                      </div>
                    }
                    key={NftListType.MyNft}
                  >
                    {activeKey == NftListType.MyNft ? <NftList type={NftListType.MyNft} getNftListHandle={getNftListHandle} /> : ''}
                  </Tabs.TabPane>
                  <Tabs.TabPane tab={settlesTab} key={NftListType.SettleAccounts}>
                    {activeKey == NftListType.SettleAccounts ? <NftList type={NftListType.SettleAccounts} getNftListHandle={getNftListHandle} getSettleCountHandle={getSettleCountHandle} /> : ''}
                  </Tabs.TabPane>
                  <Tabs.TabPane
                    tab={
                      <div className="tab-wrapper">
                        {' '}
                        <i className="iconfont icon-morder-incomplete"></i>
                        <span>Uncompleted Transactions</span>
                      </div>
                    }
                    key={NftListType.UncompletedTransaction}
                  >
                    {activeKey == NftListType.UncompletedTransaction ? <NftList type={NftListType.UncompletedTransaction} getNftListHandle={getNftListHandle} /> : ''}
                  </Tabs.TabPane>
                </Tabs>
              ) : (
                <div className="connect-walllet-content">
                  <h1>Connect your wallet to view your NFT</h1>
                  <Button
                    onClick={() => {
                      dispatch(setSpinning(true));
                      connectWallet()
                        .then((res: boolean) => {
                          dispatch(setLogin(isLoginHandle()));
                          dispatch(setUserInfo(getUserInfo()));
                          dispatch(setSpinning(false));
                          dispatch(setHasInitializedStore(res));
                        })
                        .catch((error: Error) => {
                          dispatch(setLogin(isLoginHandle()));
                          dispatch(setSpinning(false));
                          if (error.message) {
                            message.error(error.message);
                          }
                        });
                    }}
                  >
                    Connect
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Spin>
    </div>
  );
};

export default Index;
