/**
 * Input validation utilities for security
 * Prevents injection attacks and validates user input
 */

/**
 * Validate token amount
 * @param {string|number} amount - Amount to validate
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
export const validateTokenAmount = (amount) => {
  if (!amount || amount === '') {
    return { valid: false, error: 'Amount is required' };
  }
  
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }
  
  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  
  if (numAmount > 1e12) {
    return { valid: false, error: 'Amount is too large' };
  }
  
  // Check for reasonable decimal places (max 18 for ETH, 9 for SOL)
  const decimals = (amount.toString().split('.')[1] || '').length;
  if (decimals > 18) {
    return { valid: false, error: 'Too many decimal places' };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate Ethereum address
 * @param {string} address - Address to validate
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
export const validateEthAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }
  
  // Check basic format
  if (!address.startsWith('0x')) {
    return { valid: false, error: 'Address must start with 0x' };
  }
  
  if (address.length !== 42) {
    return { valid: false, error: 'Invalid address length' };
  }
  
  // Check for valid hex characters
  const hexRegex = /^0x[0-9a-fA-F]{40}$/;
  if (!hexRegex.test(address)) {
    return { valid: false, error: 'Invalid address format' };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate Solana address
 * @param {string} address - Address to validate
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
export const validateSolAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }
  
  // Solana addresses are base58 encoded and 32-44 characters
  if (address.length < 32 || address.length > 44) {
    return { valid: false, error: 'Invalid address length' };
  }
  
  // Check for valid base58 characters
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(address)) {
    return { valid: false, error: 'Invalid address format' };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate chain ID
 * @param {number} chainId - Chain ID to validate
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
export const validateChainId = (chainId) => {
  const validChainIds = [1, 10, 56, 137, 8453, 42161, 43114, 59144]; // Ethereum, Optimism, BSC, Polygon, Base, Arbitrum, Avalanche, Linea
  
  if (!chainId || typeof chainId !== 'number') {
    return { valid: false, error: 'Chain ID is required' };
  }
  
  if (!validChainIds.includes(chainId)) {
    return { valid: false, error: 'Unsupported chain ID' };
  }
  
  return { valid: true, error: null };
};

/**
 * Validate token symbol
 * @param {string} symbol - Token symbol to validate
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
export const validateTokenSymbol = (symbol) => {
  if (!symbol || typeof symbol !== 'string') {
    return { valid: false, error: 'Token symbol is required' };
  }
  
  // Remove whitespace
  const cleanSymbol = symbol.trim().toUpperCase();
  
  if (cleanSymbol.length === 0) {
    return { valid: false, error: 'Token symbol cannot be empty' };
  }
  
  if (cleanSymbol.length > 20) {
    return { valid: false, error: 'Token symbol is too long' };
  }
  
  // Only allow alphanumeric characters
  const symbolRegex = /^[A-Z0-9]+$/;
  if (!symbolRegex.test(cleanSymbol)) {
    return { valid: false, error: 'Invalid token symbol format' };
  }
  
  return { valid: true, error: null, value: cleanSymbol };
};

/**
 * Validate token contract address
 * @param {string} address - Contract address to validate
 * @param {string} chain - Chain type ('evm' or 'solana')
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
export const validateTokenAddress = (address, chain = 'evm') => {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Token address is required' };
  }
  
  if (chain === 'evm') {
    return validateEthAddress(address);
  } else if (chain === 'solana') {
    return validateSolAddress(address);
  }
  
  return { valid: false, error: 'Unsupported chain type' };
};

/**
 * Sanitize string input
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {Object} Sanitization result { valid: boolean, error: string|null, value: string }
 */
export const sanitizeString = (input, maxLength = 100) => {
  if (!input || typeof input !== 'string') {
    return { valid: true, error: null, value: '' };
  }
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Remove potentially dangerous characters
  sanitized = sanitized
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/['"]/g, '') // Remove quotes
    .replace(/[;\\]/g, ''); // Remove semicolons and backslashes
  
  return { valid: true, error: null, value: sanitized };
};

/**
 * Validate search query
 * @param {string} query - Search query to validate
 * @returns {Object} Validation result { valid: boolean, error: string|null, value: string }
 */
export const validateSearchQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return { valid: true, error: null, value: '' };
  }
  
  const sanitized = sanitizeString(query, 50);
  
  if (sanitized.value.length < 2 && sanitized.value.length > 0) {
    return { valid: false, error: 'Search query too short', value: sanitized.value };
  }
  
  return sanitized;
};

/**
 * Validate transaction hash
 * @param {string} txHash - Transaction hash to validate
 * @param {string} chain - Chain type ('evm' or 'solana')
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
export const validateTxHash = (txHash, chain = 'evm') => {
  if (!txHash || typeof txHash !== 'string') {
    return { valid: false, error: 'Transaction hash is required' };
  }
  
  if (chain === 'evm') {
    // EVM tx hash: 0x + 64 hex characters
    if (!txHash.startsWith('0x')) {
      return { valid: false, error: 'Transaction hash must start with 0x' };
    }
    
    if (txHash.length !== 66) {
      return { valid: false, error: 'Invalid transaction hash length' };
    }
    
    const hexRegex = /^0x[0-9a-fA-F]{64}$/;
    if (!hexRegex.test(txHash)) {
      return { valid: false, error: 'Invalid transaction hash format' };
    }
  } else if (chain === 'solana') {
    // Solana signatures: base58 encoded, typically 88 characters
    if (txHash.length < 80 || txHash.length > 100) {
      return { valid: false, error: 'Invalid signature length' };
    }
    
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(txHash)) {
      return { valid: false, error: 'Invalid signature format' };
    }
  }
  
  return { valid: true, error: null };
};

/**
 * Rate limiter for API calls
 * Prevents excessive requests
 */
export class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }
  
  canProceed() {
    const now = Date.now();
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      return { allowed: false, waitTime };
    }
    
    this.requests.push(now);
    return { allowed: true, waitTime: 0 };
  }
}