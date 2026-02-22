import { useState, useEffect, useCallback } from 'react';

const API_ENDPOINTS = {
  coinmarketcap: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?limit=1',
  jupiter: 'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112',
  helius: 'https://mainnet.helius-rpc.com/?api-key=demo',
};

export const useSystemHealth = () => {
  const [health, setHealth] = useState({
    apis: {
      coinmarketcap: { status: 'checking', latency: 0 },
      jupiter: { status: 'checking', latency: 0 },
      helius: { status: 'checking', latency: 0 },
    },
    server: { status: 'checking', message: '' },
    overall: 'checking',
    lastCheck: null,
    error: null,
  });

  const checkAPI = async (name, url, options = {}) => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        method: 'HEAD',
      });
      
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      
      if (response.ok || response.status === 401) { // 401 is ok, means API key needed but server is up
        return { status: 'connected', latency };
      }
      return { status: 'error', latency, error: `HTTP ${response.status}` };
    } catch (err) {
      const latency = Date.now() - start;
      if (err.name === 'AbortError') {
        return { status: 'offline', latency, error: 'Timeout' };
      }
      return { status: 'offline', latency, error: err.message };
    }
  };

  const checkHealth = useCallback(async () => {
    try {
      // Check all APIs in parallel
      const [cmcResult, jupiterResult, heliusResult, serverResult] = await Promise.all([
        checkAPI('coinmarketcap', API_ENDPOINTS.coinmarketcap),
        checkAPI('jupiter', API_ENDPOINTS.jupiter),
        checkAPI('helius', API_ENDPOINTS.helius, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' })
        }),
        // Check if local server is running
        fetch('http://localhost:3001/api/health', { 
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        })
          .then(() => ({ status: 'online', message: 'Server running' }))
          .catch((err) => ({ 
            status: 'offline', 
            message: err.name === 'AbortError' ? 'Server timeout' : 'Server offline'
          }))
      ]);

      const allConnected = 
        cmcResult.status === 'connected' && 
        jupiterResult.status === 'connected' && 
        heliusResult.status === 'connected';

      const anyError = 
        cmcResult.status === 'error' || 
        jupiterResult.status === 'error' || 
        heliusResult.status === 'error';

      let overall = 'operational';
      if (serverResult.status === 'offline') {
        overall = 'offline';
      } else if (anyError) {
        overall = 'error';
      } else if (!allConnected) {
        overall = 'degraded';
      }

      // Collect errors
      const errors = [];
      if (cmcResult.status !== 'connected') errors.push(`CMC: ${cmcResult.error || cmcResult.status}`);
      if (jupiterResult.status !== 'connected') errors.push(`Jupiter: ${jupiterResult.error || jupiterResult.status}`);
      if (heliusResult.status !== 'connected') errors.push(`Helius: ${heliusResult.error || heliusResult.status}`);
      if (serverResult.status === 'offline') errors.push(`Server: ${serverResult.message}`);

      setHealth({
        apis: {
          coinmarketcap: cmcResult,
          jupiter: jupiterResult,
          helius: heliusResult,
        },
        server: serverResult,
        overall,
        lastCheck: new Date(),
        error: errors.length > 0 ? errors.join(', ') : null,
      });
    } catch (err) {
      setHealth(prev => ({
        ...prev,
        overall: 'error',
        error: err.message,
        lastCheck: new Date(),
      }));
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { health, checkHealth };
};

export default useSystemHealth;