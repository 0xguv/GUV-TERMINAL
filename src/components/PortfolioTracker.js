import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AlertTriangle, Wallet } from 'lucide-react';
import './PortfolioTracker.css';

const PortfolioTracker = () => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalValue, setTotalValue] = useState(0);

  // Token metadata cache
  const tokenMetadata = {
    'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Solana', decimals: 9 },
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk', decimals: 5 },
    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU': { symbol: 'SAMO', name: 'Samoyedcoin', decimals: 9 },
  };

  const fetchPortfolio = async () => {
    if (!publicKey || !connected) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check connection
      if (!connection) {
        throw new Error('No connection to Solana network');
      }

      // Get SOL balance
      let solBalance;
      try {
        solBalance = await connection.getBalance(publicKey);
      } catch (connErr) {
        throw new Error('Failed to connect to Solana RPC. Please check your internet connection.');
      }
      
      const solAmount = solBalance / 1e9;

      // Get token accounts
      let tokenAccounts;
      try {
        tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );
      } catch (tokenErr) {
        // Continue with just SOL balance
        tokenAccounts = { value: [] };
      }

      // Build portfolio array
      const portfolioData = [
        {
          symbol: 'SOL',
          name: 'Solana',
          balance: solAmount,
          mint: 'So11111111111111111111111111111111111111112',
          isNative: true,
          decimals: 9
        }
      ];

      // Add token balances
      tokenAccounts.value.forEach((tokenAccount) => {
        const accountData = tokenAccount.account.data.parsed.info;
        const mint = accountData.mint;
        const balance = accountData.tokenAmount.uiAmount;
        
        if (balance > 0) {
          const metadata = tokenMetadata[mint] || { 
            symbol: mint.slice(0, 6) + '...', 
            name: 'Unknown Token',
            decimals: accountData.tokenAmount.decimals 
          };
          
          portfolioData.push({
            symbol: metadata.symbol,
            name: metadata.name,
            balance: balance,
            mint: mint,
            isNative: false,
            decimals: metadata.decimals
          });
        }
      });

      // Fetch real-time prices from backend
      let prices = {};
      try {
        const symbols = portfolioData.map(t => t.symbol).join(',');
        const priceResponse = await fetch(`/api/cmc/quotes?symbol=${symbols}`);
        if (priceResponse.ok) {
          const priceData = await priceResponse.json();
          if (priceData.data) {
            Object.keys(priceData.data).forEach(symbol => {
              prices[symbol] = priceData.data[symbol].quote.USD.price;
            });
          }
        }
      } catch (priceErr) {
        // Fallback: Use CoinGecko for SOL if CMC fails
        try {
          const cgResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
          if (cgResponse.ok) {
            const cgData = await cgResponse.json();
            if (cgData.solana) {
              prices['SOL'] = cgData.solana.usd;
            }
          }
        } catch (cgErr) {
          // Silently handle errors
        }
      }

      // Add price data to portfolio
      const portfolioWithPrices = portfolioData.map(token => ({
        ...token,
        price: prices[token.symbol] || null,
        value: prices[token.symbol] ? token.balance * prices[token.symbol] : null
      }));

      setPortfolio(portfolioWithPrices);
      
      // Calculate total value from real prices
      const totalPortfolioValue = portfolioWithPrices.reduce((sum, token) => {
        return sum + (token.value || 0);
      }, 0);
      
      setTotalValue(totalPortfolioValue);
      
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to fetch portfolio. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connected && publicKey) {
      fetchPortfolio();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchPortfolio, 30000);
      return () => clearInterval(interval);
    }
  }, [connected, publicKey, connection]);

  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    if (num >= 1) return num.toFixed(4);
    return num.toFixed(6);
  };

  if (!connected) {
    return (
      <div className="portfolio-tracker">
        <div className="portfolio-section">
          <div className="portfolio-empty">
            <div className="empty-icon"><Wallet size={48} /></div>
            <div className="empty-title">WALLET NOT CONNECTED</div>
            <div className="empty-text">
              Connect your Solana wallet to track your portfolio
            </div>
            <div className="portfolio-connect-btn">
              <WalletMultiButton className="mobile-wallet-btn" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && portfolio.length === 0) {
    return (
      <div className="portfolio-tracker">
        <div className="portfolio-section">
          <div className="portfolio-loading">
            <span className="loading-text" style={{ color: 'var(--terminal-green)' }}>LOADING ...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-tracker">
      <div className="portfolio-section">
        {error && (
          <div className="portfolio-error">
          <span className="error-icon"><AlertTriangle size={20} /></span>
          <span className="error-text">{error}</span>
          <button className="retry-btn" onClick={fetchPortfolio}>
            [RETRY]
          </button>
        </div>
      )}

      <div className="portfolio-header">
        <div className="portfolio-title">PORTFOLIO OVERVIEW</div>
        <div className="portfolio-total">
          <span className="total-label">EST. VALUE</span>
          <span className="total-value">~${formatNumber(totalValue)}</span>
        </div>
      </div>

      <div className="portfolio-list">
        <div className="portfolio-list-header">
          <div className="header-asset-col">
            <span className="header-rank">#</span>
            <span className="header-asset">ASSET</span>
          </div>
          <span className="header-balance">BALANCE</span>
          <span className="header-price">PRICE</span>
          <span className="header-value">VALUE (USD)</span>
        </div>

        {portfolio.map((token, index) => (
          <div key={token.mint} className={`portfolio-item ${token.isNative ? 'native' : ''}`}>
            <div className="token-info">
              <span className="token-rank">{index + 1}</span>
              <div className="token-details">
                <span className="token-symbol">{token.symbol}</span>
                <span className="token-name">{token.name}</span>
              </div>
            </div>
            <div className="token-balance">
              {formatNumber(token.balance)}
            </div>
            <div className="token-price">
              {token.price ? `$${formatNumber(token.price)}` : '--'}
            </div>
            <div className="token-value">
              {token.value ? `~$${formatNumber(token.value)}` : (token.price ? `~$${formatNumber(token.balance * token.price)}` : '--')}
            </div>
          </div>
        ))}
      </div>

        <div className="portfolio-footer">
          <span>Auto-refresh every 30s</span>
          <button className="refresh-btn" onClick={fetchPortfolio}>
            [REFRESH]
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortfolioTracker;