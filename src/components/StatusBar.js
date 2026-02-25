import React from 'react';
import { useSystemHealth } from '../hooks/useSystemHealth';
import './StatusBar.css';

const StatusBar = ({ currentTime, formatTime, formatDate }) => {
  const { health } = useSystemHealth();

  const getServerStatus = () => {
    let tooltip = '';
    
    if (health.overall === 'operational') {
      tooltip = `✓ SYSTEM OPERATIONAL\n\nBackend server running\nLatency: ${health.apis.server?.latency || 0}ms\nLast check: ${health.lastCheck ? health.lastCheck.toLocaleTimeString() : 'Just now'}`;
      return { text: 'LIVE', class: 'status-live', blink: true, tooltip };
    } else if (health.overall === 'offline') {
      tooltip = `✗ SERVER OFFLINE\n\n${health.server.message || 'Connection failed'}\n\nCheck your internet connection`;
      return { text: 'OFFLINE', class: 'status-offline', blink: false, tooltip };
    }
    tooltip = `⏳ CHECKING SERVICES\n\nVerifying connections...\nPlease wait`;
    return { text: 'CHECKING...', class: 'status-checking', blink: false, tooltip };
  };

  const serverStatus = getServerStatus();

  return (
    <div className="status-bar">
      <div className="status-left">
        <span 
          className={`status-item ${serverStatus.class} ${serverStatus.blink ? 'blink' : ''}`}
          title={serverStatus.tooltip}
        >
          <span className="status-dot">●</span>
          {serverStatus.text}
        </span>
      </div>
      
      <div className="status-center">
        <span className="market-status">
          NETWORK STATUS:
          <span className={health.overall === 'operational' ? 'market-open' : 'market-closed'}>
            {' '}{health.overall === 'checking' ? 'CHECKING...' : health.overall.toUpperCase()}
          </span>
        </span>
        <span className="status-separator">|</span>
        <span className="session-info">
          CHAIN: SOLANA
        </span>
      </div>
      
      <div className="status-right">
        <span className="status-item">
          {formatTime(currentTime)} UTC
        </span>
        <span className="status-separator">|</span>
        <span className="status-item">
          {formatDate(currentTime)}
        </span>
      </div>
    </div>
  );
};

export default StatusBar;
