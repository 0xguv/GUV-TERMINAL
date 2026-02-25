import { useState, useEffect, useCallback } from 'react';

const API_ENDPOINTS = {
  server: 'http://localhost:3001/api/health',
};

export const useSystemHealth = () => {
  const [health, setHealth] = useState({
    apis: {
      server: { status: 'checking', latency: 0 },
    },
    server: { status: 'checking', message: '' },
    overall: 'checking',
    lastCheck: null,
    error: null,
  });

  const checkHealth = useCallback(async () => {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(API_ENDPOINTS.server, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      
      if (response.ok) {
        setHealth({
          apis: {
            server: { status: 'connected', latency },
          },
          server: { status: 'online', message: 'Server running' },
          overall: 'operational',
          lastCheck: new Date(),
          error: null,
        });
      } else {
        setHealth(prev => ({
          ...prev,
          apis: { server: { status: 'error', latency, error: `HTTP ${response.status}` } },
          server: { status: 'offline', message: 'Server error' },
          overall: 'offline',
          lastCheck: new Date(),
          error: `Server error: ${response.status}`,
        }));
      }
    } catch (err) {
      setHealth(prev => ({
        ...prev,
        apis: { server: { status: 'offline', latency: 0, error: err.name === 'AbortError' ? 'Timeout' : err.message } },
        server: { status: 'offline', message: err.name === 'AbortError' ? 'Server timeout' : 'Server offline' },
        overall: 'offline',
        lastCheck: new Date(),
        error: err.name === 'AbortError' ? 'Server timeout' : err.message,
      }));
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { health, checkHealth };
};

export default useSystemHealth;
