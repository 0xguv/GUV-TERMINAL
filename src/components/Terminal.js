import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Terminal as TerminalIcon } from 'lucide-react';
import NewsFeed from './NewsFeed';
import CryptoDashboard from './CryptoDashboard';
import SolanaDashboard from './SolanaDashboard';
import PortfolioTracker from './PortfolioTracker';
import Settings from './Settings';
import JupiterSwap from './JupiterSwap';
import Bridge from './Bridge';
import StatusBar from './StatusBar';
import WalletButton from './WalletButton';
import ThemeToggle from './ThemeToggle';
import MobileDock from './MobileDock';
import MobileOverlay from './MobileOverlay';
import { useSystemHealth } from '../hooks/useSystemHealth';
import './Terminal.css';

const Terminal = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState('CRYPTO');
  const [btcDominance, setBtcDominance] = useState(52.4);
  const [fearGreedIndex, setFearGreedIndex] = useState(50);
  const [mobileActivePanel, setMobileActivePanel] = useState(null);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('guvSettings');
    return saved ? JSON.parse(saved) : {
      showFearGreed: true,
      showGasPrices: true,
    };
  });
  const { health } = useSystemHealth();
  const { connected, disconnect } = useWallet();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('guvSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
    
    const handleSettingsChange = () => {
      const newSettings = localStorage.getItem('guvSettings');
      if (newSettings) {
        setSettings(JSON.parse(newSettings));
      }
    };
    
    window.addEventListener('guv-settings-change', handleSettingsChange);
    window.addEventListener('storage', handleSettingsChange);
    return () => {
      window.removeEventListener('guv-settings-change', handleSettingsChange);
      window.removeEventListener('storage', handleSettingsChange);
    };
  }, []);

  useEffect(() => {
    const fetchFearGreed = async () => {
      try {
        const response = await fetch('https://api.alternative.me/fng/');
        const data = await response.json();
        if (data.data && data.data[0]) {
          setFearGreedIndex(parseInt(data.data[0].value));
        }
      } catch {
        // Silently handle
      }
    };
    
    fetchFearGreed();
    const interval = setInterval(fetchFearGreed, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).toUpperCase();
  };

  const getFearGreedLabel = (index) => {
    if (index >= 75) return 'EXTREME GREED';
    if (index >= 55) return 'GREED';
    if (index >= 45) return 'NEUTRAL';
    if (index >= 25) return 'FEAR';
    return 'EXTREME FEAR';
  };

  const getFearGreedColor = (index) => {
    if (index >= 75) return '#ff4444';
    if (index >= 55) return '#ffb000';
    if (index >= 45) return '#00ffff';
    if (index >= 25) return '#888888';
    return '#ff0000';
  };

  // Render the correct dashboard based on active tab
  const renderDashboard = () => {
    switch (activeTab) {
      case 'CRYPTO':
        return <CryptoDashboard />;
      case 'SOLANA':
        return <SolanaDashboard />;
      case 'SWAP':
        return <JupiterSwap />;
      case 'BRIDGE':
        return <Bridge />;
      case 'PORTFOLIO':
        return <PortfolioTracker />;
      case 'SETTINGS':
        return <Settings />;
      default:
        return <CryptoDashboard />;
    }
  };

  // Get panel subtitle based on active tab
  const getPanelSubtitle = () => {
    switch (activeTab) {
      case 'CRYPTO':
        return 'SPOT MARKETS';
      case 'SOLANA':
        return 'SOLANA ECOSYSTEM';
      case 'SWAP':
        return 'JUPITER AGGREGATOR';
      case 'BRIDGE':
        return 'RELAY PROTOCOL';
      case 'PORTFOLIO':
        return 'WALLET HOLDINGS';
      case 'SETTINGS':
        return 'CONFIGURATION';
      default:
        return 'SPOT MARKETS';
    }
  };

  // Get news title based on active tab
  const getNewsTitle = () => {
    switch (activeTab) {
      case 'SOLANA':
        return 'SOLANA WIRE';
      case 'BRIDGE':
        return 'HISTORY';
      case 'SWAP':
        return 'HISTORY';
      default:
        return 'CRYPTO WIRE';
    }
  };

  // Check if current tab is portfolio or settings (hide news and stats)
  // Only hide left panel for news (not for swap/bridge history)
  const hideNewsPanel = activeTab === 'SETTINGS' || activeTab === 'PORTFOLIO' || (activeTab !== 'SWAP' && activeTab !== 'BRIDGE' && !settings.showNewsPanel);
  const hideStatsPanel = !settings.showStatsPanel;

  return (
    <div className="terminal">
      {/* Top Header */}
      <div className="terminal-header">
        <div className="header-left">
          <div className="header-logo">
            <TerminalIcon size={18} className="logo-icon" />
            <span>GUV TERMINAL</span>
          </div>
          <span className="header-version">v1.1</span>
        </div>
        <div className="header-center">
          <span className="header-tabs">
            {['CRYPTO', 'SOLANA', 'SWAP', 'BRIDGE', 'PORTFOLIO', 'SETTINGS'].map(tab => (
              <span 
                key={tab}
                className={`header-tab ${activeTab === tab ? 'active' : ''} ${tab === 'PORTFOLIO' ? 'header-tab-portfolio' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </span>
            ))}
          </span>
        </div>
        <div className="header-right">
          <ThemeToggle />
          <WalletButton />
        </div>
        {/* Mobile Header Actions - positioned at top right */}
        <div className="mobile-header-actions">
          <ThemeToggle />
          {connected && (
            <button 
              className="mobile-disconnect-btn" 
              onClick={disconnect}
              title="Disconnect Wallet"
            >
              ⏻
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={`terminal-content ${hideNewsPanel ? 'no-news' : ''} ${hideStatsPanel || (activeTab !== 'CRYPTO' && activeTab !== 'SOLANA') ? 'no-stats' : ''} ${activeTab === 'SETTINGS' ? 'settings-mode' : ''} ${activeTab === 'BRIDGE' ? 'bridge-mode' : ''}`}>
        {/* Left Panel - News - Hidden on portfolio/settings */}
        {!hideNewsPanel && (
          <div className="panel panel-left">
            <div className="panel-header">
              <span className="panel-title">{getNewsTitle()}</span>
              <span className="panel-indicator flash">● NEW</span>
            </div>
            <NewsFeed key={activeTab === 'SOLANA' ? 'solana' : 'crypto'} feedType={activeTab === 'SWAP' ? 'swap' : activeTab === 'BRIDGE' ? 'bridge' : 'news'} chain={activeTab === 'SOLANA' ? 'solana' : 'all'} />
          </div>
        )}

        {/* Center Panel - Dynamic Dashboard */}
        <div className="panel panel-center">
          <div className="panel-header">
            <span className="panel-title">
              {activeTab === 'SETTINGS' ? 'SETTINGS' : activeTab === 'BRIDGE' ? 'BRIDGE' : 'MARKET DATA'}
            </span>
            <span className="panel-subtitle">{getPanelSubtitle()}</span>
          </div>
          {renderDashboard()}
        </div>

        {/* Right Panel - Stats - Only show on CRYPTO and SOLANA tabs */}
        {!hideStatsPanel && (activeTab === 'CRYPTO' || activeTab === 'SOLANA') && (
          <div className="panel panel-right">
            <div className="panel-header">
              <span className="panel-title">MARKET STATS</span>
            </div>
            
            <div className="stats-container">
              {/* Fear & Greed Index with GIF */}
              <div className="fear-greed-card">
                <div 
                  className="fear-greed-bg"
                  style={fearGreedIndex < 25 ? {
                    backgroundImage: "url('https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGJoMGZ4eGh2NmV5cmg3Z2lramc5ZG5sZ3hyZDRuYmE1dGxhdnhmbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/7MuB31oCbouLRCNT3n/giphy.gif')"
                  } : fearGreedIndex < 45 ? {
                    backgroundImage: "url('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NTJuandqbnoyMGd0Znd0bGMxdXdib2I1NWhxMzkyY2FlZnRqcWF2OCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/DPw5kfRUGIigpXiC3Y/giphy.gif')"
                  } : fearGreedIndex < 55 ? {
                    backgroundImage: "url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWdpbzFpYTNkMmo3NXcxOTdhN3lldGd0dnUxYmQwdjF3bTFhMWF6NCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/De86EqNHMlLWuzabtN/giphy.gif')"
                  } : fearGreedIndex < 75 ? {
                    backgroundImage: "url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDhhcTFhNzRjZG01d3EwMGNub3duemdqNjMxNmR3aG5lNjdlbXRqaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/kvDK2Gi79XTftc7PHs/giphy.gif')"
                  } : {
                    backgroundImage: "url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGcwOTRmMmc2eTVvYzJ2ZmZybGdvamthN2RudnQ5aGlmMXUza3RuaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/FfMktMppgq8xEIXZOm/giphy.gif')"
                  }}
                />
                <div className="fear-greed-overlay">
                  <span className="fear-greed-title">Fear & Greed</span>
                  <span className="fear-greed-value" style={{ color: getFearGreedColor(fearGreedIndex) }}>
                    {fearGreedIndex}
                  </span>
                  <span className="fear-greed-label" style={{ color: getFearGreedColor(fearGreedIndex) }}>
                    {getFearGreedLabel(fearGreedIndex)}
                  </span>
                </div>
              </div>

              {/* Market Dominance Grid */}
              <div className="stat-card">
                <div className="stat-card-header">Market Dominance</div>
                <div className="stat-grid">
                  <div className="stat-grid-row">
                    <div className="stat-grid-item">
                      <span className="stat-grid-label">BTC</span>
                      <span className="stat-grid-value" style={{ color: '#F7931A' }}>{btcDominance}%</span>
                    </div>
                    <div className="stat-grid-item">
                      <span className="stat-grid-label">ETH</span>
                      <span className="stat-grid-value" style={{ color: '#627EEA' }}>18.2%</span>
                    </div>
                  </div>
                  <div className="stat-grid-row">
                    <div className="stat-grid-item">
                      <span className="stat-grid-label">ALT</span>
                      <span className="stat-grid-value" style={{ color: '#00D4AA' }}>29.4%</span>
                    </div>
                    <div className="stat-grid-item">
                      <span className="stat-grid-label">STABLE</span>
                      <span className="stat-grid-value" style={{ color: '#26A17B' }}>8.7%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Stats */}
              <div className="stat-card">
                <div className="stat-card-header">Market Overview</div>
                <div className="stat-grid">
                  <div className="stat-grid-item">
                    <span className="stat-grid-label">Total Cap</span>
                    <span className="stat-grid-value">$2.54T</span>
                  </div>
                  <div className="stat-grid-item">
                    <span className="stat-grid-label">24H Vol</span>
                    <span className="stat-grid-value">$98.5B</span>
                  </div>
                </div>
              </div>

              {/* Gas Prices */}
              <div className="stat-card">
                <div className="stat-card-header">Gas Prices</div>
                <div className="gas-grid">
                  <div className="gas-item">
                    <span className="gas-chain">ETH</span>
                    <span className="gas-price gas-low">$1.20</span>
                  </div>
                  <div className="gas-item">
                    <span className="gas-chain">BASE</span>
                    <span className="gas-price gas-low">$0.02</span>
                  </div>
                  <div className="gas-item">
                    <span className="gas-chain">ARB</span>
                    <span className="gas-price gas-low">$0.15</span>
                  </div>
                  <div className="gas-item">
                    <span className="gas-chain">OP</span>
                    <span className="gas-price gas-low">$0.08</span>
                  </div>
                  <div className="gas-item">
                    <span className="gas-chain">BSC</span>
                    <span className="gas-price gas-low">$0.05</span>
                  </div>
                  <div className="gas-item">
                    <span className="gas-chain">AVAX</span>
                    <span className="gas-price gas-low">$0.03</span>
                  </div>
                  <div className="gas-item">
                    <span className="gas-chain">SOL</span>
                    <span className="gas-price gas-low">$0.001</span>
                  </div>
                  <div className="gas-item">
                    <span className="gas-chain">TON</span>
                    <span className="gas-price gas-low">$0.005</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar 
        currentTime={currentTime}
        formatTime={formatTime}
        formatDate={formatDate}
      />

      {/* Mobile Dock */}
      <MobileDock 
        activeTab={activeTab}
        setActivePanel={setMobileActivePanel}
        activePanel={mobileActivePanel}
        hasPortfolio={true}
      />

      {/* Mobile Overlays */}
      <MobileOverlay 
        isOpen={mobileActivePanel === 'news'}
        onClose={() => setMobileActivePanel(null)}
        title={activeTab === 'SOLANA' ? 'SOLANA WIRE' : 'CRYPTO WIRE'}
      >
        <NewsFeed key={activeTab === 'SOLANA' ? 'solana' : 'crypto'} feedType="news" chain={activeTab === 'SOLANA' ? 'solana' : 'all'} />
      </MobileOverlay>

      <MobileOverlay 
        isOpen={mobileActivePanel === 'stats'}
        onClose={() => setMobileActivePanel(null)}
        title="MARKET STATS"
      >
        <div className="mobile-stats-content">
          {/* Fear & Greed */}
          <div className="stat-card">
            <div className="stat-card-header">Fear & Greed Index</div>
            <div className="fear-greed-card">
              <div 
                className="fear-greed-bg"
                style={fearGreedIndex < 25 ? {
                  backgroundImage: "url('https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGJoMGZ4eGh2NmV5cmg3Z2lramc5ZG5sZ3hyZDRuYmE1dGxhdnhmbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/7MuB31oCbouLRCNT3n/giphy.gif')"
                } : fearGreedIndex < 45 ? {
                  backgroundImage: "url('https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3NTJuandqbnoyMGd0Znd0bGMxdXdib2I1NWhxMzkyY2FlZnRqcWF2OCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/DPw5kfRUGIigpXiC3Y/giphy.gif')"
                } : fearGreedIndex < 55 ? {
                  backgroundImage: "url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZWdpbzFpYTNkMmo3NXcxOTdhN3lldGd0dnUxYmQwdjF3bTFhMWF6NCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/De86EqNHMlLWuzabtN/giphy.gif')"
                } : fearGreedIndex < 75 ? {
                  backgroundImage: "url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDhhcTFhNzRjZG01d3EwMGNub3duemdqNjMxNmR3aG5lNjdlbXRqaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/kvDK2Gi79XTftc7PHs/giphy.gif')"
                } : {
                  backgroundImage: "url('https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGcwOTRmMmc2eTVvYzJ2ZmZybGdvamthN2RudnQ5aGlmMXUza3RuaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/FfMktMppgq8xEIXZOm/giphy.gif')"
                }}
              />
              <div className="fear-greed-overlay">
                <span className="fear-greed-title">Fear & Greed</span>
                <span className="fear-greed-value" style={{ color: getFearGreedColor(fearGreedIndex) }}>
                  {fearGreedIndex}
                </span>
                <span className="fear-greed-label" style={{ color: getFearGreedColor(fearGreedIndex) }}>
                  {getFearGreedLabel(fearGreedIndex)}
                </span>
              </div>
            </div>
          </div>

          {/* Market Dominance */}
          <div className="stat-card">
            <div className="stat-card-header">Market Dominance</div>
            <div className="stat-grid">
              <div className="stat-grid-row">
                <div className="stat-grid-item">
                  <span className="stat-grid-label">BTC</span>
                  <span className="stat-grid-value" style={{ color: '#F7931A' }}>{btcDominance}%</span>
                </div>
                <div className="stat-grid-item">
                  <span className="stat-grid-label">ETH</span>
                  <span className="stat-grid-value" style={{ color: '#627EEA' }}>18.2%</span>
                </div>
              </div>
              <div className="stat-grid-row">
                <div className="stat-grid-item">
                  <span className="stat-grid-label">ALT</span>
                  <span className="stat-grid-value" style={{ color: '#00D4AA' }}>29.4%</span>
                </div>
                <div className="stat-grid-item">
                  <span className="stat-grid-label">STABLE</span>
                  <span className="stat-grid-value" style={{ color: '#26A17B' }}>8.7%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gas Prices */}
          <div className="stat-card">
            <div className="stat-card-header">Gas Prices</div>
            <div className="gas-grid">
              <div className="gas-item">
                <span className="gas-chain">ETH</span>
                <span className="gas-price gas-low">$1.20</span>
              </div>
              <div className="gas-item">
                <span className="gas-chain">BASE</span>
                <span className="gas-price gas-low">$0.02</span>
              </div>
              <div className="gas-item">
                <span className="gas-chain">ARB</span>
                <span className="gas-price gas-low">$0.15</span>
              </div>
              <div className="gas-item">
                <span className="gas-chain">OP</span>
                <span className="gas-price gas-low">$0.08</span>
              </div>
              <div className="gas-item">
                <span className="gas-chain">BSC</span>
                <span className="gas-price gas-low">$0.05</span>
              </div>
              <div className="gas-item">
                <span className="gas-chain">AVAX</span>
                <span className="gas-price gas-low">$0.03</span>
              </div>
              <div className="gas-item">
                <span className="gas-chain">SOL</span>
                <span className="gas-price gas-low">$0.001</span>
              </div>
              <div className="gas-item">
                <span className="gas-chain">TON</span>
                <span className="gas-price gas-low">$0.005</span>
              </div>
            </div>
          </div>
        </div>
      </MobileOverlay>

      <MobileOverlay 
        isOpen={mobileActivePanel === 'portfolio'}
        onClose={() => setMobileActivePanel(null)}
        title="PORTFOLIO"
      >
        <PortfolioTracker />
      </MobileOverlay>
    </div>
  );
};

export default Terminal;