import React, { useState } from 'react';
import './Settings.css';

const Settings = () => {
   // Load saved settings from localStorage or use defaults
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('guvSettings');
    let parsed = saved ? JSON.parse(saved) : {
      autoRefresh: 60,
      showNewsPanel: true,
      showStatsPanel: true,
      defaultCurrency: 'USD',
      soundEnabled: false,
      confirmTransactions: true,
      slippageTolerance: 0.5,
      customSolanaRpc: '',
      priceProvider: 'coingecko',
      priceApiKey: '',
      customNewsApiKey: '',
      newsProvider: 'cryptocompare',
      customNewsApiUrl: '',
      newsApiKey: '',
    };
    
    // Fix RPC URL if missing https://
    if (parsed.customSolanaRpc && !parsed.customSolanaRpc.startsWith('http://') && !parsed.customSolanaRpc.startsWith('https://')) {
      parsed.customSolanaRpc = 'https://' + parsed.customSolanaRpc;
      localStorage.setItem('guvSettings', JSON.stringify(parsed));
    }
    
    return parsed;
  });

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('guvSettings', JSON.stringify(newSettings));
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
    window.dispatchEvent(new Event('guv-settings-change'));
  };

  const refreshOptions = [
    { value: 30, label: '30s' },
    { value: 60, label: '60s' },
    { value: 80, label: '80s' },
    { value: 0, label: 'MANUAL' }
  ];

  const slippageOptions = [0.1, 0.5, 1.0, 2.0, 3.0];

  const defaultSettings = {
    autoRefresh: 60,
    showNewsPanel: true,
    showStatsPanel: true,
    defaultCurrency: 'USD',
    soundEnabled: false,
    confirmTransactions: true,
    slippageTolerance: 0.5,
    customSolanaRpc: '',
    priceProvider: 'coingecko',
    priceApiKey: '',
    customNewsApiKey: '',
    newsProvider: 'cryptocompare',
    customNewsApiUrl: '',
  };

  const resetToDefaults = () => {
    localStorage.setItem('guvSettings', JSON.stringify(defaultSettings));
    window.location.reload();
  };

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <h3 className="settings-title">⚙ CONFIGURATION</h3>
        
        {/* Appearance */}
        <div className="settings-group">
          <h4 className="group-title">[ APPEARANCE ]</h4>
          
          <div className="setting-item interactive">
            <span className="setting-label">Crypto Wire (Left Panel):</span>
            <button 
              className={`toggle-btn ${settings.showNewsPanel ? 'on' : 'off'}`}
              onClick={() => updateSetting('showNewsPanel', !settings.showNewsPanel)}
            >
              {settings.showNewsPanel ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          <div className="setting-item interactive">
            <span className="setting-label">Market Stats (Right Panel):</span>
            <button 
              className={`toggle-btn ${settings.showStatsPanel ? 'on' : 'off'}`}
              onClick={() => updateSetting('showStatsPanel', !settings.showStatsPanel)}
            >
              {settings.showStatsPanel ? 'HIDE' : 'SHOW'}
            </button>
          </div>
        </div>

        {/* Data & Refresh */}
        <div className="settings-group">
          <h4 className="group-title">[ DATA & REFRESH ]</h4>
          
          <div className="setting-item interactive">
            <span className="setting-label">Auto Refresh:</span>
            <div className="setting-control">
              {refreshOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`refresh-option-btn ${settings.autoRefresh === opt.value ? 'active' : ''}`}
                  onClick={() => updateSetting('autoRefresh', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-item interactive">
            <span className="setting-label">Currency:</span>
            <div className="setting-control">
              {settings.priceProvider === 'coingecko' ? (
                // CoinGecko free tier only supports USD reliably
                <button
                  className={`currency-option-btn ${settings.defaultCurrency === 'USD' ? 'active' : ''}`}
                  onClick={() => updateSetting('defaultCurrency', 'USD')}
                >
                  USD
                </button>
              ) : (
                // Other providers support multiple currencies
                ['USD', 'EUR', 'GBP', 'JPY', 'IDR'].map((curr) => (
                  <button
                    key={curr}
                    className={`currency-option-btn ${settings.defaultCurrency === curr ? 'active' : ''}`}
                    onClick={() => updateSetting('defaultCurrency', curr)}
                  >
                    {curr}
                  </button>
                ))
              )}
            </div>
            {settings.priceProvider === 'coingecko' && (
              <span className="currency-hint" style={{fontSize: '11px', color: 'var(--accent-gold)', marginLeft: '10px'}}>
                (CoinGecko free tier: USD only)
              </span>
            )}
          </div>
        </div>

        {/* Trading */}
        <div className="settings-group">
          <h4 className="group-title">[ TRADING ]</h4>
          
          <div className="setting-item interactive">
            <span className="setting-label">Solana RPC:</span>
            <div className="rpc-input-container">
              <input
                type="text"
                className="rpc-input"
                placeholder="PublicNode FREE"
                value={settings.customSolanaRpc || ''}
                onChange={(e) => {
                  let value = e.target.value.trim();
                  if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
                    value = 'https://' + value;
                  }
                  updateSetting('customSolanaRpc', value);
                }}
              />
              <button 
                className="rpc-save-btn"
                onClick={() => window.location.reload()}
              >
                SAVE
              </button>
            </div>
          </div>

          <div className="setting-item interactive">
            <span className="setting-label">Confirm Transactions:</span>
            <button 
              className={`toggle-btn ${settings.confirmTransactions ? 'on' : 'off'}`}
              onClick={() => updateSetting('confirmTransactions', !settings.confirmTransactions)}
            >
              {settings.confirmTransactions ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="setting-item interactive">
            <span className="setting-label">Slippage Tolerance:</span>
            <div className="setting-control">
              {slippageOptions.map((slip) => (
                <button
                  key={slip}
                  className={`slippage-option-btn ${settings.slippageTolerance === slip ? 'active' : ''}`}
                  onClick={() => updateSetting('slippageTolerance', slip)}
                >
                  {slip}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="settings-group">
          <h4 className="group-title">[ DATA ]</h4>
          
          <div className="setting-item interactive">
            <span className="setting-label">Price Provider:</span>
            <div className="setting-control">
              <button
                className={`refresh-option-btn ${settings.priceProvider === 'coingecko' ? 'active' : ''}`}
                onClick={async () => {
                  // Reset to USD when switching to CoinGecko
                  const newSettings = { ...settings, priceProvider: 'coingecko', defaultCurrency: 'USD' };
                  saveSettings(newSettings);
                  // Send to backend immediately
                  try {
                    await fetch('/api/price-key', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        apiKey: settings.priceApiKey,
                        provider: 'coingecko'
                      })
                    });
                  } catch (e) {}
                }}
              >
                CoinGecko
              </button>
              <button
                className={`refresh-option-btn ${settings.priceProvider === 'cryptocompare' ? 'active' : ''}`}
                onClick={async () => {
                  updateSetting('priceProvider', 'cryptocompare');
                  // Send to backend immediately
                  try {
                    await fetch('/api/price-key', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        apiKey: settings.priceApiKey,
                        provider: 'cryptocompare'
                      })
                    });
                  } catch (e) {}
                }}
              >
                CryptoCompare
              </button>
              <button
                className={`refresh-option-btn ${settings.priceProvider === 'cmc' ? 'active' : ''}`}
                onClick={async () => {
                  updateSetting('priceProvider', 'cmc');
                  // Send to backend immediately
                  try {
                    await fetch('/api/price-key', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        apiKey: settings.priceApiKey,
                        provider: 'cmc'
                      })
                    });
                  } catch (e) {}
                }}
              >
                CMC
              </button>
            </div>
          </div>

          <div className="setting-item interactive">
            <span className="setting-label">API Key:</span>
            <div className="rpc-input-container">
              <input
                type="text"
                className="rpc-input"
                placeholder={settings.priceProvider === 'coingecko' ? 'api.coingecko.com/api/v3' : settings.priceProvider === 'cryptocompare' ? 'none' : 'none'}
                value={settings.priceApiKey || ''}
                onChange={(e) => updateSetting('priceApiKey', e.target.value.trim())}
              />
              <button 
                className="rpc-save-btn"
                onClick={async () => {
                  try {
                    await fetch('/api/price-key', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        apiKey: settings.priceApiKey,
                        provider: settings.priceProvider
                      })
                    });
                  } catch (e) {}
                  window.location.reload();
                }}
              >
                SAVE
              </button>
            </div>
          </div>

          <div className="setting-item interactive">
            <span className="setting-label">News Provider:</span>
            <div className="setting-control">
              <button
                className={`refresh-option-btn ${settings.newsProvider === 'cryptocompare' ? 'active' : ''}`}
                onClick={() => updateSetting('newsProvider', 'cryptocompare')}
              >
                CryptoCompare
              </button>
              <button
                className={`refresh-option-btn ${settings.newsProvider === 'newsapi' ? 'active' : ''}`}
                onClick={() => updateSetting('newsProvider', 'newsapi')}
              >
                NewsAPI
              </button>
              <button
                className={`refresh-option-btn ${settings.newsProvider === 'custom' ? 'active' : ''}`}
                onClick={() => updateSetting('newsProvider', 'custom')}
              >
                Custom URL
              </button>
            </div>
          </div>

          {settings.newsProvider === 'custom' && (
            <div className="setting-item interactive">
              <span className="setting-label">Custom News API:</span>
              <div className="rpc-input-with-btn">
                <input
                  type="text"
                  className="rpc-input-full"
                  placeholder="https://api.example.com/news"
                  value={settings.customNewsApiUrl || ''}
                  onChange={(e) => updateSetting('customNewsApiUrl', e.target.value.trim())}
                />
                <button 
                  className="rpc-save-btn"
                  onClick={async () => {
                    try {
                      await fetch('/api/news-key', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          apiKey: settings.customNewsApiKey,
                          provider: settings.newsProvider,
                          customUrl: settings.customNewsApiUrl
                        })
                      });
                    } catch (e) {}
                    window.location.reload();
                  }}
                >
                  SAVE
                </button>
              </div>
            </div>
          )}

          {settings.newsProvider === 'newsapi' && (
            <div className="setting-item interactive">
              <span className="setting-label">NewsAPI Key:</span>
              <div className="rpc-input-container">
                <input
                  type="text"
                  className="rpc-input"
                  placeholder="your-api-key-here"
                  value={settings.newsApiKey || ''}
                  onChange={(e) => updateSetting('newsApiKey', e.target.value.trim())}
                />
                <button 
                  className="rpc-save-btn"
                  onClick={async () => {
                    try {
                      await fetch('/api/news-key', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          apiKey: settings.newsApiKey,
                          provider: 'newsapi'
                        })
                      });
                    } catch (e) {}
                    window.location.reload();
                  }}
                >
                  SAVE
                </button>
              </div>
            </div>
          )}

          {settings.newsProvider === 'cryptocompare' && (
            <div className="setting-item interactive">
              <span className="setting-label">News API Key:</span>
              <div className="rpc-input-container">
                <input
                  type="text"
                  className="rpc-input"
                  placeholder="min-api.cryptocompare.com"
                  value={settings.customNewsApiKey || ''}
                  onChange={(e) => updateSetting('customNewsApiKey', e.target.value.trim())}
                />
                <button 
                  className="rpc-save-btn"
                  onClick={async () => {
                    try {
                      await fetch('/api/news-key', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          apiKey: settings.customNewsApiKey,
                          provider: settings.newsProvider,
                          customUrl: settings.customNewsApiUrl
                        })
                      });
                    } catch (e) {}
                    window.location.reload();
                  }}
                >
                  SAVE
                </button>
              </div>
            </div>
          )}
        </div>


        <div className="settings-info">
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="reset-btn" onClick={resetToDefaults}>
              RESET TO DEFAULTS
            </button>
          </div>
          <div className="api-info" style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <p><strong>DEFAULT APIS:</strong></p>
            <p>• <strong>CoinGecko:</strong> api.coingecko.com/api/v3 or <a href="https://www.coingecko.com/en/api" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>GET API</a></p>
            <p>• <strong>CryptoCompare:</strong> min-api.cryptocompare.com or <a href="https://www.cryptocompare.com/cryptopian/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>GET API</a></p>
            <p>• <strong>CMC:</strong> Free tier - 10k calls/month - <a href="https://coinmarketcap.com/api/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>GET API</a></p>
            <p>• <strong>NewsAPI:</strong> newsapi.org or <a href="https://newsapi.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>GET API</a></p>
            <p>• <strong>Solana:</strong> DexScreener FREE</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;