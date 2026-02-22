const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Keys - use environment variable or default free key
let CMC_API_KEY = process.env.CMC_API_KEY || '';
const CMC_API_URL = 'https://pro-api.coinmarketcap.com/v1';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const CRYPTOCOMPARE_API_URL = 'https://min-api.cryptocompare.com';

// Price provider configuration (stored in memory)
let PRICE_PROVIDER = 'coingecko';
let PRICE_API_KEY = '';

// News cache variables (must be defined before endpoints)
let newsCache = null;
let newsCacheTime = 0;
const NEWS_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (was 10 minutes)

// Endpoint to update Price API key and provider from frontend
app.post('/api/price-key', (req, res) => {
  const { apiKey, provider } = req.body;
  
  if (provider) {
    PRICE_PROVIDER = provider;
  }
  
  if (apiKey && apiKey.trim()) {
    PRICE_API_KEY = apiKey.trim();
    // Also update CMC key if using CMC provider
    if (provider === 'cmc') {
      CMC_API_KEY = apiKey.trim();
    }
    console.log(`[CONFIG] ${provider} API Key updated`);
  } else {
    PRICE_API_KEY = '';
    if (provider === 'cmc') {
      CMC_API_KEY = process.env.CMC_API_KEY || '';
    }
    console.log(`[CONFIG] ${provider} API Key reset`);
  }
  
  res.json({ success: true, message: 'Price provider settings updated' });
});

// News API key and provider (stored in memory)
let NEWS_API_KEY = '';
let NEWS_PROVIDER = 'cryptocompare';
let CUSTOM_NEWS_URL = '';
let NEWSAPI_KEY = '';

const NEWSAPI_BASE_URL = 'https://newsapi.org/v2';

// Endpoint to update News API key from frontend
app.post('/api/news-key', (req, res) => {
  const { apiKey, provider, customUrl } = req.body;
  
  // Clear the news cache when settings change
  newsCache = null;
  newsCacheTime = 0;
  console.log(`[CONFIG] News cache cleared due to settings change`);
  
  if (provider === 'custom' && customUrl) {
    NEWS_PROVIDER = 'custom';
    CUSTOM_NEWS_URL = customUrl.startsWith('http') ? customUrl : 'https://' + customUrl;
    NEWS_API_KEY = apiKey || '';
    console.log(`[CONFIG] News provider set to: ${CUSTOM_NEWS_URL}`);
  } else if (provider === 'newsapi') {
    NEWS_PROVIDER = 'newsapi';
    NEWSAPI_KEY = apiKey || '';
    console.log(`[CONFIG] News provider set to: NewsAPI`);
  } else {
    NEWS_PROVIDER = 'cryptocompare';
    CUSTOM_NEWS_URL = '';
    NEWS_API_KEY = apiKey || '';
    console.log(`[CONFIG] News provider reset to CryptoCompare`);
  }
  
  res.json({ success: true, message: 'News settings updated' });
});

// Create axios instance with timeout and retry config
const axiosInstance = axios.create({
  timeout: 10000, // 10 second timeout
  headers: {
    'Accept': 'application/json',
    'Accept-Encoding': 'deflate, gzip'
  }
});

// Helper function to transform CoinGecko data to CMC format
const transformCoinGeckoToCMC = (data) => {
  return data.map((coin, index) => ({
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol.toUpperCase(),
    slug: coin.id,
    cmc_rank: coin.market_cap_rank || index + 1,
    num_market_pairs: null,
    circulating_supply: coin.circulating_supply,
    total_supply: coin.total_supply,
    max_supply: coin.max_supply,
    last_updated: coin.last_updated,
    quote: {
      USD: {
        price: coin.current_price,
        volume_24h: coin.total_volume,
        volume_change_24h: null,
        percent_change_1h: null,
        percent_change_24h: coin.price_change_percentage_24h,
        percent_change_7d: coin.price_change_percentage_7d_in_currency,
        percent_change_30d: null,
        market_cap: coin.market_cap,
        market_cap_dominance: null,
        fully_diluted_market_cap: coin.fully_diluted_valuation,
        last_updated: coin.last_updated
      }
    }
  }));
};

