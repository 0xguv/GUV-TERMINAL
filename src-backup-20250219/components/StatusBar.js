import React from 'react';
import { useSystemHealth } from '../hooks/useSystemHealth';
import './StatusBar.css';

const StatusBar = ({ currentTime, formatTime, formatDate }) => {
  const { health } = useSystemHealth();

  const getApiStatus = () => {
    const allConnected = Object.values(health.apis).every(api => api.status === 'connected');
    const anyError = Object.values(health.apis).some(api => api.status === 'error');
    const apiList = Object.entries(health.apis)
      .map(([name, api]) => {
        const status = api.status === 'connected' ? 'Online' : api.error || api.status;
        return `${name.padEnd(15)} ${status}`;
      })
      .join('\n');
    
    let tooltip = '';
    if (allConnected) {
      tooltip = `✓ ALL APIs CONNECTED\n\n${apiList}`;
    } else if (anyError) {
      tooltip = `✗ API ERROR\n\n${apiList}\n\nCheck connection`;
    } else {
      tooltip = `⚠ API OFFLINE\n\n${apiList}\n\nCheck your connection`;
    }
    
    if (allConnected) return { text: 'API CONNECTED', class: 'status-ok', blink: true, tooltip };
    if (anyError) return { text: 'API ERROR', class: 'status-error', blink: true, tooltip };
    return { text: 'API OFFLINE', class: 'status-offline', blink: false, tooltip };
  };

  const getServerStatus = () => {
    let tooltip = '';
    
    if (health.overall === 'operational') {
      tooltip = `✓ SYSTEM OPERATIONAL\n\nAll services running normally\nLast check: ${health.lastCheck ? health.lastCheck.toLocaleTimeString() : 'Just now'}`;
      return { text: '● LIVE', class: 'status-live', blink: true, tooltip };
    } else if (health.overall === 'error') {
      tooltip = `✗ SYSTEM ERROR\n\n${health.error || 'Unknown error'}\n\nSome features may not work`;
      return { text: `● ERROR`, class: 'status-error', blink: true, tooltip };
    } else if (health.overall === 'offline') {
      tooltip = `✗ SERVER OFFLINE\n\n${health.server.message || 'Connection failed'}\n\nCheck your internet connection`;
      return { text: '● OFFLINE', class: 'status-offline', blink: false, tooltip };
    }
    tooltip = `⏳ CHECKING SERVICES\n\nVerifying connections...\nPlease wait`;
    return { text: '● CHECKING...', class: 'status-checking', blink: false, tooltip };
  };

  const apiStatus = getApiStatus();
  const serverStatus = getServerStatus();

  return (
    <div className="status-bar">
      <div className="status-left">
        <span 
          className={`status-item ${apiStatus.class} ${apiStatus.blink ? 'blink' : ''}`}
          title={apiStatus.tooltip}
        >
          <span className="status-dot">●</span>
          {apiStatus.text}
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
        <span className="status-separator">|</span>
        <span 
          className={`status-item ${serverStatus.class} ${serverStatus.blink ? 'blink' : ''}`}
          title={serverStatus.tooltip}
        >
          {serverStatus.text}
        </span>

      </div>
    </div>
  );
};

export default StatusBar;
