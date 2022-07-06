declare module NodeJS {
  interface Process extends NodeJS.Process {
    browser?: string;
  }
}

interface Window {
  gtag: (...args: any[]) => void;
  fbq: (...args: any[]) => void;
  particle: any;
  web3: any;
  solanaWallet: any;
}

declare module 'react-grid-carousel';
