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
      '--bg-primary': '#0d1117',
      '--bg-secondary': '#161b22',
      '--bg-tertiary': '#21262d',
      '--bg-elevated': '#30363d',
      '--text-primary': '#f0f6fc',
      '--text-secondary': '#8b949e',
      '--text-muted': '#6e7681',
      '--border-color': '#30363d',
      '--border-light': '#21262d',
      '--accent-primary': '#22c55e',
      '--accent-success': '#3fb950',
      '--accent-danger': '#f85149',
      '--accent-warning': '#d29922',
    },
    light: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f6f8fa',
      '--bg-tertiary': '#eaeef2',
      '--bg-elevated': '#d0d7de',
      '--text-primary': '#24292f',
      '--text-secondary': '#57606a',
      '--text-muted': '#8b949e',
      '--border-color': '#d0d7de',
      '--border-light': '#eaeef2',
      '--accent-primary': '#22c55e',
      '--accent-success': '#1a7f37',
      '--accent-danger': '#cf222e',
      '--accent-warning': '#9a6700',
    },
    midnight: {
      '--bg-primary': '#0d1117',
      '--bg-secondary': '#161b22',
      '--bg-tertiary': '#21262d',
      '--bg-elevated': '#30363d',
      '--text-primary': '#c9d1d9',
      '--text-secondary': '#8b949e',
      '--text-muted': '#6e7681',
      '--border-color': '#30363d',
      '--border-light': '#3d444d',
      '--accent-primary': '#22c55e',
      '--accent-success': '#238636',
      '--accent-danger': '#da3633',
      '--accent-warning': '#d29922',
    },
    neon: {
      '--bg-primary': '#0a0a0f',
      '--bg-secondary': '#12121a',
      '--bg-tertiary': '#1a1a2e',
      '--bg-elevated': '#252540',
      '--text-primary': '#eaeaea',
      '--text-secondary': '#a0a0a0',
      '--text-muted': '#707070',
      '--border-color': '#2d2d44',
      '--border-light': '#3d3d5c',
      '--accent-primary': '#22c55e',
      '--accent-success': '#00ff88',
      '--accent-danger': '#ff3366',
      '--accent-warning': '#ffaa00',
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