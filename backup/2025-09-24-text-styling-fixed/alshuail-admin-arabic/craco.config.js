const webpack = require('webpack');

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

      // Optimize for production
      if (process.env.NODE_ENV === 'production') {
        // Enable code splitting
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            }
          }
        };
      }

      return webpackConfig;
    }
  },
  style: {
    postcss: {
      loaderOptions: (postcssLoaderOptions) => {
        // Override the PostCSS plugins to use Tailwind v4
        postcssLoaderOptions.postcssOptions.plugins = [
          require('@tailwindcss/postcss')(),
          require('autoprefixer')
        ];
        return postcssLoaderOptions;
      }
    }
  }
};