// Helper function to transform CryptoCompare data to CMC format
const transformCryptoCompareToCMC = (data, convert) => {
  return Object.entries(data).map(([symbol, coin], index) => ({
    id: symbol.toLowerCase(),
    name: symbol,
    symbol: symbol,
    slug: symbol.toLowerCase(),
    cmc_rank: index + 1,
    num_market_pairs: null,
    circulating_supply: null,
    total_supply: null,
    max_supply: null,
    last_updated: new Date().toISOString(),
    quote: {
      [convert]: {
        price: coin[convert] || 0,
        volume_24h: null,
        volume_change_24h: null,
        percent_change_1h: null,
        percent_change_24h: null,
        percent_change_7d: null,
        percent_change_30d: null,
        market_cap: null,
        market_cap_dominance: null,
        fully_diluted_market_cap: null,
        last_updated: new Date().toISOString()
      }
    }
  }));
};

// Proxy endpoint for CMC listings (supports multiple providers)
app.get('/api/cmc/listings', async (req, res) => {
  const { start = 1, limit = 100, convert = 'USD', provider: queryProvider } = req.query;
  
  // Use provider from query if provided, otherwise use configured provider
  const provider = queryProvider || PRICE_PROVIDER;
  
  console.log(`[DATA] Request provider: ${provider} | Backend config: ${PRICE_PROVIDER} | Currency: ${convert}`);
  
  // Route to appropriate provider
  if (provider === 'cmc' && CMC_API_KEY) {
    // Use CoinMarketCap
    try {
      console.log(`[DATA] Fetching from CoinMarketCap...`);
      const response = await axiosInstance.get(`${CMC_API_URL}/cryptocurrency/listings/latest`, {
        headers: {
          'X-CMC_PRO_API_KEY': CMC_API_KEY,
          'Accept': 'application/json'
        },
        params: { start, limit, convert }
      });
      
      console.log(`[DATA] CMC response received`);
      res.json(response.data);
    } catch (error) {
      console.error(`[ERROR] CMC failed: ${error.message}`);
      // Check if it's an authentication error (invalid API key)
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        return res.status(401).json({ 
          error: 'Invalid API key', 
          message: 'Your CMC API key is invalid. Please check your key in Settings > Data > API Key'
        });
      }
      res.status(500).json({ error: 'CMC API error', message: error.message });
    }
    return;
  }
  
  if (provider === 'cryptocompare' && PRICE_API_KEY) {
    // Use CryptoCompare
    console.log(`[DATA] Fetching from CryptoCompare...`);
    try {
      const symbols = 'BTC,ETH,BNB,SOL,XRP,ADX,DOT,DOGE,AVAX,TON,SHIB,LINK,TRX,NEAR,MATIC,PEPE,ICP,LTC,APT,FET,AAVE,IMX,SAND,GALA,FLOW,MANA,AXS,CHZ,ENJ,BAT,COMP,CRV,SUSHI,UNI,MKR,YFI,1INCH,LDO,RPL,SSV';
      const ccResponse = await axiosInstance.get(
        `${CRYPTOCOMPARE_API_URL}/data/pricemulti`, {
          params: {
            fsyms: symbols,
            tsyms: convert,
            api_key: PRICE_API_KEY
          }
        }
      );
      
      const transformedData = {
        status: {
          timestamp: new Date().toISOString(),
          error_code: 0,
          error_message: null,
          elapsed: 0,
          credit_count: 0,
          notice: 'Using CryptoCompare data'
        },
        data: transformCryptoCompareToCMC(ccResponse.data, convert)
      };
      
      console.log(`[DATA] CryptoCompare response received`);
      res.json(transformedData);
    } catch (ccError) {
      console.error(`[ERROR] CryptoCompare failed: ${ccError.message}`);
      // Check if it's an authentication error (invalid API key)
      if (ccError.response && (ccError.response.status === 401 || ccError.response.status === 403)) {
        return res.status(401).json({ 
          error: 'Invalid API key', 
          message: 'Your CryptoCompare API key is invalid. Please check your key in Settings > Data > API Key'
        });
      }
      res.status(500).json({ error: 'CryptoCompare API error', message: ccError.message });
    }
    return;
  }
  
  // Check if provider was explicitly selected but missing API key
  if (provider === 'cmc' && !CMC_API_KEY) {
    console.log(`[ERROR] CMC selected but no API key provided`);
    return res.status(400).json({ 
      error: 'API key required', 
      message: 'CoinMarketCap requires an API key. Please add your key in Settings > Data > API Key'
    });
  }
  
  if (provider === 'cryptocompare' && !PRICE_API_KEY) {
    console.log(`[ERROR] CryptoCompare selected but no API key provided`);
    return res.status(400).json({ 
      error: 'API key required', 
      message: 'CryptoCompare requires an API key. Please add your key in Settings > Data > API Key'
    });
  }
  
  // Default: Use CoinGecko (free, no key needed)
  console.log(`[DATA] Fetching from CoinGecko (free tier) in ${convert}...`);
  try {
    const cgResponse = await axiosInstance.get(
      `${COINGECKO_API_URL}/coins/markets`, {
        params: {
          vs_currency: convert.toLowerCase(),
          order: 'market_cap_desc',
          per_page: limit,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h'
        }
      }
    );
    
    const transformedData = {
      status: {
        timestamp: new Date().toISOString(),
        error_code: 0,
        error_message: null,
        elapsed: 0,
        credit_count: 0,
        notice: `Using CoinGecko data (${provider === 'cmc' ? 'CMC key not set' : provider === 'cryptocompare' ? 'CryptoCompare key not set' : 'default'})`
      },
      data: transformCoinGeckoToCMC(cgResponse.data)
    };
    
    console.log(`[DATA] CoinGecko response received (${cgResponse.data.length} coins)`);
    res.json(transformedData);
  } catch (cgError) {
    let errorMsg;
    if (cgError.response?.status === 429) {
      errorMsg = 'CoinGecko rate limit exceeded (free tier)';
    } else if (cgError.response?.status === 401 || cgError.response?.status === 403) {
      errorMsg = 'Your CoinGecko API key is invalid. Please check your key in Settings > Data > API Key';
    } else {
      errorMsg = cgError.message;
    }
    console.error(`[ERROR] CoinGecko failed: ${errorMsg}`);
    res.status(500).json({ error: 'Data unavailable', message: errorMsg });
  }
});

