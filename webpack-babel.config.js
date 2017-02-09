var path = require('path');

module.exports = {
  output: {
    libraryTarget: 'commonjs2',
    umdNamedDefine: true
  },
  module: {
    loaders: [
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
