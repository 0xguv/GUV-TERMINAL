import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Zap, Star } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const themeIcons = {
    dark: Moon,
    light: Sun,
    midnight: Star,
    neon: Zap
  };

  const themeLabels = {
    dark: 'DARK',
    light: 'LIGHT',
    midnight: 'MIDNIGHT',
    neon: 'NEON'
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const CurrentIcon = themeIcons[theme];

  return (
    <div className="theme-toggle" ref={dropdownRef}>
      <button 
        className="theme-dropdown-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="theme-current-icon"><CurrentIcon size={14} /></span>
        <span className="theme-current-label">THEME</span>
        <span className="theme-arrow">▼</span>
      </button>
      
      {isOpen && (
        <div className="theme-dropdown-menu">
          {themes.map((t) => {
            const ThemeIcon = themeIcons[t];
            return (
              <button
                key={t}
                className={`theme-option ${theme === t ? 'active' : ''}`}
                onClick={() => {
                  setTheme(t);
                  setIsOpen(false);
                }}
              >
                <span className="theme-option-icon"><ThemeIcon size={14} /></span>
                <span className="theme-option-label">{themeLabels[t]}</span>
                {theme === t && <span className="theme-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
