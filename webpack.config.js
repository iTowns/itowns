var path = require('path');
var webpack = require('webpack');

// THREE js replace
// "three": "^0.74.0" -> "three": "mrdoob/three.js#35a5994828da7cebc0d8442062f784b3f9e1f818",
//                                               #idcommit

var definePlugin = new webpack.DefinePlugin({
    __DEBUG__: JSON.stringify(process.env.NODE_ENV === 'development'),
});

module.exports = {
    entry: {
        itowns: ['es6-promise', 'whatwg-fetch', 'custom-event', path.resolve(__dirname, 'src/Main.js')],
        debug: [path.resolve(__dirname, 'utils/debug/Debug.js')],
    },
    devtool: 'source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: '[name]',
        libraryTarget: 'umd',
        umdNamedDefine: true,
    },
    plugins: [definePlugin, new webpack.optimize.CommonsChunkPlugin({ name: 'itowns' })],
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: 'pre',
                include: [
                    path.resolve(__dirname, 'src'),
                    path.resolve(__dirname, 'test'),
                    path.resolve(__dirname, 'utils'),
                ],
                loader: 'eslint-loader',
            },
            {
                test: /\.js$/,
                include: [
                    path.resolve(__dirname, 'src'),
                    path.resolve(__dirname, 'test'),
                    path.resolve(__dirname, 'utils'),
                ],
                loader: 'babel-loader',
                // Please consider modifying .babelrc too
                // .babelrc is used for transpiling src/ into lib/ in the prepublish
                // phase, see package.json
                options: {
                    presets: ['es2015'],
                    plugins: ['transform-runtime'],
                    babelrc: false,
                },
            },
            {
                // please consider modifying corresponding loaders in webpack-babel.config.js too
                test: /\.glsl$/,
                include: [
                    path.resolve(__dirname, 'src'),
                    path.resolve(__dirname, 'test'),
                ],
                loader: 'raw-loader',
            },
            {
                // please consider modifying corresponding loaders in webpack-babel.config.js too
                test: /\.json$/,
                include: [
                    path.resolve(__dirname, 'utils'),
                ],
                loader: 'raw-loader',
            },
            {
                test: /node_modules[/\\]three[/\\]examples[/\\].*\.js$/,
                loader: 'imports-loader',
                options: {
                    THREE: 'three',
                },
            },
        ],
    },
    devServer: {
        publicPath: '/dist/',
    },
};
