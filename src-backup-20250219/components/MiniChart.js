import React, { useEffect, useRef, useState } from 'react';
import './MiniChart.css';

const MiniChart = ({ data, isPositive, symbol, interval }) => {
  const canvasRef = useRef(null);
  const [hoverData, setHoverData] = useState(null);

  // Get time labels based on interval
  const getTimeLabels = () => {
    switch (interval) {
      case '23H':
        return ['22h', '20h', '18h', '16h', '14h', '12h', '10h', '8h', '6h', '4h', '2h', 'NOW'];
      case '1D':
        return ['23h', '21h', '19h', '17h', '15h', '13h', '11h', '9h', '7h', '5h', '3h', '1h', 'NOW'];
      case '1W':
        return ['6D', '5D', '4D', '3D', '2D', '1D', 'NOW'];
      case '1Y':
        return ['12M', '10M', '8M', '6M', '4M', '2M', 'NOW'];
      case 'ALL':
        return ['2010', '2013', '2017', '2021', '2024', 'NOW'];
      default:
        return ['7D', '6D', '5D', '4D', '3D', '2D', '1D', 'NOW'];
    }
  };

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size with device pixel ratio for sharp rendering
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 50, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate min/max for scaling
    const minPrice = Math.min(...data);
    const maxPrice = Math.max(...data);
    const priceRange = maxPrice - minPrice || 1;

    // Color based on trend
    const lineColor = isPositive ? '#00ff00' : '#ff4444';
    const areaColor = isPositive ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 68, 68, 0.1)';

    // Draw grid lines
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 6; i++) {
      const x = padding.left + (chartWidth / 6) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw price line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;

    data.forEach((price, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw area under line
    ctx.beginPath();
    ctx.fillStyle = areaColor;
    data.forEach((price, index) => {
      const x = padding.left + (index / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    ctx.fill();

    // Draw Y-axis labels (price)
    ctx.fillStyle = '#888888';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const price = minPrice + (priceRange / 4) * (4 - i);
      const y = padding.top + (chartHeight / 4) * i;
      ctx.fillText(formatPrice(price), padding.left - 8, y + 3);
    }

    // Draw X-axis labels (time)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#888888';
    const timeLabels = getTimeLabels();
    timeLabels.forEach((label, index) => {
      const x = padding.left + (chartWidth / (timeLabels.length - 1)) * index;
      ctx.fillText(label, x, height - padding.bottom + 15);
    });

    // Draw current price dot
    const lastPrice = data[data.length - 1];
    const lastX = width - padding.right;
    const lastY = padding.top + chartHeight - ((lastPrice - minPrice) / priceRange) * chartHeight;

    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();

    // Glow effect for current price
    ctx.beginPath();
    ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
    ctx.fillStyle = isPositive ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 68, 68, 0.3)';
    ctx.fill();

  }, [data, isPositive]);

  const formatPrice = (price) => {
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

  return (
    <div className="mini-chart">
      <canvas
        ref={canvasRef}
        className="chart-canvas"
        style={{ width: '100%', height: '300px' }}
      />
    </div>
  );
};

export default MiniChart;
