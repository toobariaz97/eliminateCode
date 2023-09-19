const TerserPlugin = require('terser-webpack-plugin');
const path = require('path')
module.exports = {
  entry: './index.js', // Your entry JavaScript file
  output: {
    filename: 'bundle.js', // Output file name
    path: path.resolve(__dirname, 'dist'), // Output directory
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            dead_code: true, // Enable dead code elimination
          },
        },
      }),
    ],
  },
};
