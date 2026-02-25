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
const JUPITER_API_URL = 'https://api.jup.ag';

// Price provider configuration (stored in memory)
let PRICE_PROVIDER = 'coingecko';
let PRICE_API_KEY = '';

// News cache variables (must be defined before endpoints)
let newsCache = {};
let newsCacheTime = {};
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
  newsCache = {};
  newsCacheTime = {};
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
    image: coin.image || null,
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

// Cache for CoinGecko images
let coinGeckoImageCache = {};
let imageCacheTime = 0;
const IMAGE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper to fetch CoinGecko images and merge with any data
const mergeCoinGeckoImages = async (data) => {
  const now = Date.now();
  
  // Check if cache is still valid
  if (Object.keys(coinGeckoImageCache).length === 0 || now - imageCacheTime > IMAGE_CACHE_DURATION) {
    try {
      console.log(`[IMAGE] Fetching CoinGecko images...`);
      
      // Fetch multiple pages to get more images
      const allCoins = [];
      for (let page = 1; page <= 3; page++) {
        const cgResponse = await axiosInstance.get(
          `${COINGECKO_API_URL}/coins/markets`,
          {
            params: {
              vs_currency: 'usd',
              order: 'market_cap_desc',
              per_page: 100,
              page: page,
              sparkline: false
            }
          }
        );
        allCoins.push(...cgResponse.data);
      }
      
      const cgData = transformCoinGeckoToCMC(allCoins);
      coinGeckoImageCache = {};
      cgData.forEach(coin => {
        // Store with multiple keys for better matching
        coinGeckoImageCache[coin.symbol.toUpperCase()] = coin.image;
        coinGeckoImageCache[coin.symbol.toLowerCase()] = coin.image;
        coinGeckoImageCache[coin.id] = coin.image;
        coinGeckoImageCache[coin.name.toLowerCase()] = coin.image;
      });
      imageCacheTime = now;
      console.log(`[IMAGE] CoinGecko images cached: ${Object.keys(coinGeckoImageCache).length} entries`);
    } catch (err) {
      console.log(`[IMAGE] Failed to fetch CoinGecko images: ${err.message}`);
      return data;
    }
  }
  
  // Merge images into original data
  return data.map(crypto => {
    const symbol = String(crypto.symbol || '').toUpperCase();
    const id = String(crypto.id || '').toLowerCase();
    const name = String(crypto.name || '').toLowerCase();
    
    return {
      ...crypto,
      image: crypto.image || coinGeckoImageCache[symbol] || coinGeckoImageCache[id] || coinGeckoImageCache[name] || null
    };
  });
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
      
      console.log(`[DATA] CMC response received, merging CoinGecko images...`);
      const dataWithImages = await mergeCoinGeckoImages(response.data.data);
      response.data.data = dataWithImages;
      
      console.log(`[DATA] CMC response with images ready`);
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
  
  if (provider === 'cryptocompare') {
    // Use CryptoCompare (works without API key for free tier)
    console.log(`[DATA] Fetching from CryptoCompare...`);
    try {
      const symbols = 'BTC,ETH,BNB,SOL,XRP,DOGE,AVAX,TON,SHIB,LINK,TRX,NEAR,MATIC,PEPE,ICP,LTC,APT,FET,AAVE,IMX,SAND,GALA,FLOW,MANA,AXS,CHZ,ENJ,BAT,COMP,CRV,SUSHI,UNI,MKR,YFI';
    const ccResponse = await axiosInstance.get(
        `${CRYPTOCOMPARE_API_URL}/data/pricemulti`, {
          timeout: 8000,
          params: {
            fsyms: symbols,
            tsyms: convert
            // No API key required for basic free tier
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
          notice: 'Using CryptoCompare data (free tier)'
        },
        data: transformCryptoCompareToCMC(ccResponse.data, convert)
      };
      
      console.log(`[DATA] CryptoCompare response received, merging CoinGecko images...`);
      transformedData.data = await mergeCoinGeckoImages(transformedData.data);
      
      console.log(`[DATA] CryptoCompare with images ready`);
      res.json(transformedData);
    } catch (ccError) {
      console.error(`[ERROR] CryptoCompare failed: ${ccError.message}`);
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
  
  // Default: Use CoinGecko (free, no key needed)
  console.log(`[DATA] Fetching from CoinGecko (free tier) in ${convert}...`);
  try {
    const cgResponse = await axiosInstance.get(
      `${COINGECKO_API_URL}/coins/markets`, {
        timeout: 8000,
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
    let shouldFallback = false;
    
    // Check if we should fallback - rate limit, timeout, or server error
    if (cgError.response?.status === 429) {
      errorMsg = 'CoinGecko rate limit exceeded (free tier)';
      shouldFallback = true;
    } else if (cgError.code === 'ECONNABORTED' || cgError.message.includes('timeout')) {
      errorMsg = 'CoinGecko request timed out';
      shouldFallback = true;
    } else if (cgError.response?.status >= 500) {
      errorMsg = `CoinGecko server error: ${cgError.response?.status}`;
      shouldFallback = true;
    } else if (cgError.response?.status === 401 || cgError.response?.status === 403) {
      errorMsg = 'Your CoinGecko API key is invalid. Please check your key in Settings > Data > API Key';
    } else {
      errorMsg = cgError.message;
    }
    
    // Fallback to CryptoCompare for rate limiting, timeouts, or server errors
    if (shouldFallback) {
      console.log(`[FALLBACK] ${errorMsg}, trying CryptoCompare...`);
      
      try {
        const symbols = 'BTC,ETH,BNB,SOL,XRP,DOGE,AVAX,TON,SHIB,LINK,TRX,NEAR,MATIC,PEPE,ICP,LTC,APT,FET,AAVE,IMX,SAND,GALA,FLOW,MANA,AXS,CHZ,ENJ,BAT,COMP,CRV,SUSHI,UNI,MKR,YFI';
        const ccResponse = await axiosInstance.get(
          `${CRYPTOCOMPARE_API_URL}/data/pricemulti`, {
            timeout: 8000,
            params: {
              fsyms: symbols,
              tsyms: convert
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
            notice: 'Using CryptoCompare data (CoinGecko unavailable - auto fallback)'
          },
          data: transformCryptoCompareToCMC(ccResponse.data, convert)
        };
        
        console.log(`[FALLBACK] CryptoCompare response received`);
        return res.json(transformedData);
      } catch (ccError) {
        console.error(`[FALLBACK] CryptoCompare also failed: ${ccError.message}`);
      }
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
    const { refresh, chain } = req.query;
    
    // Check cache first (unless refresh=true)
    const now = Date.now();
    const cacheKey = chain || 'all';
    if (!refresh && newsCache[cacheKey] && (now - newsCacheTime[cacheKey]) < NEWS_CACHE_DURATION) {
      return res.json(newsCache[cacheKey]);
    }
    
    let response;
    const searchTerm = chain === 'solana' ? 'Solana' : chain === 'ethereum' ? 'Ethereum' : 'crypto';
    
    // Check NewsAPI first
    if (NEWS_PROVIDER === 'newsapi' && NEWSAPI_KEY) {
      // Use NewsAPI
      console.log(`[NEWS] Fetching from NewsAPI for ${searchTerm}...`);
      
      try {
        const newsApiUrl = `${NEWSAPI_BASE_URL}/everything?q=${searchTerm}&sortBy=publishedAt&language=en&pageSize=10&apiKey=${NEWSAPI_KEY}`;
        
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
          
          newsCache[cacheKey] = normalizedData;
          newsCacheTime[cacheKey] = now;
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
        
        newsCache[cacheKey] = normalizedData;
        newsCacheTime[cacheKey] = now;
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
        let articles = response.data.Data;
        
        // Filter by chain if specified
        if (chain && chain !== 'all') {
          const chainLower = chain.toLowerCase();
          articles = articles.filter(article => 
            article.title?.toLowerCase().includes(chainLower) ||
            article.body?.toLowerCase().includes(chainLower) ||
            article.categories?.toLowerCase().includes(chainLower)
          );
          console.log(`[NEWS] Filtered to ${articles.length} ${chain} articles`);
        } else if (chain === 'all') {
          // Exclude Solana news from general crypto news to differentiate from Solana WIRE
          articles = articles.filter(article => {
            const title = article.title?.toLowerCase() || '';
            const body = article.body?.toLowerCase() || '';
            const categories = article.categories?.toLowerCase() || '';
            return !title.includes('solana') && !body.includes('solana') && !categories.includes('solana');
          });
          console.log(`[NEWS] Excluded Solana, ${articles.length} general articles remaining`);
        }
        
        const filteredData = { ...response.data, Data: articles };
        newsCache[cacheKey] = filteredData;
        newsCacheTime[cacheKey] = now;
        res.json(filteredData);
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
    
    // No fallback - return error for real data
    console.error(`[ERROR] News endpoint failed: ${error.message}`);
    return res.status(500).json({
      error: 'News unavailable',
      message: error.message
    });
  } 
  
  // Close outer try block
  }
   
  // Outer catch for the main try block
  catch (outerError) {
    console.error('[ERROR] News endpoint error:', outerError.message);
    res.status(500).json({
      error: 'Server error',
      message: outerError.message
    });
  }
});

// Separate endpoint for Solana-specific news
app.get('/api/news/solana', async (req, res) => {
  try {
    const { refresh } = req.query;
    const now = Date.now();
    const cacheKey = 'solana-specific';
    
    // Check cache first
    if (!refresh && newsCache[cacheKey] && (now - newsCacheTime[cacheKey]) < NEWS_CACHE_DURATION) {
      return res.json(newsCache[cacheKey]);
    }
    
    console.log('[SOLANA NEWS] Fetching Solana-specific news...');
    let allArticles = [];
    
    // Source 1: CryptoCompare - get ALL news then filter for Solana
    try {
      const ccResponse = await axiosInstance.get(
        `${CRYPTOCOMPARE_API_URL}/data/v2/news/?lang=EN`,
        {
          params: { api_key: NEWS_API_KEY || 'free' },
          timeout: 10000
        }
      );
      
      if (ccResponse.data && ccResponse.data.Data && ccResponse.data.Data.length > 0) {
        const solanaFromCC = ccResponse.data.Data
          .filter(article => {
            const title = article.title?.toLowerCase() || '';
            const body = article.body?.toLowerCase() || '';
            const categories = article.categories?.toLowerCase() || '';
            return title.includes('solana') || body.includes('solana') || categories.includes('solana') || categories.includes('sol');
          })
          .map((article, index) => ({
            id: `solana-cc-${index}`,
            published_on: article.published_on || Math.floor(Date.now() / 1000),
            title: article.title || 'Untitled',
            body: article.body || 'Click to read more.',
            url: article.url,
            source_info: { name: article.source_info?.name || 'CryptoCompare' },
            categories: article.categories || 'Solana'
          }));
        
        allArticles = [...allArticles, ...solanaFromCC];
        console.log(`[SOLANA NEWS] Got ${solanaFromCC.length} from CryptoCompare`);
      }
    } catch (ccError) {
      console.log('[SOLANA NEWS] CryptoCompare failed:', ccError.message);
    }
    
    // Source 2: Try NewsAPI if key provided
    if (NEWS_PROVIDER === 'newsapi' && NEWSAPI_KEY) {
      try {
        const newsApiUrl = `${NEWSAPI_BASE_URL}/everything?q=solana&sortBy=publishedAt&language=en&pageSize=20&apiKey=${NEWSAPI_KEY}`;
        const newsApiResponse = await axiosInstance.get(newsApiUrl, { timeout: 10000 });
        
        if (newsApiResponse.data && newsApiResponse.data.articles) {
          const solanaFromNewsAPI = newsApiResponse.data.articles
            .map((article, index) => ({
              id: `solana-newsapi-${index}`,
              published_on: Math.floor(new Date(article.publishedAt).getTime() / 1000),
              title: article.title || 'Untitled',
              body: article.description || article.content || 'Click to read more.',
              url: article.url,
              source_info: { name: article.source?.name || 'NewsAPI' },
              categories: 'Solana|News'
            }));
          
          allArticles = [...allArticles, ...solanaFromNewsAPI];
          console.log(`[SOLANA NEWS] Got ${solanaFromNewsAPI.length} from NewsAPI`);
        }
      } catch (newsApiError) {
        console.log('[SOLANA NEWS] NewsAPI failed:', newsApiError.message);
      }
    }
    
    // Remove duplicates based on title
    const seen = new Set();
    allArticles = allArticles.filter(article => {
      const key = article.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Sort by date (newest first)
    allArticles.sort((a, b) => b.published_on - a.published_on);
    
    const normalizedData = { Data: allArticles };
    newsCache[cacheKey] = normalizedData;
    newsCacheTime[cacheKey] = Date.now();
    console.log(`[SOLANA NEWS] Total: ${allArticles.length} articles (real data only)`);
    res.json(normalizedData);
  } catch (error) {
    console.error('[SOLANA NEWS] Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Solana news', message: error.message });
  }
});

// Jupiter API - Get token prices
app.get('/api/jupiter/price', async (req, res) => {
  const { mint } = req.query;
  
  if (!mint) {
    return res.status(400).json({ error: 'mint parameter required' });
  }
  
  try {
    const response = await axiosInstance.get(
      `${JUPITER_API_URL}/price`,
      {
        params: { ids: mint },
        timeout: 10000
      }
    );
    
    if (response.data && response.data.data) {
      console.log(`[JUPITER] Price fetched for ${mint}`);
      res.json(response.data);
    } else {
      throw new Error('No price data');
    }
  } catch (error) {
    console.error('[JUPITER] Price error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Jupiter price', message: error.message });
  }
});

// Jupiter API - Get multiple token prices
app.get('/api/jupiter/prices', async (req, res) => {
  const { mints } = req.query;
  
  if (!mints) {
    return res.status(400).json({ error: 'mints parameter required (comma-separated)' });
  }
  
  try {
    const mintList = mints.split(',').map(m => m.trim()).join(',');
    const response = await axiosInstance.get(
      `${JUPITER_API_URL}/price`,
      {
        params: { ids: mintList },
        timeout: 10000
      }
    );
    
    if (response.data && response.data.data) {
      console.log(`[JUPITER] Prices fetched for ${mintList}`);
      res.json(response.data);
    } else {
      throw new Error('No price data');
    }
  } catch (error) {
    console.error('[JUPITER] Prices error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Jupiter prices', message: error.message });
  }
});

// Jupiter API - Get token list (metadata)
app.get('/api/jupiter/tokens', async (req, res) => {
  try {
    const response = await axiosInstance.get(
      `${JUPITER_API_URL}/token/list.json`,
      {
        timeout: 15000
      }
    );
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`[JUPITER] Token list fetched: ${response.data.length} tokens`);
      res.json({ tokens: response.data });
    } else {
      throw new Error('Invalid token list');
    }
  } catch (error) {
    console.error('[JUPITER] Token list error:', error.message);
    res.status(500).json({ error: 'Failed to fetch Jupiter token list', message: error.message });
  }
});

// Solana Token List (from GitHub) - for token metadata and images
let solanaTokenListCache = null;
let solanaTokenListTime = 0;
const SOLANA_TOKEN_LIST_CACHE = 60 * 60 * 1000; // 1 hour

app.get('/api/solana/tokens', async (req, res) => {
  const now = Date.now();
  
  // Return cached if available
  if (solanaTokenListCache && (now - solanaTokenListTime) < SOLANA_TOKEN_LIST_CACHE) {
    return res.json(solanaTokenListCache);
  }
  
  try {
    const response = await axiosInstance.get(
      'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json',
      { timeout: 15000 }
    );
    
    if (response.data && response.data.tokens) {
      // Build a lookup map for quick access
      const tokenMap = {};
      response.data.tokens.forEach(token => {
        tokenMap[token.address] = {
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI || null,
          tags: token.tags || []
        };
      });
      
      solanaTokenListCache = { tokens: tokenMap, count: response.data.tokens.length };
      solanaTokenListTime = now;
      
      console.log(`[SOLANA TOKENS] Cached ${response.data.tokens.length} tokens`);
      res.json(solanaTokenListCache);
    } else {
      throw new Error('Invalid token list format');
    }
  } catch (error) {
    console.error('[SOLANA TOKENS] Error:', error.message);
    if (solanaTokenListCache) {
      return res.json(solanaTokenListCache);
    }
    res.status(500).json({ error: 'Failed to fetch Solana token list', message: error.message });
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

// Coin detail endpoint with fallback
app.get('/api/coin/detail', async (req, res) => {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Coin ID required' });
  }
  
  console.log(`[DETAIL] Fetching details for: ${id}`);
  
  // Try CoinGecko first
  try {
    const response = await axiosInstance.get(
      `https://api.coingecko.com/api/v3/coins/${id}`,
      {
        params: {
          localization: false,
          tickers: false,
          market_data: false,
          community_data: true,
          developer_data: false,
          sparkline: false
        }
      }
    );
    console.log(`[DETAIL] CoinGecko response received for ${id}`);
    return res.json(response.data);
  } catch (cgError) {
    if (cgError.response?.status === 429) {
      console.log(`[DETAIL] CoinGecko rate limited, trying CryptoCompare...`);
      
      // Fallback to CryptoCompare for basic info
      try {
        const ccResponse = await axiosInstance.get(
          `${CRYPTOCOMPARE_API_URL}/data/coin/generalInfo`,
          {
            params: {
              fsyms: id.toUpperCase(),
              api_key: 'free'
            }
          }
        );
        
        if (ccResponse.data.Data && ccResponse.data.Data[id.toUpperCase()]) {
          const coinInfo = ccResponse.data.Data[id.toUpperCase()];
          const fallbackData = {
            id: id,
            name: coinInfo.Name || id,
            symbol: coinInfo.Symbol || id.toUpperCase(),
            description: { en: 'Description not available (using CryptoCompare fallback)' },
            links: {
              twitter_screen_name: coinInfo.Twitter?.replace('@', '') || '',
              telegram_channel_identifier: coinInfo.Telegram || '',
              homepage: coinInfo.Url ? [coinInfo.Url] : []
            },
            community_data: {
              twitter_followers: 0,
              telegram_channel_user_count: 0,
              reddit_subscribers: 0
            }
          };
          console.log(`[DETAIL] CryptoCompare fallback for ${id}`);
          return res.json(fallbackData);
        }
      } catch (ccError) {
        console.error(`[DETAIL] CryptoCompare fallback failed: ${ccError.message}`);
      }
    }
    console.error(`[DETAIL] CoinGecko failed: ${cgError.message}`);
    return res.status(500).json({ error: 'Failed to fetch coin details', message: cgError.message });
  }
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

// Coin market data endpoint - fetches real-time price, volume, market cap
app.get('/api/coin/market', async (req, res) => {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Coin ID required' });
  }
  
  console.log(`[MARKET] Fetching real-time market data for: ${id}`);
  
  // Try CoinGecko first
  try {
    const response = await axiosInstance.get(
      `https://api.coingecko.com/api/v3/coins/${id}`,
      {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false
        }
      }
    );
    console.log(`[MARKET] CoinGecko market data received for ${id}`);
    return res.json(response.data);
  } catch (cgError) {
    if (cgError.response?.status === 429) {
      console.log(`[MARKET] CoinGecko rate limited, trying CryptoCompare...`);
      
      // Fallback to CryptoCompare
      try {
        const symbolMap = {
          'bitcoin': 'BTC', 'ethereum': 'ETH', 'tether': 'USDT', 'binancecoin': 'BNB',
          'solana': 'SOL', 'ripple': 'XRP', 'dogecoin': 'DOGE', 'cardano': 'ADA',
          'litecoin': 'LTC', 'avalanche-2': 'AVAX'
        };
        const ccSymbol = symbolMap[id.toLowerCase()] || id.toUpperCase();
        
        const ccResponse = await axiosInstance.get(
          `${CRYPTOCOMPARE_API_URL}/data/pricemultifull`,
          {
            params: {
              fsyms: ccSymbol,
              tsyms: 'USD'
            }
          }
        );
        
        if (ccResponse.data && ccResponse.data.RAW && ccResponse.data.RAW[ccSymbol]) {
          const raw = ccResponse.data.RAW[ccSymbol].USD;
          return res.json({
            market_data: {
              current_price: { usd: raw.PRICE },
              market_cap: { usd: raw.MKTCAP },
              total_volume: { usd: raw.TOTALVOLUME24H },
              price_change_percentage_24h: raw.CHANGEPCT24HOUR,
              high_24h: { usd: raw.HIGH24HOUR },
              low_24h: { usd: raw.LOW24HOUR },
              ath: { usd: raw.ATHPRICE },
              atl: { usd: raw.ATLPRICE }
            }
          });
        }
      } catch (ccError) {
        console.error(`[MARKET] CryptoCompare also failed: ${ccError.message}`);
      }
    }
    console.error(`[MARKET] Failed to fetch market data: ${cgError.message}`);
    return res.status(500).json({ error: 'Failed to fetch market data', message: cgError.message });
  }
});

module.exports = app;