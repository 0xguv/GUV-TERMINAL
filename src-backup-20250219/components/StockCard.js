import React from 'react';
import './StockCard.css';

const StockCard = ({ stock }) => {
  const isPositive = stock.change >= 0;
  
  // Calculate sparkline path
  const sparklineData = stock.sparklineData || [];
  const minPrice = Math.min(...sparklineData);
  const maxPrice = Math.max(...sparklineData);
  const range = maxPrice - minPrice || 1;
  
  const width = 100;
  const height = 30;
  const padding = 2;
  
  const points = sparklineData.map((price, index) => {
    const x = (index / (sparklineData.length - 1)) * (width - 2 * padding) + padding;
    const y = height - padding - ((price - minPrice) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={`stock-card ${isPositive ? 'up' : 'down'}`}>
      <div className="stock-cell symbol-cell">
        <span className="stock-symbol">{stock.symbol}</span>
      </div>
      
      <div className="stock-cell name-cell">
        <span className="stock-name">{stock.name}</span>
      </div>
      
      <div className="stock-cell price-cell">
        <span className="stock-price">${stock.price.toFixed(2)}</span>
      </div>
      
      <div className="stock-cell change-cell">
        <span className={`stock-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{stock.change.toFixed(2)}
        </span>
      </div>
      
      <div className="stock-cell change-pct-cell">
        <span className={`stock-change-pct ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
        </span>
      </div>
      
      <div className="stock-cell spark-cell">
        <svg 
          className="sparkline" 
          viewBox={`0 0 ${width} ${height}`}
          width="90" 
          height="28"
        >
          <polyline
            points={points}
            fill="none"
            stroke={isPositive ? 'var(--terminal-green)' : 'var(--terminal-red)'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={width - padding}
            cy={height - padding - ((sparklineData[sparklineData.length - 1] - minPrice) / range) * (height - 2 * padding)}
            r="2"
            fill={isPositive ? 'var(--terminal-green)' : 'var(--terminal-red)'}
          />
        </svg>
      </div>
      
      <div className="stock-cell volume-cell">
        <span className="stock-volume">{stock.volume}</span>
      </div>
      
      <div className="stock-cell mkt-cap-cell">
        <span className="stock-mkt-cap">{stock.marketCap}</span>
      </div>
    </div>
  );
};

export default StockCard;