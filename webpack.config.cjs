const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

const mode = process.env.NODE_ENV;

module.exports = () => {
    const include = [
        path.resolve(__dirname, 'src'),
        path.resolve(__dirname, 'test'),
        path.resolve(__dirname, 'utils'),
    ];

    return {
        mode,
        context: path.resolve(__dirname),
        resolve: {
            modules: [path.resolve(__dirname, 'src'), 'node_modules'],
            extensions: ['.ts', '.js'],
            extensionAlias: {
                '.js': ['.ts', '.js'],
            },
        },
        entry: {
            itowns: [
                'core-js',
                './src/MainBundle.js',
            ],
            debug: {
                import: './utils/debug/Main.js',
                dependOn: 'itowns',
            },
            itowns_widgets: {
                import: './src/Utils/gui/Main.js',
                dependOn: 'itowns',
            },
        },
        devtool: 'source-map',
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            library: '[name]',
            libraryTarget: 'umd',
            umdNamedDefine: true,
        },
        module: {
            rules: [
                {
                    test: /\.[jt]s$/,
                    include,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            rootMode: 'upward',
                        },
                    },
                },
            ],
        },
        plugins: [
            // new ESLintPlugin({
            //     files: include,
            // }),
        ],
        devServer: {
            devMiddleware: {
                publicPath: '/dist/',
            },
            static: {
                directory: path.resolve(__dirname, './'),
                watch: {
                    ignored: [path.resolve(__dirname, '.git'), path.resolve(__dirname, 'node_modules')],
                },
            },
            client: {
                overlay: {
                    errors: true,
                    runtimeErrors: false,
                    warnings: false,
                },
            },
        },
    };
};
