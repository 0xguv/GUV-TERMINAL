import React, { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

const DEFAULT_RPC = 'https://solana-rpc.publicnode.com';

const WalletContextProvider = ({ children }) => {
  // Use Mainnet
  const network = WalletAdapterNetwork.Mainnet;

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('guvSettings');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const handleSettingsChange = () => {
      const saved = localStorage.getItem('guvSettings');
      setSettings(saved ? JSON.parse(saved) : {});
    };
    window.addEventListener('guv-settings-change', handleSettingsChange);
    return () => window.removeEventListener('guv-settings-change', handleSettingsChange);
  }, []);

  // Use custom RPC from settings, or fall back to default public RPC
  const endpoint = useMemo(() => {
    let rpc = settings.customSolanaRpc;
    if (rpc && rpc.trim()) {
      rpc = rpc.trim();
      if (!rpc.startsWith('http://') && !rpc.startsWith('https://')) {
        rpc = 'https://' + rpc;
      }
      return rpc;
    }
    return DEFAULT_RPC;
  }, [settings.customSolanaRpc]);

  // Only use Phantom and Solflare wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default WalletContextProvider;
