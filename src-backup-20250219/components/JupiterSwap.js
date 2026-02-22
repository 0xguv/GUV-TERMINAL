import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import './JupiterSwap.css';

const JUPITER_API_KEY = process.env.REACT_APP_JUPITER_API_KEY;

const base64ToUint8Array = (base64) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const uint8ArrayToBase64 = (uint8Array) => {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
};

const JupiterSwap = () => {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [fromToken, setFromToken] = useState('SOL');
  const [toToken, setToToken] = useState('BONK');
  const [fromAmount, setFromAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState(null);
  const [swapSuccess, setSwapSuccess] = useState(null);
  const [walletBalances, setWalletBalances] = useState({});
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const [customTokens, setCustomTokens] = useState([]);
  const [searchingToken, setSearchingToken] = useState(false);
  const [lastSwapTxId, setLastSwapTxId] = useState(null);

  const popularTokens = [
    { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112', decimals: 9 },
    { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
    { symbol: 'USDT', name: 'Tether', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
    { symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5 },
    { symbol: 'WIF', name: 'Dogwifhat', mint: '85VBFQZC9TZkfaptBWqv14ALD9fJNUKtWA41kh69teRP', decimals: 6 },
    { symbol: 'JUP', name: 'Jupiter', mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtkqjberbSOWw91TsfU', decimals: 6 },
    { symbol: 'RAY', name: 'Raydium', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59a5FDNJTYKwjJA', decimals: 6 },
    { symbol: 'ORCA', name: 'Orca', mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfIC6iW8fNX7wdUg', decimals: 6 },
    { symbol: 'PYTH', name: 'Pyth Network', mint: 'HZ1JovNiVvGrGNiiYvEozEVg6Db6MAQvYpihjcMSBCYt', decimals: 6 },
    { symbol: 'MEW', name: 'cat in a dogs world', mint: 'MEW1gQW4aHrfNcc3Kk58a7rG2TSS3YGzoB1xJJCvXHm', decimals: 5 },
    { symbol: 'POPCAT', name: 'Popcat', mint: '8HGyABBqGmXVWvD9R7mXpKu5u5W3q3wFwnb8cMZN7m7U', decimals: 9 },
    { symbol: 'WEN', name: 'Wen', mint: 'WENWENv2QyE8dC1MPT9xQpEBqQXLK5WPukYbwEGJbU3', decimals: 5 },
    { symbol: 'MICHI', name: 'Michi', mint: 'MCPo3iS3Xeu3jAFpE7Wm7w23w5AQMxhnXwGDVCvCMWR', decimals: 6 },
    { symbol: 'MOODENG', name: 'Moo Deng', mint: 'ED5nyyZzpTPYQ5dB4xjt3Y3rYbNLQXzSaK9i5i9N7wU', decimals: 9 },
    { symbol: 'PNUT', name: 'Peanut the Squirrel', mint: '7dHbWXmBcHPB1ZkdJJ9Z5j4F3F5T7Q3G2Y9Z5j4F3F5', decimals: 9 },
  ];

  // Search for token by address or name
  const searchToken = async (query) => {
    if (!query.trim()) return;
    
    setSearchingToken(true);
    try {
      // Check if it's a mint address (base58 encoded, 32-44 chars)
      const isAddress = query.length >= 32 && query.length <= 44;
      
      if (isAddress) {
        // Try to fetch token info from Jupiter
        const response = await fetch(`https://api.jup.ag/tokens/v1/token/${query}`, {
          headers: {
            'x-api-key': JUPITER_API_KEY
          }
        });
        
        if (response.ok) {
          const tokenData = await response.json();
          if (tokenData && tokenData.address) {
            const newToken = {
              mint: tokenData.address,
              symbol: tokenData.symbol || 'UNKNOWN',
              name: tokenData.name || 'Unknown Token',
              decimals: tokenData.decimals || 6
            };
            
            // Check if token already exists
            const exists = [...popularTokens, ...customTokens].some(t => t.mint === newToken.mint);
            if (!exists) {
              setCustomTokens(prev => [...prev, newToken]);
            }
          }
        }
      }
    } catch (err) {
      // Silently handle errors
    } finally {
      setSearchingToken(false);
    }
  };

  // Filter tokens based on search query
  const getFilteredTokens = () => {
    const allTokens = [...popularTokens, ...customTokens];
    if (!tokenSearchQuery.trim()) return allTokens;
    
    const query = tokenSearchQuery.toLowerCase();
    return allTokens.filter(token => 
      token.symbol.toLowerCase().includes(query) ||
      token.name.toLowerCase().includes(query) ||
      token.mint.toLowerCase().includes(query)
    );
  };

  const fetchWalletBalances = useCallback(async () => {
    if (!publicKey || !connected || !connection) {
      console.log('Cannot fetch balance:', { publicKey: !!publicKey, connected, connection: !!connection });
      setWalletBalances({});
      return;
    }

    try {
      const balances = {};

      // Get SOL balance
      try {
        console.log('Fetching SOL balance for:', publicKey.toBase58());
        const solBalance = await connection.getBalance(publicKey);
        console.log('SOL balance:', solBalance);
        balances['SOL'] = solBalance / Math.pow(10, 9);
      } catch (err) {
        console.error('Error fetching SOL balance:', err);
        balances['SOL'] = 0;
      }

      // Get token accounts
      try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );

        tokenAccounts.value.forEach((account) => {
          const mint = account.account.data.parsed.info.mint;
          const balance = account.account.data.parsed.info.tokenAmount.uiAmount;

          const tokenInfo = popularTokens.find(t => t.mint === mint);
          if (tokenInfo && balance > 0) {
            balances[tokenInfo.symbol] = balance;
          }
        });
      } catch (err) {
        // Silently handle errors
      }

      setWalletBalances(balances);
    } catch (error) {
      // Silently handle errors
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    fetchWalletBalances();
  }, [fetchWalletBalances]);

  // Refresh balances periodically
  useEffect(() => {
    if (!connected || !publicKey) return;
    
    const interval = setInterval(() => {
      fetchWalletBalances();
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [connected, publicKey, fetchWalletBalances]);

  const getTokenBySymbol = (symbol) => {
    return popularTokens.find(t => t.symbol === symbol) || customTokens.find(t => t.symbol === symbol);
  };

  const formatAddress = (address) => {
    if (!address) return '';
    const addressStr = address.toBase58();
    return `${addressStr.slice(0, 8)}...${addressStr.slice(-8)}`;
  };

  const formatBalance = (symbol) => {
    const balance = walletBalances[symbol] || 0;
    if (balance >= 1000) return balance.toFixed(2);
    if (balance >= 1) return balance.toFixed(4);
    if (balance >= 0.01) return balance.toFixed(4);
    return balance.toFixed(6);
  };

  const fetchQuote = useCallback(async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0 || !connected) {
      setQuote(null);
      return;
    }

    setLoading(true);
    setSwapError(null);

    try {
      const fromTokenData = getTokenBySymbol(fromToken);
      const toTokenData = getTokenBySymbol(toToken);

      if (!fromTokenData || !toTokenData) {
        throw new Error('Invalid token selection');
      }

      const balance = walletBalances[fromToken] || 0;
      const inputAmount = parseFloat(fromAmount);

      if (inputAmount > balance) {
        throw new Error(`Insufficient balance. You have ${balance.toFixed(4)} ${fromToken}.`);
      }

      if (fromToken === 'SOL' && inputAmount > balance - 0.005) {
        throw new Error(`Keep at least 0.005 SOL for fees.`);
      }

      const amount = Math.floor(inputAmount * Math.pow(10, fromTokenData.decimals));

      const url = `https://api.jup.ag/ultra/v1/order?inputMint=${fromTokenData.mint}&outputMint=${toTokenData.mint}&amount=${amount}&slippageBps=100&prioritizationFeeLamports=0`;

      const response = await fetch(url, {
        headers: {
          'x-api-key': JUPITER_API_KEY
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('Insufficient') || errorText.includes('balance')) {
          throw new Error('Insufficient balance for this swap.');
        }
        throw new Error('Quote failed. Try a smaller amount.');
      }

      const data = await response.json();
      setQuote(data);
    } catch (error) {
      setSwapError(error.message);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [fromAmount, fromToken, toToken, connected, walletBalances]);

  useEffect(() => {
    if (fromAmount && connected) {
      const timer = setTimeout(fetchQuote, 300);
      return () => clearTimeout(timer);
    }
  }, [fromAmount, fetchQuote, connected]);

  const handleSwap = async () => {
    if (!quote || !connected || !publicKey || !sendTransaction) {
      setSwapError('Wallet not ready for swap');
      return;
    }

    setSwapLoading(true);
    setSwapError(null);
    setSwapSuccess(null);

    try {
      const fromTokenData = getTokenBySymbol(fromToken);
      const toTokenData = getTokenBySymbol(toToken);
      const amount = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromTokenData.decimals));

      const orderParams = new URLSearchParams({
        inputMint: fromTokenData.mint,
        outputMint: toTokenData.mint,
        amount: amount.toString(),
        taker: publicKey.toBase58(),
        slippageBps: '100',
        prioritizationFeeLamports: '0',
      });

      const orderUrl = `https://api.jup.ag/ultra/v1/order?${orderParams}`;
      
      const orderResponse = await fetch(orderUrl, {
        headers: {
          'x-api-key': JUPITER_API_KEY
        }
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        setSwapError('Quote expired or low liquidity. Try refreshing the quote.');
        setQuote(null);
        return;
      }

      const order = await orderResponse.json();

      if (order.errorCode || !order.transaction) {
        setSwapError('Quote expired or low liquidity. Try refreshing the quote.');
        await fetchQuote();
        return;
      }

      const transaction = VersionedTransaction.deserialize(base64ToUint8Array(order.transaction));

      const signedResult = await sendTransaction(transaction, connection);
      
      const signature = typeof signedResult === 'string' ? signedResult : signedResult.signature;

      const executeResponse = await fetch('https://api.jup.ag/ultra/v1/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': JUPITER_API_KEY
        },
        body: JSON.stringify({
          signedTransaction: uint8ArrayToBase64(transaction.serialize()),
          requestId: order.requestId,
        }),
      });

      if (!executeResponse.ok) {
        const errorText = await executeResponse.text();
        setSwapError('Transaction failed. Market may have moved. Try again.');
        return;
      }

      const executeResult = await executeResponse.json();

      if (executeResult.status === 'Success') {
        setLastSwapTxId(executeResult.signature);
        setSwapSuccess(`Swap confirmed! Tx: ${executeResult.signature.slice(0, 8)}...${executeResult.signature.slice(-8)}`);
      } else {
        setSwapError('Swap execution failed. Try again.');
      }

      await fetchWalletBalances();
      setFromAmount('');
      setQuote(null);

    } catch (error) {
      setSwapError(error.message || 'Swap failed. Please try again.');
    } finally {
      setSwapLoading(false);
    }
  };

  const handleSetMaxAmount = () => {
    const balance = walletBalances[fromToken] || 0;
    let maxAmount = balance;

    if (fromToken === 'SOL') {
      maxAmount = Math.max(0, balance - 0.01);
    }

    setFromAmount(maxAmount.toFixed(4).replace(/\.?0+$/, ''));
  };

  const outputAmount = quote 
    ? (parseFloat(quote.outAmount) / Math.pow(10, getTokenBySymbol(toToken)?.decimals || 6)).toFixed(6)
    : '0.000000';

  const priceImpact = quote 
    ? (parseFloat(quote.priceImpactPct) || 0).toFixed(2)
    : '0.00';

  const routesInfo = quote 
    ? `${quote.routePlan?.length || 1} hop${(quote.routePlan?.length || 1) > 1 ? 's' : ''}`
    : 'Direct';

  return (
    <div className="jupiter-swap">
      <div className="swap-container">
        <div className="swap-interface">
          <div className="swap-row">
            <div className="swap-label">
              FROM 
              {connected && (
                <span className="wallet-balance-info">
                  (Balance: {formatBalance(fromToken)} {fromToken})
                  <button 
                    className="balance-refresh-btn"
                    onClick={fetchWalletBalances}
                    title="Refresh balance"
                  >
                    ↻
                  </button>
                </span>
              )}
            </div>
            <div className="token-input-group">
              <div 
                className="token-selector"
                onClick={() => setShowFromDropdown(!showFromDropdown)}
              >
                <span className="token-symbol">{fromToken}</span>
                <span className="token-dropdown">▼</span>
              </div>
              <input
                type="number"
                className="amount-input"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                disabled={!connected}
              />
              {connected && (
                <button 
                  className="max-btn"
                  onClick={handleSetMaxAmount}
                  disabled={!walletBalances[fromToken]}
                >
                  MAX
                </button>
              )}
            </div>
            {connected && showFromDropdown && (
              <div className="token-dropdown-menu">
                <div className="token-search-container">
                  <input
                    type="text"
                    className="token-search-input"
                    placeholder="Search token or paste address..."
                    value={tokenSearchQuery}
                    onChange={(e) => {
                      setTokenSearchQuery(e.target.value);
                      if (e.target.value.length >= 32) {
                        searchToken(e.target.value);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  {searchingToken && <span className="token-search-loading">Searching...</span>}
                </div>
                <div className="token-dropdown-list">
                  {getFilteredTokens().map((token) => (
                    <div
                      key={token.mint}
                      className={`token-option ${token.symbol === fromToken ? 'active' : ''}`}
                      onClick={() => {
                        setFromToken(token.symbol);
                        setShowFromDropdown(false);
                        setTokenSearchQuery('');
                      }}
                    >
                      <span className="token-symbol">{token.symbol}</span>
                      <span className="token-name">{token.name}</span>
                    </div>
                  ))}
                  {getFilteredTokens().length === 0 && (
                    <div className="token-option token-no-results">
                      <span>No tokens found. Paste mint address to search.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="swap-direction">
            <button 
              className="swap-direction-btn"
              onClick={() => {
                const temp = fromToken;
                setFromToken(toToken);
                setToToken(temp);
              }}
            >
              ⇅
            </button>
          </div>

          <div className="swap-row">
            <div className="swap-label">TO</div>
            <div className="token-input-group">
              <div 
                className="token-selector"
                onClick={() => connected && setShowToDropdown(!showToDropdown)}
              >
                <span className="token-symbol">{toToken}</span>
                <span className="token-dropdown">▼</span>
              </div>
              <div className="output-display">
                {loading ? (
                  <span className="loading-text">Calculating...</span>
                ) : (
                  <span className="output-amount">{outputAmount}</span>
                )}
              </div>
            </div>
            {connected && showToDropdown && (
              <div className="token-dropdown-menu">
                <div className="token-search-container">
                  <input
                    type="text"
                    className="token-search-input"
                    placeholder="Search token or paste address..."
                    value={tokenSearchQuery}
                    onChange={(e) => {
                      setTokenSearchQuery(e.target.value);
                      if (e.target.value.length >= 32) {
                        searchToken(e.target.value);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  {searchingToken && <span className="token-search-loading">Searching...</span>}
                </div>
                <div className="token-dropdown-list">
                  {getFilteredTokens().map((token) => (
                    <div
                      key={token.mint}
                      className={`token-option ${token.symbol === toToken ? 'active' : ''}`}
                      onClick={() => {
                        setToToken(token.symbol);
                        setShowToDropdown(false);
                        setTokenSearchQuery('');
                      }}
                    >
                      <span className="token-symbol">{token.symbol}</span>
                      <span className="token-name">{token.name}</span>
                    </div>
                  ))}
                  {getFilteredTokens().length === 0 && (
                    <div className="token-option token-no-results">
                      <span>No tokens found. Paste mint address to search.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {quote && connected && (
            <div className="quote-info">
              <div className="quote-row">
                <span className="quote-label">RATE</span>
                <span className="quote-value">
                  1 {fromToken} ≈ {(parseFloat(quote.outAmount) / Math.pow(10, getTokenBySymbol(toToken)?.decimals || 6) / (parseFloat(quote.inAmount) / Math.pow(10, getTokenBySymbol(fromToken)?.decimals || 9))).toFixed(6)} {toToken}
                </span>
              </div>
              <div className="quote-row">
                <span className="quote-label">PRICE IMPACT</span>
                <span className={`quote-value ${parseFloat(priceImpact) > 1 ? 'warning' : ''}`}>
                  {priceImpact}%
                </span>
              </div>
              <div className="quote-row">
                <span className="quote-label">ROUTE</span>
                <span className="quote-value">{routesInfo}</span>
              </div>
              <div className="quote-row">
                <span className="quote-label">MIN RECEIVE</span>
                <span className="quote-value">
                  {(parseFloat(outputAmount) * 0.99).toFixed(6)} {toToken}
                </span>
              </div>
            </div>
          )}

          {swapError && (
            <div className="swap-error">
              <span>⚠</span> {swapError}
            </div>
          )}

          {swapSuccess && (
            <div className="swap-success">
              <span>✓</span> {swapSuccess}
            </div>
          )}

          <button
            className={`swap-btn ${!connected || !quote || swapLoading ? 'disabled' : ''}`}
            onClick={handleSwap}
            disabled={!connected || !quote || swapLoading}
          >
            {swapLoading ? 'PROCESSING...' : !quote ? 'ENTER AMOUNT' : 'SWAP NOW'}
          </button>
        </div>

        <div className="jupiter-footer">
          <span className="powered-by">POWERED BY</span>
          <span className="jupiter-logo">JUPITER</span>
        </div>
      </div>
    </div>
  );
};

export default JupiterSwap;