// Proxy endpoint for CMC quotes (with CoinGecko fallback)
app.get('/api/cmc/quotes', async (req, res) => {
  const { symbol, convert = 'USD' } = req.query;
  
  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter required' });
  }
  
  // Skip CMC if no API key is set
  if (!CMC_API_KEY) {
    console.log(`[DATA] Fetching quotes from CoinGecko (free tier)...`);
    try {
      const symbols = symbol.split(',');
      
      const cgResponse = await axiosInstance.get(
        `${COINGECKO_API_URL}/coins/markets`, {
          params: {
            vs_currency: 'usd',
            symbols: symbols.join(',').toLowerCase(),
            order: 'market_cap_desc',
            per_page: 250,
            sparkline: false,
            price_change_percentage: '24h'
          }
        }
      );
      
      // Transform to match CMC format
      const dataObj = {};
      cgResponse.data.forEach(coin => {
        dataObj[coin.symbol.toUpperCase()] = {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol.toUpperCase(),
          slug: coin.id,
          quote: {
            USD: {
              price: coin.current_price,
              volume_24h: coin.total_volume,
              percent_change_24h: coin.price_change_percentage_24h,
              market_cap: coin.market_cap,
              last_updated: coin.last_updated
            }
          }
        };
      });
      
      const transformedData = {
        status: {
          timestamp: new Date().toISOString(),
          error_code: 0,
          error_message: null,
          notice: 'Using CoinGecko data (no CMC API key)'
        },
        data: dataObj
      };
      
      console.log(`[DATA] CoinGecko quotes received (${Object.keys(dataObj).length} symbols)`);
      res.json(transformedData);
    } catch (cgError) {
      let errorMsg;
      if (cgError.response?.status === 429) {
        errorMsg = 'CoinGecko rate limit exceeded (free tier)';
      } else if (cgError.response?.status === 401 || cgError.response?.status === 403) {
        errorMsg = 'Your CoinGecko API key is invalid. Please check your key in Settings > Data > API Key';
      } else {
        errorMsg = cgError.message;
      }
      console.error(`[ERROR] CoinGecko failed: ${errorMsg}`);
      res.status(500).json({ error: 'Data unavailable', message: errorMsg });
    }
    return;
  }
  
  try {    
    console.log(`[DATA] Fetching quotes from CoinMarketCap...`);
    
    const response = await axiosInstance.get(`${CMC_API_URL}/cryptocurrency/quotes/latest`, {
      headers: {
        'X-CMC_PRO_API_KEY': CMC_API_KEY,
        'Accept': 'application/json'
      },
      params: { symbol, convert }
    });
    
    console.log(`[DATA] CMC quotes received`);
    res.json(response.data);
  } catch (error) {
    const errorMsg = error.response?.status === 429 
      ? 'CoinMarketCap rate limit exceeded' 
      : error.message;
    console.error(`[ERROR] CMC failed: ${errorMsg}`);
    
    // Fallback to CoinGecko
    console.log(`[FALLBACK] Trying CoinGecko...`);
    
    try {
      const { symbol } = req.query;
      const symbols = symbol.split(',');
      
      // CoinGecko uses symbols parameter for searching
      const cgResponse = await axiosInstance.get(
        `${COINGECKO_API_URL}/coins/markets`, {
          params: {
            vs_currency: 'usd',
            symbols: symbols.join(',').toLowerCase(),
            order: 'market_cap_desc',
            per_page: 250,
            sparkline: false,
            price_change_percentage: '24h'
          }
        }
      );
      
      // Transform to match CMC format
      const dataObj = {};
      cgResponse.data.forEach(coin => {
        dataObj[coin.symbol.toUpperCase()] = {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol.toUpperCase(),
          slug: coin.id,
          quote: {
            USD: {
              price: coin.current_price,
              volume_24h: coin.total_volume,
              percent_change_24h: coin.price_change_percentage_24h,
              market_cap: coin.market_cap,
              last_updated: coin.last_updated
            }
          }
        };
      });
      
      const transformedData = {
        status: {
          timestamp: new Date().toISOString(),
          error_code: 0,
          error_message: null,
          notice: 'Using CoinGecko fallback data'
        },
        data: dataObj
      };
      
      console.log(`[DATA] CoinGecko fallback quotes received`);
      res.json(transformedData);
    } catch (cgError) {
      let errorMsg;
      if (cgError.response?.status === 429) {
        errorMsg = 'CoinGecko rate limit exceeded (free tier)';
      } else if (cgError.response?.status === 401 || cgError.response?.status === 403) {
        errorMsg = 'Your CoinGecko API key is invalid. Please check your key in Settings > Data > API Key';
      } else {
        errorMsg = cgError.message;
      }
      console.error(`[ERROR] All sources failed: ${errorMsg}`);
      res.status(500).json({ 
        error: 'Data unavailable',
        message: errorMsg
      });
    }
  }
});

