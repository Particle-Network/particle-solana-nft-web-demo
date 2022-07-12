import React, { useEffect, useState } from 'react';
import { Button, Popover, message } from 'antd';
import { connectWallet, isLogin as isLoginHandle, getUserInfo, logout } from '@/utils/index';
import { clearDB } from '@/apis/index';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { CopyOutlined } from '@ant-design/icons';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { setUserInfo, setSpinning, selecteIsLogin, setLogin, selectUserInfo, selecteChainId, setChainId, selecteHasInitializedStore, setHasInitializedStore } from '@/store/nftSlice';

import { getBalance, withdrawWSOLAccount, CHAIN_ID } from '@/apis/index';

const Header = (props: any) => {
  const dispatch = useAppDispatch();

  const isLogin = useAppSelector(selecteIsLogin);

  const userInfo = useAppSelector(selectUserInfo);

  const chainId = useAppSelector(selecteChainId);

  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [unfold, setUnfold] = useState(false);

  const [withdrawShow, setWithdrawShow] = useState(false);

  const [chainList] = useState(
    Object.keys(CHAIN_ID)
      .filter((key: any) => parseInt(CHAIN_ID[key]))
      .map((key: any) => ({ label: key, value: CHAIN_ID[key] }))
  );

  const userMenuContent = (
    <div>
      <div className="menu-list">
        <div className="user-info">
          <div className="wrapper">
            <div className="left">
              <img src={userInfo.userImage} alt="" />
            </div>
            <div className="right">
              <div className="userName">Normie</div>
              <div className="address">
                <span>{(userInfo.address || '').substring(0, 5) + '...' + (userInfo.address || '').substring((userInfo.address || '').length - 5)}</span>
                <CopyToClipboard
                  text={userInfo.address || ''}
                  onCopy={() => {
                    message.success('Copy Successfully！');
                  }}
                >
                  <CopyOutlined />
                </CopyToClipboard>
              </div>
            </div>
          </div>
          <div className="network-name">NetWork：{(chainList.find((item) => parseInt(item.value) == chainId) || {}).label}</div>
        </div>
        <div className="balance-content">
          <div className="main-wallect">
            <div className="left">
              <img src="/icon1.svg" alt="" />
            </div>
            <div className="right">
              <div className="name">Main Wallet</div>
              <div className="balance">{userInfo.balance}◎</div>
            </div>
          </div>
          <div className="bidding-wallect">
            <div className="left">
              <img src="/icon1.svg" alt="" />
            </div>
            <div className="right">
              <div className="wrapper">
                <div className="name">Bidding Wallet</div>
                <div className="balance">{userInfo.wsolBalance}◎</div>
              </div>
              <div
                className="o-btn"
                onClick={() => {
                  setWithdrawShow((val) => {
                    return !val;
                  });
                }}
              >
                <img src="/icon3.svg" alt="" />
              </div>
            </div>
          </div>
          <div
            className={'withdraw-wallet ' + (withdrawShow ? 'activate' : '')}
            onClick={() => {
              if (!withdrawLoading) {
                setWithdrawLoading(true);
                withdrawWSOLAccount(window.solanaWallet)
                  .then((res) => {
                    setWithdrawLoading(false);
                    if (res.error) {
                      throw new Error(res.error);
                    } else {
                      message.success('Success');
                      setWithdrawShow(false);
                      if (props.getBalanceHandle) {
                        props.getBalanceHandle();
                      }
                    }
                  })
                  .catch((error: Error) => {
                    setWithdrawLoading(false);
                    message.error(error.message);
                  });
              }
            }}
          >
            <span>Withdraw to main wallet</span>
          </div>
        </div>
        <div className="switch-content">
          <div
            className="title"
            onClick={() => {
              setUnfold((val) => {
                return !val;
              });
            }}
          >
            <span>Switch Network</span>
            <i className="arrow-down-icon">
              <img src="/arrow-down.svg" alt="" />
            </i>
          </div>
          <div className={'sub-list ' + (unfold ? 'unfold' : '')}>
            {chainList.map((item, index) => {
              return (
                <div
                  key={index}
                  className={'sub-item ' + (parseInt(item.value) == chainId ? 'activate' : '')}
                  onClick={() => {
                    clearDB(window.solanaWallet);
                    dispatch(setChainId(parseInt(item.value)));
                    location.reload();
                  }}
                >
                  {item.label}
                </div>
              );
            })}
          </div>
        </div>
        <div
          className="disconnect-content"
          onClick={() => {
            logout().then(() => {
              dispatch(setLogin(isLoginHandle()));
              dispatch(setUserInfo(getUserInfo()));
              localStorage.removeItem('chainId');
              localStorage.removeItem('hasInitializedStore');
            });
          }}
        >
          Disconnect
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    dispatch(setLogin(isLoginHandle()));
    dispatch(setUserInfo(getUserInfo()));
    // console.log(createUserImg());
  }, []);

  return (
    <div className="header-content">
      <div className="left logo">
        <a href="https://particle.network/">
          <img src="https://particle.network/images/logo-top.png" alt="" />
        </a>
      </div>
      <div className="right btns">
        {isLogin ? (
          <>
            {/* <div className="network-name">
              NetWork：{(chainList.find(item => parseInt(item.value) == chainId) || {}).label}
            </div> */}
            <Popover
              placement="topLeft"
              content={userMenuContent}
              trigger="hover"
              overlayClassName="user-menu-content"
              defaultVisible={false}
              // visible={true}
            >
              <div className="use-info">
                <img src={userInfo.userImage} alt="" />
              </div>
            </Popover>
          </>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

export default Header;
