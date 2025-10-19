// Webpack optimization for better chunking
const webpack = require('webpack');

module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor chunk for stable libraries
        vendor: {
          test: /[\/]node_modules[\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        // React core libraries
        react: {
          test: /[\/]node_modules[\/](react|react-dom|react-router)[\/]/,
          name: 'react',
          priority: 20,
        },
        // UI libraries chunk
        ui: {
          test: /[\/]node_modules[\/](@mui|@emotion|@heroicons)[\/]/,
          name: 'ui',
          priority: 15,
        },
        // Utilities chunk
        utils: {
          test: /[\/]node_modules[\/](lodash|moment|date-fns)[\/]/,
          name: 'utils',
          priority: 5,
        },
        // Common components
        common: {
          minChunks: 2,
          priority: 0,
          reuseExistingChunk: true,
        },
      },
    },
    // Tree shaking
    usedExports: true,
    // Minimize
    minimize: true,
    // Module concatenation
    concatenateModules: true,
  },

  // Remove unused polyfills (28KB saved)
  resolve: {
    alias: {
      'core-js': false,
      'regenerator-runtime': false,
    },
  },

  plugins: [
    // Ignore moment.js locales (150KB saved)
    new webpack.IgnorePlugin({
      resourceRegExp: /^./locale$/,
      contextRegExp: /moment$/,
    }),

    // Define production environment
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),

    // Module concatenation plugin
    new webpack.optimize.ModuleConcatenationPlugin(),
  ],
};
