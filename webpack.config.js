var path = require('path');
var webpack = require('webpack');

// THREE js replace
//"three": "^0.74.0" -> "three": "mrdoob/three.js#35a5994828da7cebc0d8442062f784b3f9e1f818",
//                                               #idcommit

var definePlugin = new webpack.DefinePlugin({
    __DEBUG__: JSON.stringify(process.env.NODE_ENV === 'development')
});

module.exports = {
  entry: {
      itowns: [ 'es6-promise', 'whatwg-fetch', 'custom-event', path.resolve(__dirname, 'src/Main.js') ],
      debug: [ path.resolve(__dirname, 'utils/debug/Debug.js') ]
  },
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: '[name]',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    preLoaders: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'test'),
          path.resolve(__dirname, 'utils')
        ],
        loader: 'eslint'
      }
    ],
    loaders: [
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'test'),
          path.resolve(__dirname, 'utils')
        ],
        loader: 'babel'
      },
       {
        test: /\.glsl$/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'test')
        ],
        loader: 'raw'
      },
      {
        test: /node_modules[\/\\]three[\/\\]examples[\/\\].*\.js$/,
        loader: 'imports',
        query: {
            'THREE': 'three'
        }
      }
    ],
    noParse: [
            /js-priority-queue[\\\/]file\.js$/,
            path.join(__dirname, "node_modules", "js-priority-queue")
    ]
  },
  resolve: {
    extensions: ['', '.js']
  },
  devServer: {
    publicPath: '/dist/'
  },
  plugins: [definePlugin]
};
