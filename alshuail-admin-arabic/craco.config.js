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

      // CRITICAL: Configure module resolution for feature packages
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@app/feature-access-control': path.resolve(__dirname, 'src/features/access-control')
      };

      // CRITICAL: Ensure feature packages are never tree-shaken
      webpackConfig.module.rules.push({
        test: /features\/access-control/,
        sideEffects: true
      });

      // CRITICAL: Prevent optimization of force-include shim
      if (webpackConfig.optimization) {
        webpackConfig.optimization.providedExports = false; // Disable export analysis
        webpackConfig.optimization.innerGraph = false; // Disable inner graph analysis
      }

      // EMERGENCY WORKAROUND: Completely disable optimizations for development build
      // Set BUILD_MODE=emergency to deploy unminified build with NO tree-shaking
      if (process.env.BUILD_MODE === 'emergency') {
        console.log('⚠️  EMERGENCY MODE: Building with ZERO optimizations (unminified, no tree-shaking)');

        // Disable ALL optimizations
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          minimize: false,
          usedExports: false,
          sideEffects: false,
          concatenateModules: false,
          splitChunks: false,
          runtimeChunk: false,
          removeAvailableModules: false,
          removeEmptyChunks: false,
          mergeDuplicateChunks: false,
          minimizer: []  // Remove all minimizers
        };

        return webpackConfig;
      }

      // Phase 4: Optimize for production with aggressive bundle splitting
      if (process.env.NODE_ENV === 'production') {
        // WORKAROUND: Re-enable minification but keep tree-shaking disabled
        webpackConfig.optimization.usedExports = false;
        webpackConfig.optimization.sideEffects = false;
        webpackConfig.optimization.minimize = true;  // Re-enabled for production bundle size
        webpackConfig.optimization.concatenateModules = false;  // Keep disabled

        // Configure minimizer to preserve Settings components
        webpackConfig.optimization.minimizer = webpackConfig.optimization.minimizer || [];
        if (webpackConfig.optimization.minimizer.length > 0) {
          const TerserPlugin = webpackConfig.optimization.minimizer[0];
          if (TerserPlugin && TerserPlugin.constructor.name === 'TerserPlugin') {
            TerserPlugin.options = TerserPlugin.options || {};
            TerserPlugin.options.terserOptions = TerserPlugin.options.terserOptions || {};
            TerserPlugin.options.terserOptions.compress = TerserPlugin.options.terserOptions.compress || {};
            // Disable dead code elimination for Settings components
            TerserPlugin.options.terserOptions.compress.dead_code = false;
            TerserPlugin.options.terserOptions.compress.unused = false;
          }
        }

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