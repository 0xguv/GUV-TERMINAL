import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import CryptoCard from './CryptoCard';
import CryptoDetail from './CryptoDetail';
import './CryptoDashboard.css';

const CryptoDashboard = () => {
  const [cryptos, setCryptos] = useState([]);
  const [filteredCoins, setFilteredCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasData, setHasData] = useState(false);
  const [dataCurrency, setDataCurrency] = useState('USD');
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [selectedSort, setSelectedSort] = useState('market_cap');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(90);
  const [searchQuery, setSearchQuery] = useState('');
  const COINS_PER_PAGE = 100;

  const getDataSource = () => {
    const saved = localStorage.getItem('guvSettings');
    const settings = saved ? JSON.parse(saved) : {};
    const provider = settings.priceProvider || 'coingecko';
    return provider.toUpperCase();
  };

  const getPriceProvider = () => {
    const saved = localStorage.getItem('guvSettings');
    const settings = saved ? JSON.parse(saved) : {};
    return settings.priceProvider || 'coingecko';
  };

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

  const getSelectedCurrency = () => {
    const saved = localStorage.getItem('guvSettings');
    const settings = saved ? JSON.parse(saved) : {};
    return settings.defaultCurrency || 'USD';
  };

  const SORT_OPTIONS = [
    { value: 'market_cap', label: 'MARKET CAP' },
    { value: 'volume', label: 'VOLUME' },
    { value: 'price', label: 'PRICE' },
    { value: 'change_24h', label: '24H CHANGE' }
  ];

  // Backend API URL - auto-detect for mobile/desktop
  const getApiBaseUrl = () => {
    // If running on localhost, use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    // Otherwise use the same hostname but port 3001 (for mobile on same network)
    return `http://${window.location.hostname}:3001/api`;
  };
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || getApiBaseUrl();

  const fetchCryptoData = async (page = currentPage) => {
    try {
      setLoading(true);
      
      // Calculate start position based on page number
      const start = (page - 1) * COINS_PER_PAGE + 1;
      
      // Get selected currency and provider
      const currency = getSelectedCurrency();
      const provider = getPriceProvider();
      
      // Call backend proxy instead of directly calling CMC
      const response = await fetch(`${API_BASE_URL}/cmc/listings?start=${start}&limit=${COINS_PER_PAGE}&convert=${currency}&provider=${provider}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.message || errorData?.error || `Server error: ${response.status}`;
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const requestedCurrency = getSelectedCurrency();
        
        // First, determine what currency the data is actually in
        const firstQuote = data.data[0]?.quote;
        const actualCurrency = firstQuote?.[requestedCurrency] ? requestedCurrency : 'USD';
        setDataCurrency(actualCurrency);
        
        if (actualCurrency !== requestedCurrency) {
          // Currency fallback - silently handle
        }
        
        const formattedData = data.data.map((crypto, index) => {
          // Check if requested currency exists in data, otherwise fallback to USD
          const quote = crypto.quote?.[requestedCurrency] || crypto.quote?.USD || {};
          
          return {
            id: crypto.id,
            rank: crypto.cmc_rank || ((page - 1) * COINS_PER_PAGE) + index + 1,
            symbol: crypto.symbol,
            name: crypto.name,
            price: quote.price || 0,
            change: quote.price ? quote.price - (quote.price / (1 + (quote.percent_change_24h || 0) / 100)) : 0,
            changePercent: quote.percent_change_24h || 0,
            volume24h: formatVolumeWithCurrency(quote.volume_24h, actualCurrency),
            marketCap: formatMarketCapWithCurrency(quote.market_cap, actualCurrency),
            sparklineData: generateSparkline(quote.price || 0, quote.percent_change_24h || 0),
            ath: quote.price ? quote.price * (1 + Math.abs(quote.percent_change_24h || 0) / 100 * 2) : 0,
            high24h: quote.price ? quote.price * 1.02 : 0,
            low24h: quote.price ? quote.price * 0.98 : 0,
            image: null,
            circulatingSupply: crypto.circulating_supply,
            maxSupply: crypto.max_supply,
            change5m: (Math.random() - 0.5) * 2,
            change1h: (Math.random() - 0.5) * 5,
            change6h: (Math.random() - 0.5) * 8,
            liquidity: getCurrencySymbol(actualCurrency) + (Math.random() * 100).toFixed(1) + 'M'
          };
        });

        setCryptos(formattedData);
        
        // Re-sort based on current selectedSort
        const sorted = [...formattedData].sort((a, b) => {
          switch (selectedSort) {
            case 'market_cap':
              return (b.marketCap || 0) - (a.marketCap || 0);
            case 'volume':
              return (b.volume24h || 0) - (a.volume24h || 0);
            case 'price':
              return (b.price || 0) - (a.price || 0);
            case 'change_24h':
              return (b.changePercent || 0) - (a.changePercent || 0);
            default:
              return (b.marketCap || 0) - (a.marketCap || 0);
          }
        });
        setFilteredCoins(sorted);
        
        setLastUpdate(new Date());
        setError(null);
        setHasData(true);
      } else {
        throw new Error('No data received from backend');
      }
      
      setLoading(false);
    } catch (err) {
      
      const errorDetail = err.response?.data?.message || err.message || 'Unknown error';
      
      // Only retry up to 3 times, then show persistent error
      if (retryCount < 3) {
        setError(`Data unavailable: ${errorDetail}. Retrying...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchCryptoData();
        }, 60000); // Retry after 60 seconds
      } else {
        setError(`Data unavailable: ${errorDetail}. Please check Settings.`);
      }
      
      setLoading(false);
    }
  };

  // Get currency symbol - uses actual data currency if different from settings
  const getCurrencySymbol = (currencyOverride) => {
    const currency = currencyOverride || dataCurrency || getSelectedCurrency();
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'IDR': 'Rp'
    };
    return symbols[currency] || '$';
  };

  // Format volume for display with specific currency
  const formatVolumeWithCurrency = (volume, currency) => {
    const symbol = getCurrencySymbol(currency);
    if (!volume) return `${symbol}0.00`;
    if (volume >= 1e9) return `${symbol}${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${symbol}${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${symbol}${(volume / 1e3).toFixed(2)}K`;
    return `${symbol}${volume.toFixed(2)}`;
  };

  // Format market cap for display with specific currency
  const formatMarketCapWithCurrency = (marketCap, currency) => {
    const symbol = getCurrencySymbol(currency);
    if (!marketCap) return `${symbol}0.00`;
    if (marketCap >= 1e12) return `${symbol}${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `${symbol}${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `${symbol}${(marketCap / 1e6).toFixed(2)}M`;
    return `${symbol}${marketCap.toFixed(2)}`;
  };

  // Generate sparkline data
  const generateSparkline = (currentPrice, changePercent) => {
    const points = [];
    const numPoints = 20;
    const volatility = Math.abs(changePercent) / 100;
    
    let price = currentPrice * (1 - changePercent / 100);
    
    for (let i = 0; i < numPoints; i++) {
      const step = (currentPrice - price) / (numPoints - i);
      const noise = (Math.random() - 0.5) * currentPrice * volatility * 0.5;
      price = price + step + noise;
      points.push(parseFloat(price.toFixed(2)));
    }
    
    points[points.length - 1] = currentPrice;
    return points;
  };

  useEffect(() => {
    fetchCryptoData(currentPage);
    
    // Get auto refresh interval from settings
    const refreshMs = getAutoRefreshInterval();
    let interval;
    
    if (refreshMs) {
      interval = setInterval(() => fetchCryptoData(currentPage), refreshMs);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentPage]);

  // Listen for settings changes to update auto refresh
  useEffect(() => {
    const handleSettingsChange = () => {
      // Force re-render to pick up new auto refresh interval
      fetchCryptoData(currentPage);
    };
    
    window.addEventListener('guv-settings-change', handleSettingsChange);
    return () => window.removeEventListener('guv-settings-change', handleSettingsChange);
  }, [currentPage]);

  // Handle ESC key to close detail modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setSelectedCrypto(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleCryptoClick = (crypto) => {
    setSelectedCrypto(crypto);
  };

  const handleCloseDetail = () => {
    setSelectedCrypto(null);
  };

  const handleSortChange = (sortType) => {
    setSelectedSort(sortType);
    setCurrentPage(1);
  };

  // Filter by search query
  useEffect(() => {
    let filtered = [...cryptos];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(coin => 
        coin.name.toLowerCase().includes(query) || 
        coin.symbol.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting - use raw numeric values from formatted data
    filtered.sort((a, b) => {
      switch (selectedSort) {
        case 'market_cap':
          // Parse marketCap strings like "$1.2B" to numbers
          const getMarketCapValue = (mc) => {
            if (!mc) return 0;
            const num = parseFloat(mc.replace(/[$,]/g, ''));
            if (mc.includes('T')) return num * 1e12;
            if (mc.includes('B')) return num * 1e9;
            if (mc.includes('M')) return num * 1e6;
            if (mc.includes('K')) return num * 1e3;
            return num;
          };
          return getMarketCapValue(b.marketCap) - getMarketCapValue(a.marketCap);
        case 'volume':
          // Parse volume strings like "$1.2B" to numbers
          const getVolumeValue = (vol) => {
            if (!vol) return 0;
            const num = parseFloat(vol.replace(/[$,]/g, ''));
            if (vol.includes('T')) return num * 1e12;
            if (vol.includes('B')) return num * 1e9;
            if (vol.includes('M')) return num * 1e6;
            if (vol.includes('K')) return num * 1e3;
            return num;
          };
          return getVolumeValue(b.volume24h) - getVolumeValue(a.volume24h);
        case 'price':
          return (b.price || 0) - (a.price || 0);
        case 'change_24h':
          return (b.changePercent || 0) - (a.changePercent || 0);
        default:
          return (b.price || 0) - (a.price || 0);
      }
    });
    
    setFilteredCoins(filtered);
  }, [cryptos, searchQuery, selectedSort]);

  if (loading && cryptos.length === 0) {
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
      {error && !hasData && (
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
              placeholder="SEARCH COIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="chain-filter-section">
            <span className="chain-filter-label">SORT BY:</span>
            <div className="chain-filter-buttons">
              <button
                className={`chain-filter-btn ${selectedSort === 'market_cap' ? 'active' : ''}`}
                onClick={() => handleSortChange('market_cap')}
                style={{
                  borderColor: selectedSort === 'market_cap' ? '#00FFA3' : 'var(--border-color)',
                  color: selectedSort === 'market_cap' ? '#00FFA3' : 'var(--text-secondary)'
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
                className={`chain-filter-btn ${selectedSort === 'price' ? 'active' : ''}`}
                onClick={() => handleSortChange('price')}
                style={{
                  borderColor: selectedSort === 'price' ? '#00FFA3' : 'var(--border-color)',
                  color: selectedSort === 'price' ? '#00FFA3' : 'var(--text-secondary)'
                }}
              >
                PRICE
              </button>
              <button
                className={`chain-filter-btn ${selectedSort === 'change_24h' ? 'active' : ''}`}
                onClick={() => handleSortChange('change_24h')}
                style={{
                  borderColor: selectedSort === 'change_24h' ? '#00FFA3' : 'var(--border-color)',
                  color: selectedSort === 'change_24h' ? '#00FFA3' : 'var(--text-secondary)'
                }}
              >
                24H CHANGE
              </button>
            </div>
            {isManualRefresh() && (
              <button 
                className={`refresh-btn-large ${loading ? 'refreshing' : ''}`}
                onClick={() => {
                  
                  fetchCryptoData(currentPage);
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
            <span className="header-cell name">ASSET</span>
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
        {filteredCoins.length === 0 ? (
          <div className="no-coins-message">
            <span>Loading cryptocurrencies...</span>
          </div>
        ) : (
          filteredCoins.map((crypto) => (
            <CryptoCard 
              key={crypto.symbol} 
              crypto={crypto} 
              rank={crypto.rank} 
              onClick={handleCryptoClick}
            />
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
          PAGE {currentPage} / {totalPages}
        </span>
        <button 
          className="pagination-btn"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages || loading}
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
            LAST UPDATE: {lastUpdate.toLocaleTimeString()} [AUTO: {getRefreshLabel()}] [{dataCurrency}]
            {dataCurrency !== getSelectedCurrency() && (
              <span style={{ color: 'var(--terminal-amber)', marginLeft: '8px' }}>
                ⚠ {getSelectedCurrency()} not supported, showing {dataCurrency}
              </span>
            )}
          </span>
          <span className="update-indicator">● {getDataSource()}</span>
        </div>
      )}
    </div>
  );
};

export default CryptoDashboard;