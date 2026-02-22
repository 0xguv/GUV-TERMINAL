import React, { useState } from 'react';
import TradingViewWidget from './TradingViewWidget';
import './CryptoDetail.css';

const CryptoDetail = ({ crypto, onClose }) => {
  if (!crypto) return null;

  const isPositive = crypto.change >= 0;

  // Calculate additional metrics
  const priceChangeFromATH = ((crypto.price - crypto.ath) / crypto.ath * 100).toFixed(2);
  const volatility = Math.abs(crypto.changePercent).toFixed(2);
  const range24h = ((crypto.high24h - crypto.low24h) / crypto.low24h * 100).toFixed(2);

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    if (price >= 1000) {
      return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return '$' + price.toFixed(2);
    } else if (price >= 0.01) {
      return '$' + price.toFixed(4);
    } else {
      return '$' + price.toFixed(6);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  return (
    <div className="crypto-detail-overlay" onClick={onClose}>
      <div className="crypto-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="detail-header">
          <div className="detail-title">
            <span className="detail-rank">#{crypto.rank}</span>
            <span className="detail-symbol">{crypto.symbol}</span>
            <span className="detail-name">{crypto.name}</span>
          </div>
          <button className="detail-close" onClick={onClose}>✕</button>
        </div>

        {/* TradingView Chart */}
        <div className="chart-section">
          <TradingViewWidget 
            symbol={crypto.symbol} 
            pairName={crypto.name} 
            currentPrice={formatPrice(crypto.price)} 
          />
        </div>

        {/* Market Stats Grid */}
        <div className="detail-stats-grid">
          <div className="stats-section">
            <h3 className="section-title">MARKET DATA</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">MARKET CAP</span>
                <span className="stat-value">{crypto.marketCap}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">24H VOLUME</span>
                <span className="stat-value">{crypto.volume24h}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">RANK</span>
                <span className="stat-value">#{crypto.rank}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">VOLATILITY</span>
                <span className="stat-value">{volatility}%</span>
              </div>
            </div>
          </div>

          <div className="stats-section">
            <h3 className="section-title">PRICE STATS</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">24H HIGH</span>
                <span className="stat-value">{formatPrice(crypto.high24h)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">24H LOW</span>
                <span className="stat-value">{formatPrice(crypto.low24h)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">24H RANGE</span>
                <span className="stat-value">{range24h}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">ALL TIME HIGH</span>
                <span className="stat-value">{formatPrice(crypto.ath)}</span>
              </div>
            </div>
          </div>

          <div className="stats-section full-width">
            <h3 className="section-title">PERFORMANCE</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">FROM ATH</span>
                <span className={`stat-value ${parseFloat(priceChangeFromATH) >= 0 ? 'positive' : 'negative'}`}>
                  {parseFloat(priceChangeFromATH) >= 0 ? '+' : ''}{priceChangeFromATH}%
                </span>
              </div>
              {crypto.athDate && (
                <div className="stat-item">
                  <span className="stat-label">ATH DATE</span>
                  <span className="stat-value">{crypto.athDate}</span>
                </div>
              )}
              {crypto.circulatingSupply && (
                <div className="stat-item">
                  <span className="stat-label">CIRCULATING</span>
                  <span className="stat-value">{formatNumber(crypto.circulatingSupply)}</span>
                </div>
              )}
              {crypto.maxSupply && (
                <div className="stat-item">
                  <span className="stat-label">MAX SUPPLY</span>
                  <span className="stat-value">{formatNumber(crypto.maxSupply)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="detail-footer">
          <span className="footer-text">Press ESC or click outside to close</span>
        </div>
      </div>
    </div>
  );
};

export default CryptoDetail;
