import React from 'react';
import Terminal from './components/Terminal';
import WalletContextProvider from './components/WalletContextProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <WalletContextProvider>
        <div className="app">
          <Terminal />
        </div>
      </WalletContextProvider>
    </ThemeProvider>
  );
}

export default App;