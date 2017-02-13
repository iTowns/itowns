var path = require('path');

module.exports = {
  output: {
    libraryTarget: 'commonjs2',
    umdNamedDefine: true
  },
  module: {
    loaders: [
      // please consider modifying corresponding loaders in webpack.config.js too
      {
        test: /\.glsl$/,
        include: [
          path.resolve(__dirname, 'src'),
        ],
        loader: 'raw'
      },
    ],
  },
};
