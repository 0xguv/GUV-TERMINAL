import React, { useRef, useEffect, useState } from 'react';
import './CryptoCard.css';

const CryptoCard = ({ crypto, rank, onClick }) => {
  const isPositive = (crypto.changePercent || 0) >= 0;
  const [flashState, setFlashState] = useState(null); // 'up', 'down', or null
  const prevPriceRef = useRef(crypto.price);
  
  // Get currency symbol - use actual currency from data if available
  const getCurrencySymbol = () => {
    const currency = crypto.actualCurrency || getCurrencyCode();
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'IDR': 'Rp'
    };
    return symbols[currency] || '$';
  };
  
  const getCurrencyCode = () => {
    const saved = localStorage.getItem('guvSettings');
    const settings = saved ? JSON.parse(saved) : {};
    return settings.defaultCurrency || 'USD';
  };
  
  useEffect(() => {
    const currentPrice = crypto.price;
    const prevPrice = prevPriceRef.current;
    
    // Check if price changed
    if (currentPrice !== prevPrice) {
      // Determine direction
      if (currentPrice > prevPrice) {
        setFlashState('up');
      } else if (currentPrice < prevPrice) {
        setFlashState('down');
      }
      
      // Update ref
      prevPriceRef.current = currentPrice;
      
      // Clear flash after animation
      const timer = setTimeout(() => {
        setFlashState(null);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [crypto.price]);
  
  // Calculate sparkline path
  const sparklineData = crypto.sparklineData || [];
  const hasSparkline = sparklineData.length > 0;
  const minPrice = hasSparkline ? Math.min(...sparklineData) : 0;
  const maxPrice = hasSparkline ? Math.max(...sparklineData) : 1;
  const range = maxPrice - minPrice || 1;
  
  const width = 100;
  const height = 30;
  const padding = 2;
  
  const points = hasSparkline ? sparklineData.map((price, index) => {
    const x = sparklineData.length > 1 ? (index / (sparklineData.length - 1)) * (width - 2 * padding) + padding : width / 2;
    const y = height - padding - ((price - minPrice) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ') : `${padding},${height / 2} ${width - padding},${height / 2}`;

  // Format price based on value
  const formatPrice = (price) => {
    if (price === null || price === undefined) return '--';
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toFixed(2);
    } else if (price >= 0.01) {
      return price.toFixed(4);
    } else {
      return price.toFixed(6);
    }
  };

  // Build class names
  const getPriceClassName = () => {
    let className = 'crypto-price';
    if (flashState === 'up') className += ' flash-up';
    if (flashState === 'down') className += ' flash-down';
    return className;
  };

  // Get direction indicator (based on 24h change)
  const getDirectionIndicator = () => {
    if (isPositive) {
      return <span className="direction-indicator up" title="24h Up">▲</span>;
    } else {
      return <span className="direction-indicator down" title="24h Down">▼</span>;
    }
  };

  return (
    <div className={`crypto-card ${isPositive ? 'up' : 'down'} ${flashState ? `flash-${flashState}` : ''}`} onClick={() => onClick && onClick(crypto)}>
      <div className="crypto-cell rank-cell">
        <span className="crypto-rank">{rank}</span>
      </div>
      
      <div className="crypto-cell symbol-cell">
        <span className="crypto-symbol">{(crypto.symbol || 'UNKNOWN')}/{crypto.actualCurrency || getCurrencyCode()}</span>
      </div>
      
      <div className="crypto-cell name-cell">
        <span className="crypto-name">{crypto.name || 'Unknown Token'}</span>
      </div>
      
      <div className="crypto-cell price-cell">
        <span className={getPriceClassName()}>{getCurrencySymbol()}{formatPrice(crypto.price)}</span>
        {getDirectionIndicator()}
      </div>
      
      <div className="crypto-cell change-pct-cell">
        <span className={`crypto-change-pct ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{crypto.changePercent !== undefined && crypto.changePercent !== null ? crypto.changePercent.toFixed(2) : '0.00'}%
        </span>
      </div>
      
      <div className="crypto-cell change-cell">
        <span className={`crypto-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{crypto.change !== undefined && crypto.change !== null ? (Math.abs(crypto.change) >= 1 ? crypto.change.toFixed(2) : crypto.change.toFixed(4)) : '0.00'}
        </span>
      </div>
      
      <div className="crypto-cell volume-cell">
        <span className="crypto-volume">{crypto.volume24h || '--'}</span>
      </div>

      <div className="crypto-cell change-5m-cell">
        <span className={`crypto-change-5m ${(crypto.change5m || 0) >= 0 ? 'positive' : 'negative'}`}>
          {(crypto.change5m !== undefined ? (crypto.change5m >= 0 ? '+' : '') + crypto.change5m.toFixed(2) : '--')}%
        </span>
      </div>

      <div className="crypto-cell change-1h-cell">
        <span className={`crypto-change-1h ${(crypto.change1h || 0) >= 0 ? 'positive' : 'negative'}`}>
          {(crypto.change1h !== undefined ? (crypto.change1h >= 0 ? '+' : '') + crypto.change1h.toFixed(2) : '--')}%
        </span>
      </div>

      <div className="crypto-cell change-6h-cell">
        <span className={`crypto-change-6h ${(crypto.change6h || 0) >= 0 ? 'positive' : 'negative'}`}>
          {(crypto.change6h !== undefined ? (crypto.change6h >= 0 ? '+' : '') + crypto.change6h.toFixed(2) : '--')}%
        </span>
      </div>

      <div className="crypto-cell liquidity-cell">
        <span className="crypto-liquidity">{crypto.liquidity || '--'}</span>
      </div>

      <div className="crypto-cell mkt-cap-cell">
        <span className="crypto-mkt-cap">{crypto.marketCap || '--'}</span>
      </div>
    </div>
  );
};

export default CryptoCard;