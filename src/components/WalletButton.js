import React from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import './WalletButton.css';

const WalletButton = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const { connection } = useConnection();

  // Format wallet address for display
  const formatAddress = (address) => {
    if (!address) return '';
    const addressStr = address.toBase58();
    return `${addressStr.slice(0, 4)}...${addressStr.slice(-4)}`;
  };

  return (
    <div className="wallet-button-container">
      {connected ? (
        <div className="wallet-connected">
          <div className="wallet-info">
            <span className="wallet-dot">●</span>
            <span className="wallet-address">{formatAddress(publicKey)}</span>
          </div>
          <button 
            className="wallet-disconnect-btn"
            onClick={disconnect}
          >
            DISCONNECT
          </button>
        </div>
      ) : (
        <WalletMultiButton className="wallet-multi-button">
          <span className="wallet-btn-text">CONNECT WALLET</span>
        </WalletMultiButton>
      )}
    </div>
  );
};

export default WalletButton;