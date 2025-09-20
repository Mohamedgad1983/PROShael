module.exports = {
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