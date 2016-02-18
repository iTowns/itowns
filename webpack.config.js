var path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'src/Main.js'),
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'itowns2.js',
    library: 'itowns2',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    loaders: [
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
    ]
  },
  resolve: {
    root: path.resolve(__dirname, 'src'),
    extensions: ['', '.js'],
    alias: {
      THREE:         'three',
      PriorityQueue: 'js-priority-queue',
      'Renderer/ThreeExtented/jszip.min': 'jszip',
      'Renderer/ThreeExtented/ColladaLoader': 'ColladaLoader',
      ColladaLoader: 'three/examples/js/loaders/ColladaLoader',
      OrbitControls: 'three/examples/js/controls/OrbitControls',
      GlobeControls: 'Renderer/ThreeExtented/GlobeControls',
      OBB:           'Renderer/ThreeExtented/OBB',
      OBBHelper:     'Renderer/ThreeExtented/OBBHelper',
      SphereHelper:  'Renderer/ThreeExtented/SphereHelper',
      StarGeometry:  'Renderer/ThreeExtented/StarGeometry'
    }
  },
  devServer: {
    publicPath: '/dist/'
  }
};
