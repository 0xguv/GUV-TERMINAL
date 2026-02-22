import React, { useState, useEffect, useCallback } from 'react';
import './BridgeHistory.css';

const CHAIN_NAMES = {
  1: 'Ethereum',
  10: 'Optimism',
  42161: 'Arbitrum',
  8453: 'Base',
  84532: 'Base Sepolia',
  11155111: 'Sepolia'
};

const ChainIcon = ({ chainId }) => {
  const icons = {
    1: '⟐',
    10: '⟐',
    42161: '⟐',
    8453: '⟐',
    84532: '⟐',
    11155111: '⟐'
  };
  return <span className="chain-icon">{icons[chainId] || '⟐'}</span>;
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const BridgeHistory = ({ walletAddress: propWalletAddress }) => {
  const [history, setHistory] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState(propWalletAddress || null);
  const [showMineOnly, setShowMineOnly] = useState(false);

  useEffect(() => {
    if (propWalletAddress) {
      setWalletAddress(propWalletAddress);
    } else if (typeof window.ethereum !== 'undefined') {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
          }
        })
        .catch(console.error);
    }
  }, [propWalletAddress]);

  const fetchAllHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.relay.link/requests/v2?limit=20&sortDirection=desc`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setAllHistory(data.requests || []);
      setHistory(data.requests || []);
    } catch (err) {
      console.error('Error fetching all history:', err);
      setError(err.message);
      setAllHistory([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    const address = walletAddress || propWalletAddress;
    if (!address) {
      setHistory([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.relay.link/requests/v2?user=${address}&limit=20&sortDirection=desc`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data.requests || []);
    } catch (err) {
      console.error('Error fetching bridge history:', err);
      setError(err.message);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, propWalletAddress]);

  useEffect(() => {
    fetchAllHistory();
    
    const interval = setInterval(fetchAllHistory, 30000);
    return () => clearInterval(interval);
  }, [fetchAllHistory]);

  useEffect(() => {
    const address = walletAddress || propWalletAddress;
    if (address) {
      fetchHistory();
      const interval = setInterval(fetchHistory, 30000);
      return () => clearInterval(interval);
    }
  }, [walletAddress, propWalletAddress, fetchHistory]);

  useEffect(() => {
    if (showMineOnly && (walletAddress || propWalletAddress)) {
      setHistory(allHistory.filter(tx => 
        tx.user?.toLowerCase() === (walletAddress || propWalletAddress)?.toLowerCase()
      ));
    } else {
      setHistory(allHistory);
    }
  }, [showMineOnly, allHistory, walletAddress, propWalletAddress]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'success': return 'status-success';
      case 'pending':
      case 'waiting': return 'status-pending';
      case 'failure': return 'status-failed';
      case 'refund': return 'status-refund';
      default: return '';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'success': return 'COMPLETED';
      case 'pending': return 'PENDING';
      case 'waiting': return 'PENDING';
      case 'failure': return 'FAILED';
      case 'refund': return 'REFUNDED';
      default: return status.toUpperCase();
    }
  };

  const formatAmount = (data) => {
    if (!data?.currencyObject) return '—';
    const { symbol, decimals } = data.currencyObject;
    
    let amount = '0';
    if (data.metadata?.currencyIn?.amountFormatted) {
      amount = data.metadata.currencyIn.amountFormatted;
    } else if (data.inTxs?.[0]) {
      const inTx = data.inTxs[0];
      amount = (parseInt(inTx.value || 0) / Math.pow(10, decimals || 18)).toFixed(4);
    }
    
    return `${parseFloat(amount).toFixed(4)} ${symbol || 'ETH'}`;
  };

  const getChainName = (chainId) => {
    return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
  };

  const getTxUrl = (chainId, hash) => {
    const explorers = {
      1: 'etherscan.io',
      10: 'optimistic.etherscan.io',
      42161: 'arbiscan.io',
      8453: 'basescan.org',
      84532: 'sepolia.basescan.org',
      11155111: 'sepolia.etherscan.io'
    };
    const explorer = explorers[chainId];
    if (!explorer) return `#`;
    return `https://${explorer}/tx/${hash}`;
  };

  if (!walletAddress) {
    return (
      <div className="bridge-history-empty">
        <span className="empty-text">Connect wallet to view history</span>
      </div>
    );
  }

  if (loading && allHistory.length === 0) {
    return (
      <div className="bridge-history-loading">
        <span className="loading-text">Loading history...</span>
      </div>
    );
  }

  const handleRefresh = () => {
    fetchAllHistory();
    const address = walletAddress || propWalletAddress;
    if (address) {
      fetchHistory();
    }
  };

  if (error && allHistory.length === 0) {
    return (
      <div className="bridge-history-error">
        <span className="error-text">{error}</span>
        <button className="retry-btn" onClick={handleRefresh}>Retry</button>
      </div>
    );
  }

  if (allHistory.length === 0) {
    return (
      <div className="bridge-history-empty">
        <span className="empty-text">No bridge transactions yet</span>
      </div>
    );
  }

  return (
    <div className="bridge-history">
      <div className="bridge-history-header">
        <div className="history-toggle-group">
          <button 
            className={`history-toggle-btn ${!showMineOnly ? 'active' : ''}`}
            onClick={() => setShowMineOnly(false)}
          >
            ALL
          </button>
          <button 
            className={`history-toggle-btn ${showMineOnly ? 'active' : ''}`}
            onClick={() => setShowMineOnly(true)}
            disabled={!walletAddress && !propWalletAddress}
          >
            MINE
          </button>
        </div>
        <button className="history-refresh-btn" onClick={handleRefresh}>↻</button>
      </div>
      <div className="bridge-history-list">
        {(showMineOnly && !walletAddress && !propWalletAddress) ? (
          <div className="bridge-history-empty">
            <span className="empty-text">Connect wallet to view your history</span>
          </div>
        ) : (
          history.map((tx) => {
            const inChain = tx.data?.inTxs?.[0]?.chainId;
            const outChain = tx.data?.outTxs?.[0]?.chainId;
            const inHash = tx.data?.inTxs?.[0]?.hash;
            const outHash = tx.data?.outTxs?.[0]?.hash;
            const inTime = tx.data?.inTxs?.[0]?.timestamp;
            const createdTime = tx.createdAt ? new Date(tx.createdAt).getTime() / 1000 : inTime;

            return (
              <div key={tx.id} className="bridge-history-item">
                <div className="history-item-main">
                  <div className="history-route">
                    <span className="chain-from">
                      <ChainIcon chainId={inChain} />
                      {getChainName(inChain)}
                    </span>
                    <span className="route-arrow">→</span>
                    <span className="chain-to">
                      <ChainIcon chainId={outChain} />
                      {getChainName(outChain)}
                    </span>
                  </div>
                  <span className={`history-status ${getStatusClass(tx.status)}`}>
                    {getStatusLabel(tx.status)}
                  </span>
                </div>
                <div className="history-item-details">
                  <span className="history-amount">{formatAmount(tx.data)}</span>
                  <span className="history-time">{formatTime(createdTime)}</span>
                </div>
                <div className="history-tx-links">
                  {inHash && (
                    <a 
                      href={getTxUrl(inChain, inHash)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      Origin
                    </a>
                  )}
                  {outHash && tx.status === 'success' && (
                    <a 
                      href={getTxUrl(outChain, outHash)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="tx-link"
                    >
                      Dest
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BridgeHistory;
