const path = require('path');

module.exports = {
  entry: './backend-connection.js',
  output: {
    filename: 'backend-connection.bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
};