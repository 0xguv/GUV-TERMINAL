import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import CryptoCard from './CryptoCard';
import CryptoDetail from './CryptoDetail';
import './CryptoDashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

const SolanaDashboard = () => {
  const [solanaTokens, setSolanaTokens] = useState([]);
  const [filteredCoins, setFilteredCoins] = useState([]);
  const [displayedCoins, setDisplayedCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSort, setSelectedSort] = useState('mcap');
  const [boostedTokens, setBoostedTokens] = useState([]);
  const [topBoosted, setTopBoosted] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tokenMetadata, setTokenMetadata] = useState({});
  const COINS_PER_PAGE = 25; // Show 25 per page, 4 pages = 100 tokens

  // DexScreener API Base URLs
  const DEXSCREENER_BASE = 'https://api.dexscreener.com';
  
  // Multiple endpoints to get more Solana tokens
  const getDexScreenerEndpoints = () => [
    // By pair age (newest pairs)
    'https://api.dexscreener.com/latest/dex/search?q=solana&sort=pairAge&order=desc&limit=50',
    // By liquidity
    'https://api.dexscreener.com/latest/dex/search?q=solana&sort=liquidity&order=desc&limit=50',
    // By volume
    'https://api.dexscreener.com/latest/dex/search?q=solana&sort=volume&order=desc&limit=50',
    // By market cap
    'https://api.dexscreener.com/latest/dex/search?q=solana&sort=marketCap&order=desc&limit=50',
    // Generic Solana search
    'https://api.dexscreener.com/latest/dex/search?q=solana&limit=100'
  ];

  const getAutoRefreshInterval = () => {
    const saved = localStorage.getItem('guvSettings');
    const settings = saved ? JSON.parse(saved) : {};
    const interval = settings.autoRefresh || 60;
    return interval === 0 ? null : interval * 1000;
  };

  const isManualRefresh = () => {
    const saved = localStorage.getItem('guvSettings');
    const settings = saved ? JSON.parse(saved) : {};
    return settings.autoRefresh === 0;
  };

  const getRefreshLabel = () => {
    const saved = localStorage.getItem('guvSettings');
    const settings = saved ? JSON.parse(saved) : {};
    const interval = settings.autoRefresh;
    if (interval === 0) return 'MANUAL';
    if (interval === 30) return '30s';
    if (interval === 60) return '60s';
    if (interval === 80) return '80s';
    return '60s';
  };

  // DexScreener only supports USD - hardcode to always use USD
  const getCurrencySymbol = () => {
    return '$'; // DexScreener only supports USD
  };

  // Always return USD since DexScreener doesn't support other currencies
  const getSelectedCurrency = () => {
    return 'USD';
  };

  // Fetch all Solana data from DexScreener
  const fetchSolanaData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use multiple DexScreener endpoints in parallel for comprehensive coverage
      const endpoints = getDexScreenerEndpoints();
      const endpointPromises = endpoints.map(url => fetch(url).then(r => r.ok ? r.json() : { pairs: [] }).catch(() => ({ pairs: [] })));
      const [boostedResponse, topBoostedResponse, ...endpointResults] = await Promise.allSettled([
        fetch(`${DEXSCREENER_BASE}/token-boosts/latest/v1`),
        fetch(`${DEXSCREENER_BASE}/token-boosts/top/v1`),
        ...endpointPromises
      ]);
      
      let pairsData = [];
      const seenPairs = new Set();
      
      // Process all endpoint results
      for (const result of endpointResults) {
        if (result.status === 'fulfilled' && result.value?.pairs) {
          result.value.pairs.forEach(pair => {
            // STRICT: Only allow actual Solana chain
            if (pair.chainId && pair.chainId !== 'solana') return;
            
            const pairAddr = pair.pairAddress || '';
            if (!pairAddr || seenPairs.has(pairAddr)) return;
            seenPairs.add(pairAddr);
            pairsData.push(pair);
          });
        }
      }
      
      console.log(`[SolanaDashboard] Total pairs fetched: ${pairsData.length}`);
      
      // If we still need more, supplement with individual token searches
      if (pairsData.length < 50) {
        
        const popularTokens = [
          'SOL', 'BONK', 'RAY', 'JUP', 'ORCA', 'WIF', 'MEW', 'PYTH', 'JTO',
          'BLZE', 'HNT', 'FIDA', 'SAMO', 'MSOL', 'PRCL', 'W', 'TNSR', 'KMNO', 'CLORE',
          'ZEX', 'DRIFT', 'CLOUD', 'SHDW', 'IO', 'ZRO', 'POPCAT', 'MOG', 'MICHI', 'GOAT',
          'MOODENG', 'PNUT', 'CHILLGUY', 'SPX', 'GIGA', 'RETARDIO', 'RENDER', 'HONEY', 'NATIX', 'AURY',
          'ATLAS', 'POLIS', 'STEP', 'TULIP', 'SLND', 'MNDE', 'UXD', 'NOS', 'DUST', 'GMT',
          'GENE', 'DFL', 'SONAR', 'MANGO', 'COPE', 'MEDIA', 'ONLY1', 'LIKE', 'ROPE', 'MER',
          'SBR', 'SUNNY', 'PORT', 'ALM', 'SNY', 'WOOF', 'CHEEMS', 'KERO', 'CATO', 'WOOP',
          'SOLAPE', 'FAB', 'SODA', 'SOLDOGE', 'SOLCAT', 'SOLDOODLE', 'LDO', 'AUDIO', 'SRM', 'STEPN'
        ];
        
        // Fetch in batches of 5 to avoid rate limits
        const batchSize = 5;
        for (let i = 0; i < popularTokens.length; i += batchSize) {
          const batch = popularTokens.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(async (token) => {
              try {
                const searchResponse = await fetch(`${DEXSCREENER_BASE}/latest/dex/search?q=${token}&chainId=solana`);
                if (searchResponse.ok) {
                  const searchData = await searchResponse.json();
                  return (searchData.pairs || []).filter(p => p.chainId === 'solana');
                }
              } catch (e) {
                return [];
              }
            })
          );
          
          batchResults.flat().forEach(pair => {
            if (!seenPairs.has(pair.pairAddress)) {
              pairsData.push(pair);
              seenPairs.add(pair.pairAddress);
            }
          });
          
          if (pairsData.length >= 100) break;
        }
      }
      
      // Process boosted tokens
      let boostedList = [];
      if (boostedResponse.status === 'fulfilled') {
        try {
          const boosted = await boostedResponse.value.json();
          boostedList = (boosted.tokens || boosted || []).filter(b => b.chainId === 'solana');
          setBoostedTokens(boostedList);
        } catch (e) {
          
        }
      }
      
      // Process top boosted
      let topBoostedList = [];
      if (topBoostedResponse.status === 'fulfilled') {
        try {
          const top = await topBoostedResponse.value.json();
          topBoostedList = (top.tokens || top || []).filter(t => t.chainId === 'solana');
          setTopBoosted(topBoostedList);
        } catch (e) {
          
        }
      }
      
      // Create a map to avoid duplicates (same token on multiple DEXs)
      const tokenMap = new Map();
      
      pairsData.forEach((pair) => {
        const tokenAddress = pair.baseToken?.address;
        const symbol = pair.baseToken?.symbol;
        
        // Only add if not already present or has higher liquidity
        if (!tokenMap.has(symbol) || parseFloat(pair.liquidity?.usd || 0) > parseFloat(tokenMap.get(symbol).liquidity?.usd || 0)) {
          const price = parseFloat(pair.priceUsd) || 0;
          const changePercent = parseFloat(pair.priceChange?.h24) || 0;
          
          tokenMap.set(symbol, {
            id: symbol.toLowerCase(),
            rank: 0,
            symbol: symbol,
            name: pair.baseToken?.name || 'Unknown Token',
            address: tokenAddress,
            price: price,
            change: price * (changePercent / 100),
            changePercent: changePercent,
            volume24h: formatVolume(parseFloat(pair.volume?.h24) || 0),
            marketCap: formatMarketCap(parseFloat(pair.marketCap) || 0),
            liquidity: formatVolume(parseFloat(pair.liquidity?.usd) || 0),
            sparklineData: generateSparkline(price, changePercent),
            ath: price * 1.5,
            high24h: price * 1.02,
            low24h: price * 0.98,
            // Try multiple sources for image: DexScreener -> Solana Token List -> null
            image: pair.baseToken?.logoUri || pair.info?.imageUrl || tokenMetadata[tokenAddress]?.logoURI || null,
            circulatingSupply: pair.marketCap ? (parseFloat(pair.marketCap) / price) : 0,
            maxSupply: null,
            change5m: parseFloat(pair.priceChange?.m5) || 0,
            change1h: parseFloat(pair.priceChange?.h1) || 0,
            change6h: parseFloat(pair.priceChange?.h6) || 0,
            chain: 'SOLANA',
            dexId: pair.dexId,
            pairAddress: pair.pairAddress,
            isBoosted: boostedList.some(b => b.tokenAddress === tokenAddress),
            isTopBoosted: topBoostedList.some(t => t.tokenAddress === tokenAddress),
            hasTakeover: false,
            profile: null,
            actualCurrency: 'USD', // Force USD for CryptoCard
            isSolanaToken: true, // Flag to indicate this is a Solana token (DexScreener data)
            // Store token metadata for reference
            tokenName: tokenMetadata[tokenAddress]?.name || pair.baseToken?.name || null,
            tokenSymbol: tokenMetadata[tokenAddress]?.symbol || pair.baseToken?.symbol || null
          });
        }
      });

      // Convert to array and sort
      let formattedData = Array.from(tokenMap.values());
      
      // Sort based on selected sort
      formattedData = sortTokens(formattedData, selectedSort);
      
      // Assign ranks
      formattedData = formattedData.map((token, index) => ({
        ...token,
        rank: index + 1
      }));

      setSolanaTokens(formattedData);
      setFilteredCoins(formattedData);
      setLastUpdate(new Date());
      setLoading(false);
      
    } catch (err) {
      
      setError(err.message);
      setLoading(false);
      
      // Retry after 30 seconds
      setTimeout(() => {
        fetchSolanaData();
      }, 30000);
    }
  };

  const sortTokens = (tokens, sortType) => {
    return [...tokens].sort((a, b) => {
      if (sortType === 'mcap') {
        return parseFloat(b.marketCap.replace(/[$,]/g, '')) - parseFloat(a.marketCap.replace(/[$,]/g, ''));
      } else if (sortType === 'volume') {
        return parseFloat(b.volume24h.replace(/[$,]/g, '')) - parseFloat(a.volume24h.replace(/[$,]/g, ''));
      } else if (sortType === 'price') {
        return b.price - a.price;
      } else if (sortType === 'change') {
        return b.changePercent - a.changePercent;
      }
      return 0;
    });
  };

  const formatVolume = (volume) => {
    const symbol = getCurrencySymbol();
    if (!volume || volume === 0) return `${symbol}0.00`;
    if (volume >= 1e9) return `${symbol}${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${symbol}${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${symbol}${(volume / 1e3).toFixed(2)}K`;
    return `${symbol}${volume.toFixed(2)}`;
  };

  const formatMarketCap = (marketCap) => {
    const symbol = getCurrencySymbol();
    if (!marketCap || marketCap === 0) return `${symbol}0.00`;
    if (marketCap >= 1e12) return `${symbol}${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `${symbol}${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `${symbol}${(marketCap / 1e6).toFixed(2)}M`;
    if (marketCap >= 1e3) return `${symbol}${(marketCap / 1e3).toFixed(2)}K`;
    return `${symbol}${marketCap.toFixed(2)}`;
  };

  const generateSparkline = (currentPrice, changePercent) => {
    const points = [];
    const numPoints = 20;
    const volatility = Math.abs(changePercent) / 100;
    
    let price = currentPrice * (1 - changePercent / 100);
    
    for (let i = 0; i < numPoints; i++) {
      const step = (currentPrice - price) / (numPoints - i);
      const noise = (Math.random() - 0.5) * currentPrice * volatility * 0.5;
      price = price + step + noise;
      points.push(parseFloat(price.toFixed(6)));
    }
    
    points[points.length - 1] = currentPrice;
    return points;
  };

  const handleSortChange = (sortType) => {
    setSelectedSort(sortType);
    setCurrentPage(1);
    
    const sortedData = sortTokens(solanaTokens, sortType);
    
    // Reassign ranks
    const rankedData = sortedData.map((token, index) => ({
      ...token,
      rank: index + 1
    }));
    
    setFilteredCoins(rankedData);
  };

  // Fetch token metadata from Solana token list
  const fetchTokenMetadata = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/solana/tokens`);
      if (response.ok) {
        const data = await response.json();
        if (data.tokens) {
          setTokenMetadata(data.tokens);
          console.log('[SolanaDashboard] Loaded token metadata:', data.count);
        }
      }
    } catch (err) {
      console.error('[SolanaDashboard] Failed to fetch token metadata:', err);
    }
  };

  useEffect(() => {
    fetchTokenMetadata();
    fetchSolanaData();
    
    // Get auto refresh interval from settings
    const refreshMs = getAutoRefreshInterval();
    let interval;
    
    if (refreshMs) {
      interval = setInterval(fetchSolanaData, refreshMs);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Listen for settings changes to update auto refresh
  useEffect(() => {
    const handleSettingsChange = () => {
      fetchSolanaData();
    };
    
    window.addEventListener('guv-settings-change', handleSettingsChange);
    return () => window.removeEventListener('guv-settings-change', handleSettingsChange);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setSelectedCrypto(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Update displayed coins when filtered coins or page changes
  useEffect(() => {
    let filtered = [...solanaTokens];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(coin => 
        coin.name.toLowerCase().includes(query) || 
        coin.symbol.toLowerCase().includes(query) ||
        (coin.pairAddress && coin.pairAddress.toLowerCase().includes(query))
      );
      setCurrentPage(1);
    }
    
    // Apply sorting
    filtered = sortTokens(filtered, selectedSort);
    
    setFilteredCoins(filtered);
  }, [solanaTokens, searchQuery, selectedSort]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * COINS_PER_PAGE;
    const endIndex = startIndex + COINS_PER_PAGE;
    setDisplayedCoins(filteredCoins.slice(startIndex, endIndex));
  }, [filteredCoins, currentPage]);

  const handleCryptoClick = (crypto) => {
    setSelectedCrypto(crypto);
  };

  const handleCloseDetail = () => {
    setSelectedCrypto(null);
  };

  if (loading && solanaTokens.length === 0) {
    return (
      <div className="crypto-dashboard loading">
        <div className="loading-message">
          <span className="loading-text" style={{ color: 'var(--terminal-green)' }}>LOADING ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="crypto-dashboard">
      {error && (
        <div className="crypto-error">
          <span className="error-icon"><AlertTriangle size={20} /></span>
          <span className="error-text">{error}</span>
        </div>
      )}
      
      <div className="dashboard-controls">
        <div className="controls-top">
          <div className="search-section">
            <input
              type="text"
              className="search-input"
              placeholder="SEARCH TOKEN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="chain-filter-section">
            <span className="chain-filter-label">SORT BY:</span>
            <div className="chain-filter-buttons">
              <button
                className={`chain-filter-btn ${selectedSort === 'mcap' ? 'active' : ''}`}
                onClick={() => handleSortChange('mcap')}
                style={{
                  borderColor: selectedSort === 'mcap' ? '#00FFA3' : 'var(--border-color)',
                  color: selectedSort === 'mcap' ? '#00FFA3' : 'var(--text-secondary)'
                }}
              >
                MARKET CAP
              </button>
              <button
                className={`chain-filter-btn ${selectedSort === 'volume' ? 'active' : ''}`}
                onClick={() => handleSortChange('volume')}
                style={{
                  borderColor: selectedSort === 'volume' ? '#00FFA3' : 'var(--border-color)',
                  color: selectedSort === 'volume' ? '#00FFA3' : 'var(--text-secondary)'
                }}
              >
                VOLUME
              </button>
              <button
                className={`chain-filter-btn ${selectedSort === 'change' ? 'active' : ''}`}
                onClick={() => handleSortChange('change')}
                style={{
                  borderColor: selectedSort === 'change' ? '#00FFA3' : 'var(--border-color)',
                  color: selectedSort === 'change' ? '#00FFA3' : 'var(--text-secondary)'
                }}
              >
                24H CHANGE
              </button>
              <button
                className={`chain-filter-btn ${selectedSort === 'price' ? 'active' : ''}`}
                onClick={() => handleSortChange('price')}
                style={{
                  borderColor: selectedSort === 'price' ? '#00FFA3' : 'var(--border-color)',
                  color: selectedSort === 'price' ? '#00FFA3' : 'var(--text-secondary)'
                }}
              >
                PRICE
              </button>
            </div>
            {isManualRefresh() && (
              <button 
                className={`refresh-btn-large ${loading ? 'refreshing' : ''}`}
                onClick={() => {
                  
                  fetchSolanaData();
                }}
                disabled={loading}
              >
                {loading ? '⟳ REFRESHING...' : '↻ REFRESH'}
              </button>
            )}
          </div>
        </div>
        <div className="dashboard-header">
          <div className="header-row">
            <span className="header-cell rank">#</span>
            <span className="header-cell pair">PAIR</span>
            <span className="header-cell name">TOKEN</span>
            <span className="header-cell price">PRICE</span>
            <span className="header-cell change-pct">24H %</span>
            <span className="header-cell change">24H CHG</span>
            <span className="header-cell volume">24H VOL</span>
            <span className="header-cell change-5m">5M</span>
            <span className="header-cell change-1h">1H</span>
            <span className="header-cell change-6h">6H</span>
            <span className="header-cell liquidity">LIQUIDITY</span>
            <span className="header-cell mkt-cap">MKT CAP</span>
          </div>
        </div>
      </div>
      
      <div className="crypto-list">
        {displayedCoins.length === 0 ? (
          <div className="no-coins-message">
            <span>No Solana tokens found</span>
          </div>
        ) : (
          displayedCoins.map((crypto) => (
            <div key={`${crypto.symbol}-${crypto.address}`} className="crypto-card-wrapper">
              <CryptoCard 
                crypto={crypto} 
                rank={crypto.rank} 
                onClick={handleCryptoClick}
              />
            </div>
          ))
        )}
      </div>

      <div className="pagination-section">
        <button 
          className="pagination-btn"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1 || loading}
        >
          ← PREV
        </button>
        <span className="pagination-info">
          PAGE {currentPage} / {Math.ceil(filteredCoins.length / COINS_PER_PAGE) || 1}
        </span>
        <button 
          className="pagination-btn"
          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredCoins.length / COINS_PER_PAGE), prev + 1))}
          disabled={currentPage >= Math.ceil(filteredCoins.length / COINS_PER_PAGE) || loading}
        >
          NEXT →
        </button>
      </div>
      
      {selectedCrypto && (
        <CryptoDetail 
          crypto={selectedCrypto} 
          onClose={handleCloseDetail}
        />
      )}
      
      {lastUpdate && (
        <div className="update-timestamp">
          <span>
            LAST UPDATE: {lastUpdate.toLocaleTimeString()} [AUTO: {getRefreshLabel()}] [USD]
            <span style={{ color: 'var(--terminal-amber)', marginLeft: '8px' }}>
              ⚠ DexScreener only supports USD
            </span>
          </span>
          <span className="update-indicator" style={{ color: '#00FFA3' }}>● SOLANA DATA</span>
        </div>
      )}
    </div>
  );
};

export default SolanaDashboard;