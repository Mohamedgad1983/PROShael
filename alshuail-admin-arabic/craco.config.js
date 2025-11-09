const webpack = require('webpack');
const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {

      // Fix for xlsx-populate and other node modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser.js')
      };

      // Fix for fully specified ESM imports
      webpackConfig.resolve.extensionAlias = {
        '.js': ['.js', '.ts', '.tsx', '.jsx'],
        '.mjs': ['.mjs', '.mts']
      };

      // Add Buffer and process polyfills
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process'
        })
      );


      // Phase 4: Optimize for production with aggressive bundle splitting
      if (process.env.NODE_ENV === 'production') {
        // Optimize for production
        webpackConfig.optimization.usedExports = true;
        webpackConfig.optimization.sideEffects = true;
        webpackConfig.optimization.minimize = true;

        // Advanced code splitting strategy
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          maxInitialRequests: Infinity,
          minSize: 20000,
          cacheGroups: {
            // Heroicons separate bundle
            heroicons: {
              test: /[\\/]node_modules[\\/]@heroicons/,
              name: 'heroicons',
              priority: 30,
              reuseExistingChunk: true
            },
            // Chart.js separate bundle
            chartjs: {
              test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)/,
              name: 'charts',
              priority: 25,
              reuseExistingChunk: true
            },
            // Recharts separate bundle
            recharts: {
              test: /[\\/]node_modules[\\/]recharts/,
              name: 'recharts',
              priority: 24,
              reuseExistingChunk: true
            },
            // React and React-DOM
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)/,
              name: 'react',
              priority: 23,
              reuseExistingChunk: true
            },
            // Other large libraries
            libs: {
              test: /[\\/]node_modules[\\/](axios|framer-motion|styled-components)/,
              name: 'libs',
              priority: 22,
              reuseExistingChunk: true
            },
            // All other vendor code
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 20,
              reuseExistingChunk: true
            },
            // Common code used across multiple chunks
            common: {
              minChunks: 2,
              name: 'common',
              priority: 10,
              reuseExistingChunk: true
            }
          }
        };
      }

      return webpackConfig;
    }
  },
  // PostCSS configuration is now handled by postcss.config.js
};