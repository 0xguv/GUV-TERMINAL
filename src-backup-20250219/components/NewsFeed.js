import React, { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import BridgeHistory from './BridgeHistory';
import './NewsFeed.css';

const NewsFeed = ({ autoRefresh = true, feedType = 'news' }) => {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [news, setNews] = useState([]);
  const [swapHistory, setSwapHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newArticleIds, setNewArticleIds] = useState(new Set());
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const getFallbackNews = useCallback(() => {
    const now = new Date();
    return [
      {
        id: 'fallback-1',
        title: "Bitcoin Maintains Support Above $67K Amid Market Volatility",
        abstract: "Leading cryptocurrency continues to show resilience as institutional investors maintain positions.",
        byline: "By Market Analyst",
        published_date: new Date(now - 5 * 60 * 1000).toISOString(),
        section: "Bitcoin",
        source: "CoinDesk"
      },
      {
        id: 'fallback-2',
        title: "Ethereum Gas Fees Drop to 6-Month Low",
        abstract: "Network congestion eases as Layer 2 adoption accelerates across DeFi protocols.",
        byline: "By DeFi Reporter",
        published_date: new Date(now - 15 * 60 * 1000).toISOString(),
        section: "Ethereum",
        source: "Decrypt"
      },
      {
        id: 'fallback-3',
        title: "Major Exchange Reports Record Trading Volume",
        abstract: "24-hour trading volume surpasses previous all-time high amid increased market activity.",
        byline: "By Exchange Reporter",
        published_date: new Date(now - 32 * 60 * 1000).toISOString(),
        section: "Exchanges",
        source: "CoinTelegraph"
      },
      {
        id: 'fallback-4',
        title: "DeFi TVL Reaches New Milestone",
        abstract: "Total value locked across decentralized finance protocols shows strong growth.",
        byline: "By DeFi Analyst",
        published_date: new Date(now - 58 * 60 * 1000).toISOString(),
        section: "DeFi",
        source: "DeFi Llama"
      },
      {
        id: 'fallback-5',
        title: "Solana Network Upgrade Completed Successfully",
        abstract: "Latest protocol update improves transaction throughput and reducing latency.",
        byline: "By Solana Team",
        published_date: new Date(now - 95 * 60 * 1000).toISOString(),
        section: "Solana",
        source: "Solana Foundation"
      }
    ];
  }, []);

  const fetchSwapHistory = useCallback(async () => {
    if (!connected || !publicKey) {
      setSwapHistory([]);
      return;
    }

    const tokenSymbolCache = {};

    const fetchTokenSymbol = async (mint) => {
      if (tokenSymbolCache[mint]) {
        return tokenSymbolCache[mint];
      }

      try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        if (response.ok) {
          const data = await response.json();
          if (data.pairs && data.pairs.length > 0) {
            const pair = data.pairs[0];
            const symbol = pair.baseToken.symbol || mint.slice(0, 8);
            tokenSymbolCache[mint] = symbol;
            return symbol;
          }
        }
      } catch (err) {
        console.log('DexScreener fetch error:', err.message);
      }

      const fallback = mint.slice(0, 8);
      tokenSymbolCache[mint] = fallback;
      return fallback;
    };

    try {
      const signatures = await connection.getSignaturesForAddress(
        publicKey,
        { limit: 50 }
      );

      const history = await Promise.all(
        signatures.map(async (sig) => {
          const time = new Date(sig.blockTime * 1000);
          const now = new Date();
          const diff = Math.floor((now - time) / 1000 / 60);

          let fromToken = '';
          let toToken = '';
          let fromAmount = '';
          let toAmount = '';
          let isSuccess = sig.confirmationStatus === 'confirmed' || sig.confirmationStatus === 'finalized';

          try {
            const tx = await connection.getParsedTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0
            });

            if (tx && tx.meta) {
              if (tx.meta.err && Object.keys(tx.meta.err).length > 0) {
                isSuccess = false;
              }

              const preTokenBalances = tx.meta.preTokenBalances || [];
              const postTokenBalances = tx.meta.postTokenBalances || [];
              const preBalances = tx.meta.preBalances || [];
              const postBalances = tx.meta.postBalances || [];

              const changes = [];

              if (preBalances.length > 0 && postBalances.length > 0) {
                const solDiff = (postBalances[0] || 0) - (preBalances[0] || 0);
                if (solDiff !== 0) {
                  changes.push({
                    mint: 'SOL',
                    symbol: 'SOL',
                    diff: solDiff / Math.pow(10, 9),
                    isNative: true
                  });
                }
              }

              const userAddress = publicKey.toBase58();
              const preByOwner = {};
              const postByOwner = {};

              preTokenBalances.forEach(b => {
                if (b.owner === userAddress) {
                  preByOwner[b.mint] = (preByOwner[b.mint] || 0) + b.uiTokenAmount.uiAmount;
                }
              });

              postTokenBalances.forEach(b => {
                if (b.owner === userAddress) {
                  postByOwner[b.mint] = (postByOwner[b.mint] || 0) + b.uiTokenAmount.uiAmount;
                }
              });

              const tokenNames = {
                'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
                'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
                'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
                '85VBFQZC9TZkfaptBWqv14ALD9fJNUKtWA41kh69teRP': 'WIF',
                'JUPyiwrYJFskUPiHa7hkeR8VUtkqjberbSOWw91TsfU': 'JUP',
                '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59a5FDNJTYKwjJA': 'RAY',
                'orcaEKTdK7LKz57vaAYr9QeNsVEPfIC6iW8fNX7wdUg': 'ORCA',
                'HZ1JovNiVvGrGNiiYvEozEVg6Db6MAQvYpihjcMSBCYt': 'PYTH',
                'MEW1gQW4aHrfNcc3Kk58a7rG2TSS3YGzoB1xJJCvXHm': 'MEW',
              };

              const allMints = new Set([
                ...Object.keys(preByOwner),
                ...Object.keys(postByOwner)
              ]);

              const symbolPromises = [];
              allMints.forEach(mint => {
                if (!tokenNames[mint]) {
                  symbolPromises.push(
                    fetchTokenSymbol(mint).then(symbol => {
                      tokenNames[mint] = symbol;
                    })
                  );
                }
              });

              await Promise.all(symbolPromises);

              allMints.forEach(mint => {
                const pre = preByOwner[mint] || 0;
                const post = postByOwner[mint] || 0;
                const tokenDiff = post - pre;

                if (tokenDiff !== 0) {
                  const symbol = tokenNames[mint] || mint.slice(0, 8);
                  changes.push({
                    mint,
                    symbol,
                    diff: tokenDiff,
                    isNative: false
                  });
                }
              });

              if (changes.length >= 2) {
                const sent = changes.find(c => c.diff < 0);
                const received = changes.find(c => c.diff > 0);

                if (sent) {
                  fromToken = sent.symbol;
                  fromAmount = Math.abs(sent.diff).toFixed(sent.symbol === 'SOL' ? 4 : 2);
                }
                if (received) {
                  toToken = received.symbol;
                  toAmount = Math.abs(received.diff).toFixed(received.symbol === 'SOL' ? 4 : 2);
                }
              } else if (changes.length === 1) {
                const change = changes[0];
                fromToken = change.symbol;
                fromAmount = Math.abs(change.diff).toFixed(change.symbol === 'SOL' ? 4 : 2);
                toToken = change.symbol;
                toAmount = fromAmount;
              }
            }
          } catch (txErr) {
            console.log('Could not fetch tx details:', txErr.message);
          }

          return {
            id: sig.signature,
            signature: sig.signature,
            time: time.toISOString(),
            timeAgo: diff < 60 ? `${diff}m` : diff < 1440 ? `${Math.floor(diff / 60)}h` : `${Math.floor(diff / 1440)}d`,
            status: isSuccess ? 'SUCCESS' : 'FAILED',
            slot: sig.slot,
            fromToken,
            toToken,
            fromAmount,
            toAmount,
            hasChanges: !!fromToken
          };
        })
      );

      const filteredHistory = history.filter(tx => tx.hasChanges && tx.status === 'SUCCESS');
      setSwapHistory(filteredHistory);
    } catch (err) {
      console.error('Error fetching swap history:', err);
      setSwapHistory([]);
    }
  }, [connected, publicKey, connection]);

  const fetchCryptoNews = useCallback(async (isManual = false) => {
    try {
      setLoading(true);
      setError(null);

      // Add refresh parameter if manual refresh
      const url = isManual ? '/api/news?refresh=true' : '/api/news';
      const response = await fetch(url);

      if (!response.ok) {
        // Try to get error message from backend
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Error: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.Data && data.Data.length > 0) {
        const formattedNews = data.Data.slice(0, 10).map((article) => ({
          id: article.id + '-' + article.published_on,
          title: article.title,
          abstract: article.body ? article.body.substring(0, 120) + '...' : 'Click to read more.',
          byline: 'By ' + (article.source_info ? article.source_info.name : 'Crypto News'),
          published_date: new Date(article.published_on * 1000).toISOString(),
          url: article.url,
          section: getCategory(article.categories),
          source: article.source_info ? article.source_info.name : 'Crypto News',
          publishedAt: article.published_on * 1000,
          body: article.body ? article.body.substring(0, 300) + '...' : article.body
        }));

        formattedNews.sort((a, b) => b.publishedAt - a.publishedAt);
        setNews(formattedNews);
      } else {
        setNews(getFallbackNews());
      }
    } catch (err) {
      console.error('News fetch error:', err);
      setError(err.message);
      // Don't show fallback news if it's a custom provider error
      // Only show fallback for default CryptoCompare errors
      const saved = localStorage.getItem('guvSettings');
      const settings = saved ? JSON.parse(saved) : {};
      if (settings.newsProvider !== 'custom') {
        setNews(getFallbackNews());
      } else {
        setNews([]); // Clear news for custom provider errors
      }
    } finally {
      setLoading(false);
    }
  }, [getFallbackNews]);

  const getCategory = (categories) => {
    const cats = (categories || '').toLowerCase();
    if (cats.includes('bitcoin') || cats.includes('btc')) return 'Bitcoin';
    if (cats.includes('ethereum') || cats.includes('eth')) return 'Ethereum';
    if (cats.includes('defi') || cats.includes('decentralized')) return 'DeFi';
    if (cats.includes('nft') || cats.includes('nonfungible')) return 'NFTs';
    if (cats.includes('regulation') || cats.includes('sec') || cats.includes('government')) return 'Regulation';
    if (cats.includes('mining') || cats.includes('miner')) return 'Mining';
    if (cats.includes('exchange') || cats.includes('binance') || cats.includes('coinbase')) return 'Exchanges';
    if (cats.includes('market') || cats.includes('price') || cats.includes('trading')) return 'Markets';
    return 'Crypto';
  };

  useEffect(() => {
    if (feedType === 'swap') {
      fetchSwapHistory();
    } else {
      fetchCryptoNews();
      
      // Set up auto-refresh interval (every 10 minutes)
      let intervalId;
      if (autoRefresh) {
        intervalId = setInterval(() => {
          fetchCryptoNews();
        }, 10 * 60 * 1000); // 10 minutes
      }
      
      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }
  }, [feedType, fetchCryptoNews, fetchSwapHistory, autoRefresh]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);

    if (diff < 1) return 'NOW';
    if (diff < 60) return `${diff}m`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}d`;
  };

  const formatSignature = (sig) => {
    return `${sig.slice(0, 8)}...${sig.slice(-8)}`;
  };

  if (feedType === 'bridge') {
    return <BridgeHistory />;
  }

  if (feedType === 'swap') {
    return (
      <div className="news-feed">
        <div className="news-header-bar">
          <span className="news-title">REFRESH</span>
          <button className="news-refresh-btn" onClick={fetchSwapHistory} disabled={loading}>
            {loading ? '⟳' : '↻'}
          </button>
        </div>
        {!connected ? (
          <div className="swap-history-empty">
            <span className="empty-text">Connect wallet to view history</span>
          </div>
        ) : swapHistory.length === 0 ? (
          <div className="swap-history-empty">
            <span className="empty-text">No recent transactions found</span>
          </div>
        ) : (
          <div className="news-list">
              {swapHistory.map((tx, index) => (
              <div key={tx.id} className="news-item">
                <div className="news-header">
                  <span className="news-index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="news-time">{tx.timeAgo}</span>
                </div>
                <div className="swap-history-item">
                  <div className="swap-history-pair">
                    {tx.fromToken && tx.toToken ? (
                      <span className="swap-pair-text">
                        {tx.fromAmount} {tx.fromToken} → {tx.toAmount} {tx.toToken}
                      </span>
                    ) : (
                      <span className="swap-pair-text">Token Transfer</span>
                    )}
                  </div>
                  <div className="swap-history-sig">
                    <a 
                      href={`https://solscan.io/tx/${tx.signature}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="solscan-link"
                    >
                      {formatSignature(tx.signature)}
                    </a>
                    <span className="news-separator"> | </span>
                    <span className={`status-${tx.status.toLowerCase()}`}>{tx.status}</span>
                  </div>
                </div>
                <div className="news-separator">- - - - - - - - - - - - - -</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading && news.length === 0) {
    return (
      <div className="news-feed">
        <div className="news-header-bar">
          <span className="news-title">REFRESH</span>
          <button className="news-refresh-btn" onClick={() => fetchCryptoNews(true)} disabled={loading}>
            ↻
          </button>
        </div>
        <div className="news-loading">
          <span className="loading-text">LOADING CRYPTO NEWS...</span>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="news-feed">
      <div className="news-header-bar">
        <span className="news-title">REFRESH</span>
        <button className="news-refresh-btn" onClick={() => fetchCryptoNews(true)} disabled={loading}>
          {loading ? '⟳' : '↻'}
        </button>
      </div>
      {error && (
        <div className="news-error-banner" style={{ 
          padding: '8px 10px', 
          background: 'rgba(255, 68, 68, 0.15)', 
          color: '#ff4444', 
          fontSize: '11px', 
          borderBottom: '1px solid #ff4444',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          <span style={{ marginRight: '5px' }}>⚠</span> {error}
        </div>
      )}
      {lastUpdate && !error && (
        <div className="news-last-update">
          Updated: {formatTime(lastUpdate)}
        </div>
      )}
      <div className="news-list">
        {news.length === 0 && error && (
          <div className="news-empty" style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: 'var(--text-muted)',
            fontSize: '12px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚠️</div>
            <div>News unavailable</div>
            <div style={{ fontSize: '10px', marginTop: '5px', opacity: 0.7 }}>Check your custom URL settings</div>
          </div>
        )}
        {news.map((article, index) => (
          <div
            key={article.id}
            className={`news-item ${newArticleIds.has(article.id) ? 'new-article' : ''}`}
            onClick={() => setSelectedArticle(article)}
          >
            <div className="news-header">
              <span className="news-index">{String(index + 1).padStart(2, '0')}</span>
              {newArticleIds.has(article.id) && (
                <span className="news-new-indicator flash">[NEW]</span>
              )}
              <span className="news-time">{formatTime(article.published_date)}</span>
            </div>
            <div className="news-title">
              {article.title}
            </div>
            <p className="news-abstract">{article.abstract}</p>
            <div className="news-meta">
              <span className="news-section">[{article.section?.toUpperCase() || 'NEWS'}]</span>
              <span className="news-byline">{article.byline}</span>
            </div>
            <div className="news-separator">- - - - - - - - - - - - - -</div>
          </div>
        ))}
      </div>

      {selectedArticle && (
        <div className="news-modal-overlay" onClick={() => setSelectedArticle(null)}>
          <div className="news-modal" onClick={(e) => e.stopPropagation()}>
            <div className="news-modal-header">
              <span className="news-modal-section">[{selectedArticle.section?.toUpperCase() || 'NEWS'}]</span>
              <button className="news-modal-close" onClick={() => setSelectedArticle(null)}>×</button>
            </div>
            <h3 className="news-modal-title">{selectedArticle.title}</h3>
            <div className="news-modal-meta">
              <span className="news-modal-byline">{selectedArticle.byline}</span>
              <span className="news-modal-time">{formatTime(selectedArticle.published_date)}</span>
            </div>
            <p className="news-modal-abstract">{selectedArticle.body || selectedArticle.abstract}</p>
            <div className="news-modal-actions">
              <button 
                className="news-modal-open-btn"
                onClick={() => window.open(selectedArticle.url, '_blank', 'noopener,noreferrer')}
              >
                READ FULL ARTICLE →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
