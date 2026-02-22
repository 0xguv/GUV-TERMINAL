# GUV Screener

A comprehensive cryptocurrency screener and trading dashboard supporting multiple chains including Ethereum, Solana, and various L2s. Features real-time price tracking, portfolio management, token swapping, and bridging capabilities.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.x-61DAFB.svg)
![Node](https://img.shields.io/badge/Node-18.x-339933.svg)

## Features

### Multi-Chain Support
- **Ethereum** (ETH) - Full support with MetaMask integration
- **Solana** (SOL) - Phantom & Solflare wallet support
- **Layer 2 Networks** - Base, Arbitrum, Optimism support
- **EVM Chains** - BSC, Avalanche, Polygon, and more

### Dashboard Tabs
1. **CRYPTO** - Top 100 cryptocurrencies with market data
2. **SOLANA** - Solana ecosystem tokens and trending coins
3. **FUTURES** - Perpetual futures and derivatives markets
4. **NFT** - NFT market data and trending collections
5. **DEFI** - DeFi protocols and yield farming data
6. **STOCK** - Traditional stock market integration
7. **SWAP** - Jupiter-powered token swapping on Solana
8. **PORTFOLIO** - Track your wallet balances and positions
9. **BRIDGE** - Cross-chain bridging (Coming Soon)

### Key Features
- Real-time price updates
- Wallet connection (MetaMask, Phantom, Solflare)
- Token swapping via Jupiter
- Portfolio tracking
- News feed integration
- TradingView charts
- Multiple themes (Dark, Light, Midnight, Neon)
- Responsive design

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18.x or higher) - [Download here](https://nodejs.org/)
- **npm** (v9.x or higher) or **yarn** (v1.22.x or higher)
- **Git** - [Download here](https://git-scm.com/)
- **A code editor** (VS Code recommended)

### Required API Keys

You'll need to obtain API keys from the following services:

1. **CoinMarketCap API** (Free tier available)
   - Sign up at: https://pro.coinmarketcap.com/signup
   - Get your API key from the dashboard

2. **Jupiter API** (Free)
   - Visit: https://portal.jup.ag/pricing
   - Generate an API key

3. **Helius RPC** (Free tier available)
   - Sign up at: https://www.helius.dev/
   - Create a new project and copy the RPC URL

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/guv-screener.git
cd guv-screener
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React 18.x
- Solana Web3.js
- Ethers.js
- Wallet adapters
- Chart.js and TradingView widgets

### Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in your text editor and add your API keys:
   ```env
   CMC_API_KEY=your_actual_cmc_api_key_here
   REACT_APP_JUPITER_API_KEY=your_actual_jupiter_api_key_here
   REACT_APP_HELIUS_API_KEY=your_actual_helius_api_key_here
   ```

3. **Important:** Never commit the `.env` file to git!

### Step 4: Start the Development Server

```bash
npm start
```

This will start:
- React development server on http://localhost:3000
- Backend proxy server on http://localhost:3001

The app will automatically open in your default browser.

### Step 5: Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

## Usage Guide

### Connecting Your Wallet

1. Click the "Connect Wallet" button in the top right
2. Choose your wallet:
   - **MetaMask** for Ethereum/EVM chains
   - **Phantom** or **Solflare** for Solana
3. Approve the connection in your wallet popup

### Using the Swap Feature

1. Navigate to the **SWAP** tab
2. Connect your Solana wallet (Phantom/Solflare)
3. Select tokens to swap:
   - **From:** The token you want to sell
   - **To:** The token you want to buy
4. Enter the amount
5. Review the quote (rate, price impact, minimum received)
6. Click "SWAP NOW" and confirm in your wallet

### Tracking Your Portfolio

1. Go to the **PORTFOLIO** tab
2. Connect your Solana wallet
3. View your:
   - SOL balance
   - Token balances
   - Total portfolio value in USD
   - Individual token values

The portfolio updates automatically every 30 seconds.

### Bridging Tokens (Coming Soon)

The **BRIDGE** feature is currently under development. It will support:
- Cross-chain transfers between Ethereum, Base, Arbitrum, and more
- Native token bridging
- Automatic network switching

## Project Structure

```
guv-screener/
├── public/                 # Static files
├── src/
│   ├── components/         # React components
│   │   ├── Bridge.js      # Cross-chain bridging
│   │   ├── JupiterSwap.js # Token swapping
│   │   ├── PortfolioTracker.js # Portfolio view
│   │   ├── CryptoDashboard.js  # Main crypto dashboard
│   │   ├── SolanaDashboard.js  # Solana ecosystem
│   │   └── ...            # Other dashboard components
│   ├── styles/            # CSS styles
│   ├── utils/             # Utility functions
│   └── App.js             # Main app component
├── server.js              # Backend proxy server
├── package.json           # Dependencies
└── .env.example           # Environment variables template
```

## API Rate Limits

Be aware of these rate limits:

- **CoinMarketCap**: 10,000 calls/month (Free tier)
- **Jupiter**: 600 requests/minute (Free tier)
- **Helius**: 10,000 requests/day (Free tier)

The app implements caching to minimize API calls.

## Security Considerations

### API Keys
- Never commit your `.env` file to git
- Rotate API keys regularly
- Monitor usage for suspicious activity
- Use environment-specific keys (dev/staging/prod)

### Wallet Security
- Always verify transaction details before signing
- Never share your private keys or seed phrases
- Use hardware wallets for large amounts
- Be cautious of phishing attempts

### Code Security
- All sensitive console logging has been removed
- API keys are never exposed in frontend code
- Input validation is implemented
- Error messages don't leak sensitive information

## Troubleshooting

### Common Issues

**1. "No wallet found" error**
- Make sure you have MetaMask, Phantom, or Solflare installed
- Check that your wallet extension is enabled

**2. API errors or data not loading**
- Verify your API keys are correct in `.env`
- Check if you've exceeded API rate limits
- Ensure you have internet connectivity

**3. Swap transaction failing**
- Verify you have sufficient balance
- Check that you're on the correct network
- Ensure you have enough SOL for transaction fees

**4. Portfolio not showing**
- Make sure your wallet is connected
- Try refreshing the page
- Check browser console for errors

### Still having issues?

1. Clear browser cache and cookies
2. Try in incognito/private mode
3. Check the browser console (F12) for errors
4. Ensure all dependencies are installed: `npm install`
5. Restart the development server

## Development

### Adding New Features

1. Create a new component in `src/components/`
2. Add styles in `src/styles/ComponentName.css`
3. Import and use the component in `App.js`
4. Update the tab navigation if needed

### Running Tests

```bash
npm test
```

### Code Style

This project uses ESLint and Prettier for code formatting:

```bash
npm run lint
npm run format
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Commit: `git commit -m 'Add my feature'`
5. Push: `git push origin feature/my-feature`
6. Open a Pull Request

Please ensure:
- Code passes linting: `npm run lint`
- No console.log statements in production code
- API keys are never hardcoded
- Sensitive data is not logged

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This software is for educational and informational purposes only. Cryptocurrency trading involves substantial risk. Always do your own research and never invest more than you can afford to lose.

## Acknowledgments

- [CoinMarketCap](https://coinmarketcap.com/) for market data
- [Jupiter](https://jup.ag/) for swap aggregation
- [Helius](https://www.helius.dev/) for Solana RPC
- [TradingView](https://www.tradingview.com/) for chart widgets
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter) for wallet integration

## Support

If you find this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs via Issues
- 💡 Suggesting features
- 🔧 Contributing code

---

**Built with ❤️ for the crypto community**