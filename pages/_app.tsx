import React, { ReactElement, ReactNode, useEffect, useMemo } from 'react';
import type { AppProps } from 'next/app';
import '@/styles/globals.less';
import Head from 'next/head';
import 'antd/dist/antd.css';
import '@/styles/index.less';
import store from '@/store/index';
import { Provider } from 'react-redux';
import { NextPage } from 'next';

type NextPageWithLayout = NextPage & {
  getLayout?: (props: { children: ReactElement }) => ReactElement;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const Layout = Component.getLayout ?? ((props: { children: ReactElement }) => props.children);
  return (
    <Provider store={store}>
      <Head>
        <title>NFT Market</title>
        <meta property="description" key="description" content="nft market" />
      </Head>
      <Layout {...pageProps}>
        {/* @ts-ignore */}
        <Component {...pageProps} />
      </Layout>
    </Provider>
  );
}

export default MyApp;
