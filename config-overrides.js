const { override, addWebpackPlugin } = require('customize-cra');

module.exports = function override(config, env) {
  // Set dev server port to 3002
  config.devServer = {
    ...config.devServer,
    port: 3002,
  };

  // Add polyfills for Node.js modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
    util: require.resolve('util/'),
    url: require.resolve('url/'),
    querystring: require.resolve('querystring-es3'),
    zlib: require.resolve('browserify-zlib'),
    assert: require.resolve('assert/'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    os: require.resolve('os-browserify/browser'),
    path: require.resolve('path-browserify'),
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      dns: false,
      vm: false,
  };
  
  // Disable source maps for problematic packages
  config.module.rules.forEach((rule) => {
    if (rule.oneOf) {
      rule.oneOf.forEach((oneOfRule) => {
        if (
          oneOfRule.loader &&
          oneOfRule.loader.includes('source-map-loader')
        ) {
          if (!oneOfRule.exclude) {
            oneOfRule.exclude = [];
          } else if (!Array.isArray(oneOfRule.exclude)) {
            oneOfRule.exclude = [oneOfRule.exclude];
          }
          oneOfRule.exclude.push(/@solana[\\/]buffer-layout/);
          oneOfRule.exclude.push(/superstruct/);
        }
      });
    }
  });
  
  return config;
};
