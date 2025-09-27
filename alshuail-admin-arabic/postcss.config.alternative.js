// Alternative PostCSS configuration if needed
// Use this if the main config still causes issues

module.exports = (ctx) => {
  const plugins = [
    require('tailwindcss'),
    require('autoprefixer'),
  ];

  // Add any environment-specific plugins
  if (ctx.env === 'production') {
    plugins.push(
      require('cssnano')({
        preset: 'default',
      })
    );
  }

  return {
    plugins: plugins,
  };
};