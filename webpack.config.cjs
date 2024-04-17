const path = require('path');
const ESLintPlugin = require('eslint-webpack-plugin');

const mode = process.env.NODE_ENV;
const noInline = process.env.noInline;
const debugBuild = mode === 'development';

// For each file, this config is merged with its local babel configuration.
// See https://babeljs.io/docs/configuration#how-babel-merges-config-items
const babelConf = {
    rootMode: 'upward',
    plugins: [
        ['minify-replace', {
            replacements: [{
                identifierName: '__DEBUG__',
                replacement: {
                    type: 'booleanLiteral',
                    value: debugBuild,
                },
            }],
        }],
    ],
};

const include = [
    path.resolve(__dirname, 'packages/itowns/src'),
    path.resolve(__dirname, 'utils'),
    path.resolve(__dirname, 'packages/Geodesy/src'),
];

const exclude = [
    path.resolve(__dirname, '.git'),
    path.resolve(__dirname, 'node_modules'),
];

const alias = {
    '@itowns/geodesy': path.resolve(__dirname, 'packages/Geodesy/src/Main.js'),
};

module.exports = () => {
    const babelLoaderOptions = [];
    if (!noInline) {
        babelLoaderOptions.push('babel-inline-import-loader');
    }
    babelLoaderOptions.push({
        loader: 'babel-loader',
        options: babelConf,
    });

    return {
        mode,
        context: path.resolve(__dirname),
        resolve: { alias },
        entry: {
            itowns: [
                'core-js',
                './packages/itowns/src/MainBundle.js',
            ],
            debug: {
                import: './utils/debug/Main.js',
                dependOn: 'itowns',
            },
            itowns_widgets: {
                import: './packages/itowns/src/Utils/gui/Main.js',
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
                    test: /\.js$/,
                    exclude,
                    include,
                    use: babelLoaderOptions,
                },
            ],
        },
        plugins: [
            new ESLintPlugin({
                files: include,
            }),
        ],
        devServer: {
            devMiddleware: {
                publicPath: '/dist/',
            },
            static: {
                directory: path.resolve(__dirname, './'),
                watch: {
                    ignored: exclude,
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
