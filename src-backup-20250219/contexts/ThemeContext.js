import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Check localStorage or default to dark theme
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'dark';
  });

  // Available themes
  const themes = {
    dark: {
      '--bg-primary': '#000000',
      '--bg-secondary': '#0a0a0a',
      '--bg-tertiary': '#111111',
      '--text-primary': '#ffffff',
      '--text-secondary': '#888888',
      '--text-muted': '#555555',
      '--border-color': '#333333',
      '--border-light': '#444444',
      '--terminal-green': '#00ff00',
      '--terminal-green-dim': '#00aa00',
      '--terminal-red': '#ff4444',
      '--terminal-amber': '#ffb000',
      '--terminal-cyan': '#00ffff',
    },
    light: {
      '--bg-primary': '#f5f5f5',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#eeeeee',
      '--text-primary': '#1a1a1a',
      '--text-secondary': '#666666',
      '--text-muted': '#999999',
      '--border-color': '#dddddd',
      '--border-light': '#cccccc',
      '--terminal-green': '#00aa00',
      '--terminal-green-dim': '#008800',
      '--terminal-red': '#cc0000',
      '--terminal-amber': '#cc8800',
      '--terminal-cyan': '#0088aa',
    },
    midnight: {
      '--bg-primary': '#0d1117',
      '--bg-secondary': '#161b22',
      '--bg-tertiary': '#21262d',
      '--text-primary': '#c9d1d9',
      '--text-secondary': '#8b949e',
      '--text-muted': '#6e7681',
      '--border-color': '#30363d',
      '--border-light': '#3d444d',
      '--terminal-green': '#238636',
      '--terminal-green-dim': '#1a6328',
      '--terminal-red': '#da3633',
      '--terminal-amber': '#d29922',
      '--terminal-cyan': '#58a6ff',
    },
    neon: {
      '--bg-primary': '#0a0a0f',
      '--bg-secondary': '#12121a',
      '--bg-tertiary': '#1a1a2e',
      '--text-primary': '#eaeaea',
      '--text-secondary': '#a0a0a0',
      '--text-muted': '#707070',
      '--border-color': '#2d2d44',
      '--border-light': '#3d3d5c',
      '--terminal-green': '#00ff88',
      '--terminal-green-dim': '#00cc6a',
      '--terminal-red': '#ff3366',
      '--terminal-amber': '#ffaa00',
      '--terminal-cyan': '#00ffff',
    }
  };

  // Apply theme CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const themeVars = themes[theme];
    
    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = (newTheme) => {
    if (themes[newTheme]) {
      setTheme(newTheme);
    }
  };

  const value = {
    theme,
    setTheme: toggleTheme,
    themes: Object.keys(themes),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};