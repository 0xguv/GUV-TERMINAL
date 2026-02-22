import React, { useEffect, useRef, useState } from 'react';
import './TradingViewWidget.css';

const TradingViewWidget = ({ symbol, pairName, currentPrice }) => {
  const containerRef = useRef(null);
  const [interval, setInterval] = useState('D');
  const [error, setError] = useState(false);
  const widgetRef = useRef(null);

  const intervals = [
    { value: '15', label: '15m' },
    { value: '60', label: '1H' },
    { value: 'D', label: '1D' },
    { value: 'W', label: '1W' },
  ];

  // Get appropriate range based on interval
  const getRange = (int) => {
    switch(int) {
      case '15': return '1D';    // 15m: show 1 day
      case '60': return '5D';    // 1H: show 5 days
      case 'D': return '1M';     // 1D: show 1 month
      case 'W': return '12M';    // 1W: show 12 months
      default: return '1M';
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    widgetRef.current = setTimeout(() => {
      const widgetId = `tv_${symbol}_${Date.now()}`;
      
      container.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.id = widgetId;
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      container.appendChild(wrapper);

      const widgetConfig = {
        symbol: `${symbol.toUpperCase()}USD`,
        interval: interval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '3',
        locale: 'en',
        toolbar_bg: '#0a0a0a',
        enable_publishing: false,
        allow_symbol_change: false,
        hide_top_toolbar: true,
        hide_legend: true,
        hide_side_toolbar: true,
        hide_volume: true,
        hide_bottom_toolbar: true,
        withdateranges: false,
        save_image: false,
        range: getRange(interval),
        container_id: widgetId,
      };

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.innerHTML = JSON.stringify(widgetConfig);
      script.onerror = () => setError(true);
      wrapper.appendChild(script);

      setTimeout(() => {
        const widgetDiv = document.getElementById(widgetId);
        if (widgetDiv && widgetDiv.querySelector('iframe')) {
          widgetDiv.querySelector('iframe').style.border = 'none';
        }
      }, 500);
    }, 100);

    return () => {
      clearTimeout(widgetRef.current);
      try {
        container.innerHTML = '';
      } catch (e) {}
    };
  }, [symbol, interval]);

  return (
    <div className="tradingview-widget">
      <div className="chart-info">
        <span className="pair-symbol">{pairName || symbol}</span>
        <span className="pair-price">{currentPrice || 'Loading...'}</span>
      </div>
      <div className="chart-container" ref={containerRef}>
        {error && <div className="chart-error">Chart unavailable</div>}
      </div>
      <div className="interval-buttons">
        {intervals.map((int) => (
          <button
            key={int.value}
            className={`interval-btn ${interval === int.value ? 'active' : ''}`}
            onClick={() => setInterval(int.value)}
          >
            {int.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TradingViewWidget;
