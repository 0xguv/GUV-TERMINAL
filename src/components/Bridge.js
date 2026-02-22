import React, { useState, useEffect, useCallback } from 'react';
import './Bridge.css';

const RELAY_API_URL = 'https://api.relay.link';

const Bridge = () => {
  const [chains, setChains] = useState([]);
  const [currencies, setCurrencies] = useState({});
  const [fromChain, setFromChain] = useState(8453);
  const [toChain, setToChain] = useState(1);
  const [fromToken, setFromToken] = useState(null);
  const [toToken, setToToken] = useState(null);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [senderWallet, setSenderWallet] = useState(null);
  const [receiverWallet, setReceiverWallet] = useState('');
  const [showSenderDropdown, setShowSenderDropdown] = useState(false);
  const [showReceiverDropdown, setShowReceiverDropdown] = useState(false);
  const [showConnectNewWallet, setShowConnectNewWallet] = useState(false);
  const [pasteAddress, setPasteAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [balance, setBalance] = useState('0.00');
  const [error, setError] = useState(null);
  
  const [showFromTokenDropdown, setShowFromTokenDropdown] = useState(false);
  const [showToTokenDropdown, setShowToTokenDropdown] = useState(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');

  const fetchChains = useCallback(async () => {
    try {
      const response = await fetch(`${RELAY_API_URL}/chains`);
      const data = await response.json();
      const enabledChains = (data.chains || []).filter(c => !c.disabled && c.depositEnabled);
      setChains(enabledChains);
      
      if (enabledChains.length > 0) {
        const baseChain = enabledChains.find(c => c.id === 8453);
        const ethChain = enabledChains.find(c => c.id === 1);
        setFromChain(baseChain?.id || enabledChains[0].id);
        setToChain(ethChain?.id || enabledChains[1]?.id || enabledChains[0].id);
      }
    } catch (err) {
      
    }
  }, []);

  const fetchCurrencies = useCallback(async (chainId) => {
    if (!chainId) return;
    try {
      const response = await fetch(`${RELAY_API_URL}/currencies/v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainIds: [chainId],
          depositAddressOnly: true,
          limit: 50
        })
      });
      const data = await response.json();
      setCurrencies(prev => ({ ...prev, [chainId]: data || [] }));
    } catch (err) {
      
      const fallbackTokens = getFallbackTokens(chainId);
      setCurrencies(prev => ({ ...prev, [chainId]: fallbackTokens }));
    }
  }, []);

  const getFallbackTokens = (chainId) => {
    const tokens = {
      1: [
        { id: 'NATIVE', symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
        { id: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', name: 'USD Coin', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 },
        { id: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', name: 'Tether', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
      ],
      8453: [
        { id: 'NATIVE', symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
        { id: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', symbol: 'USDC', name: 'USD Coin', address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', decimals: 6 },
      ],
      42161: [
        { id: 'NATIVE', symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
        { id: '0xaf88d065e77c5c727273de6a0e0db1e7ae9d4891', symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c5c727273de6a0e0db1e7ae9d4891', decimals: 6 },
      ],
      10: [
        { id: 'NATIVE', symbol: 'ETH', name: 'Ethereum', address: '0x0000000000000000000000000000000000000000', decimals: 18 },
        { id: '0x7f5c764cbc14f9669b88837ca1490cca17c31607', symbol: 'USDC', name: 'USD Coin', address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607', decimals: 6 },
      ],
    };
    return tokens[chainId] || tokens[1];
  };

  const searchTokenByAddress = async (chainId, address) => {
    try {
      const response = await fetch(`${RELAY_API_URL}/currencies/v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainIds: [chainId],
          address: address
        })
      });
      const data = await response.json();
      if (data && data.length > 0) {
        return data[0];
      }
    } catch (err) {
      
    }
    return null;
  };

  useEffect(() => { fetchChains(); }, [fetchChains]);
  useEffect(() => { if (fromChain) fetchCurrencies(fromChain); }, [fromChain, fetchCurrencies]);
  useEffect(() => { if (toChain) fetchCurrencies(toChain); }, [toChain, fetchCurrencies]);

  useEffect(() => {
    const chainCurrencies = currencies[fromChain];
    if (chainCurrencies && chainCurrencies.length > 0 && !fromToken) {
      const nativeToken = chainCurrencies.find(c => c.id === 'NATIVE' || c.symbol === 'ETH');
      if (nativeToken) setFromToken(nativeToken);
    }
  }, [currencies, fromChain, fromToken]);

  useEffect(() => {
    const chainCurrencies = currencies[toChain];
    if (chainCurrencies && chainCurrencies.length > 0 && !toToken) {
      const nativeToken = chainCurrencies.find(c => c.id === 'NATIVE' || c.symbol === 'ETH');
      if (nativeToken) setToToken(nativeToken);
    }
  }, [currencies, toChain, toToken]);

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    if (typeof window.ethereum === 'undefined') {
      setError('No wallet found. Please install MetaMask.');
      setIsConnecting(false);
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        const walletChainId = await window.ethereum.request({ method: 'eth_chainId' }).then(id => parseInt(id, 16));
        const newWallet = {
          address: accounts[0],
          chainId: walletChainId
        };
        setSenderWallet(newWallet);
        
        // Set fromChain to match wallet's chain if available
        const chainExists = chains.find(c => c.id === walletChainId);
        if (chainExists) {
          setFromChain(walletChainId);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = (walletType) => {
    if (walletType === 'sender') {
      setSenderWallet(null);
      setBalance('0.00');
    } else {
      setReceiverWallet('');
    }
    setQuote(null);
    setAmount('');
  };

  const getBalance = useCallback(async () => {
    if (!senderWallet || !window.ethereum || !fromChain) return;

    try {
      const chain = chains.find(c => c.id === fromChain);
      if (!chain) return;

      const tokenAddress = fromToken?.address;
      const isNative = !tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000' || fromToken?.id === 'NATIVE';

      if (isNative) {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [senderWallet.address, 'latest']
        });
        const ethBalance = parseInt(balance, 16) / 1e18;
        setBalance(ethBalance.toFixed(4));
      } else {
        const response = await fetch(chain.httpRpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: tokenAddress,
              data: `0x70a08231000000000000000000000000${senderWallet.address.slice(2)}`
            }, 'latest'],
            id: 1
          })
        });
        const data = await response.json();
        if (data.result) {
          const tokenBalance = parseInt(data.result, 16) / Math.pow(10, fromToken.decimals || 18);
          setBalance(tokenBalance.toFixed(4));
        } else {
          setBalance('0.00');
        }
      }
    } catch (err) {
      
      setBalance('0.00');
    }
  }, [senderWallet, fromChain, fromToken, chains]);

  useEffect(() => {
    if (!senderWallet) return;

    const handleAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        disconnectWallet('sender');
      } else if (accounts[0] !== senderWallet.address) {
        setSenderWallet({ ...senderWallet, address: accounts[0] });
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [senderWallet]);

  useEffect(() => {
    if (senderWallet) getBalance();
  }, [senderWallet, fromChain, getBalance]);

  const fetchQuote = useCallback(async () => {
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0 || !senderWallet || !fromToken || !toToken) {
      setQuote(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const originCurrency = fromToken.address || '0x0000000000000000000000000000000000000000';
      const destCurrency = toToken.address || '0x0000000000000000000000000000000000000000';
      const isSameAsSender = !receiverWallet || receiverWallet === '' || receiverWallet === senderWallet.address;
      const recipient = isSameAsSender ? senderWallet.address : receiverWallet;

      const amountInWei = (parseFloat(amount.replace(',', '.')) * Math.pow(10, fromToken.decimals || 18)).toString();

      const requestBody = {
        user: senderWallet.address,
        recipient: recipient,
        originChainId: fromChain,
        destinationChainId: toChain,
        originCurrency: originCurrency,
        destinationCurrency: destCurrency,
        amount: amountInWei,
        tradeType: 'EXACT_INPUT'
      };

      const response = await fetch(`${RELAY_API_URL}/quote/v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get quote');
      }

      const data = await response.json();
      setQuote(data);
    } catch (err) {
      setError(err.message);
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, [amount, fromChain, toChain, fromToken, toToken, senderWallet, receiverWallet]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount && senderWallet && fromToken && toToken && parseFloat(amount) > 0) {
        fetchQuote();
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [amount, fromChain, toChain, fromToken, toToken, senderWallet, receiverWallet, fetchQuote]);

  const handleBridge = async () => {
    if (!quote || !window.ethereum) return;

    try {
      const depositStep = quote.steps?.find(step => step.id === 'deposit');
      if (depositStep?.items?.[0]) {
        const item = depositStep.items[0];
        
        // Check if MetaMask is on the correct chain
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        const expectedChainId = `0x${fromChain.toString(16)}`;
        
        if (currentChainId !== expectedChainId) {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: expectedChainId }]
            });
          } catch (switchErr) {
            setError(`Please switch to the correct network (Chain ID: ${fromChain})`);
            return;
          }
        }
        
        setError(null);
        
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: senderWallet.address,
            to: item.data.to,
            value: item.data.value,
            data: item.data.data,
            chainId: `0x${fromChain.toString(16)}`
          }]
        });
        
        if (txHash) {
          setError(null);
          setAmount('');
          setQuote(null);
          alert(`Bridge initiated! Tx: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`);
        }
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetMaxAmount = (percent) => {
    const maxAmount = parseFloat(balance);
    if (maxAmount > 0) {
      const newAmount = (maxAmount * percent / 100).toFixed(6).replace(/\.?0+$/, '');
      setAmount(newAmount);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isValidAddress = (addr) => {
    return addr && addr.startsWith('0x') && addr.length === 42;
  };

  const handlePasteAddress = () => {
    if (isValidAddress(pasteAddress)) {
      setReceiverWallet(pasteAddress);
      setPasteAddress('');
      setShowReceiverDropdown(false);
    }
  };

  const handleAddNewWallet = async () => {
    setShowReceiverDropdown(false);
    
    if (typeof window.ethereum === 'undefined') {
      setError('No wallet found. Please install MetaMask.');
      return;
    }

    setIsConnecting(true);
    setError(null);
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        const newWalletAddress = accounts[0];
        setReceiverWallet(newWalletAddress);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const sortedChains = [...chains].sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

  const fromCurrencies = currencies[fromChain] || [];
  const toCurrencies = currencies[toChain] || [];

  const filteredFromTokens = tokenSearchQuery 
    ? fromCurrencies.filter(t => t.symbol?.toLowerCase().includes(tokenSearchQuery.toLowerCase()) || t.name?.toLowerCase().includes(tokenSearchQuery.toLowerCase()))
    : fromCurrencies;

  const filteredToTokens = tokenSearchQuery 
    ? toCurrencies.filter(t => t.symbol?.toLowerCase().includes(tokenSearchQuery.toLowerCase()) || t.name?.toLowerCase().includes(tokenSearchQuery.toLowerCase()))
    : toCurrencies;

  const handleTokenSearch = async (e, isFrom) => {
    const query = e.target.value;
    setTokenSearchQuery(query);
    if (query.length >= 42 && query.startsWith('0x')) {
      const chainId = isFrom ? fromChain : toChain;
      const token = await searchTokenByAddress(chainId, query);
      if (token) {
        if (isFrom) setFromToken(token);
        else setToToken(token);
        setTokenSearchQuery('');
      }
    }
  };

  return (
    <div className="bridge-interface">
      <div className="bridge-box">
        <div className="bridge-input-section">
          <div className="bridge-wallet-row">
            <span className="bridge-wallet-label">Sender</span>
            <div className="bridge-wallet-selector">
              <button 
                className="bridge-wallet-btn"
                onClick={() => setShowSenderDropdown(!showSenderDropdown)}
              >
                {senderWallet ? (
                  <>
                    <span className="wallet-dot">●</span>
                    {formatAddress(senderWallet.address)}
                  </>
                ) : (
                  '+ Select Wallet'
                )}
              </button>
              {showSenderDropdown && (
                <div className="bridge-wallet-dropdown">
                  {senderWallet ? (
                    <div className="wallet-option disconnect" onClick={() => { disconnectWallet('sender'); setShowSenderDropdown(false); }}>
                      Disconnect
                    </div>
                  ) : (
                    <div className="wallet-option" onClick={() => { connectWallet(); setShowSenderDropdown(false); }}>
                      + Connect Wallet
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="bridge-token-chain-row">
            <div className="bridge-token-selector">
              <button 
                className="bridge-token-btn"
                onClick={() => setShowFromTokenDropdown(!showFromTokenDropdown)}
              >
                {fromToken?.symbol || 'Select'} ▼
              </button>
              {showFromTokenDropdown && (
                <div className="bridge-token-dropdown">
                  <input
                    type="text"
                    className="bridge-token-search"
                    placeholder="Search or paste address..."
                    value={tokenSearchQuery}
                    onChange={(e) => handleTokenSearch(e, true)}
                    autoFocus
                  />
                  <div className="bridge-token-list">
                    {filteredFromTokens.slice(0, 15).map(token => (
                      <div key={token.id} className="bridge-token-option" onClick={() => { setFromToken(token); setShowFromTokenDropdown(false); setTokenSearchQuery(''); }}>
                        <span className="token-symbol">{token.symbol}</span>
                        <span className="token-name">{token.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <select className="bridge-chain-select" value={fromChain} onChange={(e) => { setFromChain(Number(e.target.value)); setFromToken(null); setQuote(null); }}>
              {sortedChains.map(chain => <option key={chain.id} value={chain.id}>{chain.displayName}</option>)}
            </select>
          </div>
          
          <div className="bridge-balance-row">
            <span className="bridge-balance">Balance: {balance}</span>
          </div>
          
          <div className="bridge-amount-row">
            <input 
              type="number" 
              className="bridge-amount-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
            <div className="bridge-percent-btns">
              <button onClick={() => handleSetMaxAmount(25)}>25%</button>
              <button onClick={() => handleSetMaxAmount(50)}>50%</button>
              <button onClick={() => handleSetMaxAmount(75)}>75%</button>
              <button onClick={() => handleSetMaxAmount(100)}>MAX</button>
            </div>
          </div>
        </div>

        <div className="bridge-switch-container">
          <button className="bridge-switch-btn" onClick={() => {
            const tempChain = fromChain; setFromChain(toChain); setToChain(tempChain);
            const tempToken = fromToken; setFromToken(toToken); setToToken(tempToken);
            setQuote(null);
          }}>⇅</button>
        </div>

        <div className="bridge-input-section">
          <div className="bridge-wallet-row">
            <span className="bridge-wallet-label">Receiver</span>
            <div className="bridge-wallet-selector">
              <button 
                className="bridge-wallet-btn"
                onClick={() => setShowReceiverDropdown(!showReceiverDropdown)}
              >
                {receiverWallet ? formatAddress(receiverWallet) : 'Same as sender'}
              </button>
              {showReceiverDropdown && (
                <div className="bridge-wallet-dropdown">
                  {receiverWallet && (
                    <div className="wallet-option disconnect" onClick={() => { setReceiverWallet(''); setShowReceiverDropdown(false); }}>
                      Disconnect
                    </div>
                  )}
                  <div className="wallet-option" onClick={() => { setReceiverWallet(''); setShowReceiverDropdown(false); }}>
                    Same as sender
                  </div>
                  <div className="wallet-option" onClick={handleAddNewWallet}>
                    + Connect new wallet
                  </div>
                  <div className="wallet-option paste">
                    <input
                      type="text"
                      placeholder="Paste address (0x...)"
                      value={pasteAddress}
                      onChange={(e) => setPasteAddress(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handlePasteAddress()}
                    />
                    {pasteAddress && isValidAddress(pasteAddress) && (
                      <button className="paste-btn" onClick={handlePasteAddress}>Add</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="bridge-token-chain-row">
            <div className="bridge-token-selector">
              <button className="bridge-token-btn" onClick={() => setShowToTokenDropdown(!showToTokenDropdown)}>
                {toToken?.symbol || 'Select Token'} ▼
              </button>
              {showToTokenDropdown && (
                <div className="bridge-token-dropdown">
                  <input type="text" className="bridge-token-search" placeholder="Search or paste address..." value={tokenSearchQuery} onChange={(e) => handleTokenSearch(e, false)} autoFocus />
                  <div className="bridge-token-list">
                    {filteredToTokens.slice(0, 15).map(token => (
                      <div key={token.id} className="bridge-token-option" onClick={() => { setToToken(token); setShowToTokenDropdown(false); setTokenSearchQuery(''); }}>
                        <span className="token-symbol">{token.symbol}</span>
                        <span className="token-name">{token.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <select className="bridge-chain-select" value={toChain} onChange={(e) => { setToChain(Number(e.target.value)); setToToken(null); setQuote(null); }}>
              {sortedChains.map(chain => <option key={chain.id} value={chain.id}>{chain.displayName}</option>)}
            </select>
          </div>
          
          <div className="bridge-balance-row">
            <span className="bridge-balance">Balance: -</span>
          </div>
          
          <div className="bridge-amount-output">
            {loading ? <span className="loading-text">Calculating...</span> : quote ? (parseFloat(quote.details?.currencyOut?.amount || 0) / Math.pow(10, toToken?.decimals || 18)).toFixed(6) : '0.000000'}
          </div>
        </div>

        {error && <div className="bridge-error"><span>⚠</span> {error}</div>}

        {quote && (
          <div className="bridge-quote-info">
            <div className="bridge-quote-row"><span>Rate:</span><span>1 {fromToken?.symbol} = {parseFloat(quote.details?.rate || 1).toFixed(6)} {toToken?.symbol}</span></div>
            <div className="bridge-quote-row"><span>Time:</span><span>~{quote.details?.timeEstimate || 30}s</span></div>
            <div className="bridge-quote-row"><span>Fee:</span><span>${parseFloat(quote.fees?.relayer?.amountUsd || 0).toFixed(2)}</span></div>
          </div>
        )}

        <button className={`bridge-action-btn ${loading ? 'loading' : ''}`} onClick={handleBridge} disabled={!quote || loading}>
          {loading ? 'PROCESSING...' : !quote ? 'ENTER AMOUNT' : 'BRIDGE'}
        </button>
      </div>

      <div className="bridge-footer">
        <span className="powered-by">POWERED BY</span>
        <span className="relay-logo">RELAY</span>
      </div>

      <div className="coming-soon-overlay">
        <div className="coming-soon-content">
          <h2>COMING SOON</h2>
          <p>Bridge feature is under development</p>
        </div>
      </div>
    </div>
  );
};

export default Bridge;
