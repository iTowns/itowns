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
    path.resolve(__dirname, 'packages/Geographic/src'),
    path.resolve(__dirname, 'packages/Main/src'),
    path.resolve(__dirname, 'packages/Debug/src'),
    path.resolve(__dirname, 'packages/Widgets/src'),
];

const exclude = [
    path.resolve(__dirname, '.git'),
    path.resolve(__dirname, 'node_modules'),
];

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
        resolve: {
            extensions: ['.ts', '.js'],
            extensionAlias: {
                '.js': ['.ts', '.js'],
            },
            alias: {
                itowns: path.resolve(__dirname, 'packages/Main/src/Main.js'),
                '@itowns/geographic': path.resolve(__dirname, 'packages/Geographic/src/Main.js'),
            },
        },
        entry: {
            itowns: [
                'core-js',
                './packages/Main/src/MainBundle.js',
            ],
            debug: {
                import: './packages/Debug/src/Main.js',
                dependOn: 'itowns',
            },
            itowns_widgets: {
                import: './packages/Widgets/src/Main.js',
                dependOn: 'itowns',
            },
            itowns_potree2worker: {
                import: './packages/Main/src/Worker/Potree2Worker.js',
            },
            itowns_lasworker: {
                import: './packages/Main/src/Worker/LASLoaderWorker.js',
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
                    test: /\.(js|ts)$/,
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