// News endpoint with fallback
app.get('/api/news', async (req, res) => {
  try {
    const { refresh } = req.query;
    
    // Check cache first (unless refresh=true)
    const now = Date.now();
    if (!refresh && newsCache && (now - newsCacheTime) < NEWS_CACHE_DURATION) {
      return res.json(newsCache);
    }
    
    let response;
    
    // Check NewsAPI first
    if (NEWS_PROVIDER === 'newsapi' && NEWSAPI_KEY) {
      // Use NewsAPI
      console.log(`[NEWS] Fetching from NewsAPI...`);
      
      try {
        const newsApiUrl = `${NEWSAPI_BASE_URL}/everything?q=crypto&sortBy=publishedAt&language=en&pageSize=10&apiKey=${NEWSAPI_KEY}`;
        
        response = await axiosInstance.get(newsApiUrl, {
          timeout: 10000
        });
        
        if (response.data && response.data.status === 'error') {
          console.error(`[ERROR] NewsAPI error: ${response.data.message || response.data.code}`);
          return res.status(400).json({
            error: 'NewsAPI Error',
            message: response.data.message || 'Invalid API key or request parameters'
          });
        }
        
        if (response.data.articles && Array.isArray(response.data.articles)) {
          console.log(`[NEWS] NewsAPI returned ${response.data.articles.length} articles`);
          
          if (response.data.articles.length === 0) {
            return res.status(404).json({
              error: 'No articles',
              message: 'NewsAPI returned 0 articles.'
            });
          }
          
          const normalizedData = {
            Data: response.data.articles.map((article, index) => ({
              id: `newsapi-${index}`,
              published_on: Math.floor(new Date(article.publishedAt).getTime() / 1000),
              title: article.title || 'Untitled',
              body: article.description || article.content || 'Click to read more.',
              url: article.url,
              source_info: { name: article.source?.name || 'NewsAPI' },
              categories: 'Crypto|News'
            }))
          };
          
          newsCache = normalizedData;
          newsCacheTime = now;
          res.json(normalizedData);
          return;
        }
      } catch (newsApiError) {
        console.error(`[ERROR] NewsAPI failed: ${newsApiError.message}`);
        return res.status(500).json({
          error: 'NewsAPI Error',
          message: newsApiError.message || 'Failed to fetch from NewsAPI'
        });
      }
    }
    
    // Check Custom URL second
    if (NEWS_PROVIDER === 'custom' && CUSTOM_NEWS_URL) {
      // Validate that the URL is actually a valid URL
      try {
        new URL(CUSTOM_NEWS_URL);
      } catch (urlError) {
        console.error(`[ERROR] Invalid custom news URL format: ${CUSTOM_NEWS_URL}`);
        return res.status(400).json({
          error: 'Invalid URL',
          message: `The custom news URL '${CUSTOM_NEWS_URL}' is not a valid URL. Please enter a valid URL like https://api.example.com/news`
        });
      }
      
      // Use custom news API
      console.log(`[NEWS] Fetching from custom API: ${CUSTOM_NEWS_URL}`);
      
      const fetchOptions = {
        headers: {},
        timeout: 5000 // 5 second timeout for custom URLs
      };
      
      if (NEWS_API_KEY) {
        fetchOptions.headers['Authorization'] = `Bearer ${NEWS_API_KEY}`;
        fetchOptions.headers['x-api-key'] = NEWS_API_KEY;
      }
      
      response = await axiosInstance.get(CUSTOM_NEWS_URL, fetchOptions);
      
      console.log(`[NEWS] Custom API response received, status: ${response.status}`);
      console.log(`[NEWS] Response data keys: ${Object.keys(response.data || {}).join(', ')}`);
      
      // Check for NewsAPI error response
      if (response.data && response.data.status === 'error') {
        console.error(`[ERROR] NewsAPI error: ${response.data.message || response.data.code}`);
        return res.status(400).json({
          error: 'NewsAPI Error',
          message: response.data.message || 'Invalid API key or request parameters'
        });
      }
      
      // Assume custom API returns data in a similar format or wrap it
      if (response.data) {
        // Try to detect the format and normalize
        let normalizedData = response.data;
        
        // Check if it's NewsAPI format (has 'articles' array)
        if (response.data.articles && Array.isArray(response.data.articles)) {
          console.log(`[NEWS] Detected NewsAPI format, ${response.data.articles.length} articles found`);
          
          if (response.data.articles.length === 0) {
            return res.status(404).json({
              error: 'No articles',
              message: 'NewsAPI returned 0 articles. Try a different search query.'
            });
          }
          
          normalizedData = {
            Data: response.data.articles.map((article, index) => ({
              id: `newsapi-${index}`,
              published_on: Math.floor(new Date(article.publishedAt).getTime() / 1000),
              title: article.title || 'Untitled',
              body: article.description || article.content || 'Click to read more.',
              url: article.url,
              source_info: { name: article.source?.name || 'NewsAPI' },
              categories: 'Crypto|News'
            }))
          };
        }
        // If it's not in CryptoCompare format, wrap it
        else if (!response.data.Data) {
          normalizedData = {
            Data: Array.isArray(response.data) ? response.data : [response.data]
          };
        }
        
        newsCache = normalizedData;
        newsCacheTime = now;
        res.json(normalizedData);
        return;
      }
    }
    
    // Check if NewsAPI selected but no key provided
    if (NEWS_PROVIDER === 'newsapi' && !NEWSAPI_KEY) {
      console.log(`[ERROR] NewsAPI selected but no API key provided`);
      return res.status(400).json({
        error: 'API key required',
        message: 'NewsAPI requires an API key. Please add your key in Settings > Data > News API Key'
      });
    }
    
    // Default: Use CryptoCompare
    console.log(`[NEWS] Fetching from CryptoCompare...`);
    const apiKeyToUse = NEWS_API_KEY || 'free';
    
    try {
      response = await axiosInstance.get(
        `${CRYPTOCOMPARE_API_URL}/data/v2/news/?lang=EN`,
        {
          params: {
            api_key: apiKeyToUse
          }
        }
      );
      
      if (response.data && response.data.Data && response.data.Data.length > 0) {
        newsCache = response.data;
        newsCacheTime = now;
        res.json(response.data);
        return;
      } else {
        throw new Error('No articles found');
      }
    } catch (error) {
    // Check if it's an authentication error or custom URL error
    if (NEWS_PROVIDER === 'custom' && (error.response?.status === 401 || error.response?.status === 403)) {
      console.error(`[ERROR] Custom news URL authentication failed: ${error.message}`);
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'Your custom news API key is invalid. Please check your key in Settings > Data > News API Key'
      });
    }
    
    if (NEWS_PROVIDER === 'custom' && (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')) {
      console.error(`[ERROR] Custom news URL not found: ${error.message}`);
      return res.status(404).json({
        error: 'Invalid URL',
        message: 'Your custom news URL is invalid or unreachable. Please check the URL in Settings > Data > News'
      });
    }
    
    // For any other error with custom provider, return the error instead of falling back
    if (NEWS_PROVIDER === 'custom') {
      console.error(`[ERROR] Custom news URL failed: ${error.message}`);
      return res.status(400).json({
        error: 'Invalid custom URL',
        message: `Failed to fetch from custom URL: ${error.message}. Please check your URL in Settings > Data > News`
      });
    }
    
    // Fallback: Return static news data (silently) only for default CryptoCompare
    const now = Math.floor(Date.now() / 1000);
    
    const fallbackNews = {
      Data: [
        {
          id: '1',
          published_on: now - 300,
          title: "Bitcoin Maintains Support Above $97K Amid Market Consolidation",
          body: "Leading cryptocurrency continues to show resilience as institutional investors maintain positions. Market analysts suggest the current support level could determine near-term direction for BTC.",
          url: "https://www.coindesk.com/markets/",
          source_info: { name: "CoinDesk" },
          categories: "Bitcoin|Markets"
        },
        {
          id: '2',
          published_on: now - 900,
          title: "Ethereum Gas Fees Drop to 3-Month Low",
          body: "Network congestion eases as Layer 2 adoption accelerates across DeFi protocols. Average transaction fees have fallen significantly.",
          url: "https://decrypt.co/",
          source_info: { name: "Decrypt" },
          categories: "Ethereum|DeFi"
        },
        {
          id: '3',
          published_on: now - 1800,
          title: "Major Exchange Reports Record Trading Volume",
          body: "24-hour trading volume surpasses previous all-time high amid increased market activity across spot and derivatives markets.",
          url: "https://cointelegraph.com/",
          source_info: { name: "CoinTelegraph" },
          categories: "Exchanges|Markets"
        },
        {
          id: '4',
          published_on: now - 3600,
          title: "DeFi TVL Reaches New All-Time High",
          body: "Total value locked across decentralized finance protocols shows strong growth. New DeFi projects continue to attract significant capital.",
          url: "https://defillama.com/",
          source_info: { name: "DeFi Llama" },
          categories: "DeFi"
        },
        {
          id: '5',
          published_on: now - 5400,
          title: "Solana Network Activity Hits Record Levels",
          body: "Latest protocol metrics show significant growth in daily active addresses and transaction throughput.",
          url: "https://solana.com/",
          source_info: { name: "Solana Foundation" },
          categories: "Solana"
        }
      ]
    };
    
    // Cache fallback data too
    newsCache = fallbackNews;
    newsCacheTime = Date.now();
    
    res.json(fallbackNews);
  }
  } catch (error) {
    console.error('[ERROR] News endpoint error:', error.message);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    api: 'CoinMarketCap Pro (with CoinGecko fallback)',
    version: '1.0.0'
  });
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================`);
  console.log(`  GUV TERMINAL Backend`);
  console.log(`========================================`);
  console.log(`  Server running on port: ${PORT}`);
  console.log(`  Default Provider: ${PRICE_PROVIDER.toUpperCase()}`);
  console.log(`  Per-request providers: Enabled`);
  console.log(`  Fallback: Static data on error`);
  console.log(`========================================`);
  if (PRICE_PROVIDER === 'cmc') {
    if (CMC_API_KEY) {
      console.log(`  [CONFIG] CMC: API key configured`);
    } else {
      console.log(`  [CONFIG] CMC: No API key - will fallback to CoinGecko`);
    }
  } else if (PRICE_PROVIDER === 'cryptocompare') {
    if (PRICE_API_KEY) {
      console.log(`  [CONFIG] CryptoCompare: API key configured`);
    } else {
      console.log(`  [CONFIG] CryptoCompare: No API key - will fallback to CoinGecko`);
    }
  } else {
    console.log(`  [CONFIG] CoinGecko: Free tier (no key needed)`);
  }
  console.log(`========================================`);
});

module.exports = app;