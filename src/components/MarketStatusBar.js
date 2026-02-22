import React from 'react';
import './MarketStatusBar.css';

const MarketStatusBar = () => {
  const getMarketStatus = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) {
      return { status: 'BULLISH', color: '#00ff00', icon: '▲' };
    } else {
      return { status: 'BEARISH', color: '#ff4444', icon: '▼' };
    }
  };

  const marketStatus = getMarketStatus();

  return (
    <div className="market-status-bar">
      <div className="market-indicator">
        <span className="market-label">MARKET STATUS:</span>
        <span 
          className="market-value"
          style={{ color: marketStatus.color }}
        >
          {marketStatus.icon} {marketStatus.status}
        </span>
      </div>
      
      <div className="market-separator">|</div>
      
      <div className="market-stats">
        <span className="stat-item">
          <span className="stat-symbol">BTC</span>
          <span className="stat-change positive">+2.4%</span>
        </span>
        <span className="stat-item">
          <span className="stat-symbol">ETH</span>
          <span className="stat-change positive">+1.8%</span>
        </span>
        <span className="stat-item">
          <span className="stat-symbol">SOL</span>
          <span className="stat-change negative">-0.5%</span>
        </span>
      </div>
      
      <div className="market-separator">|</div>
      
      <div className="market-mood">
        <span className="mood-label">FEAR & GREED:</span>
        <span className="mood-value">65 GREED</span>
      </div>
    </div>
  );
};

export default MarketStatusBar;
