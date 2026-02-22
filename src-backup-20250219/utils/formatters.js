/**
 * Shared utility functions for GUV Screener
 * Consolidated to reduce code duplication
 */

/**
 * Format volume numbers (e.g., 1.2B, 3.4M)
 * @param {number} volume - The volume to format
 * @returns {string} Formatted volume string
 */
export const formatVolume = (volume) => {
  if (!volume || volume === 0) return '0';
  if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B';
  if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M';
  if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K';
  return volume.toFixed(2);
};

/**
 * Format market cap numbers
 * @param {number} marketCap - The market cap to format
 * @returns {string} Formatted market cap string
 */
export const formatMarketCap = (marketCap) => {
  if (!marketCap || marketCap === 0) return '0';
  if (marketCap >= 1e12) return (marketCap / 1e12).toFixed(2) + 'T';
  if (marketCap >= 1e9) return (marketCap / 1e9).toFixed(2) + 'B';
  if (marketCap >= 1e6) return (marketCap / 1e6).toFixed(2) + 'M';
  if (marketCap >= 1e3) return (marketCap / 1e3).toFixed(2) + 'K';
  return marketCap.toFixed(2);
};

/**
 * Format price with appropriate decimal places
 * @param {number} price - The price to format
 * @returns {string} Formatted price string
 */
export const formatPrice = (price) => {
  if (!price || price === 0) return '0.00';
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.01) return price.toFixed(6);
  return price.toFixed(8);
};

/**
 * Format large numbers (e.g., 1.2K, 3.4M, 5.6B)
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num) => {
  if (!num || num === 0) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  if (num >= 1) return num.toFixed(4);
  return num.toFixed(6);
};

/**
 * Format wallet address (e.g., 0x1234...5678)
 * @param {string} addr - The address to format
 * @param {number} startChars - Number of characters at start (default: 6)
 * @param {number} endChars - Number of characters at end (default: 4)
 * @returns {string} Formatted address string
 */
export const formatAddress = (addr, startChars = 6, endChars = 4) => {
  if (!addr || typeof addr !== 'string') return '';
  if (addr.length <= startChars + endChars) return addr;
  return `${addr.slice(0, startChars)}...${addr.slice(-endChars)}`;
};

/**
 * Validate Ethereum address
 * @param {string} addr - The address to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidEthAddress = (addr) => {
  return addr && typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42;
};

/**
 * Validate Solana address
 * @param {string} addr - The address to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidSolAddress = (addr) => {
  return addr && typeof addr === 'string' && addr.length >= 32 && addr.length <= 44;
};

/**
 * Generate sparkline SVG path for charts
 * @param {Array<number>} data - Array of price data
 * @param {number} width - SVG width
 * @param {number} height - SVG height
 * @returns {string} SVG path string
 */
export const generateSparkline = (data, width = 60, height = 20) => {
  if (!data || data.length < 2) return '';
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((price, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((price - min) / range) * height;
    return `${x},${y}`;
  });
  
  return `M${points.join(' L')}`;
};

/**
 * Format percentage change with sign
 * @param {number} change - The percentage change
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (change) => {
  if (change === undefined || change === null) return '0.00%';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Debounce function to limit execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Safe localStorage wrapper with error handling
 */
export const safeStorage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      return false;
    }
  }
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Format date to readable string
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get API base URL based on environment
 * @returns {string} API base URL
 */
export const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  return 'http://localhost:3001';
};