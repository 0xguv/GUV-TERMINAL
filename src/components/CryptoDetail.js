import React, { useState, useEffect } from 'react';
import { Twitter, MessageCircle, Globe, Github, BookOpen, Users, TrendingUp, TrendingDown, Activity, ExternalLink, X } from 'lucide-react';
import TradingViewWidget from './TradingViewWidget';
import './CryptoDetail.css';

const CryptoDetail = ({ crypto, onClose }) => {
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!crypto) return;

    // Check if this is a Solana token (DexScreener data)
    const isSolanaToken = crypto.isSolanaToken || false;
    
    if (!isSolanaToken && crypto.symbol) {
      // Fetch detailed CoinGecko data using symbol (works with both CMC and CoinGecko providers)
      fetchCoinGeckoDetailsBySymbol(crypto.symbol);
    }
  }, [crypto]);

  const fetchCoinGeckoDetailsBySymbol = async (symbol) => {
    if (!symbol) {
      
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      
      
      // First, search for the coin by symbol to get the correct CoinGecko ID
      const searchResponse = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${symbol.toLowerCase()}`
      );
      
      if (!searchResponse.ok) {
        throw new Error(`Failed to search for coin: ${searchResponse.status}`);
      }
      
      const searchData = await searchResponse.json();
      
      // Find the exact match by symbol
      const coinMatch = searchData.coins?.find(
        coin => coin.symbol.toLowerCase() === symbol.toLowerCase()
      );
      
      if (!coinMatch) {
        
        setLoading(false);
        return;
      }
      
      const coinId = coinMatch.id;
      
      
      // Now fetch the detailed data using the CoinGecko ID
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false&sparkline=false`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch coin details: ${response.status}`);
      }
      
      const data = await response.json();
      
      setDetailData(data);
    } catch (err) {
      
      setError('Failed to load additional details');
    } finally {
      setLoading(false);
    }
  };

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

  // Extract social media links from CoinGecko data
  const getSocialLinks = () => {
    if (!detailData?.links) return [];
    
    const links = [];
    const { links: linkData } = detailData;
    
    if (linkData.twitter_screen_name) {
      links.push({ type: 'twitter', url: `https://twitter.com/${linkData.twitter_screen_name}`, icon: Twitter, label: 'Twitter' });
    }
    if (linkData.telegram_channel_identifier) {
      links.push({ type: 'telegram', url: `https://t.me/${linkData.telegram_channel_identifier}`, icon: MessageCircle, label: 'Telegram' });
    }
    if (linkData.subreddit_url) {
      links.push({ type: 'reddit', url: linkData.subreddit_url, icon: Globe, label: 'Reddit' });
    }
    if (linkData.facebook_username) {
      links.push({ type: 'facebook', url: `https://facebook.com/${linkData.facebook_username}`, icon: Users, label: 'Facebook' });
    }
    
    return links;
  };

  // Extract official links
  const getOfficialLinks = () => {
    if (!detailData?.links) return [];
    
    const links = [];
    const { links: linkData } = detailData;
    
    if (linkData.homepage?.[0]) {
      links.push({ type: 'website', url: linkData.homepage[0], icon: Globe, label: 'Website' });
    }
    if (linkData.blockchain_site?.[0]) {
      links.push({ type: 'explorer', url: linkData.blockchain_site[0], icon: Activity, label: 'Explorer' });
    }
    if (linkData.official_forum_url?.[0]) {
      links.push({ type: 'forum', url: linkData.official_forum_url[0], icon: BookOpen, label: 'Forum' });
    }
    if (linkData.repos_url?.github?.[0]) {
      links.push({ type: 'github', url: linkData.repos_url.github[0], icon: Github, label: 'GitHub' });
    }
    
    return links;
  };

  const socialLinks = getSocialLinks();
  const officialLinks = getOfficialLinks();
  const description = detailData?.description?.en;
  const categories = detailData?.categories?.filter(cat => cat);
  const genesisDate = detailData?.genesis_date;
  const sentiment = detailData?.sentiment_votes_up_percentage;

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
          <button className="detail-close" onClick={onClose}><X size={18} /></button>
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
          {/* Price Header */}
          <div className="detail-price-header">
            <div className="detail-price-main">
              <span className="detail-price">{formatPrice(crypto.price)}</span>
              <span className={`detail-change ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '+' : ''}{crypto.changePercent.toFixed(2)}%
              </span>
            </div>
            <span className="detail-pair">{crypto.symbol}/USD</span>
          </div>

          {/* Description Section */}
          {(description || loading) && !crypto.isSolanaToken && (
            <div className="stats-section full-width">
              <h3 className="section-title">ABOUT</h3>
              <div className="description-content">
                {loading ? (
                  <p className="loading-text">Loading description...</p>
                ) : (
                  <>
                    <p>{description.length > 300 ? description.substring(0, 300) + '...' : description}</p>
                    {description.length > 300 && (
                      <a 
                        href={`https://www.coingecko.com/en/coins/${crypto.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="read-more-link"
                      >
                        Read more on CoinGecko →
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Categories */}
          {(categories?.length > 0 || loading) && !crypto.isSolanaToken && (
            <div className="stats-section full-width">
              <h3 className="section-title">CATEGORIES</h3>
              <div className="categories-list">
                {loading ? (
                  <span className="loading-text">Loading...</span>
                ) : (
                  categories.slice(0, 6).map((category, idx) => (
                    <span key={idx} className="category-tag">{category}</span>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Market Data */}
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

          {/* Price Stats */}
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

          {/* Performance */}
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
              {genesisDate && (
                <div className="stat-item">
                  <span className="stat-label">GENESIS</span>
                  <span className="stat-value">{genesisDate}</span>
                </div>
              )}
              {sentiment && (
                <div className="stat-item">
                  <span className="stat-label">BULLISH</span>
                  <span className={`stat-value ${sentiment > 50 ? 'positive' : 'negative'}`}>
                    {sentiment.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Official Links */}
          {(officialLinks.length > 0 || loading) && !crypto.isSolanaToken && (
            <div className="stats-section full-width links-section">
              <h3 className="section-title">OFFICIAL LINKS</h3>
              <div className="links-grid">
                {loading ? (
                  <span className="loading-text">Loading links...</span>
                ) : (
                  officialLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-item official-link"
                    >
                      <span className="link-icon"><link.icon size={14} /></span>
                      <span className="link-label">{link.label}</span>
                    </a>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Social Media */}
          {(socialLinks.length > 0 || loading) && !crypto.isSolanaToken && (
            <div className="stats-section full-width links-section">
              <h3 className="section-title">SOCIAL MEDIA</h3>
              <div className="links-grid">
                {loading ? (
                  <span className="loading-text">Loading social links...</span>
                ) : (
                  socialLinks.map((link, idx) => {
                    const IconComponent = link.icon;
                    return (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-item social-link"
                    >
                      <span className="link-icon"><IconComponent size={14} /></span>
                      <span className="link-label">{link.label}</span>
                    </a>
                  );})
                )}
              </div>
            </div>
          )}

          {/* Community Data */}
          {(detailData?.community_data || loading) && !crypto.isSolanaToken && (
            <div className="stats-section full-width">
              <h3 className="section-title">COMMUNITY</h3>
              <div className="stats-grid">
                {loading ? (
                  <div className="stat-item">
                    <span className="stat-label">STATUS</span>
                    <span className="stat-value">Loading...</span>
                  </div>
                ) : (
                  <>
                    {detailData.community_data?.twitter_followers > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">TWITTER FOLLOWERS</span>
                        <span className="stat-value">{formatNumber(detailData.community_data.twitter_followers)}</span>
                      </div>
                    )}
                    {detailData.community_data?.telegram_channel_user_count > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">TELEGRAM MEMBERS</span>
                        <span className="stat-value">{formatNumber(detailData.community_data.telegram_channel_user_count)}</span>
                      </div>
                    )}
                    {detailData.community_data?.reddit_subscribers > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">REDDIT SUBSCRIBERS</span>
                        <span className="stat-value">{formatNumber(detailData.community_data.reddit_subscribers)}</span>
                      </div>
                    )}
                    {detailData.community_data?.reddit_average_posts_48h > 0 && (
                      <div className="stat-item">
                        <span className="stat-label">REDDIT POSTS/DAY</span>
                        <span className="stat-value">{detailData.community_data.reddit_average_posts_48h.toFixed(1)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </div>


      </div>
    </div>
  );
};

export default CryptoDetail;
