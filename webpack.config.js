var path = require('path');
var webpack = require('webpack');

var commonConfig = require('./webpack-common.config.js');

var definePlugin = new webpack.DefinePlugin({
    __DEBUG__: JSON.stringify(process.env.NODE_ENV === 'development'),
});

var providePlugin = new webpack.ProvidePlugin({
    TextDecoder: [path.resolve(__dirname, 'src/utils/polyfill'), 'TextDecoder'],
    TextEncoder: [path.resolve(__dirname, 'src/utils/polyfill'), 'TextEncoder'],
});

module.exports = {
    entry: {
        itowns: ['babel-polyfill', 'url-polyfill', 'whatwg-fetch', path.resolve(__dirname, 'src/MainBundle.js')],
        debug: [path.resolve(__dirname, 'utils/debug/Main.js')],
    },
    devtool: 'source-map',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        library: '[name]',
        libraryTarget: 'umd',
        umdNamedDefine: true,
    },
    plugins: [
        definePlugin,
        providePlugin,
        new webpack.optimize.CommonsChunkPlugin({ name: 'itowns' }),
    ],
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
                    presets: [['es2015', { modules: false } ]],
                    plugins: ['transform-runtime'],
                    babelrc: false,
                },
            },
            commonConfig.glslLoader,
            commonConfig.jsonLoader,
        ],
    },
    devServer: {
        publicPath: '/dist/',
    },
};
