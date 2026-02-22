import React from 'react';
import { Home, Newspaper, BarChart3, Wallet } from 'lucide-react';
import './MobileDock.css';

const MobileDock = ({ 
  activeTab, 
  setActivePanel, 
  activePanel,
  unreadNews = false,
  hasPortfolio = false
}) => {
  const dockItems = [
    { 
      id: 'main', 
      icon: Home, 
      label: 'HOME',
      onClick: () => setActivePanel(null)
    },
    { 
      id: 'news', 
      icon: Newspaper, 
      label: 'NEWS',
      badge: unreadNews,
      onClick: () => setActivePanel(activePanel === 'news' ? null : 'news')
    },
    { 
      id: 'stats', 
      icon: BarChart3, 
      label: 'STATS',
      onClick: () => setActivePanel(activePanel === 'stats' ? null : 'stats')
    },
    { 
      id: 'portfolio', 
      icon: Wallet, 
      label: 'PORTFOLIO',
      badge: hasPortfolio,
      onClick: () => setActivePanel(activePanel === 'portfolio' ? null : 'portfolio')
    }
  ];

  return (
    <div className="mobile-dock">
      <div className="dock-items">
        {dockItems.map(item => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              className={`dock-item ${activePanel === item.id ? 'active' : ''} ${item.id === 'main' && !activePanel ? 'active' : ''}`}
              onClick={item.onClick}
            >
              <span className="dock-icon">
                <IconComponent size={20} strokeWidth={2} />
                {item.badge && <span className="dock-badge"></span>}
              </span>
              <span className="dock-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileDock;
